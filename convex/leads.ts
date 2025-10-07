import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Lead management functions
export const createLead = mutation({
  args: {
    customerId: v.id("customers"),
    conversationId: v.id("conversations"),
    initialScore: v.optional(v.number()),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const leadId = await ctx.db.insert("leads", {
      customerId: args.customerId,
      conversationId: args.conversationId,
      status: "prospect",
      leadScore: args.initialScore || 0,
      qualificationData: {
        painPoints: [],
        interests: [],
      },
      lastQualificationAt: Date.now(),
      assignedAgent: identity.email!,
    });

    // Create initial agent state
    await ctx.db.insert("agentStates", {
      conversationId: args.conversationId,
      currentPhase: "greeting",
      contextData: {
        qualificationProgress: 0,
        objectionsRaised: [],
        painPointsIdentified: [],
        interestsExpressed: [],
      },
      lastUpdated: Date.now(),
      agentPersonality: "consultative",
    });

    return leadId;
  },
});

export const updateLeadScore = mutation({
  args: {
    leadId: v.id("leads"),
    newScore: v.number(),
    qualificationData: v.optional(v.object({
      budget: v.optional(v.string()),
      timeline: v.optional(v.string()),
      painPoints: v.array(v.string()),
      interests: v.array(v.string()),
      companySize: v.optional(v.string()),
      decisionMaker: v.optional(v.boolean()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    const updateData: any = {
      leadScore: args.newScore,
      lastQualificationAt: Date.now(),
    };

    if (args.qualificationData) {
      updateData.qualificationData = args.qualificationData;
    }

    // Update lead status based on score
    if (args.newScore >= 80) {
      updateData.status = "qualified";
    } else if (args.newScore >= 50) {
      updateData.status = "nurturing";
    }

    await ctx.db.patch(args.leadId, updateData);
    return null;
  },
});

export const getLeadByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.union(
    v.object({
      _id: v.id("leads"),
      customerId: v.id("customers"),
      conversationId: v.id("conversations"),
      status: v.string(),
      leadScore: v.number(),
      qualificationData: v.object({
        budget: v.optional(v.string()),
        timeline: v.optional(v.string()),
        painPoints: v.array(v.string()),
        interests: v.array(v.string()),
        companySize: v.optional(v.string()),
        decisionMaker: v.optional(v.boolean()),
      }),
      lastQualificationAt: v.number(),
      assignedAgent: v.optional(v.string()),
      notes: v.optional(v.string()),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const lead = await ctx.db
      .query("leads")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    return lead;
  },
});

export const getAgentState = query({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.union(
    v.object({
      _id: v.id("agentStates"),
      conversationId: v.id("conversations"),
      currentPhase: v.string(),
      contextData: v.object({
        qualificationProgress: v.number(),
        objectionsRaised: v.array(v.string()),
        painPointsIdentified: v.array(v.string()),
        interestsExpressed: v.array(v.string()),
        budgetMentioned: v.optional(v.boolean()),
        timelineMentioned: v.optional(v.boolean()),
        decisionMakerConfirmed: v.optional(v.boolean()),
      }),
      lastUpdated: v.number(),
      agentPersonality: v.string(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const agentState = await ctx.db
      .query("agentStates")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    return agentState;
  },
});

export const updateAgentState = mutation({
  args: {
    conversationId: v.id("conversations"),
    currentPhase: v.optional(v.string()),
    contextData: v.optional(v.object({
      qualificationProgress: v.number(),
      objectionsRaised: v.array(v.string()),
      painPointsIdentified: v.array(v.string()),
      interestsExpressed: v.array(v.string()),
      budgetMentioned: v.optional(v.boolean()),
      timelineMentioned: v.optional(v.boolean()),
      decisionMakerConfirmed: v.optional(v.boolean()),
    })),
    agentPersonality: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const agentState = await ctx.db
      .query("agentStates")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    if (!agentState) {
      throw new Error("Agent state not found");
    }

    const updateData: any = {
      lastUpdated: Date.now(),
    };

    if (args.currentPhase) {
      updateData.currentPhase = args.currentPhase;
    }

    if (args.contextData) {
      updateData.contextData = args.contextData;
    }

    if (args.agentPersonality) {
      updateData.agentPersonality = args.agentPersonality;
    }

    await ctx.db.patch(agentState._id, updateData);
    return null;
  },
});

export const listLeads = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("leads"),
    customerId: v.id("customers"),
    conversationId: v.id("conversations"),
    status: v.string(),
    leadScore: v.number(),
    qualificationData: v.object({
      budget: v.optional(v.string()),
      timeline: v.optional(v.string()),
      painPoints: v.array(v.string()),
      interests: v.array(v.string()),
      companySize: v.optional(v.string()),
      decisionMaker: v.optional(v.boolean()),
    }),
    lastQualificationAt: v.number(),
    assignedAgent: v.optional(v.string()),
    notes: v.optional(v.string()),
    _creationTime: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let leads;
    
    if (args.status) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(args.limit || 50);
    } else {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_lead_score")
        .order("desc")
        .take(args.limit || 50);
    }

    return leads;
  },
});

// Internal versions of functions for use by internal actions
export const internalGetLeadByConversation = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.union(
    v.object({
      _id: v.id("leads"),
      customerId: v.id("customers"),
      conversationId: v.id("conversations"),
      status: v.string(),
      leadScore: v.number(),
      qualificationData: v.object({
        budget: v.optional(v.string()),
        timeline: v.optional(v.string()),
        painPoints: v.array(v.string()),
        interests: v.array(v.string()),
        companySize: v.optional(v.string()),
        decisionMaker: v.optional(v.boolean()),
      }),
      lastQualificationAt: v.number(),
      assignedAgent: v.optional(v.string()),
      notes: v.optional(v.string()),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    return lead;
  },
});

export const internalCreateLead = internalMutation({
  args: {
    customerId: v.id("customers"),
    conversationId: v.id("conversations"),
    initialScore: v.optional(v.number()),
    assignedAgent: v.optional(v.string()),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert("leads", {
      customerId: args.customerId,
      conversationId: args.conversationId,
      status: "prospect",
      leadScore: args.initialScore || 0,
      qualificationData: {
        painPoints: [],
        interests: [],
      },
      lastQualificationAt: Date.now(),
      assignedAgent: args.assignedAgent || "system",
    });

    // Create initial agent state
    await ctx.db.insert("agentStates", {
      conversationId: args.conversationId,
      currentPhase: "greeting",
      contextData: {
        qualificationProgress: 0,
        objectionsRaised: [],
        painPointsIdentified: [],
        interestsExpressed: [],
      },
      lastUpdated: Date.now(),
      agentPersonality: "consultative",
    });

    return leadId;
  },
});

export const internalUpdateLeadScore = internalMutation({
  args: {
    leadId: v.id("leads"),
    newScore: v.number(),
    qualificationData: v.optional(v.object({
      budget: v.optional(v.string()),
      timeline: v.optional(v.string()),
      painPoints: v.array(v.string()),
      interests: v.array(v.string()),
      companySize: v.optional(v.string()),
      decisionMaker: v.optional(v.boolean()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    const updateData: any = {
      leadScore: args.newScore,
      lastQualificationAt: Date.now(),
    };

    if (args.qualificationData) {
      updateData.qualificationData = args.qualificationData;
    }

    // Update lead status based on score
    if (args.newScore >= 80) {
      updateData.status = "qualified";
    } else if (args.newScore >= 50) {
      updateData.status = "nurturing";
    }

    await ctx.db.patch(args.leadId, updateData);
    return null;
  },
});

export const internalGetAgentState = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.union(
    v.object({
      _id: v.id("agentStates"),
      conversationId: v.id("conversations"),
      currentPhase: v.string(),
      contextData: v.object({
        qualificationProgress: v.number(),
        objectionsRaised: v.array(v.string()),
        painPointsIdentified: v.array(v.string()),
        interestsExpressed: v.array(v.string()),
        budgetMentioned: v.optional(v.boolean()),
        timelineMentioned: v.optional(v.boolean()),
        decisionMakerConfirmed: v.optional(v.boolean()),
      }),
      lastUpdated: v.number(),
      agentPersonality: v.string(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const agentState = await ctx.db
      .query("agentStates")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    return agentState;
  },
});

export const internalUpdateAgentState = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    currentPhase: v.optional(v.string()),
    contextData: v.optional(v.object({
      qualificationProgress: v.number(),
      objectionsRaised: v.array(v.string()),
      painPointsIdentified: v.array(v.string()),
      interestsExpressed: v.array(v.string()),
      budgetMentioned: v.optional(v.boolean()),
      timelineMentioned: v.optional(v.boolean()),
      decisionMakerConfirmed: v.optional(v.boolean()),
    })),
    agentPersonality: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agentState = await ctx.db
      .query("agentStates")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    if (!agentState) {
      throw new Error("Agent state not found");
    }

    const updateData: any = {
      lastUpdated: Date.now(),
    };

    if (args.currentPhase) {
      updateData.currentPhase = args.currentPhase;
    }

    if (args.contextData) {
      updateData.contextData = args.contextData;
    }

    if (args.agentPersonality) {
      updateData.agentPersonality = args.agentPersonality;
    }

    await ctx.db.patch(agentState._id, updateData);
    return null;
  },
});
