import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getLoginPath } from "@/lib/authRedirect";

/** Routes unapproved creators may still access to prepare their profile. */
const PENDING_ALLOWED = new Set(["/onboarding", "/settings", "/pending-approval"]);

const CreatorRoute = ({ children }: { children: React.ReactNode }) => {
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
    const returnTo = location.pathname + location.search;
    return <Navigate to={getLoginPath(returnTo)} replace />;
  }

  if (profile && profile.role !== "creator") {
    return <Navigate to="/feed" replace />;
  }

  if (
    profile &&
    profile.role === "creator" &&
    profile.approved === false &&
    !PENDING_ALLOWED.has(location.pathname)
  ) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};

export default CreatorRoute;
