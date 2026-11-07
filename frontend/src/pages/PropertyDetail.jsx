import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, CircleCheck, Info, MapPin, MessageSquareText, Building2, CalendarCheck2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatAED } from "@/lib/site";
import { media } from "@/lib/media";
import { Img } from "@/components/brand/Img";
import { Seo, SampleBadge } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { PropertySpecs } from "@/components/PropertyCard";
import { EnquiryForm } from "@/components/EnquiryForm";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";

export default function PropertyDetail() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [status, setStatus] = useState("loading");
  const { openChat, setPropertySlug } = useChat();

  useEffect(() => {
    setStatus("loading");
    api.get(`/properties/${slug}`).then((r) => { setP(r.data); setStatus("ok"); })
      .catch((e) => setStatus(e.response?.status === 404 ? "missing" : "error"));
    setPropertySlug(slug);
    return () => setPropertySlug(null);
  }, [slug, setPropertySlug]);

  if (status === "missing") return <NotFound />;
  if (status === "error") return <div className="container-x py-20"><StatusMessage type="error">We could not load this listing. Please refresh the page.</StatusMessage></div>;
  if (status === "loading") return <div className="container-x py-14"><div className="aspect-[16/9] animate-pulse rounded-[24px] bg-line/60" /></div>;

  return (
    <>
      <Seo title={`${p.title}, ${p.location}`} path={`/properties/${p.slug}`} image={media(p.images[0]).src}
        description={`${p.is_sample ? "Sample listing: " : ""}${p.bedrooms}-bedroom ${p.type.toLowerCase()} in ${p.location}, ${p.area_sqft.toLocaleString("en-US")} sq ft. View specifications and ask about this property.`} />
      <div className="container-x pt-8">
        <Link to="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-slateink hover:text-midnight" data-testid="property-back-link"><ChevronLeft className="h-4 w-4" strokeWidth={1.75} />All properties</Link>
      </div>
      <Gallery images={p.images} title={p.title} sample={p.is_sample} />
      <div className="container-x grid gap-12 pb-24 pt-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="flex items-center gap-1.5 text-sm font-medium text-sapphire"><MapPin className="h-4 w-4" strokeWidth={1.75} />{p.location}, Dubai · {p.type}</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-midnight sm:text-5xl" data-testid="property-title">{p.title}</h1>
          <PropertySpecs p={p} className="mt-6 text-base" />
          {p.is_sample && <StatusMessage type="info" className="mt-8" testId="property-sample-notice">This is a sample listing. The price, specifications and photography are illustrative and do not represent an available property.</StatusMessage>}
          <Section title="Overview"><p className="text-base leading-relaxed text-slateink">{p.description}</p></Section>
          <Section title="Specifications"><SpecGrid p={p} /></Section>
          <Section title="Amenities"><Checklist items={p.amenities} /></Section>
          <Section title="Location"><p className="mb-4 text-slateink">{p.location}, Dubai. Nearby:</p><Checklist items={p.nearby} Icon={MapPin} /></Section>
        </div>
        <aside className="lg:col-span-5">
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="card-soft p-6" data-testid="property-price-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slateink">{p.is_sample ? "Sample price" : "Asking price"}</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-midnight" data-testid="property-detail-price">{formatAED(p.price_aed)}</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slateink"><Info className="h-4 w-4" strokeWidth={1.75} />{p.is_sample ? "Availability: not verified (sample data)" : "Availability confirmed by the team on enquiry"}</p>
              <BrandButton variant="secondary" className="mt-5 w-full" onClick={() => openChat({ propertySlug: p.slug, prompt: `I have a question about the ${p.title} in ${p.location}.` })} data-testid="property-ask-prayan-btn">
                <MessageSquareText className="h-4 w-4" strokeWidth={1.75} />Ask Prayan About This Property
              </BrandButton>
            </div>
            <div id="enquire" className="card-soft scroll-mt-28 p-6">
              <h2 className="font-display text-xl font-bold text-midnight">Ask About This Property</h2>
              <p className="mb-5 mt-1 text-sm text-slateink">Send a question or request a viewing. The team replies using your chosen contact method.</p>
              <EnquiryForm propertySlug={p.slug} allowViewing idPrefix="property-enquiry" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Gallery({ images, title, sample }) {
  const [active, setActive] = useState(0);
  const main = media(images[active]);
  return (
    <section className="container-x mt-6" aria-label={`${title} photo gallery`}>
      <div className="relative overflow-hidden rounded-[24px]">
        <Img image={main} sizes="(min-width: 1280px) 1232px, 100vw" className="aspect-[4/3] w-full object-cover sm:aspect-[16/8]" data-testid="gallery-main-image" />
        {sample && <div className="absolute left-4 top-4 flex flex-wrap gap-2 pr-4"><SampleBadge /><SampleBadge label="Illustrative photos" /></div>}
      </div>
      {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {images.map((k, i) => (
          <button key={typeof k === "string" ? k : k.path} onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === active} data-testid={`gallery-thumb-${i}`}
            className={cn("h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-[border-color,opacity] sm:h-24 sm:w-36", i === active ? "border-sapphire" : "border-transparent opacity-70 hover:opacity-100")}>
            <Img image={k} thumb alt="" sizes="144px" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>}
    </section>
  );
}

const Section = ({ title, children }) => (
  <section className="mt-12 border-t border-line pt-10"><h2 className="mb-5 font-display text-2xl font-bold text-midnight">{title}</h2>{children}</section>
);

function SpecGrid({ p }) {
  const rows = [["Property type", p.type, Building2], ["Status", p.completion, CalendarCheck2], ["Bedrooms", p.bedrooms], ["Bathrooms", p.bathrooms], ["Built-up area", `${p.area_sqft.toLocaleString("en-US")} sq ft`], ["Community", p.location]];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
      {rows.map(([k, v]) => <div key={k} className="bg-white p-5"><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slateink">{k}</dt><dd className="mt-1.5 font-display text-lg font-bold text-midnight">{v}</dd></div>)}
    </dl>
  );
}

function Checklist({ items, Icon = CircleCheck }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => <li key={a} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-charcoal"><Icon className="h-4 w-4 shrink-0 text-sapphire" strokeWidth={1.75} />{a}</li>)}
    </ul>
  );
}
