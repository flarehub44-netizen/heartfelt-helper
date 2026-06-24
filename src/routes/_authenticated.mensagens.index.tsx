import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { relativeTimePtBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/mensagens/")({
  component: ConversationsPage,
});

function ConversationsPage() {
  const { user } = useAuth();

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, creator_id, fan_id, last_message_at, creator:profiles!conv_creator_profile_fkey(handle, display_name, avatar_url), fan:profiles!conv_fan_profile_fkey(handle, display_name, avatar_url)")
        .or(`creator_id.eq.${user!.id},fan_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      if (error) console.error(error);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-4xl">Mensagens</h1>
      <p className="text-muted-foreground">Conversas com criadores e fãs.</p>

      <div className="mt-8 space-y-2">
        {conversations.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Você ainda não tem conversas. Visite um criador para começar.
          </p>
        )}
        {conversations.map((c) => {
          const other = c.creator_id === user!.id ? c.fan : c.creator;
          return (
            <Link
              key={c.id}
              to="/mensagens/$conversationId"
              params={{ conversationId: c.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-sm font-bold uppercase">
                {other?.avatar_url ? (
                  <img src={other.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  other?.display_name?.[0] ?? "?"
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{other?.display_name}</p>
                <p className="text-xs text-muted-foreground">@{other?.handle}</p>
              </div>
              <p className="text-xs text-muted-foreground">{relativeTimePtBR(c.last_message_at)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
