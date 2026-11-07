import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Save, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { LOCATIONS, PROPERTY_TYPES } from "@/lib/site";
import { media } from "@/lib/media";
import { Field, SelectInput, TextArea, TextInput } from "@/components/brand/Field";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { BrandButton } from "@/components/brand/BrandButton";
import { cn } from "@/lib/utils";

const AREAS = LOCATIONS.filter((l) => l !== "Open to suggestions");
const EMPTY = { title: "", location: "", type: "", completion: "Ready", price_aed: "", bedrooms: "", bathrooms: "", area_sqft: "",
  summary: "", description: "", amenities: "", nearby: "", images: [], featured: false, published: false, is_sample: false };

const fromListing = (p) => p ? { ...EMPTY, ...p, amenities: (p.amenities || []).join("\n"), nearby: (p.nearby || []).join("\n"), published: p.published !== false } : EMPTY;

function validate(f) {
  const e = {};
  if (f.title.trim().length < 4) e.title = "Add a title of at least 4 characters.";
  if (!f.location) e.location = "Choose a location.";
  if (!f.type) e.type = "Choose a property type.";
  ["price_aed", "area_sqft"].forEach((k) => { if (!(Number(f[k]) > 0)) e[k] = "Enter a number greater than 0."; });
  ["bedrooms", "bathrooms"].forEach((k) => { if (f[k] === "" || Number(f[k]) < 0) e[k] = "Enter 0 or more."; });
  if (f.summary.trim().length < 10) e.summary = "Add a short summary (10+ characters).";
  if (f.description.trim().length < 20) e.description = "Add a description (20+ characters).";
  if (f.published && !f.images.length) e.images = "Add at least one photo before publishing.";
  if (f.images.some((i) => typeof i === "object" && i.alt.trim().length < 3)) e.images = "Every photo needs a short description (alt text).";
  return e;
}

export function ListingEditor({ listing, onSaved, onCancel }) {
  const [f, setF] = useState(() => fromListing(listing));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => {
    setErrors((s) => (s[k] ? { ...s, [k]: undefined } : s));
    setF((s) => ({ ...s, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError("");
    const lines = (s) => s.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
    const body = { ...f, title: f.title.trim(), summary: f.summary.trim(), description: f.description.trim(),
      price_aed: Number(f.price_aed), bedrooms: Number(f.bedrooms), bathrooms: Number(f.bathrooms), area_sqft: Number(f.area_sqft),
      amenities: lines(f.amenities), nearby: lines(f.nearby) };
    ["slug", "created_at", "updated_at"].forEach((k) => delete body[k]);
    try {
      const { data } = listing ? await api.put(`/admin/properties/${listing.slug}`, body) : await api.post("/admin/properties", body);
      toast.success(listing ? "Listing updated" : "Listing created");
      onSaved(data);
    } catch (err) { setError(formatApiError(err, "Could not save the listing.")); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    try { await api.delete(`/admin/properties/${listing.slug}`); toast.success("Listing deleted"); onSaved(null); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const num = (k, label) => (
    <Field id={`listing-${k}`} label={label} error={errors[k]}>
      <TextInput id={`listing-${k}`} type="number" min="0" inputMode="numeric" value={f[k]} invalid={errors[k]} onChange={set(k)} />
    </Field>
  );

  return (
    <form onSubmit={save} noValidate className="card-soft space-y-6 p-6 sm:p-8" data-testid="listing-editor">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-midnight">{listing ? "Edit listing" : "New listing"}</h2>
        <button type="button" onClick={onCancel} aria-label="Close editor" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-soft" data-testid="listing-cancel-btn"><X className="h-5 w-5" strokeWidth={1.75} /></button>
      </div>
      <Field id="listing-title" label="Title" error={errors.title}><TextInput id="listing-title" value={f.title} invalid={errors.title} onChange={set("title")} placeholder="e.g. Three-Bedroom Villa with Garden" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="listing-location" label="Location" error={errors.location}><SelectInput id="listing-location" options={AREAS} placeholder="Choose" value={f.location} invalid={errors.location} onChange={set("location")} /></Field>
        <Field id="listing-type" label="Property type" error={errors.type}><SelectInput id="listing-type" options={PROPERTY_TYPES} placeholder="Choose" value={f.type} invalid={errors.type} onChange={set("type")} /></Field>
        <Field id="listing-completion" label="Status"><SelectInput id="listing-completion" options={["Ready", "Off-plan"]} value={f.completion} onChange={set("completion")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {num("price_aed", "Price (AED)")}{num("bedrooms", "Bedrooms")}{num("bathrooms", "Bathrooms")}{num("area_sqft", "Area (sq ft)")}
      </div>
      <Field id="listing-summary" label="Card summary" error={errors.summary}><TextInput id="listing-summary" maxLength={300} value={f.summary} invalid={errors.summary} onChange={set("summary")} /></Field>
      <Field id="listing-description" label="Description" error={errors.description}><TextArea id="listing-description" maxLength={4000} value={f.description} invalid={errors.description} onChange={set("description")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="listing-amenities" label="Amenities" hint="One per line"><TextArea id="listing-amenities" value={f.amenities} onChange={set("amenities")} className="min-h-[110px]" /></Field>
        <Field id="listing-nearby" label="Nearby" hint="One per line"><TextArea id="listing-nearby" value={f.nearby} onChange={set("nearby")} className="min-h-[110px]" /></Field>
      </div>
      <PhotoManager images={f.images} onChange={set("images")} error={errors.images} />
      <div className="grid gap-3 rounded-2xl border border-line bg-soft/60 p-4 sm:grid-cols-3">
        <Toggle id="listing-published" label="Published on website" checked={f.published} onChange={set("published")} />
        <Toggle id="listing-featured" label="Featured on homepage" checked={f.featured} onChange={set("featured")} />
        <Toggle id="listing-sample" label="Mark as sample data" checked={f.is_sample} onChange={set("is_sample")} />
      </div>
      {error && <StatusMessage type="error" testId="listing-save-error">{error}</StatusMessage>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {listing ? <BrandButton variant="secondary" size="sm" onClick={remove} className="text-red-600 hover:border-red-400 hover:text-red-700" data-testid="listing-delete-btn"><Trash2 className="h-4 w-4" strokeWidth={1.75} />Delete</BrandButton> : <span />}
        <BrandButton type="submit" disabled={busy} data-testid="listing-save-btn">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.75} />}Save Listing</BrandButton>
      </div>
    </form>
  );
}

const Toggle = ({ id, label, checked, onChange }) => (
  <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm font-medium text-midnight">
    <input id={id} type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 accent-[#245DCC]" data-testid={id} />{label}
  </label>
);

function PhotoManager({ images, onChange, error }) {
  const input = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [upError, setUpError] = useState("");

  const upload = async (files) => {
    setUpError("");
    const list = [...files];
    setUploading(list.length);
    const added = [];
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const { data } = await api.post("/admin/uploads", fd);
        added.push({ path: data.path, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") });
      } catch (err) { setUpError(`${file.name}: ${formatApiError(err, "upload failed")}`); }
      setUploading((n) => n - 1);
    }
    onChange([...images, ...added]);
    if (input.current) input.current.value = "";
  };
  const move = (i, d) => { const c = [...images]; [c[i], c[i + d]] = [c[i + d], c[i]]; onChange(c); };
  const setAlt = (i, alt) => onChange(images.map((im, j) => (j === i ? { ...im, alt } : im)));

  return (
    <fieldset>
      <legend className="mb-1.5 font-display text-[13px] font-semibold text-midnight">Photos</legend>
      <p className="mb-3 text-xs text-slateink">JPG, PNG or WebP up to 8 MB each. The first photo is the cover. Add a short description for each photo.</p>
      <div className="grid gap-3 sm:grid-cols-2" data-testid="listing-photos">
        {images.map((im, i) => {
          const m = media(im);
          return (
            <div key={typeof im === "string" ? im : im.path} className="overflow-hidden rounded-xl border border-line bg-white" data-testid={`listing-photo-${i}`}>
              <div className="relative aspect-[16/10]">
                <img src={m.src} alt={m.alt} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-midnight"><Star className="h-3 w-3 text-ember" strokeWidth={2} />Cover</span>}
                <div className="absolute right-2 top-2 flex gap-1">
                  <IconBtn label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Move later" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ArrowRight className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Remove photo" onClick={() => onChange(images.filter((_, j) => j !== i))} testId={`listing-photo-remove-${i}`}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </div>
              {typeof im === "object" ? <input aria-label="Photo description" value={im.alt} maxLength={200} onChange={(e) => setAlt(i, e.target.value)} className="w-full border-t border-line px-3 py-2 text-sm focus:outline-none" placeholder="Describe this photo" data-testid={`listing-photo-alt-${i}`} />
                : <p className="border-t border-line px-3 py-2 text-xs text-slateink">Stock sample photo</p>}
            </div>
          );
        })}
        <button type="button" onClick={() => input.current?.click()} disabled={uploading > 0} data-testid="listing-photo-upload-btn"
          className={cn("flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors", error ? "border-red-300 text-red-600" : "border-line text-slateink hover:border-sapphire hover:text-sapphire")}>
          {uploading > 0 ? <><Loader2 className="h-5 w-5 animate-spin" />Uploading {uploading}…</> : <><ImagePlus className="h-6 w-6" strokeWidth={1.75} />Upload Photos</>}
        </button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => upload(e.target.files)} data-testid="listing-photo-input" />
      {(error || upError) && <p role="alert" className="mt-2 text-xs font-medium text-red-600" data-testid="listing-photos-error">{upError || error}</p>}
    </fieldset>
  );
}

const IconBtn = ({ label, onClick, disabled, children, testId }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} data-testid={testId}
    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-midnight shadow-sm transition-colors hover:bg-midnight hover:text-white disabled:opacity-40">{children}</button>
);
