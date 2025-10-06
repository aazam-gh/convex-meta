import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";


const applicationTables = {

  facebookMessages: defineTable({
    senderId: v.string(),       // Facebook PSID
    recipientId: v.string(),    // Page ID
    text: v.string(),
    timestamp: v.number(),      // Epoch time
    mid: v.string(),            // Messenger message ID
    conversationId: v.optional(v.string()), // Facebook conversation ID
    senderName: v.optional(v.string()), // Sender's display name
    recipientName: v.optional(v.string()), // Recipient's display name
    attachments: v.optional(v.array(v.object({
      type: v.string(),
      url: v.optional(v.string()),
      title: v.optional(v.string()),
    }))),
    isFromPage: v.optional(v.boolean()), // Whether message is from the page
  })
    .index("by_sender", ["senderId"]) 
    .index("by_mid", ["mid"])
    .index("by_conversation", ["conversationId"]),

  
  customers: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    channels: v.array(v.string()),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    lastActivity: v.number(),
  }).index("by_email", ["email"]),

  conversations: defineTable({
    customerId: v.id("customers"),
    channel: v.string(),
    status: v.string(),
    subject: v.optional(v.string()),
    lastMessageAt: v.number(),
    unreadCount: v.number(),
    assignedAgent: v.optional(v.string()),
  })
    .index("by_customer", ["customerId"])
    .index("by_last_message", ["lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    customerId: v.id("customers"),
    content: v.string(),
    type: v.string(),
    sender: v.string(),
    channel: v.string(),
    timestamp: v.number(),
    agentId: v.optional(v.string()),
    isAiGenerated: v.optional(v.boolean()),
    knowledgeSnippets: v.optional(
      v.array(
        v.object({
          content: v.string(),
          source: v.string(),
          relevanceScore: v.number(),
        })
      )
    ),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_timestamp", ["timestamp"]),

  activities: defineTable({
    customerId: v.id("customers"),
    type: v.string(),
    description: v.string(),
    timestamp: v.number(),
    agentId: v.optional(v.string()),
  }).index("by_customer", ["customerId"]),

  documents: defineTable({
    filename: v.string(),
    storageId: v.id("_storage"),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.number(),
    status: v.string(), // "processing", "completed", "failed"
    chunksCount: v.optional(v.number()),
    entryIds: v.optional(v.array(v.string())), // ✅ store RAG entryIds
  }).index("by_uploaded_by", ["uploadedBy"]),

  numbers: defineTable({
    value: v.number(),
  }),
};

export default defineSchema({
  ...applicationTables,
});
