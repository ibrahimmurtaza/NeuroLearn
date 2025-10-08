import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if email exists in auth.users table
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('Error checking email existence:', error)
      return NextResponse.json(
        { error: 'Failed to check email existence' },
        { status: 500 }
      )
    }

    // Check if any user has this email
    const emailExists = data.users.some(user => user.email === email)

    return NextResponse.json({
      exists: emailExists
    })

  } catch (error) {
    console.error('Error in check-email API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}