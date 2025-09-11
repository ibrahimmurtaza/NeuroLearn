'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Navigation from './Navigation'
import LoadingSpinner from './LoadingSpinner'
import { Menu, Bell, Search, User, Settings, LogOut, ChevronDown } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    // Redirect to login if not authenticated and not on a public route
    if (!loading && !user && !isPublicRoute) {
      router.push('/auth/login')
    }
    // Redirect to dashboard if authenticated and on a public route
    else if (!loading && user && isPublicRoute) {
      router.push('/dashboard')
    }
  }, [user, loading, isPublicRoute, router])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show public pages without navigation
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  // Show authenticated layout with navigation
  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        
        {/* Main content area with header and content */}
        <div className="lg:pl-64">
          {/* Top Header */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              type="button"
              className="-m-2.5 p-2.5 text-muted-foreground lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-border lg:hidden" />

            {/* Search */}
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <form className="relative flex flex-1">
                <label htmlFor="search-field" className="sr-only">
                  Search
                </label>
                <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground pl-3" />
                <input
                  id="search-field"
                  className="block h-full w-full border-0 py-0 pl-10 pr-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm"
                  placeholder="Search courses, assignments, or content..."
                  type="search"
                  name="search"
                />
              </form>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <button
                type="button"
                className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground relative"
              >
                <Bell className="h-6 w-6" />
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              {/* Separator */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" />

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="-m-1.5 flex items-center p-1.5 hover:bg-muted rounded-lg transition-colors"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden lg:flex lg:items-center">
                    <span className="ml-4 text-sm font-semibold leading-6 text-foreground">
                      {user?.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown className="ml-2 h-5 w-5 text-muted-foreground" />
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <main className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  return null
}