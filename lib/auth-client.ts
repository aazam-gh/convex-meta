import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});

// Google SSO helper functions
export const signInWithGoogle = async () => {
  return await authClient.signIn.social({
    provider: "google",
  });
};

export const requestGoogleScopes = async (scopes: string[]) => {
  return await authClient.linkSocial({
    provider: "google",
    scopes,
  });
};

// Common Google scopes
export const GOOGLE_SCOPES = {
  DRIVE: ["https://www.googleapis.com/auth/drive.file"],
  CALENDAR: ["https://www.googleapis.com/auth/calendar"],
  GMAIL: ["https://www.googleapis.com/auth/gmail.readonly"],
  CONTACTS: ["https://www.googleapis.com/auth/contacts.readonly"],
} as const;