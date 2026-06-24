import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import CreatorRoute from "@/components/CreatorRoute";
import AdminRoute from "@/components/AdminRoute";
import AgeGateModal from "@/components/AgeGateModal";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import CreatorProfile from "./pages/CreatorProfile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import FanProfile from "./pages/FanProfile";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";
import PendingApproval from "./pages/PendingApproval";
import FanOnboarding from "./pages/FanOnboarding";
import Subscriptions from "./pages/Subscriptions";
import Bookmarks from "./pages/Bookmarks";
import CreatorByHandle from "./pages/CreatorByHandle";
import PostDetail from "./pages/PostDetail";
import Wallet from "./pages/Wallet";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [showAgeGate, setShowAgeGate] = useState(
    () => localStorage.getItem("age_verified") !== "true"
  );

  const handleConfirm = async () => {
    localStorage.setItem("age_verified", "true");
    localStorage.setItem("terms_accepted", "true");
    setShowAgeGate(false);
    // Persist server-side if user is authenticated (idempotent RPC)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.rpc("accept_age_and_terms");
      }
    } catch {
      // Non-fatal: localStorage still gates the UI
    }
  };

  const handleDeny = () => {
    window.location.href = "https://google.com";
  };


  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AgeGateModal open={showAgeGate} onConfirm={handleConfirm} onDeny={handleDeny} />
          <BottomNav />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/creator/:id" element={<CreatorProfile />} />
            <Route path="/u/:handle" element={<CreatorByHandle />} />
            <Route path="/p/:id" element={<PostDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
            <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/dashboard" element={<CreatorRoute><Dashboard /></CreatorRoute>} />
            <Route path="/settings" element={<CreatorRoute><Settings /></CreatorRoute>} />
            <Route path="/profile/:id" element={<FanProfile />} />
            <Route path="/onboarding" element={<CreatorRoute><Onboarding /></CreatorRoute>} />
            <Route path="/fan-onboarding" element={<ProtectedRoute><FanOnboarding /></ProtectedRoute>} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
