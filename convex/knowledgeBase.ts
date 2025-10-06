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

      return await ctx.storage.generateUploadUrl();
    },
  });
  
  export const uploadDocument = mutation({
    args: {
      filename: v.string(),
      storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
  
      const documentId = await ctx.db.insert("documents", {
        filename: args.filename,
        storageId: args.storageId,
        uploadedBy: undefined,
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
        const file = await ctx.storage.get(document.storageId);
        if (!file) throw new Error("File not found in storage");
  
        const buffer = await file.arrayBuffer();
  
        const text = await getText(ctx, {
          storageId: document.storageId,
          filename: document.filename,
          bytes: buffer,
          mimeType: file.type,
        });
  
        const chunks = splitTextIntoChunks(text, 500);
  
        const entryIds: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const { entryId } = await rag.add(ctx, {
            namespace: "public", // no-auth: use shared namespace
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
  
      const doc = await ctx.db.get(documentId);
      if (!doc) throw new Error("Document not found");
      // no-auth: anyone can delete for now (or add your own rule)
  
      if (doc.entryIds) {
        for (const entryId of doc.entryIds) {
          await rag.deleteAsync(ctx, { entryId: entryId as any });
        }
      }
  
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(documentId);
    },
  });
  
  export const listDocuments = query({
    args: {},
    handler: async (ctx) => {
      return await ctx.db
        .query("documents")
        .order("desc")
        .collect();
    },
  });
  
  export const searchKnowledge = action({
    args: { query: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, { query, limit }) => {
  
      const { results } = await rag.search(ctx, {
        namespace: "public",
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
  
      // 1) Retrieval pre-check: ensure the query is grounded in the user's knowledge base
      const { results: precheckResults } = await rag.search(ctx, {
        namespace: "public",
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
          namespace: "public",  // no-auth: shared knowledge base
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
  