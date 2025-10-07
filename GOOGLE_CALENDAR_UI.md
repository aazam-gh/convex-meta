# Google Calendar Integration - UI Component

This document describes the Google Calendar integration UI components that have been added to the project.

## Components Created

### 1. GoogleCalendarView.tsx
A React component that displays Google Calendar events for the current month.

**Features:**
- Displays calendar events in a clean, card-based layout
- Shows event details including title, time, location, and description
- Month navigation (previous/next month)
- Loading states and error handling
- Refresh functionality
- Support for both timed events and all-day events
- Meeting links for Google Meet events

**Props:**
- `accessToken?: string` - Google OAuth access token

### 2. GoogleCalendarIntegration.tsx
A wrapper component that handles Google OAuth authorization and token management.

**Features:**
- Checks for existing Google Calendar authorization
- Handles OAuth flow for Google Calendar access
- Manages loading and error states
- Integrates with the existing authentication system

### 3. API Routes
- `/api/auth/google/calendar/check` - Checks if user has Google Calendar access
- `/api/auth/google/calendar/token` - Retrieves Google access token

## How to Use

1. **Navigate to the Google Calendar tab** in the dashboard sidebar
2. **Click "Authorize Google Calendar"** to grant access to your Google Calendar
3. **View your calendar events** for the current month
4. **Use month navigation** to view different months
5. **Click "Refresh Events"** to reload the calendar data

## Current Implementation Status

### ✅ Completed
- UI components for displaying calendar events
- Month navigation
- Sample data display (for demonstration)
- Integration with existing dashboard
- Error handling and loading states

### 🔄 In Progress
- OAuth token management
- Real Google Calendar API integration

### 📋 TODO
- Store and retrieve access tokens from database
- Implement proper OAuth flow
- Add event creation/editing capabilities
- Add calendar availability checking
- Implement webhook handling for real-time updates

## Technical Details

### Dependencies Added
- `googleapis` - Google APIs client library

### Files Modified
- `package.json` - Added googleapis dependency
- `components/Sidebar.tsx` - Added Google Calendar tab
- `components/Dashboard.tsx` - Added Google Calendar tab content
- `convex/googleCalendarQueries.ts` - Added calendar event queries

### Files Created
- `components/GoogleCalendarView.tsx` - Main calendar display component
- `components/GoogleCalendarIntegration.tsx` - OAuth wrapper component
- `app/api/auth/google/calendar/check/route.ts` - Authorization check API
- `app/api/auth/google/calendar/token/route.ts` - Token retrieval API

## Next Steps

1. **Implement proper OAuth flow** - Connect with Google's OAuth 2.0 system
2. **Store tokens securely** - Save access/refresh tokens in the database
3. **Add real API calls** - Replace mock data with actual Google Calendar API calls
4. **Add event management** - Allow users to create, edit, and delete events
5. **Implement webhooks** - Set up real-time calendar updates

## Testing

The current implementation includes sample data for demonstration purposes. To test:

1. Start the development server: `npm run dev`
2. Navigate to the dashboard
3. Click on the "Google Calendar" tab in the sidebar
4. Click "Authorize Google Calendar" to see the sample events
5. Use the month navigation to see how the UI handles different months

## Security Considerations

- Access tokens should be stored securely in the database
- Implement proper token refresh logic
- Use HTTPS for all API calls
- Validate user permissions before accessing calendar data
- Implement proper error handling for expired tokens
