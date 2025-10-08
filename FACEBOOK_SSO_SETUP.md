# Facebook SSO Setup Guide

This guide explains how to set up Facebook authentication for your Convex application using Better Auth.

## Prerequisites

- A Facebook Developer account
- Your Convex application already set up with Better Auth
- Google SSO already configured (for reference)

## Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" as the app type
4. Fill in your app details:
   - App Name: Your application name
   - App Contact Email: Your email
   - App Purpose: Select appropriate purpose

## Step 2: Configure Facebook App Settings

1. In your Facebook App dashboard, go to "Settings" → "Basic"
2. Add your domain to "App Domains"
3. Add your site URL to "Website" section
4. Note down your **App ID** and **App Secret**

## Step 3: Configure OAuth Settings

1. Go to "Products" → "Facebook Login" → "Settings"
2. Add your OAuth redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/facebook`
   - For production: `https://yourdomain.com/api/auth/callback/facebook`
3. Add your site URL to "Valid OAuth Redirect URIs"

## Step 4: Set Environment Variables

Add the following environment variables to your `.env.local` file:

```env
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

## Step 5: Update Convex Environment

Add the environment variables to your Convex deployment:

```bash
npx convex env set FACEBOOK_CLIENT_ID your_facebook_app_id
npx convex env set FACEBOOK_CLIENT_SECRET your_facebook_app_secret
```

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/signin` or `/signup`
3. You should see both Google and Facebook sign-in buttons
4. Test the Facebook authentication flow

## Implementation Details

### Files Modified/Created

1. **`convex/auth.ts`** - Added Facebook provider configuration
2. **`lib/auth-client.ts`** - Added `signInWithFacebook` helper function
3. **`components/FacebookSignIn.tsx`** - New Facebook sign-in component
4. **`app/signin/page.tsx`** - Added Facebook sign-in option
5. **`app/signup/page.tsx`** - Added Facebook sign-in option

### Facebook Provider Configuration

```typescript
facebook: {
  clientId: process.env.FACEBOOK_CLIENT_ID as string,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
  scope: [
    "email",
    "public_profile",
  ],
},
```

### Facebook Sign-In Component

The `FacebookSignIn` component provides:
- Facebook branding and styling
- Loading states
- Error handling
- Success callbacks

## Troubleshooting

### Common Issues

1. **"App Not Setup" Error**
   - Ensure your Facebook app is in "Live" mode
   - Check that your domain is added to App Domains
   - Verify OAuth redirect URIs are correct

2. **"Invalid OAuth Redirect URI" Error**
   - Double-check the redirect URI in Facebook app settings
   - Ensure the URI matches exactly (including protocol and trailing slashes)

3. **"App Secret" Error**
   - Verify the App Secret is correct in your environment variables
   - Make sure there are no extra spaces or characters

4. **CORS Issues**
   - Ensure your site URL is added to the Facebook app's Website section
   - Check that your domain is in the App Domains list

### Testing Checklist

- [ ] Facebook app created and configured
- [ ] Environment variables set correctly
- [ ] OAuth redirect URIs configured
- [ ] App is in Live mode (for production)
- [ ] Sign-in buttons appear on login/signup pages
- [ ] Facebook authentication flow works
- [ ] User data is properly stored in Convex
- [ ] User can access dashboard after Facebook login

## Security Considerations

1. **App Secret**: Never expose your Facebook App Secret in client-side code
2. **HTTPS**: Always use HTTPS in production
3. **Domain Validation**: Ensure your domains are properly configured in Facebook
4. **Token Validation**: Better Auth handles token validation automatically

## Additional Resources

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Better Auth Social Providers](https://www.better-auth.com/docs/guides/social-providers)
- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables)
