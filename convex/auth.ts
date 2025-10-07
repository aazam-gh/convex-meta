import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    trustedOrigins: [
      "http://localhost:3000", // Frontend URL
    ],
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    // Configure Google SSO
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        accessType: "offline", 
        prompt: "select_account consent",
        scope: [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/calendar"
        ],
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

// Get Google access token for the current user
export const getGoogleAccessToken = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }

    try {
      // Get user accounts to find Google account
      const accounts = await ctx.db
        .query("account")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("providerId"), "google"))
        .collect();

      const googleAccount = accounts.find(account => account.providerId === "google");
      
      console.log("Google account for token:", googleAccount ? {
        providerId: googleAccount.providerId,
        hasAccessToken: !!googleAccount.accessToken,
        scope: googleAccount.scope
      } : "No Google account found");
      
      if (googleAccount && googleAccount.accessToken) {
        return googleAccount.accessToken;
      }

      return null;
    } catch (error) {
      console.error("Error getting Google access token:", error);
      return null;
    }
  },
});

// Simple test query to verify database connection
export const testDatabaseConnection = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("=== TEST: Database connection test ===");
      
      // Test basic database operations
      const userCount = await ctx.db.query("user").collect();
      const accountCount = await ctx.db.query("account").collect();
      const sessionCount = await ctx.db.query("session").collect();
      
      console.log("Direct query results:", {
        users: userCount.length,
        accounts: accountCount.length,
        sessions: sessionCount.length
      });
      
      // Test if we can access the account data directly
      if (accountCount.length > 0) {
        console.log("First account:", accountCount[0]);
      }
      
      return {
        success: true,
        userCount: userCount.length,
        accountCount: accountCount.length,
        sessionCount: sessionCount.length,
        firstAccount: accountCount.length > 0 ? accountCount[0] : null
      };
    } catch (error) {
      console.error("Database connection test failed:", error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Test mutation to verify we can write to the database
export const testDatabaseWrite = mutation({
  args: {},
  handler: async (ctx: any) => {
    try {
      console.log("=== TEST: Database write test ===");
      
      // Try to insert a test record
      const testId = await ctx.db.insert("numbers", { value: 12345 });
      console.log("Inserted test record with ID:", testId);
      
      // Try to read it back
      const testRecord = await ctx.db.get(testId);
      console.log("Retrieved test record:", testRecord);
      
      // Clean up
      await ctx.db.delete(testId);
      console.log("Cleaned up test record");
      
      return {
        success: true,
        testId,
        testRecord
      };
    } catch (error) {
      console.error("Database write test failed:", error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Debug query to see all users and accounts
export const debugAllUsersAndAccounts = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("=== DEBUG: Starting debugAllUsersAndAccounts ===");
      
      const currentUser = await authComponent.getAuthUser(ctx);
      console.log("Current user from authComponent:", currentUser);
      
      const allUsers = await ctx.db.query("user").collect();
      console.log("All users from db:", allUsers.length, allUsers);
      
      const allAccounts = await ctx.db.query("account").collect();
      console.log("All accounts from db:", allAccounts.length, allAccounts);
      
      const allSessions = await ctx.db.query("session").collect();
      console.log("All sessions from db:", allSessions.length, allSessions);

      // Additional debugging for the current user
      let currentUserAccounts: any[] = [];
      if (currentUser) {
        console.log("Looking for accounts for user:", currentUser._id);
        currentUserAccounts = await ctx.db
          .query("account")
          .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
          .collect();
        console.log("Current user accounts found:", currentUserAccounts.length, currentUserAccounts);
      }

      const result = {
        currentUser: currentUser ? {
          _id: currentUser._id,
          email: currentUser.email,
          name: currentUser.name,
          createdAt: currentUser.createdAt
        } : null,
        currentUserAccounts: currentUserAccounts.map(account => ({
          _id: account._id,
          providerId: account.providerId,
          scope: account.scope,
          hasAccessToken: !!account.accessToken,
          createdAt: account.createdAt
        })),
        allUsers: allUsers.map(user => ({
          _id: user._id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        })),
        allAccounts: allAccounts.map(account => ({
          _id: account._id,
          userId: account.userId,
          providerId: account.providerId,
          scope: account.scope,
          hasAccessToken: !!account.accessToken,
          createdAt: account.createdAt
        })),
        allSessions: allSessions.map(session => ({
          _id: session._id,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt
        }))
      };
      
      console.log("=== DEBUG: Final result ===", result);
      return result;
    } catch (error) {
      console.error("Error getting all users and accounts:", error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Debug query to see account data
export const debugUserAccount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return { user: null, accounts: [] };
    }

    try {
      const accounts = await ctx.db
        .query("account")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      return {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name
        },
        accounts: accounts.map(account => ({
          _id: account._id,
          providerId: account.providerId,
          scope: account.scope,
          scopeArray: account.scope ? account.scope.split(',').map((s: string) => s.trim()) : [],
          accessToken: account.accessToken ? "***" : null,
          refreshToken: account.refreshToken ? "***" : null
        }))
      };
    } catch (error) {
      console.error("Error getting user account data:", error);
      return { user: null, accounts: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Check if user has Google Calendar scope
export const hasGoogleCalendarScope = query({
  args: {},
  handler: async (ctx) => {
    console.log("=== DEBUG: hasGoogleCalendarScope called ===");
    
    const user = await authComponent.getAuthUser(ctx);
    console.log("User from authComponent:", user);
    
    if (!user) {
      console.log("No user found, returning false");
      return false;
    }

    try {
      // Get user accounts to find Google account
      console.log("Looking for accounts for user:", user._id);
      const accounts = await ctx.db
        .query("account")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("providerId"), "google"))
        .collect();

      console.log("All accounts for user:", accounts.length, accounts);

      const googleAccount = accounts.find(account => account.providerId === "google");
      
      console.log("Google account found:", googleAccount ? {
        providerId: googleAccount.providerId,
        scope: googleAccount.scope,
        hasAccessToken: !!googleAccount.accessToken
      } : "No Google account found");
      
      if (googleAccount && googleAccount.scope) {
        // Scope is stored as a comma-separated string
        const scopeArray = googleAccount.scope.split(',').map((s: string) => s.trim());
        const hasCalendarScope = scopeArray.includes("https://www.googleapis.com/auth/calendar");
        console.log("Calendar scope check:", { 
          scope: googleAccount.scope, 
          scopeArray, 
          hasCalendarScope 
        });
        return hasCalendarScope;
      }

      console.log("No Google account or scope found, returning false");
      return false;
    } catch (error) {
      console.error("Error checking Google Calendar scope:", error);
      return false;
    }
  },
});