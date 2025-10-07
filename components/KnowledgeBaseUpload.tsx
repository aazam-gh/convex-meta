// components/knowledgebase.tsx

import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export function KnowledgeBaseUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex queries and mutations
  const generateUploadUrl = useMutation(api.knowledgeBase.generateUploadUrl);
  const uploadDocument = useMutation(api.knowledgeBase.uploadDocument);
  const ingestWebsite = useMutation(api.knowledgeBase.ingestWebsite);
  const deleteDocument = useMutation(api.knowledgeBase.deleteDocument);
  const documents = useQuery(api.knowledgeBase.listDocuments) || [];

  // Determine the allowed domain based on previously scraped documents
  const allowedDomain = useMemo(() => {
    const webDocuments = documents.filter(doc => doc.sourceType === "web" && doc.sourceUrl);
    if (webDocuments.length === 0) {
      return null; // No domain restriction yet
    }
    
    // Get the domain from the first web document
    try {
      const firstUrl = new URL(webDocuments[0].sourceUrl!);
      return firstUrl.hostname.toLowerCase();
    } catch {
      return null;
    }
  }, [documents]);

  // Validate URL based on domain restrictions
  const validateUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // If no domain restriction yet, allow any valid URL
      if (!allowedDomain) {
        return null; // Valid URL
      }
      
      // Check if the hostname matches the allowed domain or is a subdomain of it
      if (hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)) {
        return null; // Valid URL
      }
      
      return `Only URLs from ${allowedDomain} are allowed for scraping. You've already scraped from this domain.`;
    } catch (error) {
      return "Please enter a valid URL.";
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Generate upload URL
      const postUrl = await generateUploadUrl();
      
      // 2. Upload file to Convex storage
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // 3. Trigger document processing
      await uploadDocument({
        filename: file.name,
        storageId,
      });

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleIngestUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    
    // Validate URL before proceeding
    const validationError = validateUrl(trimmed);
    if (validationError) {
      setUrlError(validationError);
      return;
    }
    
    setUrlError(""); // Clear any previous errors
    setIsUploading(true);
    try {
      await ingestWebsite({ url: trimmed });
      setUrl("");
    } catch (err) {
      console.error("URL ingest failed:", err);
      alert("Failed to scrape URL. Check the address and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: Id<"documents">) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      await deleteDocument({ documentId });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete document.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-100";
      case "processing": return "text-yellow-600 bg-yellow-100";
      case "failed": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "✅";
      case "processing": return "⏳";
      case "failed": return "❌";
      default: return "📄";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Knowledge Base</h3>

      {/* Upload Section */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">📚</div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Documents</h4>
          <p className="text-sm text-gray-500 mb-4">Upload PDFs, images, or text files to add knowledge.</p>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? "Uploading..." : "Choose File"}
          </button>
        </div>
      </div>

      {/* URL Ingest Section */}
      <div className="mb-6">
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Add Website URL
            {allowedDomain && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🔒 Domain Locked
              </span>
            )}
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Scrape a webpage and index its content into your knowledge base.
            {allowedDomain ? (
              <span className="font-medium text-blue-600"> You can only scrape from {allowedDomain} now.</span>
            ) : (
              <span className="font-medium text-green-600"> You can scrape from any domain for your first upload.</span>
            )}
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError(""); // Clear error when user types
              }}
              placeholder={allowedDomain ? `https://${allowedDomain}/article` : "https://example.com/article"}
              className={`flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${
                urlError ? "border-red-500" : ""
              }`}
              disabled={isUploading}
            />
            <button
              onClick={handleIngestUrl}
              disabled={isUploading || !url.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isUploading ? "Scraping…" : "Scrape & Add"}
            </button>
          </div>
          {urlError && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {urlError}
            </div>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Uploaded Documents ({documents.length})
        </h4>

        {documents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(doc.status)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        const date = new Date(doc.uploadedAt);
                        const year = date.getFullYear();
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const day = date.getDate().toString().padStart(2, '0');
                        return `${month}/${day}/${year}`;
                      })()}
                      {doc.chunksCount && ` • ${doc.chunksCount} chunks`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="px-2 py-1 text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}