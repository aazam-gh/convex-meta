"use client";

import { FacebookPagesManager } from "../../../components/FacebookPagesManager";

export default function FacebookPagesPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Facebook Pages Manager</h1>
          <p className="text-gray-600">
            Manage your Facebook page conversations and messages using the Facebook Pages API
          </p>
        </div>
        <div className="h-full overflow-auto">
          <FacebookPagesManager />
        </div>
      </div>
    </div>
  );
}
