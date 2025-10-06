// app/layout.tsx - Clean UI Component

import type { Metadata } from "next";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

// Metadata is kept as it's standard Next.js functionality
export const metadata: Metadata = {
  title: "Omnichannel Communication Dashboard",
  description: "A comprehensive customer support dashboard with AI-powered assistance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>          
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}