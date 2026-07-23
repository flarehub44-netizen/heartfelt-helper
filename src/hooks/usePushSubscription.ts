import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim();

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushPermission = NotificationPermission | "unsupported";

export function usePushSubscription() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY;

  const syncSubscription = useCallback(async () => {
    if (!user || !supported) {
      setSubscribed(false);
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      if (sub) {
        const json = sub.toJSON();
        const endpoint = json.endpoint;
        const p256dh = json.keys?.p256dh;
        const auth = json.keys?.auth;
        if (endpoint && p256dh && auth) {
          await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint,
              p256dh,
              auth,
              user_agent: navigator.userAgent.slice(0, 512),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "endpoint" }
          );
        }
      }
    } catch {
      setSubscribed(false);
    }
  }, [user, supported]);

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
    void syncSubscription();
  }, [supported, syncSubscription, user?.id]);

  const enablePush = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: "Faça login para ativar alertas" };
    if (!supported || !VAPID_PUBLIC_KEY) {
      return { ok: false, error: "Push não disponível neste navegador" };
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        return { ok: false, error: "Permissão de notificação negada" };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        return { ok: false, error: "Falha ao obter subscription" };
      }

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 512),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
      if (error) return { ok: false, error: error.message };

      setSubscribed(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erro ao ativar push" };
    } finally {
      setBusy(false);
    }
  }, [user, supported]);

  const disablePush = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (user) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
        }
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported, user]);

  return {
    supported,
    permission,
    subscribed,
    busy,
    enablePush,
    disablePush,
    vapidConfigured: !!VAPID_PUBLIC_KEY,
  };
}
