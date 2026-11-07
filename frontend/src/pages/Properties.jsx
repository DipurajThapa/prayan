import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCcw, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { LOCATIONS, PROPERTY_TYPES } from "@/lib/site";
import { Seo } from "@/components/brand/Seo";
import { Field, SelectInput } from "@/components/brand/Field";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { BrandButton } from "@/components/brand/BrandButton";
import { PropertyCard } from "@/components/PropertyCard";
import { CtaSection } from "@/components/CtaSection";

const PRICES = [["2000000", "Up to AED 2M"], ["5000000", "Up to AED 5M"], ["10000000", "Up to AED 10M"], ["30000000", "Up to AED 30M"]];
const BEDS = [1, 2, 3, 4, 5].map((n) => [String(n), `${n}+ bedrooms`]);
const valid = (opts, v) => opts.some(([k]) => k === v);
const FILTERS = ["location", "type", "beds", "price"];

export default function Properties() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const f = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) || ""]));

  useEffect(() => {
    setItems(null); setError(false);
    const q = {};
    if (f.location) q.location = f.location;
    if (f.type) q.type = f.type;
    if (valid(BEDS, f.beds)) q.bedrooms = Number(f.beds);
    if (valid(PRICES, f.price)) q.max_price = Number(f.price);
    api.get("/properties", { params: q }).then((r) => setItems(r.data)).catch(() => { setError(true); setItems([]); });
  }, [f.location, f.type, f.beds, f.price]);

  const set = (k) => (e) => {
    const next = new URLSearchParams(params);
    if (e.target.value) next.set(k, e.target.value); else next.delete(k);
    setParams(next, { replace: true });
  };
  const active = FILTERS.some((k) => f[k]);

  return (
    <>
      <Seo title="Explore Dubai Properties" path="/properties" description="Browse Dubai apartments, villas, townhouses and penthouses by area, type, bedrooms and price, then ask about any listing." />
      <section className="container-x pb-10 pt-14 lg:pt-20">
        <p className="eyebrow mb-4">Explore properties</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-midnight sm:text-5xl lg:text-6xl">Dubai properties, filtered your way.</h1>
        <p className="lead mt-5 max-w-2xl">Filter by area, property type, bedrooms and price. Every listing shown here is sample data that demonstrates how Prayan presents a property.</p>
      </section>
      <section className="sticky top-[72px] z-30 border-y border-line bg-soft/95 backdrop-blur-md" aria-label="Filters">
        <div className="container-x grid grid-cols-2 gap-3 py-4 md:grid-cols-5 md:items-end">
          <Field id="filter-location" label="Location"><SelectInput id="filter-location" options={LOCATIONS.slice(0, -1)} placeholder="All areas" value={f.location} onChange={set("location")} /></Field>
          <Field id="filter-type" label="Property type"><SelectInput id="filter-type" options={PROPERTY_TYPES} placeholder="All types" value={f.type} onChange={set("type")} /></Field>
          <Field id="filter-beds" label="Bedrooms"><SelectInput id="filter-beds" options={BEDS} placeholder="Any" value={f.beds} onChange={set("beds")} /></Field>
          <Field id="filter-price" label="Max price"><SelectInput id="filter-price" options={PRICES} placeholder="Any price" value={f.price} onChange={set("price")} /></Field>
          <BrandButton variant="secondary" className="col-span-2 h-[50px] md:col-span-1" disabled={!active} onClick={() => setParams({}, { replace: true })} data-testid="filter-reset-btn">
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />Reset filters
          </BrandButton>
        </div>
      </section>
      <section className="container-x py-12" aria-live="polite">
        {items && !error && <p className="mb-6 text-sm text-slateink" data-testid="properties-result-count">{items.length} sample listing{items.length === 1 ? "" : "s"}</p>}
        {error && <StatusMessage type="error" testId="properties-error">We could not load listings right now. Please refresh the page.</StatusMessage>}
        {items === null && <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-line/60" />)}</div>}
        {items?.length === 0 && !error && (
          <div className="card-soft flex flex-col items-center px-6 py-16 text-center" data-testid="properties-empty">
            <SearchX className="h-8 w-8 text-sapphire" strokeWidth={1.75} />
            <h2 className="mt-4 font-display text-xl font-bold">No listings match these filters.</h2>
            <p className="mt-2 max-w-md text-slateink">Try widening your search, or send us your requirements and the team will follow up.</p>
            <BrandButton to="/contact" className="mt-6" data-testid="properties-empty-enquiry-btn">Start My Enquiry</BrandButton>
          </div>
        )}
        {items?.length > 0 && <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">{items.map((p, i) => <PropertyCard key={p.slug} p={p} index={i} />)}</div>}
      </section>
      <CtaSection title="Not seeing the right fit?" body="Tell us the area, budget and type of home you have in mind. The Prayan team will review your requirements and contact you." />
    </>
  );
}
