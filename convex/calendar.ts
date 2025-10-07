import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Calendar booking functions
export const createAppointment = mutation({
  args: {
    leadId: v.id("leads"),
    customerId: v.id("customers"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
  },
  returns: v.id("appointments"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      leadId: args.leadId,
      customerId: args.customerId,
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "scheduled",
      location: args.location,
      reminderSent: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule calendar event creation
    await ctx.scheduler.runAfter(0, internal.calendar.createCalendarEvent, {
      appointmentId,
    });

    return appointmentId;
  },
});

export const getAppointment = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.union(
    v.object({
      _id: v.id("appointments"),
      leadId: v.id("leads"),
      customerId: v.id("customers"),
      title: v.string(),
      description: v.optional(v.string()),
      startTime: v.number(),
      endTime: v.number(),
      status: v.string(),
      calendarEventId: v.optional(v.string()),
      meetingLink: v.optional(v.string()),
      location: v.optional(v.string()),
      reminderSent: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const appointment = await ctx.db.get(args.appointmentId);
    return appointment;
  },
});

export const listAppointments = query({
  args: {
    leadId: v.optional(v.id("leads")),
    customerId: v.optional(v.id("customers")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("appointments"),
    leadId: v.id("leads"),
    customerId: v.id("customers"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    status: v.string(),
    calendarEventId: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    location: v.optional(v.string()),
    reminderSent: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    _creationTime: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let appointments;
    
    if (args.leadId) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_lead", (q) => q.eq("leadId", args.leadId!))
        .order("asc")
        .take(args.limit || 50);
    } else if (args.customerId) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .order("asc")
        .take(args.limit || 50);
    } else if (args.status) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("asc")
        .take(args.limit || 50);
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_start_time")
        .order("asc")
        .take(args.limit || 50);
    }

    return appointments;
  },
});

export const updateAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.string(),
    meetingLink: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.meetingLink) {
      updateData.meetingLink = args.meetingLink;
    }

    await ctx.db.patch(args.appointmentId, updateData);
    return null;
  },
});

export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Update status to cancelled
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // If there's a calendar event, cancel it
    if (appointment.calendarEventId) {
      await ctx.scheduler.runAfter(0, internal.calendar.cancelCalendarEvent, {
        appointmentId: args.appointmentId,
        calendarEventId: appointment.calendarEventId,
      });
    }

    return null;
  },
});

// Internal query for actions
export const getAppointmentForAction = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.union(
    v.object({
      _id: v.id("appointments"),
      leadId: v.id("leads"),
      customerId: v.id("customers"),
      title: v.string(),
      description: v.optional(v.string()),
      startTime: v.number(),
      endTime: v.number(),
      status: v.string(),
      calendarEventId: v.optional(v.string()),
      meetingLink: v.optional(v.string()),
      location: v.optional(v.string()),
      reminderSent: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    return appointment;
  },
});

// Internal functions for calendar integration
export const createCalendarEvent = internalAction({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.calendar.getAppointmentForAction, {
      appointmentId: args.appointmentId,
    });
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    try {
      // This would integrate with your calendar provider (Google Calendar, Outlook, etc.)
      // For now, we'll simulate the integration
      const calendarEventId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const meetingLink = `https://meet.example.com/${calendarEventId}`;

      await ctx.runMutation(internal.calendar.updateAppointmentWithCalendarData, {
        appointmentId: args.appointmentId,
        calendarEventId,
        meetingLink,
      });

      // Schedule reminder email
      await ctx.scheduler.runAfter(
        (appointment.startTime - Date.now()) - (24 * 60 * 60 * 1000), // 24 hours before
        internal.calendar.sendAppointmentReminder,
        { appointmentId: args.appointmentId }
      );

    } catch (error) {
      console.error("Failed to create calendar event:", error);
      // Update appointment status to failed
      await ctx.runMutation(internal.calendar.updateAppointmentWithCalendarData, {
        appointmentId: args.appointmentId,
        status: "failed",
      });
    }
  },
});

export const updateAppointmentWithCalendarData = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    calendarEventId: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.calendarEventId) {
      updateData.calendarEventId = args.calendarEventId;
    }

    if (args.meetingLink) {
      updateData.meetingLink = args.meetingLink;
    }

    if (args.status) {
      updateData.status = args.status;
    }

    await ctx.db.patch(args.appointmentId, updateData);
    return null;
  },
});

export const cancelCalendarEvent = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    calendarEventId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // This would integrate with your calendar provider to cancel the event
      console.log(`Cancelling calendar event: ${args.calendarEventId}`);
      
      // For now, we'll just log the cancellation
      // In a real implementation, you'd call the calendar API here
      
    } catch (error) {
      console.error("Failed to cancel calendar event:", error);
    }
  },
});

export const sendAppointmentReminder = internalAction({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.calendar.getAppointmentForAction, {
      appointmentId: args.appointmentId,
    });
    if (!appointment || appointment.reminderSent) {
      return null;
    }

    try {
      // This would integrate with your email service
      console.log(`Sending reminder for appointment: ${appointment.title}`);
      
      // Mark reminder as sent
      await ctx.runMutation(internal.calendar.markReminderSent, {
        appointmentId: args.appointmentId,
      });
      
    } catch (error) {
      console.error("Failed to send appointment reminder:", error);
    }
  },
});

export const markReminderSent = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      reminderSent: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Get available time slots (this would integrate with calendar provider)
export const getAvailableTimeSlots = query({
  args: {
    date: v.string(), // YYYY-MM-DD format
    duration: v.number(), // Duration in minutes
  },
  returns: v.array(v.object({
    startTime: v.number(),
    endTime: v.number(),
    available: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // This would integrate with your calendar provider to get actual availability
    // For now, we'll return mock data
    const date = new Date(args.date);
    const slots = [];
    
    // Generate time slots from 9 AM to 5 PM
    for (let hour = 9; hour < 17; hour++) {
      const startTime = new Date(date);
      startTime.setHours(hour, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + args.duration);
      
      slots.push({
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        available: Math.random() > 0.3, // Mock availability
      });
    }

    return slots;
  },
});
