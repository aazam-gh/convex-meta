import {
    query,
    mutation,
    action,
    internalQuery,
    internalMutation,
    internalAction,
  } from "./_generated/server";
  import { v } from "convex/values";
  import { internal } from "./_generated/api";
  import { openai } from "@ai-sdk/openai";
  import { components } from "./_generated/api";
  import { RAG } from "@convex-dev/rag";
  import { getText } from "./getText";
  
  const rag = new RAG(components.rag, {
    textEmbeddingModel: openai.embedding("text-embedding-3-small"),
    embeddingDimension: 1536,
  });
  
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});
  
export const uploadDocument = mutation({
  args: {
    filename: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const documentId = await ctx.db.insert("documents", {
      filename: args.filename,
      storageId: args.storageId,
      uploadedBy: identity.email!, // Store user email
      uploadedAt: Date.now(),
      status: "processing",
    });

    await ctx.scheduler.runAfter(0, internal.knowledgeBase.processDocument, {
      documentId,
    });

    return documentId;
  },
});
  
  export const processDocument = internalAction({
    args: { documentId: v.id("documents") },
    handler: async (ctx, args) => {
      const document = await ctx.runQuery(internal.knowledgeBase.getDocument, {
        documentId: args.documentId,
      });
      if (!document) throw new Error("Document not found");
  
      try {
        const storageId = document.storageId;
        if (!storageId) {
          throw new Error("Document missing storageId");
        }
        const file = await ctx.storage.get(storageId);
        if (!file) throw new Error("File not found in storage");
  
        const buffer = await file.arrayBuffer();
  
        const text = await getText(ctx, {
          storageId,
          filename: document.filename,
          bytes: buffer,
          mimeType: file.type,
        });
  
        const chunks = splitTextIntoChunks(text, 500);
  
        const entryIds: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const { entryId } = await rag.add(ctx, {
            namespace: document.uploadedBy ?? "system", // Use user email as namespace
            text: chunks[i],
            metadata: {
              filename: document.filename,
              chunkIndex: i,
              uploadedBy: document.uploadedBy ?? "system",
            },
          });
          entryIds.push(entryId as string);
        }
  
        await ctx.runMutation(internal.knowledgeBase.updateDocumentStatus, {
          documentId: args.documentId,
          status: "completed",
          chunksCount: chunks.length,
          entryIds,
        });
      } catch (error) {
        console.error("Error processing document:", error);
        await ctx.runMutation(internal.knowledgeBase.updateDocumentStatus, {
          documentId: args.documentId,
          status: "failed",
        });
      }
    },
  });
  
  function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = "";
  
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (currentChunk.length + trimmed.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? ". " : "") + trimmed;
      } else {
        if (currentChunk) chunks.push(currentChunk + ".");
        currentChunk = trimmed;
      }
    }
  
    if (currentChunk) chunks.push(currentChunk + ".");
    return chunks;
  }
  
  export const getDocument = internalQuery({
    args: { documentId: v.id("documents") },
    handler: async (ctx, args) => {
      return await ctx.db.get(args.documentId);
    },
  });
  
  export const updateDocumentStatus = internalMutation({
    args: {
      documentId: v.id("documents"),
      status: v.string(),
      chunksCount: v.optional(v.number()),
      entryIds: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
      const updateData: any = { status: args.status };
      if (args.chunksCount !== undefined) updateData.chunksCount = args.chunksCount;
      if (args.entryIds !== undefined) updateData.entryIds = args.entryIds;
      await ctx.db.patch(args.documentId, updateData);
    },
  });
  
export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const doc = await ctx.db.get(documentId);
    if (!doc) throw new Error("Document not found");
    
    // Ensure user can only delete their own documents
    if (doc.uploadedBy !== identity.email!) {
      throw new Error("Not authorized to delete this document");
    }

    if (doc.entryIds) {
      for (const entryId of doc.entryIds) {
        await rag.deleteAsync(ctx, { entryId: entryId as any });
      }
    }

    if (doc.storageId) {
      await ctx.storage.delete(doc.storageId);
    }
    await ctx.db.delete(documentId);
  },
});
  
export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Only return documents uploaded by the current user
    return await ctx.db
      .query("documents")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", identity.email!))
      .order("desc")
      .collect();
  },
});

export const ingestWebsite = mutation({
  args: { url: v.string(), title: v.optional(v.string()) },
  handler: async (ctx, { url, title }) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const filename = title || url;

    const documentId = await ctx.db.insert("documents", {
      filename,
      // No storageId for web sources
      uploadedBy: identity.email!,
      uploadedAt: Date.now(),
      status: "processing",
      sourceType: "web",
      sourceUrl: url,
    } as any);

    await ctx.scheduler.runAfter(0, internal.knowledgeBase.processWebsite, {
      documentId,
    });

    return documentId;
  },
});

export const processWebsite = internalAction({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.runQuery(internal.knowledgeBase.getDocument, {
      documentId,
    });
    if (!document) throw new Error("Document not found");
    if (document.sourceType !== "web" || !document.sourceUrl) {
      throw new Error("Document is not a web source");
    }

    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) throw new Error("Missing FIRECRAWL_API_KEY env var");

      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: document.sourceUrl,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Firecrawl error: ${res.status} ${errText}`);
      }

      const data: any = await res.json();
      // Firecrawl may return { markdown, content, ... }
      const text: string = data.markdown || data.content || JSON.stringify(data);

      const chunks = splitTextIntoChunks(text, 500);

      const entryIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const { entryId } = await rag.add(ctx, {
          namespace: document.uploadedBy ?? "system",
          text: chunks[i],
          metadata: {
            filename: document.filename,
            chunkIndex: i,
            uploadedBy: document.uploadedBy ?? "system",
            sourceType: "web",
            sourceUrl: document.sourceUrl,
          },
        });
        entryIds.push(entryId as string);
      }

      await ctx.runMutation(internal.knowledgeBase.updateDocumentStatus, {
        documentId,
        status: "completed",
        chunksCount: chunks.length,
        entryIds,
      });
    } catch (error) {
      console.error("Error processing website:", error);
      await ctx.runMutation(internal.knowledgeBase.updateDocumentStatus, {
        documentId,
        status: "failed",
      });
    }
  },
});
  
export const searchKnowledge = action({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query, limit }) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { results } = await rag.search(ctx, {
      namespace: identity.email!, // Search only in user's namespace
      query,
      limit: limit ?? 5,
      vectorScoreThreshold: 0.5,
    });

    return results;
  },
});
  
export const askQuestion = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    // Ensure user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 1) Retrieval pre-check: ensure the query is grounded in the user's knowledge base
    const { results: precheckResults } = await rag.search(ctx, {
      namespace: identity.email!, // Search only in user's namespace
      query: prompt,
      limit: 5,
      vectorScoreThreshold: 0.5,
    });

    // const hasSufficientContext = precheckResults && precheckResults.length > 0;
    // if (!hasSufficientContext) {
    //   return {
    //     answer: "Sorry I cannot help with that. Please ask me anything related to your data",
    //     chunks: [],
    //   };
    // }

    // 2) Generate answer constrained to retrieved context
    const guardedPrompt = `You are a retrieval-grounded assistant. Use ONLY the provided context from the user's knowledge base to answer. If the context is insufficient or unrelated, say: \n\n\"Sorry I cannot help with that. Please ask me anything related to your data\".\n\nUser question: ${prompt}`;

    const { text, context } = await rag.generateText(ctx, {
      search: {
        namespace: identity.email!, // Search only in user's namespace
        limit: 5,
      },
      prompt: guardedPrompt,
      model: openai.chat("gpt-5-mini"),
    });

    return {
      answer: text,
      chunks: context.entries, // optional: useful for showing sources
    };
  },
});
  
  // Internal variant that allows specifying the RAG namespace explicitly.
  // Useful for system-triggered flows (e.g., webhooks) that don't have an authenticated user.
  export const askQuestionForNamespace = internalAction({
    args: { namespace: v.string(), prompt: v.string() },
    handler: async (ctx, { namespace, prompt }) => {
      const guardedPrompt = `You are a retrieval-grounded assistant. Use ONLY the provided context to answer. If the context is insufficient or unrelated, say: \n\n"Sorry I cannot help with that. Please ask me anything related to your data".\n\nUser question: ${prompt}`;
  
      const { text, context } = await rag.generateText(ctx, {
        search: {
          namespace,
          limit: 5,
        },
        prompt: guardedPrompt,
        model: openai.chat("gpt-5-mini"),
      });
  
      return {
        answer: text,
        chunks: context.entries,
      };
    },
  });

// Internal version of searchKnowledge for use by internal actions
export const internalSearchKnowledge = internalAction({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, { query, limit }) => {
    // Use a default namespace for internal searches
    const { results } = await rag.search(ctx, {
      namespace: "system", // Use system namespace for internal searches
      query,
      limit: limit ?? 5,
      vectorScoreThreshold: 0.5,
    });

    return results;
  },
});
  