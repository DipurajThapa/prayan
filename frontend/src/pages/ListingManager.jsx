import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImageOff, Plus } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { formatAED } from "@/lib/site";
import { media } from "@/lib/media";
import { Img } from "@/components/brand/Img";
import { Seo } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { OwnerGate, OwnerNav } from "@/components/OwnerShell";
import { ListingEditor } from "@/components/ListingEditor";
import { cn } from "@/lib/utils";

export default function ListingManager() {
  return <OwnerGate>{() => <Manager />}</OwnerGate>;
}

function Manager() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | slug

  const editorRef = useRef(null);
  useEffect(() => {
    if (editing && window.innerWidth < 1024) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editing]);

  const load = async () => {
    try { const { data } = await api.get("/admin/properties"); setItems(data); }
    catch (err) { setError(formatApiError(err, "Could not load listings.")); setItems([]); }
  };
  useEffect(() => { load(); }, []);

  const current = editing && editing !== "new" ? items?.find((p) => p.slug === editing) : null;
  const onSaved = (p) => { setEditing(p ? p.slug : null); load(); };

  return (
    <div className="container-x py-10" data-testid="listing-manager">
      <Seo title="Listing manager" path="/dashboard/listings" description="Manage Prayan listings." noindex />
      <OwnerNav />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-3">Owner workspace</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-midnight sm:text-4xl">Listings</h1>
          <p className="mt-1 text-sm text-slateink">Create, edit and publish the properties shown on the website.</p>
        </div>
        <BrandButton onClick={() => setEditing("new")} data-testid="listing-new-btn"><Plus className="h-4 w-4" strokeWidth={1.75} />New Listing</BrandButton>
      </div>
      {error && <StatusMessage type="error" className="mt-6">{error}</StatusMessage>}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4"><ListingList items={items} active={editing} onSelect={setEditing} /></div>
        <div className="min-w-0 scroll-mt-24 lg:col-span-8" ref={editorRef}>
          {editing ? <ListingEditor key={editing} listing={current} onSaved={onSaved} onCancel={() => setEditing(null)} />
            : <div className="card-soft flex min-h-[320px] items-center justify-center p-10 text-center text-slateink">Select a listing to edit it, or create a new one.</div>}
        </div>
      </div>
    </div>
  );
}

function ListingList({ items, active, onSelect }) {
  if (items === null) return <div className="h-64 animate-pulse rounded-2xl bg-line/60" />;
  if (!items.length) return <div className="card-soft p-8 text-center text-slateink" data-testid="listing-empty">No listings yet.</div>;
  return (
    <ul className="card-soft max-h-[75vh] divide-y divide-line overflow-y-auto" data-testid="listing-list">
      {items.map((p) => {
        const img = p.images?.[0] ? media(p.images[0]) : null;
        return (
          <li key={p.slug} className="flex items-center gap-2 pr-4">
            <button onClick={() => onSelect(p.slug)} data-testid={`listing-row-${p.slug}`}
              className={cn("flex min-w-0 flex-1 items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-soft", active === p.slug && "bg-sapphire/5")}>
              <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-soft">
                {img ? <Img image={img} thumb alt="" sizes="80px" className="h-full w-full object-cover" loading="lazy" /> : <ImageOff className="m-auto mt-4 h-5 w-5 text-slateink" strokeWidth={1.75} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-bold text-midnight">{p.title}</span>
                <span className="block truncate text-xs text-slateink">{p.location} · {formatAED(p.price_aed)}</span>
                <span className="mt-1 flex gap-1.5">
                  <Tag on={p.published !== false} yes="Published" no="Draft" />
                  {p.is_sample && <span className="rounded-full bg-ember/10 px-2 py-0.5 text-[10px] font-semibold text-[#c2501b]">Sample</span>}
                  {p.featured && <span className="rounded-full bg-sapphire/10 px-2 py-0.5 text-[10px] font-semibold text-sapphire">Featured</span>}
                </span>
              </span>
            </button>
            {p.published !== false && <a href={`/properties/${p.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.title} on site`} className="shrink-0 text-slateink hover:text-sapphire" data-testid={`listing-view-${p.slug}`}><ExternalLink className="h-4 w-4" strokeWidth={1.75} /></a>}
          </li>
        );
      })}
    </ul>
  );
}

const Tag = ({ on, yes, no }) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", on ? "bg-emerald-50 text-emerald-700" : "bg-line text-slateink")}>{on ? yes : no}</span>;

