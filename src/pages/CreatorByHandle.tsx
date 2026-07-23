import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CreatorProfile from "@/pages/CreatorProfile";

/**
 * Canonical public creator URL: /u/:handle
 * Resolves handle → id and renders the profile UI with id injected via history state.
 */
const CreatorByHandle = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;
    const clean = handle.replace(/^@/, "");
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", clean)
        .eq("role", "creator")
        .maybeSingle();
      if (cancelled) return;
      if (data?.id) {
        setCreatorId(data.id);
      } else {
        navigate("/404", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, navigate]);

  if (!creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando…</div>
      </div>
    );
  }

  return <CreatorProfile creatorIdOverride={creatorId} />;
};

export default CreatorByHandle;
