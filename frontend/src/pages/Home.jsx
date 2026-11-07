import { useEffect, useRef, useState } from "react";

function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return match;
}
import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play, Compass, Handshake, MessageSquareText, ListChecks, MessagesSquare, ClipboardList, UserRoundCheck, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { CONTACT, SITE_URL } from "@/lib/site";
import { media } from "@/lib/media";
import { Img } from "@/components/brand/Img";
import { Seo, SectionHeading } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";
import { HeroLeadForm } from "@/components/HeroLeadForm";
import { PropertyCard } from "@/components/PropertyCard";
import { FAQS, FaqAccordion, faqJsonLd } from "@/components/FaqAccordion";
import { CtaSection } from "@/components/CtaSection";
import { useChat } from "@/context/ChatContext";

const ORG_LD = {
  "@context": "https://schema.org", "@type": "RealEstateAgent", name: "Prayan", url: SITE_URL,
  telephone: CONTACT.phone, email: CONTACT.email,
  address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" }, areaServed: "Dubai",
};

export default function Home() {
  return (
    <>
      <Seo title="Find your place in Dubai" path="/" description="Explore Dubai property options, ask the Prayan assistant clear questions and send your requirements to a real team who follows up." jsonLd={[ORG_LD, faqJsonLd(FAQS)]} />
      <Hero />
      <Featured />
      <Benefits />
      <Journey />
      <AssistantIntro />
      <section className="container-x grid gap-12 py-20 lg:grid-cols-12 lg:py-28" aria-labelledby="faq-heading">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-4">Questions</p>
          <h2 id="faq-heading" className="h2">Straight answers before you enquire.</h2>
          <p className="lead mt-5">Still unsure? <Link to="/how-it-works" className="font-semibold text-sapphire underline underline-offset-4">See how Prayan works</Link>.</p>
        </div>
        <div className="lg:col-span-8"><FaqAccordion /></div>
      </section>
      <CtaSection />
    </>
  );
}

// The hero photo is the first paint; the video is fetched only after the page has finished loading,
// and not at all for visitors on Data Saver or a slow connection. It fades in over the photo once it plays.
function useAfterLoad() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || ""))) return undefined;
    let idle;
    const go = () => { idle = (window.requestIdleCallback || ((cb) => setTimeout(cb, 200)))(() => setReady(true)); };
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
    return () => { window.removeEventListener("load", go); if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle); };
  }, []);
  return ready;
}

function HeroVideo() {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const ready = useAfterLoad();
  const v = media("hero-dubai-mansion-skyline-video");
  if (reduced || !ready) return null;
  const toggle = () => {
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setPlaying(true); } else { ref.current.pause(); setPlaying(false); }
  };
  return (
    <>
      <video ref={ref} src={v.src} autoPlay muted loop playsInline preload="auto" aria-hidden="true" onPlaying={() => setVisible(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`} data-testid="hero-video" />
      <button type="button" onClick={toggle} aria-label={playing ? "Pause background video" : "Play background video"} data-testid="hero-video-toggle"
        className="absolute bottom-6 left-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-midnight/40 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-midnight">
        {playing ? <Pause className="h-4 w-4" strokeWidth={1.75} /> : <Play className="h-4 w-4" strokeWidth={1.75} />}
      </button>
    </>
  );
}

function Hero() {
  const { openChat } = useChat();
  const img = media("hero-dubai-villa-pool");
  const desktop = useIsDesktop();
  return (
    <section className="relative" data-testid="home-hero">
      <div className="relative min-h-[560px] overflow-hidden lg:min-h-[calc(100vh-72px)]">
        {/* srcset/sizes must stay identical to the preload in public/index.html (written by scripts/optimize_media.py) */}
        <picture>
          <source media="(max-width: 767px)" type="image/avif" srcSet={img.mobile.avif} sizes="100vw" />
          <source media="(max-width: 767px)" type="image/webp" srcSet={img.mobile.webp} sizes="100vw" />
          <source type="image/avif" srcSet={img.avif} sizes="100vw" />
          <source type="image/webp" srcSet={img.webp} sizes="100vw" />
          <img src={img.src} alt={img.alt} fetchpriority="high" width={img.w} height={img.h} className="absolute inset-0 h-full w-full animate-slow-zoom object-cover" />
        </picture>
        {desktop && <HeroVideo />}
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/85 via-midnight/55 to-midnight/10" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-midnight/50 to-transparent" aria-hidden="true" />
        <div className="container-x relative grid gap-10 pb-14 pt-16 lg:grid-cols-12 lg:items-center lg:py-20 lg:min-h-[calc(100vh-72px)]">
          <div className="lg:col-span-6 xl:col-span-7">
            <p className="reveal mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-ember" />Dubai real estate
            </p>
            <h1 className="reveal font-display text-[2.75rem] font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl" style={{ animationDelay: "80ms" }}>
              Find your place<br />in Dubai.
            </h1>
            <p className="reveal mt-6 max-w-lg text-base leading-relaxed text-white/85 md:text-lg" style={{ animationDelay: "160ms" }}>
              Tell us what matters most. Explore property options, get clear answers and take the next step with confidence.
            </p>
            <div className="reveal mt-9 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <BrandButton to="/properties" variant="accent" size="lg" data-testid="hero-explore-properties-btn">Explore Properties<ArrowRight className="h-4 w-4" strokeWidth={1.75} /></BrandButton>
              <BrandButton variant="light" size="lg" onClick={() => openChat()} data-testid="hero-ask-prayan-btn"><MessageSquareText className="h-4 w-4" strokeWidth={1.75} />Ask Prayan</BrandButton>
            </div>
            <p className="mt-10 hidden text-xs text-white/60 lg:block">Photography and video are illustrative and do not show an available Prayan listing.</p>
          </div>
          {desktop && <div className="reveal lg:col-span-6 xl:col-span-5" style={{ animationDelay: "320ms" }}><HeroLeadForm /></div>}
        </div>
      </div>
      {!desktop && (
        <div className="container-x -mt-6 pb-4">
          <div className="relative z-10"><HeroLeadForm /></div>
          <p className="mt-4 text-xs text-slateink">Photography is illustrative and does not show an available Prayan listing.</p>
        </div>
      )}
    </section>
  );
}

function Featured() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    api.get("/properties", { params: { featured: true } }).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);
  return (
    <section className="container-x py-20 lg:py-28" aria-labelledby="featured-heading">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Featured</p>
          <h2 id="featured-heading" className="h2">A first look at how listings work.</h2>
          <p className="lead mt-5">These are sample listings that show how Prayan presents a property. Each one includes clear specifications and a direct way to ask about it.</p>
        </div>
        <BrandButton to="/properties" variant="secondary" data-testid="featured-explore-btn">Explore Properties<ArrowRight className="h-4 w-4" strokeWidth={1.75} /></BrandButton>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {items === null ? [0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-line/60" />) : items.map((p, i) => <PropertyCard key={p.slug} p={p} index={i} />)}
      </div>
    </section>
  );
}

const BENEFITS = [
  { Icon: Compass, title: "Clear answers first", body: "Ask about areas, property types and listing details before you share any personal information." },
  { Icon: ListChecks, title: "Requirements, not guesswork", body: "Your location, budget and priorities are recorded in one place, so you never have to repeat yourself." },
  { Icon: ShieldCheck, title: "Honest about the facts", body: "Prayan only shares details it holds. When something is unknown, we say so and find out." },
  { Icon: Handshake, title: "A real person follows up", body: "Every enquiry is reviewed by the Prayan team, who contact you the way you prefer." },
];

function Benefits() {
  return (
    <section className="border-y border-line bg-white py-20 lg:py-28" aria-labelledby="benefits-heading">
      <div className="container-x">
        <SectionHeading eyebrow="Why Prayan" title={<span id="benefits-heading">Property search that respects your time.</span>} />
        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {BENEFITS.map(({ Icon, title, body }, i) => (
            <div key={title} className="reveal border-l border-line pl-6 lg:pr-8" style={{ animationDelay: `${i * 80}ms` }}>
              <Icon className="h-6 w-6 text-sapphire" strokeWidth={1.75} />
              <h3 className="mt-8 font-display text-xl font-bold text-midnight">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slateink">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const JOURNEY = [
  { Icon: Compass, title: "Explore properties", body: "Browse listings by area, type, bedrooms and price, with the key facts on every card." },
  { Icon: MessagesSquare, title: "Ask questions", body: "Ask the Prayan assistant about areas or a specific listing and get a short, direct answer." },
  { Icon: ClipboardList, title: "Share requirements", body: "Tell us your location, budget and priorities, and choose how you would like to be contacted." },
  { Icon: UserRoundCheck, title: "Receive a next step", body: "The Prayan team reviews your enquiry and contacts you with an appropriate next step, such as a call or viewing." },
];

function Journey() {
  const img = media("villa-white-pool");
  return (
    <section className="container-x grid gap-12 py-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-28" aria-labelledby="journey-heading">
      <div className="relative lg:col-span-5">
        <Img image={img} sizes="(min-width: 1280px) 480px, (min-width: 1024px) 38vw, 100vw" loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-[24px] object-cover" />
        <div className="absolute -bottom-6 right-6 rounded-2xl bg-midnight p-6 text-white shadow-xl sm:-right-6">
          <p className="font-display text-4xl font-extrabold">4</p>
          <p className="text-sm text-white/75">simple steps, no account needed</p>
        </div>
      </div>
      <div className="lg:col-span-7">
        <p className="eyebrow mb-4">How it works</p>
        <h2 id="journey-heading" className="h2">From first question to next step.</h2>
        <ol className="mt-10 space-y-8">
          {JOURNEY.map(({ Icon, title, body }, i) => (
            <li key={title} className="grid grid-cols-[auto_1fr] gap-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-white"><Icon className="h-5 w-5 text-sapphire" strokeWidth={1.75} /></span>
              <div>
                <h3 className="font-display text-lg font-bold text-midnight"><span className="mr-2 text-slateink/60">0{i + 1}</span>{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slateink">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <BrandButton to="/how-it-works" variant="ghost" className="mt-8" data-testid="journey-how-it-works-link">See the full process<ArrowRight className="h-4 w-4" strokeWidth={1.75} /></BrandButton>
      </div>
    </section>
  );
}

function AssistantIntro() {
  const { openChat } = useChat();
  return (
    <section className="container-x pb-20 lg:pb-28" aria-labelledby="assistant-heading">
      <div className="grid overflow-hidden rounded-[28px] bg-midnight lg:grid-cols-2">
        <div className="p-8 sm:p-12 lg:p-16">
          <p className="mb-4 inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/70"><span className="h-1.5 w-1.5 rounded-[2px] bg-ember" />Prayan assistant</p>
          <h2 id="assistant-heading" className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Ask anything about the listings, one question at a time.</h2>
          <p className="mt-5 text-base leading-relaxed text-white/75 md:text-lg">The assistant answers from the listing data on this site, remembers what you have told it during your visit and records viewing or call-back requests for the team.</p>
          <ul className="mt-8 space-y-3 text-[15px] text-white/80">
            {["It never invents prices, availability or bookings", "It asks for consent before saving your details", "A person from Prayan always handles the follow-up"].map((t) => (
              <li key={t} className="flex items-start gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />{t}</li>
            ))}
          </ul>
          <BrandButton variant="accent" size="lg" className="mt-10" onClick={() => openChat()} data-testid="assistant-talk-btn"><MessageSquareText className="h-4 w-4" strokeWidth={1.75} />Talk to Prayan</BrandButton>
        </div>
        <div className="relative hidden min-h-[420px] lg:block">
          <Img image="dubai-skyline" sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-midnight via-midnight/30 to-transparent" />
          <div className="absolute bottom-10 right-10 w-72 space-y-2 rounded-2xl bg-white/95 p-4 text-[13px] shadow-xl backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slateink">Example conversation</p>
            <p className="ml-auto w-fit rounded-xl rounded-br-sm bg-midnight px-3 py-2 text-white">Do any villas have a private pool?</p>
            <p className="w-fit rounded-xl rounded-bl-sm border border-line px-3 py-2 text-charcoal">Two sample villas include a private pool. Which area would you prefer?</p>
          </div>
        </div>
      </div>
    </section>
  );
}
