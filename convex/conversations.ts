import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
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

    // Schedule AI response with lead agent enabled
    await ctx.scheduler.runAfter(2000, internal.ai.generateAIResponse, {
      conversationId: args.conversationId,
      customerMessage: args.content,
      useLeadAgent: true,
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

export const createTestConversation = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Create customer
    const customerId = await ctx.db.insert("customers", {
      name: args.customerName,
      email: args.customerEmail || `${args.customerName.toLowerCase().replace(' ', '.')}@example.com`,
      phone: "+1234567890",
      channels: ["ai_chat"],
      tags: ["test"],
      lastActivity: Date.now(),
    });

    // Create conversation
    const conversationId = await ctx.db.insert("conversations", {
      customerId,
      channel: "ai_chat",
      status: "open",
      lastMessageAt: Date.now(),
      unreadCount: 0,
    });

    // Create initial customer message
    await ctx.db.insert("messages", {
      conversationId,
      customerId,
      content: "Hi, I'm interested in learning more about your services.",
      type: "text",
      sender: "customer",
      channel: "ai_chat",
      timestamp: Date.now(),
      isAiGenerated: false,
    });

    // Schedule AI response to trigger lead creation
    await ctx.scheduler.runAfter(1000, internal.ai.generateAIResponse, {
      conversationId,
      customerMessage: "Hi, I'm interested in learning more about your services.",
      useLeadAgent: true,
    });

    return conversationId;
  },
});

// Internal version of getConversation for use by internal actions
export const internalGetConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      customerId: v.id("customers"),
      channel: v.string(),
      status: v.string(),
      subject: v.optional(v.string()),
      lastMessageAt: v.number(),
      unreadCount: v.number(),
      assignedAgent: v.optional(v.string()),
      _creationTime: v.number(),
      customer: v.union(
        v.object({
          _id: v.id("customers"),
          name: v.string(),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
          avatar: v.optional(v.string()),
          notes: v.optional(v.string()),
          channels: v.array(v.string()),
          tags: v.array(v.string()),
          lastActivity: v.number(),
          _creationTime: v.number(),
        }),
        v.null()
      ),
      messages: v.array(v.object({
        _id: v.id("messages"),
        conversationId: v.id("conversations"),
        content: v.string(),
        sender: v.string(),
        timestamp: v.number(),
        metadata: v.optional(v.any()),
        knowledgeSnippets: v.optional(v.array(v.any())),
        _creationTime: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
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

// Internal function to create a test conversation without authentication
export const createInternalTestConversation = internalMutation({
  args: {
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    // Create customer
    const customerId = await ctx.db.insert("customers", {
      name: args.customerName,
      email: args.customerEmail,
      phone: "",
      avatar: "",
      notes: "",
      channels: ["test"],
      tags: ["test"],
      lastActivity: Date.now(),
    });

    // Create conversation
    const conversationId = await ctx.db.insert("conversations", {
      customerId,
      channel: "test",
      status: "active",
      subject: "Test Conversation",
      lastMessageAt: Date.now(),
      unreadCount: 0,
    });

    // Schedule AI response to trigger lead creation
    await ctx.scheduler.runAfter(1000, internal.ai.generateAIResponse, {
      conversationId,
      customerMessage: "Hi, I'm interested in learning more about your services.",
      useLeadAgent: true,
    });

    return conversationId;
  },
});
