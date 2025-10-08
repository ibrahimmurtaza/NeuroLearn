'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, EyeOff, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { validateEmailBasic } from '@/lib/emailValidation'

export default function LoginPage() {
  const { signIn, user, profile, profileExists, profileLoading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)

  // Handle redirection after successful login
  useEffect(() => {
    if (loginSuccess && user && !profileLoading) {
      // Determine the user's role with priority order
      const effectiveRole = profile?.role || user.user_metadata?.role || user.user_metadata?.user_role || 'student'

      // All users now go to the same routes with conditional rendering
      if (profileExists) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }

      setLoginSuccess(false)
    } else {
      // Add timeout fallback for stuck profileLoading
      if (loginSuccess && profileLoading && user) {
        const timeoutId = setTimeout(() => {
          // Check if we're still in the same state
          if (loginSuccess && user && profileLoading) {
            // Force redirect based on user metadata if profile is still loading
            const fallbackRole = user.user_metadata?.role || user.user_metadata?.user_role || 'student'
            
            // All users go to onboarding if profile is still loading
            router.push('/onboarding')
            setLoginSuccess(false)
          }
        }, 2000)
        
        // Store timeout ID to clear it if normal redirect happens
        return () => clearTimeout(timeoutId)
      }
    }
  }, [loginSuccess, user, profile, profileExists, profileLoading, router])

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    setEmailTouched(true)

    if (newEmail && newEmail.includes('@')) {
      const isValid = validateEmailBasic(newEmail)
      setEmailValid(isValid)
    } else {
      setEmailValid(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (emailValid === false) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message || 'Failed to sign in')
      setLoading(false)
    } else {
      setLoginSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <span className="text-2xl font-bold text-primary-foreground">N</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">NeuroLearn</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    className={`pl-10 pr-10 ${
                      emailTouched && emailValid !== null
                        ? emailValid
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailTouched && emailValid !== null && (
                      emailValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )
                    )}
                  </div>
                </div>
                {emailTouched && emailValid === false && (
                  <p className="text-sm text-red-500 mt-1">
                    Please enter a valid email address
                  </p>
                )}
                {emailTouched && emailValid === true && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Email format is valid
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {/* Remember Me + Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="remember" className="text-sm text-muted-foreground">
                    Remember me
                  </label>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center mb-2">Demo Credentials:</p>
          <p className="text-xs text-muted-foreground text-center">
            Email: demo@neurolearn.com<br />
            Password: demo123
          </p>
        </div>
      </div>
    </div>
  )
}
