import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Public queries for components
export const getGoogleCalendarEventByLead = query({
  args: {
    leadId: v.id("leads"),
  },
  returns: v.union(
    v.object({
      _id: v.id("googleCalendarEvents"),
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
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
  },
});

export const listGoogleCalendarEvents = query({
  args: {
    leadId: v.optional(v.id("leads")),
    customerId: v.optional(v.id("customers")),
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("googleCalendarEvents"),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let events;
    
    if (args.leadId) {
      events = await ctx.db
        .query("googleCalendarEvents")
        .withIndex("by_lead", (q) => q.eq("leadId", args.leadId!))
        .order("asc")
        .take(args.limit || 50);
    } else if (args.customerId) {
      events = await ctx.db
        .query("googleCalendarEvents")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .order("asc")
        .take(args.limit || 50);
    } else if (args.status) {
      events = await ctx.db
        .query("googleCalendarEvents")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("asc")
        .take(args.limit || 50);
    } else {
      events = await ctx.db
        .query("googleCalendarEvents")
        .withIndex("by_start_time")
        .order("asc")
        .take(args.limit || 50);
    }

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      const startTime = args.startDate ? new Date(args.startDate).getTime() : 0;
      const endTime = args.endDate ? new Date(args.endDate).getTime() : Number.MAX_SAFE_INTEGER;
      
      events = events.filter(event => 
        event.startTime >= startTime && event.startTime <= endTime
      );
    }

    return events;
  },
});

export const getGoogleCalendarAvailability = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    duration: v.number(),
  },
  returns: v.array(v.object({
    start: v.string(),
    end: v.string(),
    available: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // This would integrate with Google Calendar API to get actual availability
    // For now, we'll return mock data
    const startDate = new Date(args.startDate);
    const endDate = new Date(args.endDate);
    const slots = [];
    
    // Generate time slots from 9 AM to 5 PM
    for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + args.duration);
        
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: Math.random() > 0.3, // Mock availability
        });
      }
    }

    return slots;
  },
});

// Internal queries for actions
export const internalGetGoogleCalendarEventByLead = internalQuery({
  args: {
    leadId: v.id("leads"),
  },
  returns: v.union(
    v.object({
      _id: v.id("googleCalendarEvents"),
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
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
  },
});

export const internalGetGoogleCalendarEventByCustomer = internalQuery({
  args: {
    customerId: v.id("customers"),
  },
  returns: v.array(v.object({
    _id: v.id("googleCalendarEvents"),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("asc")
      .collect();
  },
});

export const internalGetGoogleCalendarEventByStatus = internalQuery({
  args: {
    status: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("googleCalendarEvents"),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleCalendarEvents")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("asc")
      .collect();
  },
});

// New query to fetch Google Calendar events for the current month
export const getCurrentMonthEvents = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(v.object({
    id: v.string(),
    summary: v.string(),
    start: v.object({
      dateTime: v.optional(v.string()),
      date: v.optional(v.string()),
    }),
    end: v.object({
      dateTime: v.optional(v.string()),
      date: v.optional(v.string()),
    }),
    hangoutLink: v.optional(v.string()),
    location: v.optional(v.string()),
    status: v.string(),
    description: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // This will be called from the frontend to fetch events from Google Calendar API
    // The actual API call will be made from the frontend using the user's access token
    return [];
  },
});