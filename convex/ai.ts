"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const generateAIResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    customerMessage: v.string(),
    useLeadAgent: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ response: string; knowledgeSnippets: any[] }> => {
    try {
      // Check if we should use the lead agent
      const shouldUseLeadAgent = args.useLeadAgent ?? true; // Default to true for lead generation

      if (shouldUseLeadAgent) {
        // Use the lead agent for sales-focused conversations
        const leadAgentResult = await ctx.runAction(internal.leadAgent.generateLeadAgentResponse, {
          conversationId: args.conversationId,
          customerMessage: args.customerMessage,
        });

        return {
          response: leadAgentResult.response,
          knowledgeSnippets: [],
        };
      } else {
        // Use the original support-focused AI
        return await generateSupportResponse(ctx, args);
      }

    } catch (error) {
      console.error("Error generating AI response:", error);
      
      // Store a fallback message
      await ctx.runMutation(internal.conversations.storeAIMessage, {
        conversationId: args.conversationId,
        content: "I apologize, but I'm experiencing technical difficulties. Let me connect you with a human agent who can better assist you.",
        knowledgeSnippets: [],
      });

      throw error;
    }
  },
});

async function generateSupportResponse(ctx: any, args: any): Promise<{ response: string; knowledgeSnippets: any[] }> {
  // Search for relevant knowledge (this will use the user's namespace)
  const relevantChunks: any[] = await ctx.runAction(internal.knowledgeBase.internalSearchKnowledge, {
    query: args.customerMessage,
    limit: 3,
  });

  // Prepare context from knowledge base
  const context: string = relevantChunks.length > 0 
    ? relevantChunks.map((chunk: any) => chunk.content).join("\n\n")
    : "No specific knowledge base information found for this query.";

  // Generate AI response
  const completion: any = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a helpful customer support agent. Use the following knowledge base information to answer customer questions. If the knowledge base doesn't contain relevant information, provide a helpful general response and suggest they contact a human agent for more specific help.

Knowledge Base Context:
${context}

Guidelines:
- Be friendly and professional
- Keep responses concise but helpful
- If you're not sure about something, say so
- Always offer to escalate to a human agent if needed`
      },
      {
        role: "user",
        content: args.customerMessage
      }
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  const aiResponse: string = completion.choices[0].message.content || "I apologize, but I'm having trouble generating a response right now. Let me connect you with a human agent.";

  // Store the AI response as a message
  const knowledgeSnippets = relevantChunks.map((chunk: any) => ({
    content: chunk.content.substring(0, 200) + "...",
    source: chunk.source,
    relevanceScore: chunk.relevanceScore,
  }));

  await ctx.runMutation(internal.conversations.storeAIMessage, {
    conversationId: args.conversationId,
    content: aiResponse,
    knowledgeSnippets,
  });

  return {
    response: aiResponse,
    knowledgeSnippets,
  };
}
