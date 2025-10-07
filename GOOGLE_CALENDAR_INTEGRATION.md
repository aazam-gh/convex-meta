# Google Calendar Integration

This document describes the Google Calendar integration for the lead management system, replacing the previous Cal.com integration.

## Overview

The Google Calendar integration allows the system to:
- Create calendar events directly in Google Calendar
- Check availability and suggest meeting times
- Update and cancel events
- Sync event status with the lead management system

## Setup

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create credentials (OAuth 2.0 Client ID or Service Account)
5. Download the credentials JSON file

### 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Google Calendar API credentials
GOOGLE_CALENDAR_ACCESS_TOKEN=your_access_token_here
GOOGLE_CALENDAR_ID=primary  # or your specific calendar ID
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_refresh_token
```

### 3. OAuth Flow (Optional)

For a more robust implementation, you can implement OAuth flow to get access tokens dynamically:

```typescript
// Example OAuth implementation
const getAccessToken = async () => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  
  const data = await response.json();
  return data.access_token;
};
```

## API Functions

### Core Functions

#### `createGoogleCalendarEvent`
Creates a new event in Google Calendar and stores the reference in the database.

**Parameters:**
- `leadId`: Lead ID
- `customerId`: Customer ID
- `title`: Event title
- `description`: Event description (optional)
- `startTime`: Start time (ISO string)
- `endTime`: End time (ISO string)
- `timeZone`: Time zone
- `customerEmail`: Customer email
- `customerName`: Customer name
- `location`: Meeting location (optional)
- `meetingLink`: Meeting link (optional)

**Returns:**
- `success`: Boolean indicating success
- `eventId`: Google Calendar event ID
- `meetingLink`: Generated meeting link
- `error`: Error message if failed

#### `getGoogleCalendarAvailability`
Gets available time slots for a given date range and duration.

**Parameters:**
- `startDate`: Start date (ISO string)
- `endDate`: End date (ISO string)
- `duration`: Duration in minutes

**Returns:**
- Array of time slots with availability status

#### `updateGoogleCalendarEvent`
Updates an existing Google Calendar event.

**Parameters:**
- `googleEventId`: Google Calendar event ID
- `title`: New title (optional)
- `description`: New description (optional)
- `startTime`: New start time (optional)
- `endTime`: New end time (optional)
- `location`: New location (optional)

#### `deleteGoogleCalendarEvent`
Deletes a Google Calendar event.

**Parameters:**
- `googleEventId`: Google Calendar event ID
- `reason`: Cancellation reason (optional)

## Database Schema

### `googleCalendarEvents` Table

```typescript
{
  _id: Id<"googleCalendarEvents">,
  leadId: Id<"leads">,
  customerId: Id<"customers">,
  googleEventId: string,        // External Google Calendar event ID
  meetingLink?: string,         // Google Meet link
  status: string,               // "scheduled", "confirmed", "cancelled", "completed", "no_show"
  startTime: number,            // Unix timestamp
  endTime: number,              // Unix timestamp
  timeZone: string,
  title: string,
  description?: string,
  location?: string,
  createdAt: number,
  updatedAt: number,
}
```

## Components

### `GoogleCalendarBooking`
A React component for scheduling meetings with Google Calendar integration.

**Props:**
- `leadId`: Lead ID
- `customerId`: Customer ID
- `onBookingCreated`: Callback when booking is created

**Features:**
- Date and time selection
- Duration selection (30, 60, 90, 120 minutes)
- Availability checking
- Meeting details form
- Status display for existing bookings

### `GoogleCalendarEventsList`
A React component for displaying and managing Google Calendar events.

**Props:**
- `leadId`: Lead ID (optional)
- `customerId`: Customer ID (optional)

**Features:**
- Event listing with filtering
- Status management
- Date range filtering
- Event cancellation
- Status updates

## Usage Examples

### Creating a Meeting

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const createEvent = useMutation(api.googleCalendar.createGoogleCalendarEvent);

const handleCreateMeeting = async () => {
  const result = await createEvent({
    leadId: "lead123",
    customerId: "customer456",
    title: "Sales Consultation",
    description: "Initial sales meeting",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    timeZone: "UTC",
    customerEmail: "customer@example.com",
    customerName: "John Doe",
    location: "Conference Room A",
  });

  if (result.success) {
    console.log("Meeting created:", result.eventId);
  }
};
```

### Checking Availability

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const availability = useQuery(api.googleCalendar.getGoogleCalendarAvailability, {
  startDate: "2024-01-15T00:00:00Z",
  endDate: "2024-01-15T23:59:59Z",
  duration: 60,
});
```

## Webhooks (Optional)

The integration supports Google Calendar webhooks for real-time updates:

### `handleGoogleCalendarWebhook`
Handles webhook events from Google Calendar.

**Supported Events:**
- `event_created`: New event created
- `event_updated`: Event updated
- `event_deleted`: Event deleted

## Error Handling

The integration includes comprehensive error handling:

- API authentication errors
- Invalid event data
- Network timeouts
- Rate limiting
- Calendar permission issues

## Security Considerations

1. **Access Tokens**: Store access tokens securely and refresh them regularly
2. **Permissions**: Use minimal required permissions for the Google Calendar API
3. **Validation**: Validate all input data before making API calls
4. **Rate Limiting**: Implement proper rate limiting to avoid API quotas

## Migration from Cal.com

The Google Calendar integration is designed as a drop-in replacement for Cal.com:

1. **Database**: The `calComBookings` table has been replaced with `googleCalendarEvents`
2. **API**: All Cal.com API functions have been replaced with Google Calendar equivalents
3. **Components**: `CalComBooking` has been replaced with `GoogleCalendarBooking`
4. **Schema**: Updated to include Google Calendar-specific fields

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check access token validity and refresh if needed
2. **Permission Denied**: Ensure the calendar has proper sharing permissions
3. **Event Creation Failed**: Verify all required fields are provided
4. **Availability Not Loading**: Check date format and time zone settings

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=google-calendar
```

This will log detailed information about API calls and responses.
