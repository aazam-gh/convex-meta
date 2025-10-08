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
        // Always issue refresh tokens & allow re-consent
        accessType: "offline", 
        prompt: "select_account consent",
        // Basic scopes for authentication
        scope: [
          "openid",
          "email", 
          "profile",
        ],
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID as string,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
        configId: process.env.FACEBOOK_CONFIG_ID as string,
        // Facebook scopes for authentication
        scopes: ["email", "public_profile"],
        // Additional fields to retrieve from Facebook
        fields: ["id", "name", "email", "picture"],
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


// Simple test query to verify database connection
export const testDatabaseConnection = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("=== TEST: Database connection test ===");
      
      // Test basic database operations (using system for component tables)
      // @ts-ignore - Component tables exist at runtime
      const userCount = await ctx.db.system.query("user").collect();
      // @ts-ignore - Component tables exist at runtime
      const accountCount = await ctx.db.system.query("account").collect();
      // @ts-ignore - Component tables exist at runtime
      const sessionCount = await ctx.db.system.query("session").collect();
      
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
      
      // @ts-ignore - Component tables exist at runtime
      const allUsers = await ctx.db.system.query("user").collect();
      console.log("All users from db:", allUsers.length, allUsers);
      
      // @ts-ignore - Component tables exist at runtime
      const allAccounts = await ctx.db.system.query("account").collect();
      console.log("All accounts from db:", allAccounts.length, allAccounts);
      
      // @ts-ignore - Component tables exist at runtime
      const allSessions = await ctx.db.system.query("session").collect();
      console.log("All sessions from db:", allSessions.length, allSessions);

      // Additional debugging for the current user
      let currentUserAccounts: any[] = [];
      if (currentUser) {
        console.log("Looking for accounts for user:", currentUser._id);
        // @ts-ignore - Component tables exist at runtime
        currentUserAccounts = await (ctx.db.system as any)
          .query("account")
          .filter((q: any) => q.eq(q.field("userId"), currentUser._id))
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
        currentUserAccounts: currentUserAccounts.map((account: any) => ({
          _id: account._id,
          providerId: account.providerId,
          scope: account.scope,
          hasAccessToken: !!account.accessToken,
          createdAt: account.createdAt
        })),
        allUsers: (allUsers as any[]).map((user: any) => ({
          _id: user._id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        })),
        allAccounts: (allAccounts as any[]).map((account: any) => ({
          _id: account._id,
          userId: account.userId,
          providerId: account.providerId,
          scope: account.scope,
          hasAccessToken: !!account.accessToken,
          createdAt: account.createdAt
        })),
        allSessions: (allSessions as any[]).map((session: any) => ({
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
      const accounts = await (ctx.db.system as any)
        .query("account")
        .filter((q: any) => q.eq(q.field("userId"), user._id))
        .collect();

      return {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name
        },
        accounts: (accounts as any[]).map((account: any) => ({
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
