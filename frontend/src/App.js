import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import SiteLayout from "@/components/layout/SiteLayout";
import Home from "@/pages/Home";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import HowItWorks from "@/pages/HowItWorks";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/NotFound";

// Owner, legal and unsubscribe pages load on demand so visitors don't download them with the home page.
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ListingManager = lazy(() => import("@/pages/ListingManager"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Privacy = lazy(() => import("@/pages/Legal"));
const Terms = lazy(() => import("@/pages/Legal").then((m) => ({ default: m.Terms })));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));

const page = (Page) => (
  <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
    <Page />
  </Suspense>
);

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return page(AuthCallback);
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:slug" element={<PropertyDetail />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={page(Privacy)} />
        <Route path="/terms" element={page(Terms)} />
        <Route path="/unsubscribe" element={page(Unsubscribe)} />
        <Route path="/login" element={page(Login)} />
        <Route path="/dashboard" element={page(Dashboard)} />
        <Route path="/dashboard/listings" element={page(ListingManager)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <AppRouter />
            <Toaster position="top-center" />
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
