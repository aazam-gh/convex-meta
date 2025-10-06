import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(10);

    return {
      ...customer,
      activities,
    };
  },
});

export const addNote = mutation({
  args: {
    customerId: v.id("customers"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(args.customerId, {
      notes: args.note,
    });

    await ctx.db.insert("activities", {
      customerId: args.customerId,
      type: "note_added",
      description: `Note added: ${args.note.substring(0, 50)}...`,
      timestamp: Date.now(),
      agentId: identity.email!, // Store the agent's email
    });
  },
});

export const addTag = mutation({
  args: {
    customerId: v.id("customers"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");

    const updatedTags = [...customer.tags, args.tag];
    await ctx.db.patch(args.customerId, {
      tags: updatedTags,
    });

    await ctx.db.insert("activities", {
      customerId: args.customerId,
      type: "tag_added",
      description: `Tag added: ${args.tag}`,
      timestamp: Date.now(),
      agentId: identity.email!, // Store the agent's email
    });
  },
});
