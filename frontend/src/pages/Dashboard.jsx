import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CalendarCheck2, Clock3, Copy, Inbox, Loader2, LogOut, Mail, MessageCircle, Phone, RefreshCw, Save, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { METHOD_LABEL } from "@/lib/site";
import { useAuth } from "@/context/AuthContext";
import { Seo } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { cn } from "@/lib/utils";

const STATUS_LABEL = { new: "New", awaiting_follow_up: "Awaiting follow-up", contacted: "Contacted", closed: "Closed" };
const STATUS_TONE = { new: "bg-ember/10 text-[#c2501b]", awaiting_follow_up: "bg-sapphire/10 text-sapphire", contacted: "bg-emerald-50 text-emerald-700", closed: "bg-line text-slateink" };
const TABS = [["all", "All"], ["new", "New"], ["awaiting_follow_up", "Awaiting follow-up"], ["viewing", "Viewing requests"], ["contacted", "Contacted"], ["closed", "Closed"]];
const SOURCE = { hero: "Home enquiry form", contact: "Contact page", property: "Property question", viewing: "Viewing request", chat: "AI assistant" };
const fmtDate = (s) => new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Dashboard() {
  const { user, checkAuth } = useAuth();
  const location = useLocation();
  useEffect(() => { if (user === null && !location.state?.user) checkAuth(); }, [user, checkAuth, location.state]);
  if (user === false) return <Navigate to="/login" replace />;
  if (!user && !location.state?.user) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sapphire" /></div>;
  return <Workspace owner={user || location.state.user} />;
}

function Workspace({ owner }) {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const params = tab === "viewing" ? { viewing: true } : tab !== "all" ? { status: tab } : {};
      const [s, list] = await Promise.all([api.get("/admin/stats"), api.get("/admin/enquiries", { params })]);
      setStats(s.data); setItems(list.data);
    } catch (err) { setError(formatApiError(err, "Could not load enquiries.")); setItems([]); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const selected = items?.find((e) => e.id === selectedId);
  const onUpdated = (enq) => { setItems((l) => l.map((e) => (e.id === enq.id ? enq : e))); api.get("/admin/stats").then((r) => setStats(r.data)); };

  return (
    <div className="container-x py-10" data-testid="owner-dashboard">
      <Seo title="Owner dashboard" path="/dashboard" description="Prayan owner dashboard." noindex />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-3">Owner workspace</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-midnight sm:text-4xl">Today's enquiries</h1>
          <p className="mt-1 text-sm text-slateink">Signed in as {owner.email}</p>
        </div>
        <div className="flex gap-2">
          <BrandButton variant="secondary" size="sm" onClick={load} data-testid="dashboard-refresh-btn"><RefreshCw className="h-4 w-4" strokeWidth={1.75} />Refresh</BrandButton>
          <BrandButton variant="secondary" size="sm" onClick={logout} data-testid="dashboard-logout-btn"><LogOut className="h-4 w-4" strokeWidth={1.75} />Sign out</BrandButton>
        </div>
      </div>
      <StatCards stats={stats} />
      <div className="mt-8 flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setSelectedId(null); }} data-testid={`dashboard-tab-${k}`}
            className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors", tab === k ? "bg-midnight text-white" : "text-slateink hover:text-midnight")}>{label}</button>
        ))}
      </div>
      {error && <StatusMessage type="error" className="mt-6" testId="dashboard-error">{error}</StatusMessage>}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5"><EnquiryList items={items} selectedId={selectedId} onSelect={setSelectedId} /></div>
        <div className="lg:col-span-7">{selected ? <EnquiryDetail key={selected.id} enq={selected} onUpdated={onUpdated} /> : <EmptyDetail />}</div>
      </div>
    </div>
  );
}

function StatCards({ stats }) {
  const cards = [["New enquiries", stats?.new, Inbox, "stat-new"], ["Awaiting follow-up", stats?.awaiting_follow_up, Clock3, "stat-follow-up"], ["Viewing requests", stats?.viewing_requests, CalendarCheck2, "stat-viewing"], ["Newsletter subscribers", stats?.subscribers, Users, "stat-subscribers"]];
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(([label, v, Icon, id], i) => (
        <div key={id} className={cn("rounded-2xl p-5", i === 0 ? "bg-midnight text-white" : "card-soft")} data-testid={id}>
          <Icon className={cn("h-5 w-5", i === 0 ? "text-ember" : "text-sapphire")} strokeWidth={1.75} />
          <p className="mt-4 font-display text-3xl font-extrabold">{v ?? "–"}</p>
          <p className={cn("text-sm", i === 0 ? "text-white/70" : "text-slateink")}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function EnquiryList({ items, selectedId, onSelect }) {
  if (items === null) return <div className="h-64 animate-pulse rounded-2xl bg-line/60" />;
  if (!items.length) return <div className="card-soft p-10 text-center text-slateink" data-testid="dashboard-empty">No enquiries in this view yet.</div>;
  return (
    <ul className="card-soft max-h-[70vh] divide-y divide-line overflow-y-auto" data-testid="enquiry-list">
      {items.map((e) => (
        <li key={e.id}>
          <button onClick={() => onSelect(e.id)} data-testid={`enquiry-row-${e.id}`}
            className={cn("w-full px-5 py-4 text-left transition-colors hover:bg-soft", selectedId === e.id && "bg-sapphire/5")}>
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-display font-bold text-midnight">{e.name}</p>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_TONE[e.status])}>{STATUS_LABEL[e.status]}</span>
            </div>
            <p className="mt-1 truncate text-sm text-slateink">{[e.intent, e.location, e.budget].filter(Boolean).join(" · ") || e.property_title || SOURCE[e.source]}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-slateink/80">{fmtDate(e.created_at)} · {SOURCE[e.source]}{e.wants_viewing && <span className="font-semibold text-sapphire">· Viewing</span>}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

const EmptyDetail = () => <div className="card-soft flex min-h-[320px] items-center justify-center p-10 text-center text-slateink">Select an enquiry to see the customer's requirements and draft a follow-up.</div>;

function EnquiryDetail({ enq, onUpdated }) {
  const contact = enq.contact_method === "email" ? enq.email : enq.phone;
  const MethodIcon = { email: Mail, phone: Phone, whatsapp: MessageCircle }[enq.contact_method];
  const rows = [["Looking to", enq.intent], ["Location", enq.location], ["Budget", enq.budget], ["Property type", enq.property_type], ["Bedrooms", enq.bedrooms], ["Timeline", enq.timeline],
    [enq.follow_up_question, enq.follow_up_answer], ["Property", enq.property_title], ["Viewing requested", enq.wants_viewing ? (enq.preferred_date || "Yes, no date given") : null]].filter(([k, v]) => k && v);

  const setStatus = async (status) => {
    try { const { data } = await api.patch(`/admin/enquiries/${enq.id}`, { status }); onUpdated(data); toast.success(`Marked as ${STATUS_LABEL[status].toLowerCase()}`); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="card-soft p-6 sm:p-8" data-testid="enquiry-detail">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-2xl font-bold text-midnight" data-testid="enquiry-detail-name">{enq.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slateink"><MethodIcon className="h-4 w-4" strokeWidth={1.75} />Prefers {METHOD_LABEL[enq.contact_method]}: <span className="font-medium text-midnight">{contact}</span></p>
          <p className="mt-1 text-xs text-slateink">{SOURCE[enq.source]} · {fmtDate(enq.created_at)} · Consent given</p>
        </div>
        <label className="text-xs font-semibold text-slateink">Status
          <select value={enq.status} onChange={(e) => setStatus(e.target.value)} className="field mt-1 h-10 py-0 text-sm" data-testid="enquiry-status-select">
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {rows.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3" data-testid="enquiry-requirements">
          {rows.map(([k, v]) => <div key={k} className="bg-white p-4"><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slateink">{k}</dt><dd className="mt-1 text-sm font-semibold text-midnight">{String(v)}</dd></div>)}
        </dl>
      )}
      <div className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-sapphire">Summary</p><p className="mt-2 text-[15px] leading-relaxed text-charcoal" data-testid="enquiry-summary">{enq.summary}</p></div>
      {enq.message && <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slateink">{enq.source === "chat" ? "Visitor messages" : "Message"}</p><p className="mt-2 whitespace-pre-wrap rounded-xl bg-soft p-4 text-sm text-charcoal">{enq.message}</p></div>}
      <FollowUpEditor enq={enq} onUpdated={onUpdated} />
    </div>
  );
}

function FollowUpEditor({ enq, onUpdated }) {
  const [text, setText] = useState(enq.followup_draft || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setBusy(true); setError("");
    try { const { data } = await api.post(`/admin/enquiries/${enq.id}/followup`); setText(data.followup_draft); onUpdated({ ...enq, followup_draft: data.followup_draft }); }
    catch (err) { setError(formatApiError(err)); } finally { setBusy(false); }
  };
  const save = async () => {
    try { const { data } = await api.patch(`/admin/enquiries/${enq.id}`, { followup_draft: text }); onUpdated(data); toast.success("Draft saved"); }
    catch (err) { toast.error(formatApiError(err)); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success("Message copied"); } catch { toast.error("Copy failed. Select the text and copy it manually."); }
  };

  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-midnight">Follow-up message</h3>
          <p className="text-xs text-slateink">AI draft from this enquiry only. Review and edit before sending it yourself. Nothing is sent automatically.</p>
        </div>
        <BrandButton variant="accent" size="sm" onClick={generate} disabled={busy} data-testid="followup-generate-btn">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.75} />}{text ? "Regenerate" : "Generate Follow-up"}
        </BrandButton>
      </div>
      {error && <StatusMessage type="error" className="mt-4" testId="followup-error">{error}</StatusMessage>}
      <label htmlFor="followup-text" className="sr-only">Follow-up message</label>
      <textarea id="followup-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Generate a draft, or write your own message here."
        className="field mt-4 min-h-[200px] resize-y text-[15px] leading-relaxed" data-testid="followup-textarea" />
      <div className="mt-3 flex flex-wrap gap-2">
        <BrandButton variant="secondary" size="sm" onClick={save} disabled={!text.trim()} data-testid="followup-save-btn"><Save className="h-4 w-4" strokeWidth={1.75} />Save Draft</BrandButton>
        <BrandButton size="sm" onClick={copy} disabled={!text.trim()} data-testid="followup-copy-btn"><Copy className="h-4 w-4" strokeWidth={1.75} />Copy Message</BrandButton>
      </div>
    </div>
  );
}
