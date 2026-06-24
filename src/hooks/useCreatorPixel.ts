import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function useCreatorPixel(pixelId: string | undefined) {
  useEffect(() => {
    if (!pixelId || !window.fbq) return;
    window.fbq("init", pixelId);
    window.fbq("trackSingle", pixelId, "PageView");
  }, [pixelId]);
}
