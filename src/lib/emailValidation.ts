// TypeScript interfaces and types for client-side validation
export interface EmailValidationResult {
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

export interface ClientValidationResult {
  isValid: boolean;
  error?: string;
  isValidating?: boolean;
}

export enum ValidationError {
  INVALID_FORMAT = 'Invalid email format',
  DOMAIN_NOT_FOUND = 'Domain does not exist',
  MAILBOX_NOT_FOUND = 'Mailbox does not exist',
  TIMEOUT = 'Validation timeout',
  RATE_LIMITED = 'Rate limit exceeded',
  NETWORK_ERROR = 'Network error occurred',
  SMTP_ERROR = 'SMTP verification failed'
}

// Client-side cache for validation results
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const clientValidationCache = new Map<string, { result: EmailValidationResult; timestamp: number }>();

// Email regex pattern (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Client-side cache management functions
 */
function getCachedResult(email: string): EmailValidationResult | null {
  const cached = clientValidationCache.get(email);
  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
    return cached.result;
  }
  return null;
}

function setCachedResult(email: string, result: EmailValidationResult): void {
  clientValidationCache.set(email, {
    result,
    timestamp: Date.now()
  });
}

/**
 * Client-side email format validation using regex
 * @param email - Email address to validate
 * @returns boolean indicating if format is valid
 */
export function validateEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Basic length check
  if (email.length > 254) {
    return false;
  }
  
  // Check for basic structure
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  
  const [localPart, domain] = parts;
  
  // Local part validation
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }
  
  // Domain validation
  if (domain.length === 0 || domain.length > 253) {
    return false;
  }
  
  return EMAIL_REGEX.test(email);
}

/**
 * Domain validation using DNS lookup
 * @param domain - Domain to validate
 * @param timeout - Timeout in milliseconds
 * @returns Promise<boolean> indicating if domain exists
 */
export async function validateDomain(domain: string, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
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
    console.warn(`Domain validation failed for ${domain}:`, error);
    return false;
  }
}

/**
 * SMTP mailbox validation
 * @param email - Email address to validate
 * @param timeout - Timeout in milliseconds
 * @returns Promise<boolean> indicating if mailbox exists
 */
export async function validateMailbox(email: string, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
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
      
      socket.on('error', (err) => {
        console.warn(`SMTP validation failed for ${email}:`, err);
        clearTimeout(timeoutId);
        cleanup();
        resolve(false);
      });
    });
  } catch (error) {
    console.warn(`Mailbox validation failed for ${email}:`, error);
    return false;
  }
}

/**
 * Client-side email validation (format only)
 * @param email - Email address to validate
 * @returns ClientValidationResult with immediate format validation
 */
export function validateEmailClient(email: string): ClientValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: ValidationError.INVALID_FORMAT
    };
  }
  
  const isValidFormat = validateEmailFormat(email);
  
  return {
    isValid: isValidFormat,
    error: isValidFormat ? undefined : ValidationError.INVALID_FORMAT
  };
}

/**
 * Call server-side email validation API
 * @param email - Email address to validate
 * @param options - Validation options
 * @returns Promise<EmailValidationResult> with detailed validation results
 */
export async function validateEmailServer(
  email: string,
  options: {
    checkDomain?: boolean;
    checkMailbox?: boolean;
    timeout?: number;
  } = {}
): Promise<EmailValidationResult> {
  const startTime = Date.now();
  
  // Check cache first
  const cachedResult = getCachedResult(email);
  if (cachedResult) {
    return {
      ...cachedResult,
      processingTime: Date.now() - startTime
    };
  }
  
  try {
    const response = await fetch('/api/validate-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        checkDomain: options.checkDomain ?? true,
        checkMailbox: options.checkMailbox ?? true,
        timeout: options.timeout ?? 10000
      })
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        return {
          isValid: false,
          errors: [ValidationError.RATE_LIMITED],
          warnings: [],
          validationSteps: { format: false, domain: false, mailbox: false },
          processingTime: Date.now() - startTime
        };
      }
      
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result: EmailValidationResult = await response.json();
    
    // Cache the result
    setCachedResult(email, result);
    
    return {
      ...result,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Server email validation error:', error);
    return {
      isValid: false,
      errors: [ValidationError.NETWORK_ERROR],
      warnings: ['Server validation unavailable - only format checked'],
      validationSteps: {
        format: validateEmailFormat(email),
        domain: false,
        mailbox: false
      },
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Combined email validation (client + server)
 * @param email - Email address to validate
 * @param options - Validation options
 * @returns Promise<EmailValidationResult> with comprehensive validation
 */
export async function validateEmail(
  email: string,
  options: {
    checkDomain?: boolean;
    checkMailbox?: boolean;
    timeout?: number;
    clientOnly?: boolean;
  } = {}
): Promise<EmailValidationResult> {
  const startTime = Date.now();
  
  // Always start with client-side validation
  const clientResult = validateEmailClient(email);
  
  if (!clientResult.isValid || options.clientOnly) {
    return {
      isValid: clientResult.isValid,
      errors: clientResult.error ? [clientResult.error] : [],
      warnings: [],
      validationSteps: {
        format: clientResult.isValid,
        domain: false,
        mailbox: false
      },
      processingTime: Date.now() - startTime
    };
  }
  
  // If client validation passes, proceed with server validation
  return await validateEmailServer(email, options);
}

/**
 * Get user-friendly error message
 * @param result - Email validation result or client validation result
 * @returns string with user-friendly error message
 */
export function getUserFriendlyErrorMessage(result: EmailValidationResult | ClientValidationResult): string {
  if (result.isValid) {
    return 'Email is valid';
  }
  
  // Handle ClientValidationResult
  if ('error' in result && result.error) {
    switch (result.error) {
      case ValidationError.INVALID_FORMAT:
        return 'Please enter a valid email address format (e.g., user@example.com)';
      default:
        return 'Email validation failed. Please try again.';
    }
  }
  
  // Handle EmailValidationResult
  if ('errors' in result && result.errors.length > 0) {
    if (result.errors.includes(ValidationError.RATE_LIMITED)) {
      return 'Too many validation requests. Please try again later.';
    }
    
    if (result.errors.includes(ValidationError.INVALID_FORMAT)) {
      return 'Please enter a valid email address format (e.g., user@example.com)';
    }
    
    if (result.errors.includes(ValidationError.DOMAIN_NOT_FOUND)) {
      return 'The email domain does not exist. Please check the spelling.';
    }
    
    if (result.errors.includes(ValidationError.MAILBOX_NOT_FOUND)) {
      return 'The email address does not exist. Please verify the address.';
    }
    
    if (result.errors.includes(ValidationError.TIMEOUT)) {
      return 'Email validation timed out. Please try again.';
    }
    
    if (result.errors.includes(ValidationError.NETWORK_ERROR)) {
      return 'Network error occurred during validation. Please check your connection.';
    }
  }
  
  return 'Email validation failed. Please try again.';
}

/**
 * Clear the client-side validation cache
 */
export function clearValidationCache(): void {
  clientValidationCache.clear();
}