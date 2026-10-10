import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { SiteChrome } from "@/components/site-chrome";
import { ThemeScrollbar } from "@/components/theme-scrollbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Analyzer",
  description: "Resume analysis and job matching for candidates and recruiters.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ThemeScrollbar />
        <AuthProvider><SiteChrome>{children}</SiteChrome></AuthProvider>
      </body>
    </html>
  );
}
