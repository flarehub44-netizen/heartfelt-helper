import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public creator URL by handle. Resolves @handle to creator id and redirects
 * to /creator/:id (where the existing profile UI lives).
 */
const CreatorByHandle = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!handle) return;
    const clean = handle.replace(/^@/, "");
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", clean)
        .eq("role", "creator")
        .maybeSingle();
      if (data?.id) {
        navigate(`/creator/${data.id}`, { replace: true });
      } else {
        navigate("/404", { replace: true });
      }
    })();
  }, [handle, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Carregando…</div>
    </div>
  );
};

export default CreatorByHandle;
