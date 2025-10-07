# Google SSO Integration Setup

This document explains how to set up Google SSO for your Convex Meta application.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Google OAuth Configuration
# Get these from Google Cloud Console: https://console.cloud.google.com/apis/dashboard
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Convex Configuration
CONVEX_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
```

## Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client IDs
5. Set the application type to "Web application"
6. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your environment variables

## Features Configured

- **Always get refresh token**: Configured with `accessType: "offline"`
- **Always ask to select account**: Configured with `prompt: "select_account consent"`
- **Additional scopes support**: Can request additional Google scopes using `linkSocial`

## Usage

The Google SSO integration is now configured in your Better Auth setup. Users can sign in using:

```typescript
import { authClient } from "@/lib/auth-client";

// Sign in with Google
const signInWithGoogle = async () => {
  const data = await authClient.signIn.social({
    provider: "google",
  });
};

// Request additional Google scopes (e.g., Google Drive)
const requestGoogleDriveAccess = async () => {
  await authClient.linkSocial({
    provider: "google",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
};
```

## Next Steps

1. Set up your Google Cloud Console project
2. Add the environment variables to your `.env.local` file
3. Test the Google SSO integration
4. Deploy with production redirect URIs
