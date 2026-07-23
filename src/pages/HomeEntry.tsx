import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./Index";

const HomeEntry = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Index />;
  }

  const role = profile?.role ?? "fan";

  if (role === "creator") {
    if (profile && profile.approved === false) {
      return <Navigate to="/pending-approval" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const fanOnboarded =
    profile?.fan_onboarded === true ||
    (typeof localStorage !== "undefined" && localStorage.getItem("fan_onboarded") === "true");

  if (!fanOnboarded) {
    return <Navigate to="/fan-onboarding" replace />;
  }

  return <Navigate to="/feed" replace />;
};

export default HomeEntry;
