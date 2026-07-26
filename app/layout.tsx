import type { Metadata } from "next";
import { AuthGuard } from "@/components/AuthGuard";
import { SpeechProvider } from "@/lib/speech/SpeechContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "知行 AI 秘书",
  description: "你的日程与行程助手",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI 秘书",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#3446d3" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <AuthGuard>
          <SpeechProvider>{children}</SpeechProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
