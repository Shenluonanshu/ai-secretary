import type { Metadata } from "next";
import { AuthGuard } from "@/components/AuthGuard";
import { SpeechProvider } from "@/lib/speech/SpeechContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "知行 AI 秘书",
  description: "你的 AI 生活秘书 — 对话式日程、待办、习惯管理",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI 秘书",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
  themeColor: "#4a5be7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Theme init — must run before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var t=localStorage.getItem('theme')||'system';
                if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){
                  document.documentElement.setAttribute('data-theme','dark');
                } else if(t==='light'){
                  document.documentElement.setAttribute('data-theme','light');
                } else {
                  document.documentElement.setAttribute('data-theme','system');
                }
              })();
            `,
          }}
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#4a5be7" />
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
