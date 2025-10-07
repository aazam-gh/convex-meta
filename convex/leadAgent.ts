"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const generateLeadAgentResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    customerMessage: v.string(),
  },
  handler: async (ctx, args): Promise<{ response: string; action: string; metadata: any }> => {
    try {
      // Get or create lead for this conversation
      let lead = await ctx.runQuery(internal.leads.internalGetLeadByConversation, {
        conversationId: args.conversationId,
      });

      if (!lead) {
        // Get conversation to find customer
        const conversation = await ctx.runQuery(internal.conversations.internalGetConversation, {
          conversationId: args.conversationId,
        });

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        // Create new lead
        const leadId = await ctx.runMutation(internal.leads.internalCreateLead, {
          customerId: conversation.customerId,
          conversationId: args.conversationId,
          initialScore: 0,
          assignedAgent: "system",
        });

        lead = await ctx.runQuery(internal.leads.internalGetLeadByConversation, {
          conversationId: args.conversationId,
        });
      }

      // Get agent state
      let agentState = await ctx.runQuery(internal.leads.internalGetAgentState, {
        conversationId: args.conversationId,
      });

      if (!agentState) {
        throw new Error("Agent state not found");
      }

      // Search for relevant knowledge
      const relevantChunks: any[] = await ctx.runAction(internal.knowledgeBase.internalSearchKnowledge, {
        query: args.customerMessage,
        limit: 3,
      });

      const context: string = relevantChunks.length > 0 
        ? relevantChunks.map((chunk: any) => chunk.content).join("\n\n")
        : "No specific knowledge base information found for this query.";

      // Analyze customer message for lead qualification signals
      const qualificationAnalysis = await analyzeCustomerMessage(args.customerMessage, lead, agentState);

      // Generate AI response based on current phase and analysis
      const response = await generatePhaseBasedResponse(
        agentState.currentPhase,
        args.customerMessage,
        context,
        lead,
        agentState,
        qualificationAnalysis
      );

      // Update lead score and qualification data
      const newScore = calculateLeadScore(lead, qualificationAnalysis);
      await ctx.runMutation(internal.leads.internalUpdateLeadScore, {
        leadId: lead!._id,
        newScore,
        qualificationData: qualificationAnalysis.updatedQualificationData,
      });

      // Update agent state
      await ctx.runMutation(internal.leads.internalUpdateAgentState, {
        conversationId: args.conversationId,
        currentPhase: response.nextPhase,
        contextData: response.updatedContextData,
      });

      // Store the AI response
      await ctx.runMutation(internal.conversations.storeAIMessage, {
        conversationId: args.conversationId,
        content: response.message,
        knowledgeSnippets: relevantChunks.map((chunk: any) => ({
          content: chunk.content.substring(0, 200) + "...",
          source: chunk.source,
          relevanceScore: chunk.relevanceScore,
        })),
      });

      // If action is to schedule a meeting, create Google Calendar event
      if (response.action === "schedule_meeting") {
        // Get conversation data for customer info
        const conversation = await ctx.runQuery(internal.conversations.internalGetConversation, {
          conversationId: args.conversationId,
        });

        await ctx.runAction(internal.googleCalendar.createGoogleCalendarEvent, {
          leadId: lead!._id,
          customerId: lead!.customerId,
          title: `Sales Consultation - ${conversation?.customer?.name || "Customer"}`,
          description: `Sales consultation for lead with score ${newScore}. Pain points: ${qualificationAnalysis.updatedQualificationData.painPoints.join(", ")}`,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour later
          timeZone: "UTC",
          customerEmail: conversation?.customer?.email || "customer@example.com",
          customerName: conversation?.customer?.name || "Customer",
        });
      }

      return {
        response: response.message,
        action: response.action,
        metadata: {
          leadScore: newScore,
          phase: response.nextPhase,
          qualificationData: qualificationAnalysis.updatedQualificationData,
        },
      };

    } catch (error) {
      console.error("Error generating lead agent response:", error);
      
      // Store fallback message
      await ctx.runMutation(internal.conversations.storeAIMessage, {
        conversationId: args.conversationId,
        content: "I apologize, but I'm experiencing technical difficulties. Let me connect you with a human agent who can better assist you.",
        knowledgeSnippets: [],
      });

      throw error;
    }
  },
});

async function analyzeCustomerMessage(
  message: string,
  lead: any,
  agentState: any
): Promise<{
  updatedQualificationData: any;
  painPoints: string[];
  interests: string[];
  budgetMentioned: boolean;
  timelineMentioned: boolean;
  decisionMakerConfirmed: boolean;
}> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Analyze this customer message for lead qualification signals. Extract:
1. Pain points mentioned
2. Interests expressed
3. Budget indicators (high/medium/low/not mentioned)
4. Timeline indicators (urgent/soon/flexible/not mentioned)
5. Decision maker confirmation (yes/no/uncertain)

Return a JSON object with this structure:
{
  "painPoints": ["pain1", "pain2"],
  "interests": ["interest1", "interest2"],
  "budgetMentioned": true,
  "timelineMentioned": false,
  "decisionMakerConfirmed": true
}

IMPORTANT: Only return valid JSON. Use true/false for boolean values, never undefined or null.`
      },
      {
        role: "user",
        content: message
      }
    ],
    max_tokens: 200,
    temperature: 0.3,
  });

  let analysis;
  try {
    const content = completion.choices[0].message.content || "{}";
    // Clean up any undefined values that might be in the JSON
    const cleanedContent = content.replace(/undefined/g, 'null').replace(/:null/g, ':false');
    analysis = JSON.parse(cleanedContent);
  } catch (error) {
    console.error("Failed to parse AI analysis JSON:", error);
    // Provide default analysis if JSON parsing fails
    analysis = {
      painPoints: [],
      interests: [],
      budgetMentioned: false,
      timelineMentioned: false,
      decisionMakerConfirmed: false,
    };
  }

  // Ensure all required fields exist with default values
  const safeAnalysis = {
    painPoints: Array.isArray(analysis.painPoints) ? analysis.painPoints : [],
    interests: Array.isArray(analysis.interests) ? analysis.interests : [],
    budgetMentioned: Boolean(analysis.budgetMentioned),
    timelineMentioned: Boolean(analysis.timelineMentioned),
    decisionMakerConfirmed: Boolean(analysis.decisionMakerConfirmed),
  };

  // Update qualification data
  const updatedQualificationData = {
    ...lead.qualificationData,
    painPoints: [...new Set([...lead.qualificationData.painPoints, ...safeAnalysis.painPoints])],
    interests: [...new Set([...lead.qualificationData.interests, ...safeAnalysis.interests])],
    budget: safeAnalysis.budgetMentioned ? analysis.budget : lead.qualificationData.budget,
    timeline: safeAnalysis.timelineMentioned ? analysis.timeline : lead.qualificationData.timeline,
    decisionMaker: safeAnalysis.decisionMakerConfirmed !== undefined ? safeAnalysis.decisionMakerConfirmed : lead.qualificationData.decisionMaker,
  };

  return {
    updatedQualificationData,
    painPoints: safeAnalysis.painPoints,
    interests: safeAnalysis.interests,
    budgetMentioned: safeAnalysis.budgetMentioned,
    timelineMentioned: safeAnalysis.timelineMentioned,
    decisionMakerConfirmed: safeAnalysis.decisionMakerConfirmed,
  };
}

async function generatePhaseBasedResponse(
  currentPhase: string,
  customerMessage: string,
  context: string,
  lead: any,
  agentState: any,
  analysis: any
): Promise<{
  message: string;
  nextPhase: string;
  action: string;
  updatedContextData: any;
}> {
  const phasePrompts = {
    greeting: `You are a friendly sales agent in the greeting phase. Your goal is to:
1. Welcome the customer warmly
2. Understand their basic needs
3. Transition to qualification phase

Current lead score: ${lead.leadScore}
Customer message: ${customerMessage}

Knowledge base context:
${context}

Be conversational and build rapport. Ask open-ended questions about their needs.`,

    qualification: `You are a consultative sales agent in the qualification phase. Your goal is to:
1. Understand their pain points and challenges
2. Identify their budget and timeline
3. Determine if they're a decision maker
4. Assess their interest level

Current lead score: ${lead.leadScore}
Qualification data: ${JSON.stringify(lead.qualificationData)}
Customer message: ${customerMessage}

Knowledge base context:
${context}

Ask probing questions to understand their situation better. Be consultative, not pushy.`,

    objection_handling: `You are a skilled sales agent handling objections. Your goal is to:
1. Address their concerns empathetically
2. Provide relevant solutions from knowledge base
3. Overcome objections with value propositions
4. Move toward closing or booking

Current lead score: ${lead.leadScore}
Objections raised: ${agentState.contextData.objectionsRaised.join(", ")}
Customer message: ${customerMessage}

Knowledge base context:
${context}

Address their concerns directly and provide compelling reasons to move forward.`,

    closing: `You are a sales agent in the closing phase. Your goal is to:
1. Summarize the value proposition
2. Create urgency if appropriate
3. Ask for the meeting/appointment
4. Handle final objections

Current lead score: ${lead.leadScore}
Qualification data: ${JSON.stringify(lead.qualificationData)}
Customer message: ${customerMessage}

Knowledge base context:
${context}

Be confident and direct about next steps. Offer to schedule a meeting. Mention that you can send them a calendar link to book a convenient time.`,

    booking: `You are a sales agent in the booking phase. Your goal is to:
1. Confirm meeting details
2. Provide calendar options
3. Confirm contact information
4. Set expectations for the meeting

Current lead score: ${lead.leadScore}
Customer message: ${customerMessage}

Knowledge base context:
${context}

Focus on scheduling logistics and confirming details. Offer to send a calendar booking link for easy scheduling.`
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: phasePrompts[currentPhase as keyof typeof phasePrompts] || phasePrompts.greeting
      },
      {
        role: "user",
        content: customerMessage
      }
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  const response = completion.choices[0].message.content || "I'd be happy to help you with that. Could you tell me more about your needs?";

  // Determine next phase and action based on analysis
  let nextPhase = currentPhase;
  let action = "continue_conversation";

  if (currentPhase === "greeting" && analysis.painPoints.length > 0) {
    nextPhase = "qualification";
  } else if (currentPhase === "qualification" && lead.leadScore >= 50) {
    nextPhase = "closing";
  } else if (currentPhase === "closing" && analysis.interests.length > 0) {
    nextPhase = "booking";
    action = "schedule_meeting";
  }

  // Check if customer is expressing interest in scheduling
  const schedulingKeywords = [
    "schedule", "meeting", "call", "demo", "consultation", "book", "calendar", 
    "available", "time", "when", "appointment", "discuss", "talk"
  ];
  
  const isSchedulingRequest = schedulingKeywords.some(keyword => 
    customerMessage.toLowerCase().includes(keyword)
  );

  if (isSchedulingRequest && lead.leadScore >= 40) {
    nextPhase = "booking";
    action = "schedule_meeting";
  }

  // Update context data
  const updatedContextData = {
    ...agentState.contextData,
    qualificationProgress: Math.min(100, agentState.contextData.qualificationProgress + 10),
    painPointsIdentified: [...new Set([...agentState.contextData.painPointsIdentified, ...analysis.painPoints])],
    interestsExpressed: [...new Set([...agentState.contextData.interestsExpressed, ...analysis.interests])],
    budgetMentioned: analysis.budgetMentioned || agentState.contextData.budgetMentioned,
    timelineMentioned: analysis.timelineMentioned || agentState.contextData.timelineMentioned,
    decisionMakerConfirmed: analysis.decisionMakerConfirmed !== undefined ? analysis.decisionMakerConfirmed : agentState.contextData.decisionMakerConfirmed,
  };

  return {
    message: response,
    nextPhase,
    action,
    updatedContextData,
  };
}

function calculateLeadScore(lead: any, analysis: any): number {
  let score = lead.leadScore;
  
  // Increase score based on qualification signals
  if (analysis.painPoints.length > 0) score += 10;
  if (analysis.interests.length > 0) score += 15;
  if (analysis.budgetMentioned) score += 20;
  if (analysis.timelineMentioned) score += 15;
  if (analysis.decisionMakerConfirmed) score += 25;
  
  // Bonus for multiple signals
  const signalCount = [analysis.painPoints.length > 0, analysis.interests.length > 0, analysis.budgetMentioned, analysis.timelineMentioned, analysis.decisionMakerConfirmed].filter(Boolean).length;
  if (signalCount >= 3) score += 10;
  
  return Math.min(100, score);
}

// Test function to verify the lead agent works without authentication and without storing messages
export const testLeadAgent = internalAction({
  args: {
    conversationId: v.id("conversations"),
    customerMessage: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    response: v.string(),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; response: string; error?: string; metadata?: any }> => {
    try {
      // Get or create lead for this conversation
      let lead = await ctx.runQuery(internal.leads.internalGetLeadByConversation, {
        conversationId: args.conversationId,
      });

      if (!lead) {
        // Get conversation to find customer
        const conversation = await ctx.runQuery(internal.conversations.internalGetConversation, {
          conversationId: args.conversationId,
        });

        if (!conversation) {
          throw new Error("Conversation not found");
        }

        // Create new lead
        const leadId = await ctx.runMutation(internal.leads.internalCreateLead, {
          customerId: conversation.customerId,
          conversationId: args.conversationId,
          initialScore: 0,
          assignedAgent: "system",
        });

        lead = await ctx.runQuery(internal.leads.internalGetLeadByConversation, {
          conversationId: args.conversationId,
        });
      }

      // Get agent state
      let agentState = await ctx.runQuery(internal.leads.internalGetAgentState, {
        conversationId: args.conversationId,
      });

      if (!agentState) {
        throw new Error("Agent state not found");
      }

      // Search for relevant knowledge
      const relevantChunks: any[] = await ctx.runAction(internal.knowledgeBase.internalSearchKnowledge, {
        query: args.customerMessage,
        limit: 3,
      });

      const context: string = relevantChunks.length > 0 
        ? relevantChunks.map((chunk: any) => chunk.content).join("\n\n")
        : "No specific knowledge base information found for this query.";

      // Analyze customer message for lead qualification signals
      const qualificationAnalysis = await analyzeCustomerMessage(args.customerMessage, lead, agentState);

      // Generate AI response based on current phase and analysis
      const response = await generatePhaseBasedResponse(
        agentState.currentPhase,
        args.customerMessage,
        context,
        lead,
        agentState,
        qualificationAnalysis
      );

      // Update lead score and qualification data
      const newScore = calculateLeadScore(lead, qualificationAnalysis);
      await ctx.runMutation(internal.leads.internalUpdateLeadScore, {
        leadId: lead!._id,
        newScore,
        qualificationData: qualificationAnalysis.updatedQualificationData,
      });

      // Update agent state
      await ctx.runMutation(internal.leads.internalUpdateAgentState, {
        conversationId: args.conversationId,
        currentPhase: response.nextPhase,
        contextData: response.updatedContextData,
      });

      // Return response without storing it as a message
      return {
        success: true,
        response: response.message,
        metadata: {
          leadScore: newScore,
          phase: response.nextPhase,
          action: response.action,
          qualificationData: qualificationAnalysis.updatedQualificationData,
        },
      };
    } catch (error) {
      return {
        success: false,
        response: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
