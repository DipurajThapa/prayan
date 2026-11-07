import { Link } from "react-router-dom";
import { ArrowUpRight, BedDouble, Bath, MapPin, Ruler } from "lucide-react";
import { formatAED } from "@/lib/site";
import { media } from "@/lib/media";
import { SampleBadge } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";

export function PropertySpecs({ p, className = "" }) {
  const items = [
    { Icon: BedDouble, label: `${p.bedrooms} bed${p.bedrooms > 1 ? "s" : ""}` },
    { Icon: Bath, label: `${p.bathrooms} bath${p.bathrooms > 1 ? "s" : ""}` },
    { Icon: Ruler, label: `${p.area_sqft.toLocaleString("en-US")} sq ft` },
  ];
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-sm text-slateink ${className}`}>
      {items.map(({ Icon, label }) => <li key={label} className="flex items-center gap-1.5"><Icon className="h-4 w-4 text-sapphire" strokeWidth={1.75} />{label}</li>)}
    </ul>
  );
}

export function PropertyCard({ p, index = 0 }) {
  const img = media(p.images?.[0]);
  return (
    <article className="group reveal card-soft flex flex-col overflow-hidden" style={{ animationDelay: `${index * 80}ms` }} data-testid={`property-card-${p.slug}`}>
      <Link to={`/properties/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden" aria-label={`View details for ${p.title}`}>
        <img src={img.src} alt={img.alt} loading="lazy" decoding="async" width="1400" height="1050"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="absolute left-4 top-4 flex gap-2">
          {p.is_sample && <SampleBadge />}
          <span className="rounded-full bg-midnight/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">{p.completion}</span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-sapphire"><MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />{p.location} · {p.type}</p>
        <h3 className="mt-2 font-display text-xl font-bold leading-snug text-midnight">{p.title}</h3>
        <PropertySpecs p={p} className="mt-4" />
        <div className="mt-6 flex items-end justify-between border-t border-line pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slateink">{p.is_sample ? "Sample price" : "Price"}</p>
            <p className="font-display text-lg font-bold text-midnight" data-testid={`property-price-${p.slug}`}>{formatAED(p.price_aed)}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <BrandButton to={`/properties/${p.slug}`} variant="secondary" size="sm" data-testid={`property-view-details-${p.slug}`}>
            View Details<ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </BrandButton>
          <BrandButton to={`/properties/${p.slug}#enquire`} size="sm" data-testid={`property-enquire-${p.slug}`}>Enquire</BrandButton>
        </div>
      </div>
    </article>
  );
}
