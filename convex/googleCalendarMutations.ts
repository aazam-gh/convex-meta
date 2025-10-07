import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const storeGoogleCalendarEvent = internalMutation({
  args: {
    leadId: v.id("leads"),
    customerId: v.id("customers"),
    googleEventId: v.string(),
    meetingLink: v.optional(v.string()),
    status: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    timeZone: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  returns: v.id("googleCalendarEvents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("googleCalendarEvents", {
      leadId: args.leadId,
      customerId: args.customerId,
      googleEventId: args.googleEventId,
      meetingLink: args.meetingLink,
      status: args.status,
      startTime: args.startTime,
      endTime: args.endTime,
      timeZone: args.timeZone,
      title: args.title,
      description: args.description,
      location: args.location,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateGoogleCalendarEvent = internalMutation({
  args: {
    googleEventId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_google_event_id", (q) => q.eq("googleEventId", args.googleEventId))
      .first();

    if (event) {
      const updateData: any = {
        updatedAt: Date.now(),
      };

      if (args.title) updateData.title = args.title;
      if (args.description !== undefined) updateData.description = args.description;
      if (args.location !== undefined) updateData.location = args.location;
      if (args.startTime) updateData.startTime = args.startTime;
      if (args.endTime) updateData.endTime = args.endTime;

      await ctx.db.patch(event._id, updateData);
    }
    return null;
  },
});

export const updateGoogleCalendarEventStatus = internalMutation({
  args: {
    googleEventId: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_google_event_id", (q) => q.eq("googleEventId", args.googleEventId))
      .first();

    if (event) {
      await ctx.db.patch(event._id, {
        status: args.status,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const deleteGoogleCalendarEvent = internalMutation({
  args: {
    googleEventId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_google_event_id", (q) => q.eq("googleEventId", args.googleEventId))
      .first();

    if (event) {
      await ctx.db.delete(event._id);
    }
    return null;
  },
});

// Public mutations for components
export const updateGoogleCalendarEventStatusPublic = mutation({
  args: {
    eventId: v.id("googleCalendarEvents"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(args.eventId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteGoogleCalendarEventPublic = mutation({
  args: {
    googleEventId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_google_event_id", (q) => q.eq("googleEventId", args.googleEventId))
      .first();

    if (event) {
      await ctx.db.delete(event._id);
    }
    return null;
  },
});
