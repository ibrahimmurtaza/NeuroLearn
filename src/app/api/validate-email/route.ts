import { NextRequest, NextResponse } from 'next/server';
import { promisify } from 'util';
import * as dns from 'dns';
import * as net from 'net';

// TypeScript interfaces for API
interface EmailValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validationSteps: {
    format: boolean;
    domain: boolean;
    mailbox: boolean;
  };
  processingTime: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

enum ValidationError {
  INVALID_FORMAT = 'Invalid email format',
  DOMAIN_NOT_FOUND = 'Domain does not exist',
  MAILBOX_NOT_FOUND = 'Mailbox does not exist',
  TIMEOUT = 'Validation timeout',
  RATE_LIMITED = 'Rate limit exceeded',
  NETWORK_ERROR = 'Network error occurred',
  SMTP_ERROR = 'SMTP verification failed'
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT = 10000; // 10 seconds

// In-memory storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, RateLimitEntry>();
const validationCache = new Map<string, { result: EmailValidationResult; timestamp: number }>();

// DNS lookup promisified
const dnsLookup = promisify(dns.lookup);
const dnsResolveMx = promisify(dns.resolveMx);

// Email regex pattern (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Rate limiting function
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  entry.count++;
  return true;
}

/**
 * Cache management
 */
function getCachedResult(email: string): EmailValidationResult | null {
  const cached = validationCache.get(email);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

function setCachedResult(email: string, result: EmailValidationResult): void {
  validationCache.set(email, {
    result,
    timestamp: Date.now()
  });
}

/**
 * Format validation using regex
 */
function validateEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// Common email providers that we know are valid
const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'hotmail.co.uk', 'hotmail.fr',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me',
  'zoho.com', 'yandex.com', 'mail.ru', 'qq.com', '163.com', '126.com',
  'edu', 'ac.uk', 'edu.au', 'edu.ca', 'org', 'gov', 'mil'
]);

/**
 * Domain validation using DNS lookup with fallback for trusted domains
 */
async function validateDomain(domain: string, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
  // Check if it's a trusted domain first
  const lowerDomain = domain.toLowerCase();
  if (TRUSTED_EMAIL_DOMAINS.has(lowerDomain)) {
    return true;
  }
  
  // Check if it ends with a trusted TLD
  for (const trustedDomain of TRUSTED_EMAIL_DOMAINS) {
    if (lowerDomain.endsWith('.' + trustedDomain)) {
      return true;
    }
  }
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('DNS lookup timeout')), timeout);
    });
    
    await Promise.race([
      dnsLookup(domain),
      timeoutPromise
    ]);
    
    return true;
  } catch (error) {
    // For unknown domains, if DNS fails, we'll be more lenient
    // and just check if the domain format is valid
    console.warn(`DNS lookup failed for domain ${domain}:`, error);
    
    // Basic domain format validation as fallback
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))*$/;
    const isValidFormat = domainRegex.test(domain) && domain.includes('.') && domain.length <= 253;
    
    if (isValidFormat) {
      console.info(`Domain ${domain} has valid format, allowing despite DNS lookup failure`);
      return true;
    }
    
    return false;
  }
}

/**
 * SMTP mailbox validation
 */
async function validateMailbox(email: string, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
  const domain = email.split('@')[1];
  
  try {
    // Get MX records
    const mxRecords = await Promise.race([
      dnsResolveMx(domain),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('MX lookup timeout')), timeout);
      })
    ]);
    
    if (!mxRecords || mxRecords.length === 0) {
      return false;
    }
    
    // Sort MX records by priority
    mxRecords.sort((a, b) => a.priority - b.priority);
    
    // Try to connect to the first MX server
    const mxHost = mxRecords[0].exchange;
    
    return new Promise((resolve) => {
      const socket = net.createConnection(25, mxHost);
      let isResolved = false;
      
      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
        }
      };
      
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);
      
      socket.on('connect', () => {
        clearTimeout(timeoutId);
        cleanup();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timeoutId);
        cleanup();
        resolve(false);
      });
    });
  } catch (error) {
    return false;
  }
}

/**
 * Get client IP for rate limiting
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const { email, checkDomain = true, checkMailbox = true, timeout = DEFAULT_TIMEOUT } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required and must be a string' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    const clientIP = getClientIP(request);
    
    // Initialize result
    const result: EmailValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      validationSteps: {
        format: false,
        domain: false,
        mailbox: false
      },
      processingTime: 0
    };
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      result.errors.push(ValidationError.RATE_LIMITED);
      result.processingTime = Date.now() - startTime;
      return NextResponse.json(result, { status: 429 });
    }
    
    // Check cache
    const cachedResult = getCachedResult(email);
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        processingTime: Date.now() - startTime
      });
    }
    
    // Step 1: Format validation
    result.validationSteps.format = validateEmailFormat(email);
    if (!result.validationSteps.format) {
      result.errors.push(ValidationError.INVALID_FORMAT);
      result.processingTime = Date.now() - startTime;
      setCachedResult(email, result);
      return NextResponse.json(result);
    }
    
    const domain = email.split('@')[1];
    
    // Step 2: Domain validation
    if (checkDomain) {
      result.validationSteps.domain = await validateDomain(domain, timeout);
      if (!result.validationSteps.domain) {
        result.errors.push(ValidationError.DOMAIN_NOT_FOUND);
        result.processingTime = Date.now() - startTime;
        setCachedResult(email, result);
        return NextResponse.json(result);
      }
    } else {
      result.validationSteps.domain = true;
    }
    
    // Step 3: Mailbox validation
    if (checkMailbox) {
      result.validationSteps.mailbox = await validateMailbox(email, timeout);
      if (!result.validationSteps.mailbox) {
        result.errors.push(ValidationError.MAILBOX_NOT_FOUND);
        result.warnings.push('Mailbox verification failed - email may still be valid');
      }
    } else {
      result.validationSteps.mailbox = true;
    }
    
    // Determine overall validity
    result.isValid = result.validationSteps.format && 
                    result.validationSteps.domain && 
                    (checkMailbox ? result.validationSteps.mailbox : true);
    
    result.processingTime = Date.now() - startTime;
    
    // Cache the result
    setCachedResult(email, result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Email validation API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        isValid: false,
        errors: [ValidationError.NETWORK_ERROR],
        warnings: [],
        validationSteps: { format: false, domain: false, mailbox: false },
        processingTime: 0
      },
      { status: 500 }
    );
  }
}