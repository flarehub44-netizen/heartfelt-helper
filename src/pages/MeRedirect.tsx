import { useEffect, useState } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Alias /me → perfil do usuário logado (criador ou fã). */
export default function MeRedirect() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?returnTo=%2Fme" replace />;
  }

  if (profile?.role === "creator") {
    if (profile.handle) {
      return (
        <Navigate
          to={`/u/${profile.handle}${location.search}`}
          replace
        />
      );
    }
    return <Navigate to={`/creator/${user.id}${location.search}`} replace />;
  }

  return <Navigate to={`/profile/${user.id}${location.search}`} replace />;
}
