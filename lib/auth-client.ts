import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});

// Google SSO helper function
export const signInWithGoogle = async () => {
  return await authClient.signIn.social({
    provider: "google",
  });
};

// Facebook SSO helper function
export const signInWithFacebook = async () => {
  return await authClient.signIn.social({
    provider: "facebook",
  });
};