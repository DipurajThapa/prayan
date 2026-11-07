import { useEffect } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { Building2, Inbox, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function OwnerGate({ children }) {
  const { user, checkAuth } = useAuth();
  const location = useLocation();
  useEffect(() => { if (user === null && !location.state?.user) checkAuth(); }, [user, checkAuth, location.state]);
  if (user === false) return <Navigate to="/login" replace />;
  if (!user && !location.state?.user) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sapphire" /></div>;
  return children(user || location.state.user);
}

const LINKS = [["/dashboard", "Enquiries", Inbox, "owner-nav-enquiries"], ["/dashboard/listings", "Listings", Building2, "owner-nav-listings"]];

export function OwnerNav() {
  return (
    <nav aria-label="Owner workspace" className="mb-8 inline-flex gap-1 rounded-full border border-line bg-white p-1">
      {LINKS.map(([to, label, Icon, id]) => (
        <NavLink key={to} to={to} end data-testid={id}
          className={({ isActive }) => cn("inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors", isActive ? "bg-midnight text-white" : "text-slateink hover:text-midnight")}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />{label}
        </NavLink>
      ))}
    </nav>
  );
}
