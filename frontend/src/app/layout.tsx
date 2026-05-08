import type { Metadata } from "next";
import "./globals.css";
import { AuthLayout } from "@/components/layout/auth-layout";

export const metadata: Metadata = {
  title: "Cronograph | Quantitative Crypto Analysis",
  description: "Advanced quantitative analysis platform for crypto assets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="flex h-screen overflow-hidden bg-[#07111F] text-white antialiased font-sans">
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
