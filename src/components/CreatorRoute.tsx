import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CreatorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.role !== "creator") {
    return <Navigate to="/feed" replace />;
  }

  if (profile && profile.role === "creator" && profile.approved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};

export default CreatorRoute;
