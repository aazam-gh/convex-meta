// app/page.tsx - Clean UI Component

"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "../components/Dashboard";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-xl font-semibold">Welcome</h1>
      </div>
      <Dashboard />
    </div>
  );
}