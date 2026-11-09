import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AgentTower — Control Plane for Autonomous AI Agents",
  description: "Framework-Agnostic Governance, Monitoring, Lineage & Remediation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}

