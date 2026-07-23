import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type LiveGiftEvent = {
  id: string;
  emoji: string;
  name: string;
  senderName: string;
  cost: number;
};

interface Props {
  liveId: string;
  className?: string;
  onGift?: (evt: LiveGiftEvent) => void;
}

/** Realtime gift toasts floating over the player. */
export function LiveGiftOverlay({ liveId, className, onGift }: Props) {
  const [toasts, setToasts] = useState<LiveGiftEvent[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`live_gifts:${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_gifts",
          filter: `live_id=eq.${liveId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            gift_id: string;
            sender_id: string;
          };
          const [{ data: gift }, { data: sender }] = await Promise.all([
            supabase.from("gifts").select("name, emoji, cost").eq("id", row.gift_id).maybeSingle(),
            supabase.from("profiles").select("name").eq("id", row.sender_id).maybeSingle(),
          ]);
          const evt: LiveGiftEvent = {
            id: row.id,
            emoji: gift?.emoji ?? "🎁",
            name: gift?.name ?? "Presente",
            senderName: sender?.name ?? "Fã",
            cost: Number(gift?.cost ?? 0),
          };
          onGift?.(evt);
          setToasts((prev) => [...prev.slice(-4), evt]);
          window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== evt.id));
          }, 4500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, onGift]);

  if (toasts.length === 0) return null;

  return (
    <div className={cn("pointer-events-none absolute inset-x-3 bottom-16 z-20 flex flex-col gap-2", className)}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-in slide-in-from-left-4 fade-in duration-300 self-start rounded-full bg-background/90 border border-yellow-500/40 px-3 py-1.5 flex items-center gap-2 shadow-lg backdrop-blur-sm"
        >
          <span className="text-lg">{t.emoji}</span>
          <div className="text-xs">
            <span className="font-semibold text-foreground">{t.senderName}</span>
            <span className="text-muted-foreground"> enviou </span>
            <span className="font-semibold text-yellow-400">{t.name}</span>
          </div>
          <Gift className="h-3.5 w-3.5 text-yellow-400" />
        </div>
      ))}
    </div>
  );
}
