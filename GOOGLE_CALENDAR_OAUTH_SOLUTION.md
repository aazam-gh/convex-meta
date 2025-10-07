# Google Calendar OAuth Integration Solution

## Current Issue

The Google SSO is requesting calendar permissions, but the calendar component doesn't recognize that the user is already authorized because Better Auth doesn't directly expose the Google access tokens.

## Root Cause

Better Auth handles the OAuth flow internally and doesn't provide direct access to the Google access tokens that are obtained during the sign-in process. This is a common limitation with many OAuth libraries.

## Solutions

### Option 1: Custom OAuth Implementation (Recommended)

Create a custom OAuth flow that captures and stores the Google access token:

1. **Create a custom OAuth endpoint** that handles the Google OAuth flow
2. **Store the access token** in your database with the user's ID
3. **Retrieve the token** when needed for API calls

### Option 2: Use Better Auth with Custom Token Storage

Modify the Better Auth configuration to store tokens in your database:

1. **Add custom hooks** to capture tokens during the OAuth flow
2. **Store tokens** in your Convex database
3. **Retrieve tokens** when making API calls

### Option 3: Use Google's JavaScript API Client

Use Google's official JavaScript client library that handles token management:

1. **Load Google's API client** in the frontend
2. **Use the client's built-in authentication**
3. **Make API calls** directly from the frontend

## Implementation Plan

### Step 1: Create Custom OAuth Flow

```typescript
// app/api/auth/google/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'No authorization code' }, { status: 400 });
  }

  // Exchange code for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.SITE_URL}/api/auth/google/callback`,
    }),
  });

  const tokens = await tokenResponse.json();
  
  // Store tokens in database
  // ... implementation
  
  return NextResponse.redirect('/dashboard');
}
```

### Step 2: Store Tokens in Database

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing tables
  userTokens: defineTable({
    userId: v.id("user"),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.array(v.string()),
  }).index("by_user_provider", ["userId", "provider"]),
});
```

### Step 3: Create Token Management Functions

```typescript
// convex/tokens.ts
export const storeUserToken = mutation({
  args: {
    userId: v.id("user"),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Store token in database
  },
});

export const getUserToken = query({
  args: { userId: v.id("user"), provider: v.string() },
  handler: async (ctx, args) => {
    // Retrieve token from database
  },
});
```

## Current Workaround

For now, the implementation shows sample data to demonstrate the UI functionality. The user can:

1. **Sign in with Google** (which requests calendar permissions)
2. **Click "View Sample Calendar Data"** to see the calendar UI
3. **Navigate through months** to see how the interface works

## Next Steps

1. **Implement custom OAuth flow** to capture real Google tokens
2. **Store tokens securely** in the database
3. **Replace sample data** with real Google Calendar API calls
4. **Add token refresh logic** for long-term access

## Testing the Current Implementation

1. Start the development server: `npm run dev`
2. Navigate to the dashboard and sign in with Google
3. Click on "Google Calendar" in the sidebar
4. Click "View Sample Calendar Data" to see the calendar interface
5. Use month navigation to test the UI functionality

The UI is fully functional and ready for real data integration once the OAuth token capture is implemented.
