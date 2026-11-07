import { Link } from "react-router-dom";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { CONTACT, NAV } from "@/lib/site";
import { Logo } from "@/components/brand/Seo";
import { Newsletter } from "@/components/Newsletter";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-midnight text-white" data-testid="site-footer">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-[0.35] invert" aria-hidden="true" />
      <div className="container-x relative grid gap-14 py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo light />
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/70">
            Prayan helps you explore Dubai property options, ask clear questions and send an enquiry that a real person follows up.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 lg:col-span-4">
          <div>
            <p className="font-display text-sm font-semibold text-white">Explore</p>
            <ul className="mt-4 space-y-3 text-[15px] text-white/70">
              {NAV.map((n) => <li key={n.to}><Link to={n.to} className="transition-colors hover:text-white" data-testid={`footer-link-${n.to.replace("/", "") || "home"}`}>{n.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-white">Contact</p>
            <ul className="mt-4 space-y-3 text-[15px] text-white/70">
              <li><a href={`tel:${CONTACT.phone}`} className="flex items-center gap-2 hover:text-white" data-testid="footer-phone"><Phone className="h-4 w-4" strokeWidth={1.75} />{CONTACT.phoneDisplay}</a></li>
              <li><a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white" data-testid="footer-whatsapp"><MessageCircle className="h-4 w-4" strokeWidth={1.75} />WhatsApp</a></li>
              <li><a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 break-all hover:text-white" data-testid="footer-email"><Mail className="h-4 w-4 shrink-0" strokeWidth={1.75} />{CONTACT.email}</a></li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" strokeWidth={1.75} />{CONTACT.city}</li>
            </ul>
          </div>
        </div>
        <div className="lg:col-span-4"><Newsletter /></div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-[13px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Prayan. Listings shown on this preview are sample data.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-white" data-testid="footer-privacy-link">Privacy</Link>
            <Link to="/terms" className="hover:text-white" data-testid="footer-terms-link">Terms</Link>
            <Link to="/login" className="hover:text-white" data-testid="footer-owner-login-link">Owner sign in</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
