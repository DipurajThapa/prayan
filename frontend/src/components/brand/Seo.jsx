import { SITE_URL } from "@/lib/site";

export function Seo({ title, description, path = "/", image = "/media/hero-dubai-villa-pool.jpg", jsonLd, noindex }) {
  const full = `${title} | Prayan`;
  const url = `${SITE_URL}${path}`;
  return (
    <>
      <title>{full}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${SITE_URL}${image}`} />
      <meta name="twitter:card" content="summary_large_image" />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </>
  );
}

export function SectionHeading({ eyebrow, title, children, className = "", as: H = "h2" }) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <H className="h2">{title}</H>
      {children && <p className="lead mt-5">{children}</p>}
    </div>
  );
}

export function SampleBadge({ className = "", label = "Sample listing" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-midnight shadow-sm ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-ember" />{label}
    </span>
  );
}

export function Logo({ light }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill={light ? "#FFFFFF" : "#102B4D"} />
        <path d="M11 24V8h6.5a5.5 5.5 0 0 1 0 11H14" stroke={light ? "#102B4D" : "#FFFFFF"} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="19.5" y="20.5" width="4" height="4" rx="1" fill="#FF7A38" />
      </svg>
      <span className={`font-display text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-midnight"}`}>Prayan</span>
    </span>
  );
}
