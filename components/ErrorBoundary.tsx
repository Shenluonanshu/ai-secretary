"use client";
import { useEffect } from "react";
import { installErrorHandler } from "@/lib/logger";

/**
 * 安装全局错误处理器并渲染子组件
 * 放在 layout 中，不要包裹任何业务逻辑
 */
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installErrorHandler();
  }, []);

  return <>{children}</>;
}
