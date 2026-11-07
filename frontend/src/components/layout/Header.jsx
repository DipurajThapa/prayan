import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, MessageSquareText } from "lucide-react";
import { NAV } from "@/lib/site";
import { Logo } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { openChat } = useChat();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-soft/90 backdrop-blur-md" data-testid="site-header">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <div className="container-x flex h-[72px] items-center justify-between gap-6">
        <Link to="/" aria-label="Prayan home" data-testid="header-logo-link"><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) => cn("relative rounded-full px-4 py-2 text-[15px] font-medium transition-colors",
                isActive ? "text-midnight after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-ember" : "text-slateink hover:text-midnight")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <BrandButton variant="secondary" size="sm" onClick={() => openChat()} data-testid="header-ask-prayan-btn">
            <MessageSquareText className="h-4 w-4" strokeWidth={1.75} />Ask Prayan
          </BrandButton>
          <BrandButton to="/contact" size="sm" data-testid="header-start-enquiry-btn">Start My Enquiry</BrandButton>
        </div>
        <button className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
          {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
        </button>
      </div>
      {open && <MobileNav onChat={() => { setOpen(false); openChat(); }} />}
    </header>
  );
}

function MobileNav({ onChat }) {
  return (
    <nav aria-label="Mobile" className="animate-fade-up border-t border-line bg-soft lg:hidden" data-testid="mobile-nav">
      <div className="container-x flex h-[calc(100dvh-72px)] flex-col gap-1 py-6">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} data-testid={`mobile-nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={({ isActive }) => cn("rounded-2xl px-4 py-4 font-display text-2xl font-bold", isActive ? "bg-white text-midnight" : "text-slateink")}>
            {n.label}
          </NavLink>
        ))}
        <div className="mt-auto grid gap-3 pb-4">
          <BrandButton variant="secondary" size="lg" onClick={onChat} data-testid="mobile-ask-prayan-btn">Ask Prayan</BrandButton>
          <BrandButton to="/contact" size="lg" data-testid="mobile-start-enquiry-btn">Start My Enquiry</BrandButton>
        </div>
      </div>
    </nav>
  );
}
