import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Create sample customers
    const customer1 = await ctx.db.insert("customers", {
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      channels: ["whatsapp"],
      tags: ["VIP", "Premium"],
      notes: "Prefers WhatsApp communication. Very responsive customer.",
      lastActivity: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    });

    const customer2 = await ctx.db.insert("customers", {
      name: "Michael Chen",
      email: "m.chen@company.com",
      phone: "+1 (555) 987-6543",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      channels: ["messenger", "sms"],
      tags: ["Enterprise"],
      notes: "Technical contact for enterprise account.",
      lastActivity: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    });

    const customer3 = await ctx.db.insert("customers", {
      name: "Emma Rodriguez",
      email: "emma.r@startup.io",
      phone: "+1 (555) 456-7890",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      channels: ["sms"],
      tags: ["Startup", "New"],
      notes: "Recently signed up. Needs onboarding assistance.",
      lastActivity: Date.now() - 1000 * 60 * 15, // 15 minutes ago
    });

    // Create sample conversations
    const conv1 = await ctx.db.insert("conversations", {
      customerId: customer1,
      channel: "whatsapp",
      status: "open",
      subject: "Product inquiry",
      lastMessageAt: Date.now() - 1000 * 60 * 5,
      unreadCount: 2,
    });

    const conv2 = await ctx.db.insert("conversations", {
      customerId: customer2,
      channel: "messenger",
      status: "pending",
      subject: "Technical support",
      lastMessageAt: Date.now() - 1000 * 60 * 45,
      unreadCount: 0,
    });


    // Create sample messages
    await ctx.db.insert("messages", {
      conversationId: conv1,
      customerId: customer1,
      content: "Hi! I'm interested in your premium plan. Can you tell me more about the features?",
      type: "text",
      sender: "customer",
      channel: "whatsapp",
      timestamp: Date.now() - 1000 * 60 * 10,
    });

    await ctx.db.insert("messages", {
      conversationId: conv1,
      customerId: customer1,
      content: "Hello Sarah! I'd be happy to help you with information about our premium plan. It includes advanced analytics, priority support, and custom integrations.",
      type: "text",
      sender: "agent",
      channel: "whatsapp",
      timestamp: Date.now() - 1000 * 60 * 8,
    });

    await ctx.db.insert("messages", {
      conversationId: conv1,
      customerId: customer1,
      content: "That sounds great! What's the pricing structure?",
      type: "text",
      sender: "customer",
      channel: "whatsapp",
      timestamp: Date.now() - 1000 * 60 * 5,
    });

    await ctx.db.insert("messages", {
      conversationId: conv2,
      customerId: customer2,
      content: "We're experiencing some issues with the API integration. The webhook responses are timing out.",
      type: "text",
      sender: "customer",
      channel: "messenger",
      timestamp: Date.now() - 1000 * 60 * 50,
    });

    await ctx.db.insert("messages", {
      conversationId: conv2,
      customerId: customer2,
      content: "I understand the issue. Let me check our server logs and get back to you with a solution within the next hour.",
      type: "text",
      sender: "agent",
      channel: "messenger",
      timestamp: Date.now() - 1000 * 60 * 45,
    });


    return "Sample data created successfully!";
  },
});
