import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CreatorProfile from "@/pages/CreatorProfile";

/**
 * Legacy /creator/:id — redirects to canonical /u/:handle when handle exists.
 * Falls back to rendering the profile by id if the creator has no handle yet.
 */
const CreatorIdRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", id)
        .eq("role", "creator")
        .maybeSingle();
      if (cancelled) return;
      if (data?.handle) {
        navigate(`/u/${data.handle}${location.search}${location.hash}`, {
          replace: true,
        });
      } else {
        setFallback(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, location.search, location.hash]);

  if (fallback) return <CreatorProfile />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Carregando…</div>
    </div>
  );
};

export default CreatorIdRedirect;
