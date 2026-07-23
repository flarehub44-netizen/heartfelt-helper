import { toast } from "sonner";

const PROMPTED_KEY = "push_high_intent_prompted";

type EnablePushFn = () => Promise<{ ok: boolean; error?: string }>;

/**
 * Soft-prompt push once after high-intent moments (follow, enter live).
 * Avoids nagging: one prompt per browser, skipped if already subscribed/denied.
 */
export async function promptPushAfterHighIntent(opts: {
  supported: boolean;
  vapidConfigured: boolean;
  subscribed: boolean;
  permission: NotificationPermission | "unsupported";
  enablePush: EnablePushFn;
  reason?: string;
}): Promise<void> {
  const {
    supported,
    vapidConfigured,
    subscribed,
    permission,
    enablePush,
    reason = "Receba avisos de lives e renovações",
  } = opts;

  if (!supported || !vapidConfigured || subscribed) return;
  if (permission === "denied" || permission === "unsupported") return;
  try {
    if (localStorage.getItem(PROMPTED_KEY) === "1") return;
    localStorage.setItem(PROMPTED_KEY, "1");
  } catch {
    return;
  }

  toast(reason, {
    duration: 8000,
    action: {
      label: "Ativar",
      onClick: () => {
        void enablePush().then((res) => {
          if (res.ok) toast.success("Alertas ativados!");
          else if (res.error) toast.error(res.error);
        });
      },
    },
  });
}
