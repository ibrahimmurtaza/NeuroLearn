# Google OAuth Setup Guide

This guide will help you set up Google OAuth credentials for the calendar integration feature.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "NeuroLearn Calendar Integration")
5. Click "Create"

### 2. Enable the Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on "Google Calendar API" from the results
4. Click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields:
     - App name: "NeuroLearn"
     - User support email: Your email
     - Developer contact information: Your email
   - Click "Save and Continue"
   - Add scopes: `https://www.googleapis.com/auth/calendar.readonly`
   - Click "Save and Continue"
   - Add test users (your email) if needed
   - Click "Save and Continue"

4. Create the OAuth client ID:
   - Application type: "Web application"
   - Name: "NeuroLearn Calendar Integration"
   - Authorized redirect URIs: Add `http://localhost:3000/api/auth/google/callback`
   - Click "Create"

5. Copy the Client ID and Client Secret from the popup

### 4. Update Environment Variables

1. Open your `.env.local` file in the project root
2. Replace the placeholder values with your actual credentials:

```env
# Google OAuth Configuration for Calendar API
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
```

### 5. Restart the Development Server

After updating the environment variables, restart your development server:

```bash
npm run dev
```

## Testing the Integration

1. Navigate to the Calendar page in your application
2. Click "Connect Calendar" and select Google
3. You should be redirected to Google's OAuth consent screen
4. Grant the necessary permissions
5. You should be redirected back to your application with a successful connection

## Troubleshooting

### Common Issues

1. **"The server cannot process the request because it is malformed" (400 error)**
   - This usually means the OAuth credentials are not properly configured
   - Verify that you've replaced all placeholder values in `.env.local`
   - Make sure the redirect URI matches exactly what you configured in Google Cloud Console

2. **"redirect_uri_mismatch" error**
   - The redirect URI in your Google Cloud Console doesn't match the one being used
   - Ensure `http://localhost:3000/api/auth/google/callback` is added to authorized redirect URIs

3. **"access_denied" error**
   - The user denied permission during the OAuth flow
   - Try the connection process again and grant the required permissions

### Production Deployment

When deploying to production:

1. Add your production domain to authorized redirect URIs in Google Cloud Console
2. Update the `GOOGLE_REDIRECT_URI` environment variable to use your production domain
3. Ensure all environment variables are properly set in your production environment

## Security Notes

- Never commit your actual OAuth credentials to version control
- Keep your client secret secure and never expose it in client-side code
- Regularly rotate your credentials if needed
- Use environment-specific credentials for development, staging, and production