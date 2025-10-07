# Better Auth + Convex Implementation Guide

## Overview
This project implements authentication using Better Auth with Convex integration, following the specific patterns required for Convex compatibility.

## Key Differences from Standard Better Auth

### ❌ **What NOT to do with Convex:**
- **Server-side authentication**: Don't use `auth.api.signInEmail()` or similar server methods
- **Server-side session management**: Don't call `auth.api.getSession()` from server functions
- **HTTP response handling**: Convex functions don't return HTTP responses or set cookies
- **Better Auth session for UI state**: Don't use `authClient.useSession()` for UI state management

### ✅ **What TO do with Convex:**
- **Client-side only**: All auth operations must use `authClient.*` methods
- **Convex auth components**: Use `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` for UI state
- **Convex queries for user data**: Use `useQuery(api.auth.getCurrentUser)` instead of session data
- **WebSocket-based**: Convex functions run over websockets, not HTTP

## Implementation Details

### 1. **Authentication Client Setup**
```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()], // Required for Convex compatibility
});
```

### 2. **Sign Up Flow**
```typescript
// app/signup/page.tsx
const { data, error } = await authClient.signUp.email({
  email: formData.email,
  password: formData.password,
  name: formData.name,
  callbackURL: "/dashboard",
}, {
  onRequest: () => setIsLoading(true),
  onSuccess: () => router.push("/dashboard"),
  onError: (ctx) => setError(ctx.error.message),
});
```

### 3. **Sign In Flow**
```typescript
// app/signin/page.tsx
const { data, error } = await authClient.signIn.email({
  email: formData.email,
  password: formData.password,
  callbackURL: "/dashboard",
  rememberMe: formData.rememberMe,
}, {
  onRequest: () => setIsLoading(true),
  onSuccess: () => router.push("/dashboard"),
  onError: (ctx) => setError(ctx.error.message),
});
```

### 4. **Session Management (UI State)**
```typescript
// app/dashboard/page.tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Use Convex auth components for UI state
<Authenticated>
  <DashboardContent />
</Authenticated>
<Unauthenticated>
  <RedirectToSignIn />
</Unauthenticated>
<AuthLoading>
  <LoadingSpinner />
</AuthLoading>

// Get user data from Convex query
const currentUser = useQuery(api.auth.getCurrentUser);
```

### 5. **Authentication State Components**
```typescript
// Use Convex components instead of Better Auth session
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

// These components handle the timing difference between
// Better Auth and Convex authentication validation
```

### 6. **Sign Out Flow**
```typescript
// app/dashboard/page.tsx
const handleSignOut = async () => {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => router.push("/"),
    },
  });
};
```

## File Structure

```
app/
├── signup/page.tsx          # Sign up form
├── signin/page.tsx          # Sign in form  
├── login/page.tsx           # Redirects to signin
├── dashboard/page.tsx       # Protected dashboard
├── page.tsx                 # Landing page with auth status
└── layout.tsx               # Root layout

lib/
└── auth-client.ts           # Better Auth client configuration

convex/
└── auth.ts                  # Better Auth server configuration
```

## Session Structure

The session object returned by `authClient.useSession()` has this structure:

```typescript
{
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    userId?: string | null;
  };
  session: {
    // Session details
  };
}
```

## Error Handling

All authentication operations include proper error handling:

1. **Client-side validation**: Password length, email format, etc.
2. **Better Auth errors**: Captured via `onError` callbacks
3. **Network errors**: Try-catch blocks for unexpected errors
4. **Loading states**: Visual feedback during operations

## Security Considerations

1. **Client-side only**: All auth operations happen in the browser
2. **Session persistence**: Handled automatically by Better Auth
3. **CSRF protection**: Built into Better Auth
4. **Password requirements**: Minimum 8 characters (configurable)

## Testing the Implementation

1. **Start development server**: `npm run dev`
2. **Visit landing page**: `http://localhost:3000/`
3. **Test sign up**: Create new account
4. **Test sign in**: Authenticate existing user
5. **Test dashboard**: Access protected area
6. **Test sign out**: Return to landing page

## Troubleshooting

### Common Issues:
1. **Session undefined**: Use `useSession()` hook instead of `getSession()`
2. **Redirect loops**: Check session state management
3. **CORS errors**: Verify `baseURL` configuration
4. **Type errors**: Ensure proper TypeScript types for session

### Debug Tips:
- Check browser console for session data
- Verify network requests in DevTools
- Check Convex dashboard for auth-related logs
