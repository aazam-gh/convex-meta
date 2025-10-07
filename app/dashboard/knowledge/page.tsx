"use client";

import { KnowledgeBaseUpload } from "../../../components/KnowledgeBaseUpload";

export default function KnowledgePage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
          <p className="text-gray-600">
            Upload PDF documents to power AI responses with your support content
          </p>
        </div>
        <div className="h-full overflow-auto">
          <KnowledgeBaseUpload />
        </div>
      </div>
    </div>
  );
}
