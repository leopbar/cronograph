import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cronograph | Quantitative Crypto Analysis",
  description: "Advanced quantitative analysis platform for crypto assets.",
};

import { Sidebar } from "@/components/layout/sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body 
        className="flex h-screen overflow-hidden bg-[#07111F] text-white antialiased font-sans"
      >
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-blue-glow">
          {children}
        </main>
      </body>
    </html>
  );
}

