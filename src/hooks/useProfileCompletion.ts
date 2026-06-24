import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompletionStep {
  key: string;
  label: string;
  done: boolean;
  link: string;
}

export function useProfileCompletion() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profileCompletion", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [profileResult, plansResult, postResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("bio, avatar_url, cover_url")
          .eq("id", user!.id)
          .single(),
        supabase
          .from("creator_plans")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user!.id),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user!.id),
      ]);

      const p = profileResult.data;
      const plansCount = plansResult.count ?? 0;
      const postCount = postResult.count ?? 0;

      const steps: CompletionStep[] = [
        { key: "avatar", label: "Foto de perfil", done: !!p?.avatar_url, link: "/settings" },
        { key: "bio",    label: "Bio do perfil",   done: !!(p?.bio?.trim()), link: "/settings" },
        { key: "cover",  label: "Foto de capa",    done: !!p?.cover_url, link: "/settings" },
        { key: "plans",  label: "Criar planos",    done: plansCount > 0, link: "/settings" },
        { key: "post",   label: "Publicar 1º post", done: postCount > 0, link: "#upload" },
      ];

      const completed = steps.filter((s) => s.done).length;
      return { steps, completed, total: steps.length };
    },
  });
}
