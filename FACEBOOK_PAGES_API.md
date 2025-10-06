# Facebook Pages API Integration

This document explains how to use the Facebook Pages API integration in your Convex application.

## Setup

1. **Get Facebook Page Access Token**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app or use an existing one
   - Add the "Pages" product to your app
   - Generate a Page Access Token with the following permissions:
     - `pages_messaging`
     - `pages_read_engagement`
     - `pages_manage_metadata`

2. **Set Environment Variable**:
   ```bash
   npx convex env set FB_PAGE_ACCESS_TOKEN "your_page_access_token_here"
   ```

## Available Functions

### Actions (External API calls)

#### `fetchPageConversations`
Fetches conversations from your Facebook page.

```typescript
const conversations = await convex.action(api.facebook.fetchPageConversations, {
  pageId: "optional_page_id", // defaults to "me"
  limit: 25
});
```

#### `fetchConversationMessages`
Fetches messages from a specific conversation.

```typescript
const messageData = await convex.action(api.facebook.fetchConversationMessages, {
  conversationId: "conversation_id",
  limit: 50,
  before: "optional_pagination_cursor"
});
```

#### `syncPageMessages`
Syncs Facebook page messages to your local database.

```typescript
const result = await convex.action(api.facebook.syncPageMessages, {
  pageId: "optional_page_id",
  conversationLimit: 10,
  messageLimit: 50
});
```

#### `getPageInfo`
Gets information about your Facebook page.

```typescript
const pageInfo = await convex.action(api.facebook.getPageInfo, {
  pageId: "optional_page_id" // defaults to "me"
});
```

#### `sendPageMessage`
Sends a message to a user via Facebook Messenger.

```typescript
const result = await convex.action(api.facebook.sendPageMessage, {
  recipientId: "user_psid",
  text: "Hello from your page!",
  pageId: "optional_page_id"
});
```

### Queries (Database reads)

#### `getRecentConversations`
Gets recent conversations with message counts and participants.

```typescript
const conversations = useQuery(api.facebook.getRecentConversations, {
  limit: 20
});
```

#### `getMessagesByConversation`
Gets messages for a specific conversation.

```typescript
const messages = useQuery(api.facebook.getMessagesByConversation, {
  conversationId: "conversation_id",
  limit: 50
});
```

#### `getConversationParticipants`
Gets participants in a conversation with message counts.

```typescript
const participants = useQuery(api.facebook.getConversationParticipants, {
  conversationId: "conversation_id"
});
```

#### `listMessages`
Gets all Facebook messages (legacy function).

```typescript
const messages = useQuery(api.facebook.listMessages, {
  limit: 50
});
```

## Database Schema

The `facebookMessages` table stores Facebook messages with the following fields:

```typescript
{
  senderId: string,           // Facebook PSID
  recipientId: string,        // Page ID
  text: string,              // Message content
  timestamp: number,         // Epoch time
  mid: string,               // Messenger message ID
  conversationId?: string,   // Facebook conversation ID
  senderName?: string,       // Sender's display name
  recipientName?: string,    // Recipient's display name
  attachments?: Array<{      // Message attachments
    type: string,
    url?: string,
    title?: string
  }>,
  isFromPage?: boolean       // Whether message is from the page
}
```

## Example Usage

### React Component

```tsx
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function FacebookManager() {
  const conversations = useQuery(api.facebook.getRecentConversations);
  const syncMessages = useAction(api.facebook.syncPageMessages);
  const sendMessage = useAction(api.facebook.sendPageMessage);

  const handleSync = async () => {
    const result = await syncMessages({
      conversationLimit: 10,
      messageLimit: 50
    });
    console.log(`Synced ${result.messagesProcessed} messages`);
  };

  const handleSend = async (recipientId: string, text: string) => {
    const result = await sendMessage({ recipientId, text });
    console.log("Message sent:", result.message_id);
  };

  return (
    <div>
      <button onClick={handleSync}>Sync Messages</button>
      {conversations?.map(conv => (
        <div key={conv.conversationId}>
          <h3>{conv.participants.map(p => p.senderName).join(", ")}</h3>
          <p>{conv.messageCount} messages</p>
        </div>
      ))}
    </div>
  );
}
```

### Server-side Usage

```typescript
// In a Convex function
export const myFunction = action({
  args: {},
  handler: async (ctx) => {
    // Sync messages from Facebook
    const syncResult = await ctx.runAction(api.facebook.syncPageMessages, {
      conversationLimit: 5,
      messageLimit: 25
    });

    // Get recent conversations
    const conversations = await ctx.runQuery(api.facebook.getRecentConversations, {
      limit: 10
    });

    return { syncResult, conversations };
  }
});
```

## Error Handling

All functions include proper error handling for:
- Missing access tokens
- Facebook API errors
- Network issues
- Invalid parameters

Errors are logged to the console and thrown with descriptive messages.

## Rate Limits

Facebook has rate limits for their API. The functions are designed to handle these gracefully, but you should:
- Implement proper retry logic for production use
- Monitor your API usage in the Facebook Developer Console
- Consider implementing exponential backoff for failed requests

## Security Notes

- Never expose your Page Access Token in client-side code
- Store the token securely in Convex environment variables
- Regularly rotate your access tokens
- Use the minimum required permissions for your use case
