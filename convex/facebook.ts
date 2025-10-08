// convex/facebook.ts
import { mutation, query, action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { authComponent } from "./auth";

export const storeFacebookMessage = mutation({
  args: {
    senderId: v.string(),
    recipientId: v.string(),
    text: v.string(),
    timestamp: v.number(),
    mid: v.string(),
    conversationId: v.optional(v.string()),
    senderName: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      type: v.string(),
      url: v.optional(v.string()),
      title: v.optional(v.string()),
    }))),
    isFromPage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("facebookMessages")
      .withIndex("by_mid", (q) => q.eq("mid", args.mid))
      .unique();
    if (existing) {
      return; // dedupe by mid
    }
    await ctx.db.insert("facebookMessages", args);
  },
});

export const replyToFacebookMessage = action({
    args: {
      recipientId: v.string(), // PSID
      text: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, { recipientId, text }) => {
      const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN!;

      const res = await fetch(
        `https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text },
          }),
        }
      );
      const data = await res.json();

      if (data.message_id) {
        await ctx.runMutation(api.facebook.storeFacebookMessage, {
          senderId: "PAGE",
          recipientId,
          text,
          timestamp: Date.now(),
          mid: data.message_id,
        });
      }
      return null;
    },
  });

export const listMessages = query({
    args: {
      limit: v.optional(v.number()), // optional limit for pagination
    },
    handler: async (ctx, args) => {
      const messages = await ctx.db
        .query("facebookMessages")
        .order("desc") // newest first
        .take(args.limit ?? 50);
  
      return messages;
    },
  });

// Facebook Pages API Integration

/**
 * Get the current user's Facebook access token
 */
export const getCurrentUserFacebookToken = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }

    try {
      // @ts-ignore - Component tables exist at runtime
      const accounts = await (ctx.db.system as any)
        .query("account")
        .filter((q: any) => q.eq(q.field("userId"), user._id))
        .filter((q: any) => q.eq(q.field("providerId"), "facebook"))
        .collect();

      if (accounts.length === 0) {
        return null;
      }

      return accounts[0].accessToken || null;
    } catch (error) {
      console.error("Error getting Facebook access token:", error);
      return null;
    }
  },
});

/**
 * Get user's Facebook pages using their access token
 */
export const getUserPages = action({
  args: {
    userAccessToken: v.string(),
  },
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    category: v.optional(v.string()),
    access_token: v.string(),
    tasks: v.array(v.string()),
  })),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?access_token=${args.userAccessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching user pages:", error);
      throw error;
    }
  },
});

/**
 * Get current user's Facebook pages (convenience function)
 */
export const getCurrentUserPages = action({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    name: v.string(),
    category: v.optional(v.string()),
    access_token: v.string(),
    tasks: v.array(v.string()),
  })),
  handler: async (ctx, args): Promise<Array<{
    id: string;
    name: string;
    category?: string;
    access_token: string;
    tasks: string[];
  }>> => {
    const userToken: string | null = await ctx.runQuery(api.facebook.getCurrentUserFacebookToken, {});
    if (!userToken) {
      throw new Error("User not authenticated with Facebook");
    }

    return await ctx.runAction(api.facebook.getUserPages, {
      userAccessToken: userToken,
    });
  },
});

/**
 * Get page access token for a specific page
 */
export const getPageAccessToken = action({
  args: {
    pageId: v.string(),
    userAccessToken: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${args.pageId}?fields=access_token&access_token=${args.userAccessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error getting page access token:", error);
      throw error;
    }
  },
});

/**
 * Fetch conversations from Facebook Pages API using user access token
 */
export const fetchPageConversations = action({
  args: {
    pageId: v.string(),
    userAccessToken: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    id: v.string(),
    participants: v.array(v.object({
      id: v.string(),
      name: v.optional(v.string()),
    })),
    updated_time: v.string(),
    message_count: v.number(),
  })),
  handler: async (ctx, args): Promise<Array<{
    id: string;
    participants: Array<{
      id: string;
      name?: string;
    }>;
    updated_time: string;
    message_count: number;
  }>> => {
    const limit = args.limit || 25;

    try {
      // First get the page access token
      const pageAccessToken: string = await ctx.runAction(api.facebook.getPageAccessToken, {
        pageId: args.pageId,
        userAccessToken: args.userAccessToken,
      });

      const response: Response = await fetch(
        `https://graph.facebook.com/v23.0/${args.pageId}/conversations?fields=id,participants,updated_time,message_count&limit=${limit}&access_token=${pageAccessToken}`
      );

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: any = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching Facebook conversations:", error);
      throw error;
    }
  },
});

/**
 * Fetch messages from a specific Facebook conversation
 */
export const fetchConversationMessages = action({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
    before: v.optional(v.string()), // for pagination
  },
  returns: v.object({
    messages: v.array(v.object({
      id: v.string(),
      message: v.optional(v.string()),
      from: v.object({
        id: v.string(),
        name: v.optional(v.string()),
      }),
      to: v.object({
        data: v.array(v.object({
          id: v.string(),
          name: v.optional(v.string()),
        })),
      }),
      created_time: v.string(),
      attachments: v.optional(v.array(v.object({
        type: v.string(),
        url: v.optional(v.string()),
        title: v.optional(v.string()),
      }))),
    })),
    paging: v.optional(v.object({
      cursors: v.object({
        before: v.optional(v.string()),
        after: v.optional(v.string()),
      }),
      next: v.optional(v.string()),
      previous: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!PAGE_ACCESS_TOKEN) {
      throw new Error("Facebook Page Access Token not configured");
    }

    const limit = args.limit || 50;
    let url = `https://graph.facebook.com/v23.0/${args.conversationId}/messages?fields=id,message,from,to,created_time,attachments{type,url,title}&limit=${limit}&access_token=${PAGE_ACCESS_TOKEN}`;
    
    if (args.before) {
      url += `&before=${args.before}`;
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        messages: data.data || [],
        paging: data.paging,
      };
    } catch (error) {
      console.error("Error fetching Facebook conversation messages:", error);
      throw error;
    }
  },
});

/**
 * Sync Facebook page messages to local database
 */
export const syncPageMessages = action({
  args: {
    pageId: v.optional(v.string()),
    userAccessToken: v.string(),
    conversationLimit: v.optional(v.number()),
    messageLimit: v.optional(v.number()),
  },
  returns: v.object({
    conversationsProcessed: v.number(),
    messagesProcessed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!PAGE_ACCESS_TOKEN) {
      throw new Error("Facebook Page Access Token not configured");
    }

    let conversationsProcessed = 0;
    let messagesProcessed = 0;
    const errors: string[] = [];

    try {
      // Fetch conversations
      const conversations = await ctx.runAction(api.facebook.fetchPageConversations, {
        pageId: args.pageId || "me",
        userAccessToken: args.userAccessToken,
        limit: args.conversationLimit || 10,
      });

      for (const conversation of conversations) {
        try {
          // Fetch messages for each conversation
          const messageData = await ctx.runAction(api.facebook.fetchConversationMessages, {
            conversationId: conversation.id,
            limit: args.messageLimit || 50,
          });

          // Store messages in database
          for (const message of messageData.messages) {
            if (message.message) {
              await ctx.runMutation(api.facebook.storeFacebookMessage, {
                senderId: message.from.id,
                recipientId: message.to.data[0]?.id || "unknown",
                text: message.message,
                timestamp: new Date(message.created_time).getTime(),
                mid: message.id,
                conversationId: conversation.id,
                senderName: message.from.name,
                recipientName: message.to.data[0]?.name,
                attachments: message.attachments,
                isFromPage: message.from.id === "PAGE" || message.from.id.startsWith("page_"),
              });
              messagesProcessed++;
            }
          }

          conversationsProcessed++;
        } catch (conversationError) {
          const errorMsg = `Error processing conversation ${conversation.id}: ${conversationError}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      return {
        conversationsProcessed,
        messagesProcessed,
        errors,
      };
    } catch (error) {
      const errorMsg = `Error syncing Facebook messages: ${error}`;
      errors.push(errorMsg);
      console.error(errorMsg);
      return {
        conversationsProcessed,
        messagesProcessed,
        errors,
      };
    }
  },
});

/**
 * Get page information
 */
export const getPageInfo = action({
  args: {
    pageId: v.optional(v.string()),
  },
  returns: v.object({
    id: v.string(),
    name: v.string(),
    category: v.optional(v.string()),
    access_token: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!PAGE_ACCESS_TOKEN) {
      throw new Error("Facebook Page Access Token not configured");
    }

    const pageId = args.pageId || "me";

    try {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${pageId}?fields=id,name,category,access_token&access_token=${PAGE_ACCESS_TOKEN}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        category: data.category,
        access_token: data.access_token,
      };
    } catch (error) {
      console.error("Error fetching page info:", error);
      throw error;
    }
  },
});

/**
 * Send a message to a specific user via Facebook Pages API
 */
export const sendPageMessage = action({
  args: {
    recipientId: v.string(), // PSID
    text: v.string(),
    pageId: v.optional(v.string()),
  },
  returns: v.object({
    message_id: v.string(),
    success: v.boolean(),
  }),
  handler: async (ctx, { recipientId, text, pageId }) => {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!PAGE_ACCESS_TOKEN) {
      throw new Error("Facebook Page Access Token not configured");
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Facebook API error: ${data.error?.message || response.statusText}`);
      }

      if (data.message_id) {
        // Store the sent message in our database
        await ctx.runMutation(api.facebook.storeFacebookMessage, {
          senderId: pageId || "PAGE",
          recipientId,
          text,
          timestamp: Date.now(),
          mid: data.message_id,
          isFromPage: true,
        });

        return {
          message_id: data.message_id,
          success: true,
        };
      }

      throw new Error("No message ID returned from Facebook API");
    } catch (error) {
      console.error("Error sending Facebook message:", error);
      throw error;
    }
  },
});

/**
 * Get messages by conversation ID
 */
export const getMessagesByConversation = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("facebookMessages"),
    _creationTime: v.number(),
    senderId: v.string(),
    recipientId: v.string(),
    text: v.string(),
    timestamp: v.number(),
    mid: v.string(),
    conversationId: v.optional(v.string()),
    senderName: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      type: v.string(),
      url: v.optional(v.string()),
      title: v.optional(v.string()),
    }))),
    isFromPage: v.optional(v.boolean()),
  })),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("facebookMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(args.limit ?? 50);

    return messages;
  },
});

/**
 * Get conversation participants
 */
export const getConversationParticipants = query({
  args: {
    conversationId: v.string(),
  },
  returns: v.array(v.object({
    senderId: v.string(),
    senderName: v.optional(v.string()),
    messageCount: v.number(),
    lastMessageTime: v.number(),
  })),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("facebookMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Group by sender
    const participants = new Map();
    
    for (const message of messages) {
      const senderId = message.senderId;
      if (!participants.has(senderId)) {
        participants.set(senderId, {
          senderId,
          senderName: message.senderName,
          messageCount: 0,
          lastMessageTime: 0,
        });
      }
      
      const participant = participants.get(senderId);
      participant.messageCount++;
      participant.lastMessageTime = Math.max(participant.lastMessageTime, message.timestamp);
    }

    return Array.from(participants.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  },
});

/**
 * Get recent conversations with message counts
 */
export const getRecentConversations = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    conversationId: v.string(),
    participants: v.array(v.object({
      senderId: v.string(),
      senderName: v.optional(v.string()),
    })),
    lastMessage: v.optional(v.object({
      text: v.string(),
      timestamp: v.number(),
      senderName: v.optional(v.string()),
    })),
    messageCount: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    
    // Get all messages grouped by conversation
    const allMessages = await ctx.db
      .query("facebookMessages")
      .filter((q) => q.neq(q.field("conversationId"), undefined))
      .collect();

    const conversations = new Map();

    for (const message of allMessages) {
      const convId = message.conversationId!;
      
      if (!conversations.has(convId)) {
        conversations.set(convId, {
          conversationId: convId,
          participants: new Map(),
          lastMessage: null,
          messageCount: 0,
        });
      }

      const conv = conversations.get(convId);
      conv.messageCount++;

      // Track participants
      if (!conv.participants.has(message.senderId)) {
        conv.participants.set(message.senderId, {
          senderId: message.senderId,
          senderName: message.senderName,
        });
      }

      // Update last message
      if (!conv.lastMessage || message.timestamp > conv.lastMessage.timestamp) {
        conv.lastMessage = {
          text: message.text,
          timestamp: message.timestamp,
          senderName: message.senderName,
        };
      }
    }

    // Convert to array and sort by last message time
    return Array.from(conversations.values())
      .map(conv => ({
        ...conv,
        participants: Array.from(conv.participants.values()),
      }))
      .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0))
      .slice(0, limit);
  },
});

  