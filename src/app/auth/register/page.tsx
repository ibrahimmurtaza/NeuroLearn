'use client'

import { useState } from 'react'
import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, EyeOff, Mail, Lock, User, Check, CheckCircle, AlertCircle, BookOpen, GraduationCap } from 'lucide-react'
import { validateEmailWithExistenceCheck, getUserFriendlyErrorMessage, EmailValidationResult } from '@/lib/emailValidation'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' // Default to student
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailValidation, setEmailValidation] = useState<EmailValidationResult | null>(null)
  const [emailValidating, setEmailValidating] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRoleChange = (role: 'student' | 'tutor') => {
    setFormData({
      ...formData,
      role
    })
  }

  // Add ref to track the latest validation request
  const validationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const validationAbortControllerRef = React.useRef<AbortController | null>(null)

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setFormData(prev => ({ ...prev, email: newEmail }))
    setEmailTouched(true)
    
    // Clear any existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }
    
    // Abort any ongoing validation request
    if (validationAbortControllerRef.current) {
      validationAbortControllerRef.current.abort()
    }
    
    if (newEmail && newEmail.includes('@')) {
      setEmailValidating(true)
      
      // Debounce the validation by 500ms
      validationTimeoutRef.current = setTimeout(async () => {
        try {
          // Create new abort controller for this request
          const abortController = new AbortController()
          validationAbortControllerRef.current = abortController
          
          // For registration, use full validation with existence check
          const result = await validateEmailWithExistenceCheck(newEmail, {
            checkExists: true,
            checkDomain: true,
            checkMailbox: true
          })
          
          // Only update state if this request wasn't aborted
          if (!abortController.signal.aborted) {
            setEmailValidation(result)
            setEmailValidating(false)
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Email validation error:', error)
            setEmailValidation({
              isValid: false,
              errors: ['Validation failed'],
              warnings: [],
              validationSteps: { format: false, domain: false, mailbox: false },
              processingTime: 0
            })
          }
          setEmailValidating(false)
        }
      }, 500)
    } else {
      setEmailValidation(null)
      setEmailValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate email first
    if (emailValidation && !emailValidation.isValid) {
      setError(getUserFriendlyErrorMessage(emailValidation))
      setLoading(false)
      return
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const { error } = await signUp(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`, formData.role)
      
      if (error) {
        // Check for duplicate email error
        if (error.message?.includes('User already registered') || 
            error.message?.includes('already registered') ||
            error.message?.includes('already exists') ||
            error.code === 'user_already_exists') {
          setError('An account with this email already exists. Please try logging in instead.')
        } else {
          setError(error.message || 'Failed to create account')
        }
      } else {
        setSuccess('Account created successfully! Please check your email to verify your account.')
        // Optionally redirect after a delay
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    } catch (err: any) {
      // Fallback error handling
      if (err.message?.includes('User already registered') || 
          err.message?.includes('already registered') ||
          err.message?.includes('already exists')) {
        setError('An account with this email already exists. Please try logging in instead.')
      } else {
        setError(err.message || 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <span className="text-2xl font-bold text-primary-foreground">N</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">NeuroLearn</h1>
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Get started</CardTitle>
            <CardDescription className="text-center">
              Create your account to start learning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                  {error.includes('An account with this email already exists') && (
                    <div className="mt-2">
                      <Link 
                        href="/auth/login" 
                        className="text-primary hover:underline font-medium"
                      >
                        Go to login page →
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {success && (
                <div className="p-3 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md dark:text-green-400 dark:bg-green-900/20 dark:border-green-800">
                  {success}
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  I want to join as a
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('student')}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                      formData.role === 'student'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <BookOpen className="h-6 w-6" />
                      <span className="font-medium">Student</span>
                      <span className="text-xs text-center">Learn and grow with personalized education</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleRoleChange('tutor')}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                      formData.role === 'tutor'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <GraduationCap className="h-6 w-6" />
                      <span className="font-medium">Tutor</span>
                      <span className="text-xs text-center">Share knowledge and teach students</span>
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                    className={`pl-10 pr-10 ${
                      emailTouched && emailValidation
                        ? emailValidation.isValid
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailValidating && (
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    )}
                    {!emailValidating && emailTouched && emailValidation && (
                      emailValidation.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )
                    )}
                  </div>
                </div>
                {emailTouched && emailValidation && !emailValidation.isValid && (
                  <p className="text-sm text-red-500 mt-1">
                    {getUserFriendlyErrorMessage(emailValidation)}
                  </p>
                )}
                {emailTouched && emailValidation && emailValidation.isValid && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Email verified and deliverable
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  id="terms"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  required
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}