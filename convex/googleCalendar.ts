"use node";

import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Google Calendar API integration functions
export const createGoogleCalendarEvent = internalAction({
  args: {
    leadId: v.id("leads"),
    customerId: v.id("customers"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(), // ISO string
    endTime: v.string(), // ISO string
    timeZone: v.string(),
    customerEmail: v.string(),
    customerName: v.string(),
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    eventId: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

      if (!accessToken) {
        throw new Error("GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required");
      }

      // Create event in Google Calendar
      const eventData = {
        summary: args.title,
        description: args.description || "",
        start: {
          dateTime: args.startTime,
          timeZone: args.timeZone,
        },
        end: {
          dateTime: args.endTime,
          timeZone: args.timeZone,
        },
        attendees: [
          {
            email: args.customerEmail,
            displayName: args.customerName,
          },
        ],
        location: args.location,
        conferenceData: args.meetingLink ? {
          createRequest: {
            requestId: `meet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        } : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 24 hours before
            { method: "popup", minutes: 10 }, // 10 minutes before
          ],
        },
        extendedProperties: {
          private: {
            leadId: args.leadId,
            customerId: args.customerId,
            source: "lead_management_system",
          },
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
      }

      const event = await response.json();

      // Store event reference in our database
      await ctx.runMutation(internal.googleCalendarMutations.storeGoogleCalendarEvent, {
        leadId: args.leadId,
        customerId: args.customerId,
        googleEventId: event.id,
        meetingLink: event.hangoutLink || args.meetingLink,
        status: "confirmed",
        startTime: new Date(args.startTime).getTime(),
        endTime: new Date(args.endTime).getTime(),
        timeZone: args.timeZone,
        title: args.title,
        description: args.description,
        location: args.location,
      });

      return {
        success: true,
        eventId: event.id,
        meetingLink: event.hangoutLink || args.meetingLink,
      };

    } catch (error) {
      console.error("Error creating Google Calendar event:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const getGoogleCalendarEvents = internalAction({
  args: {
    startDate: v.string(), // ISO string
    endDate: v.string(), // ISO string
    maxResults: v.optional(v.number()),
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
  })),
  handler: async (ctx, args) => {
    try {
      const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

      if (!accessToken) {
        throw new Error("GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required");
      }

      const params = new URLSearchParams({
        timeMin: args.startDate,
        timeMax: args.endDate,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: (args.maxResults || 100).toString(),
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      return data.items?.map((event: any) => ({
        id: event.id,
        summary: event.summary || "No Title",
        start: event.start,
        end: event.end,
        hangoutLink: event.hangoutLink,
        location: event.location,
        status: event.status,
      })) || [];

    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      return [];
    }
  },
});

export const getGoogleCalendarAvailability = internalAction({
  args: {
    startDate: v.string(), // ISO string
    endDate: v.string(), // ISO string
    duration: v.number(), // Duration in minutes
  },
  returns: v.array(v.object({
    start: v.string(),
    end: v.string(),
    available: v.boolean(),
  })),
  handler: async (ctx, args) => {
    try {
      const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

      if (!accessToken) {
        throw new Error("GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required");
      }

      // Get busy times from Google Calendar
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/freeBusy`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeMin: args.startDate,
            timeMax: args.endDate,
            items: [{ id: calendarId }],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const busyTimes = data.calendars[calendarId]?.busy || [];

      // Generate available time slots
      const startDate = new Date(args.startDate);
      const endDate = new Date(args.endDate);
      const slots = [];
      
      // Generate hourly slots from 9 AM to 5 PM
      for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
        for (let hour = 9; hour < 17; hour++) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + args.duration);
          
          // Check if this slot conflicts with busy times
          const isBusy = busyTimes.some((busy: any) => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return (slotStart < busyEnd && slotEnd > busyStart);
          });
          
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available: !isBusy,
          });
        }
      }

      return slots;

    } catch (error) {
      console.error("Error fetching Google Calendar availability:", error);
      return [];
    }
  },
});

export const updateGoogleCalendarEvent = internalAction({
  args: {
    googleEventId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

      if (!accessToken) {
        throw new Error("GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required");
      }

      // First, get the existing event
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${args.googleEventId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      if (!getResponse.ok) {
        throw new Error(`Failed to fetch event: ${getResponse.statusText}`);
      }

      const existingEvent = await getResponse.json();

      // Update the event
      const updateData = {
        ...existingEvent,
        summary: args.title || existingEvent.summary,
        description: args.description !== undefined ? args.description : existingEvent.description,
        location: args.location !== undefined ? args.location : existingEvent.location,
        start: args.startTime ? {
          ...existingEvent.start,
          dateTime: args.startTime,
        } : existingEvent.start,
        end: args.endTime ? {
          ...existingEvent.end,
          dateTime: args.endTime,
        } : existingEvent.end,
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${args.googleEventId}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
      }

      // Update our database
      await ctx.runMutation(internal.googleCalendarMutations.updateGoogleCalendarEvent, {
        googleEventId: args.googleEventId,
        title: args.title,
        description: args.description,
        location: args.location,
        startTime: args.startTime ? new Date(args.startTime).getTime() : undefined,
        endTime: args.endTime ? new Date(args.endTime).getTime() : undefined,
      });

      return { success: true };

    } catch (error) {
      console.error("Error updating Google Calendar event:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const deleteGoogleCalendarEvent = internalAction({
  args: {
    googleEventId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

      if (!accessToken) {
        throw new Error("GOOGLE_CALENDAR_ACCESS_TOKEN environment variable is required");
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${args.googleEventId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 410) { // 410 means already deleted
        const errorData = await response.json();
        throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
      }

      // Update our database
      await ctx.runMutation(internal.googleCalendarMutations.updateGoogleCalendarEventStatus, {
        googleEventId: args.googleEventId,
        status: "cancelled",
      });

      return { success: true };

    } catch (error) {
      console.error("Error deleting Google Calendar event:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const getGoogleCalendarEventByLead = internalAction({
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
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runQuery(internal.googleCalendarQueries.internalGetGoogleCalendarEventByLead, {
      leadId: args.leadId,
    });
  },
});

// Webhook handler for Google Calendar events (if using push notifications)
export const handleGoogleCalendarWebhook = action({
  args: {
    event: v.string(),
    data: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const { event, data } = args;

      switch (event) {
        case "event_created":
          await handleEventCreated(ctx, data);
          break;
        case "event_updated":
          await handleEventUpdated(ctx, data);
          break;
        case "event_deleted":
          await handleEventDeleted(ctx, data);
          break;
        default:
          console.log(`Unhandled Google Calendar webhook event: ${event}`);
      }

      return null;
    } catch (error) {
      console.error("Error handling Google Calendar webhook:", error);
      throw error;
    }
  },
});

async function handleEventCreated(ctx: any, data: any) {
  // Update lead status to "meeting_scheduled"
  if (data.extendedProperties?.private?.leadId) {
    await ctx.runMutation(internal.leads.internalUpdateLeadScore, {
      leadId: data.extendedProperties.private.leadId,
      newScore: 90, // High score for scheduled meeting
    });
  }
}

async function handleEventUpdated(ctx: any, data: any) {
  // Update event in our database
  if (data.id) {
    await ctx.runMutation(internal.googleCalendarMutations.updateGoogleCalendarEvent, {
      googleEventId: data.id,
      title: data.summary,
      description: data.description,
      location: data.location,
      startTime: data.start?.dateTime ? new Date(data.start.dateTime).getTime() : undefined,
      endTime: data.end?.dateTime ? new Date(data.end.dateTime).getTime() : undefined,
    });
  }
}

async function handleEventDeleted(ctx: any, data: any) {
  // Update event status in our database
  if (data.id) {
    await ctx.runMutation(internal.googleCalendarMutations.updateGoogleCalendarEventStatus, {
      googleEventId: data.id,
      status: "cancelled",
    });
  }
}
