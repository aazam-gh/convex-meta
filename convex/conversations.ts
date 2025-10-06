import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // For now, return all conversations since this is a multi-tenant system
    // In a real app, you might want to filter by user or organization
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_last_message")
      .order("desc")
      .take(50);

    const conversationsWithCustomers = await Promise.all(
      conversations.map(async (conversation) => {
        const customer = await ctx.db.get(conversation.customerId);
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .order("desc")
          .first();

        return {
          ...conversation,
          customer,
          lastMessage,
        };
      })
    );

    return conversationsWithCustomers;
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const customer = await ctx.db.get(conversation.customerId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    return {
      ...conversation,
      customer,
      messages,
    };
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      customerId: conversation.customerId,
      content: args.content,
      type: args.type || "text",
      sender: "agent",
      channel: conversation.channel,
      timestamp: Date.now(),
      agentId: identity.email!, // Store the agent's email
      isAiGenerated: false,
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    // Add activity log
    await ctx.db.insert("activities", {
      customerId: conversation.customerId,
      type: "message_sent",
      description: `Agent sent a message: ${args.content.substring(0, 50)}...`,
      timestamp: Date.now(),
      agentId: identity.email!, // Store the agent's email
    });

    return messageId;
  },
});

export const sendDummyCustomerMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Insert customer message
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      customerId: conversation.customerId,
      content: args.content,
      type: "text",
      sender: "customer",
      channel: conversation.channel,
      timestamp: Date.now(),
      isAiGenerated: false,
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      unreadCount: conversation.unreadCount + 1,
    });

    // Schedule AI response
    await ctx.scheduler.runAfter(2000, internal.ai.generateAIResponse, {
      conversationId: args.conversationId,
      customerMessage: args.content,
    });

    return "Dummy message sent, AI response will follow shortly";
  },
});

export const storeAIMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    knowledgeSnippets: v.array(v.object({
      content: v.string(),
      source: v.string(),
      relevanceScore: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      customerId: conversation.customerId,
      content: args.content,
      type: "text",
      sender: "ai",
      channel: conversation.channel,
      timestamp: Date.now(),
      isAiGenerated: true,
      knowledgeSnippets: args.knowledgeSnippets,
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    // Add activity log
    await ctx.db.insert("activities", {
      customerId: conversation.customerId,
      type: "message_sent",
      description: `AI generated response: ${args.content.substring(0, 50)}...`,
      timestamp: Date.now(),
    });

    return messageId;
  },
});

export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(args.conversationId, {
      unreadCount: 0,
    });
  },
});
