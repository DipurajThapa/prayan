import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, MessageSquareText, UserRound, X } from "lucide-react";
import { API, api, formatApiError } from "@/lib/api";
import { contactPayload, emptyContact, METHOD_LABEL, validateContact } from "@/lib/site";
import { useChat } from "@/context/ChatContext";
import { ContactFields } from "@/components/brand/ContactFields";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { BrandButton } from "@/components/brand/BrandButton";
import { cn } from "@/lib/utils";

const TOKEN = "[[SHARE_DETAILS]]";
const clean = (t) => t.replace(TOKEN, "").replace(/\[\[[A-Z_]*\]?$/, "").trim();
const QUICK = ["Which sample villas have a private pool?", "I'd like to request a viewing", "What can I get for under AED 2M?", "Can someone call me back?"];
const GREETING = { role: "assistant", content: "Hello, I'm the Prayan assistant. Ask me about Dubai areas, the sample listings on this site, or tell me what you're looking for. I'll ask one question at a time." };

function sessionId() {
  let id = sessionStorage.getItem("prayan_chat_session");
  if (!id) { id = `chat_${crypto.randomUUID()}`; sessionStorage.setItem("prayan_chat_session", id); }
  return id;
}

export function ChatWidget() {
  const { open, setOpen, propertySlug, draft, setDraft } = useChat();
  const [messages, setMessages] = useState(() => JSON.parse(sessionStorage.getItem("prayan_chat_messages") || "null") || [GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { sessionStorage.setItem("prayan_chat_messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, showForm, open]);
  useEffect(() => {
    if (open && draft) { setInput(draft); setDraft(""); }
  }, [open, draft, setDraft]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    const update = (fn) => setMessages((m) => { const c = [...m]; c[c.length - 1] = fn(c[c.length - 1]); return c; });
    try {
      const res = await fetch(`${API}/chat/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId(), message: msg, property_slug: propertySlug }) });
      if (!res.ok || !res.body) throw new Error("bad");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const d = JSON.parse(p.slice(6));
          if (d.delta) { full += d.delta; update((last) => ({ ...last, content: full })); }
          if (d.error) update(() => ({ role: "assistant", content: d.error, error: true }));
        }
      }
      if (full.includes(TOKEN)) setShowForm(true);
    } catch {
      update(() => ({ role: "assistant", content: "The assistant is unavailable right now. Please try again, or use the contact form.", error: true }));
    } finally { setStreaming(false); }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} data-testid="chat-widget-open-btn" aria-label="Talk to Prayan"
          className="fixed bottom-5 right-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-midnight pl-5 pr-6 font-display text-sm font-semibold text-white shadow-[0_18px_40px_-14px_rgba(16,43,77,0.7)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-sapphire">
          <MessageSquareText className="h-5 w-5" strokeWidth={1.75} /><span className="hidden sm:inline">Talk to Prayan</span>
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-ember" />
        </button>
      )}
      {open && (
        <section role="dialog" aria-label="Prayan property assistant" data-testid="chat-widget-panel"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-[24px] border border-line bg-white shadow-2xl animate-fade-up sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[640px] sm:max-h-[calc(100dvh-40px)] sm:w-[400px] sm:rounded-[24px]">
          <ChatHeader onClose={() => setOpen(false)} />
          <div className="flex-1 space-y-3 overflow-y-auto bg-soft/60 px-4 py-5" aria-live="polite" data-testid="chat-messages">
            {messages.map((m, i) => <Bubble key={i} m={m} typing={streaming && i === messages.length - 1} />)}
            {messages.length === 1 && <QuickPrompts onPick={send} />}
            {showForm && <ChatDetailsForm propertySlug={propertySlug} onDone={(t) => { setShowForm(false); setMessages((m) => [...m, { role: "assistant", content: t, local: true }]); }} />}
            <div ref={endRef} />
          </div>
          <ChatInput input={input} setInput={setInput} send={send} streaming={streaming} onDetails={() => setShowForm(true)} />
        </section>
      )}
    </>
  );
}

function ChatHeader({ onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
      <div>
        <p className="font-display text-base font-bold text-midnight">Prayan assistant</p>
        <p className="text-xs text-slateink">AI answers based on sample listing data</p>
      </div>
      <button onClick={onClose} aria-label="Close assistant" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-soft" data-testid="chat-widget-close-btn"><X className="h-5 w-5" strokeWidth={1.75} /></button>
    </div>
  );
}

function Bubble({ m, typing }) {
  const user = m.role === "user";
  const text = clean(m.content);
  return (
    <div className={cn("flex", user ? "justify-end" : "justify-start")} data-testid={user ? "chat-user-message" : "chat-assistant-message"}>
      <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
        user ? "rounded-br-md bg-midnight text-white" : m.error ? "rounded-bl-md border border-red-200 bg-red-50 text-red-800" : "rounded-bl-md border border-line bg-white text-charcoal")}>
        {text || (typing && <span className="inline-flex gap-1 py-1"><Dot /><Dot d="150ms" /><Dot d="300ms" /></span>)}
      </div>
    </div>
  );
}

const Dot = ({ d = "0ms" }) => <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slateink/60" style={{ animationDelay: d }} />;

function QuickPrompts({ onPick }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {QUICK.map((q, i) => <button key={q} onClick={() => onPick(q)} data-testid={`chat-quick-prompt-${i}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] text-midnight transition-colors hover:border-sapphire hover:text-sapphire">{q}</button>)}
    </div>
  );
}

function ChatInput({ input, setInput, send, streaming, onDetails }) {
  return (
    <div className="border-t border-line bg-white px-4 pb-4 pt-3">
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">Type your question</label>
        <textarea id="chat-input" rows={1} value={input} maxLength={1200} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about areas, listings or viewings" className="field max-h-28 min-h-[46px] flex-1 resize-none py-3" data-testid="chat-input" />
        <button type="submit" disabled={streaming || !input.trim()} aria-label="Send message" data-testid="chat-send-btn"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-midnight text-white transition-colors hover:bg-sapphire disabled:opacity-40">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2} />}
        </button>
      </form>
      <button onClick={onDetails} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sapphire hover:text-midnight" data-testid="chat-share-details-btn">
        <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />Share my details for a follow-up
      </button>
    </div>
  );
}

function ChatDetailsForm({ propertySlug, onDone }) {
  const [v, setV] = useState(emptyContact);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const errs = validateContact(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError("");
    try {
      await api.post("/chat/enquiry", { session_id: sessionId(), property_slug: propertySlug, ...contactPayload(v) });
      onDone(`Thank you, ${v.name.trim().split(" ")[0]}. Your details and a summary of this conversation are saved. The Prayan team will contact you by ${METHOD_LABEL[v.contact_method]}.`);
    } catch (err) { setError(formatApiError(err, "We could not save your details. Please try again.")); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl border border-line bg-white p-4" data-testid="chat-details-form">
      <p className="font-display text-sm font-bold text-midnight">Share your details for a follow-up</p>
      <ContactFields idPrefix="chat" value={v} onChange={setV} errors={errors} compact />
      {error && <StatusMessage type="error" testId="chat-details-error">{error}</StatusMessage>}
      <BrandButton type="submit" size="sm" className="w-full" disabled={busy} data-testid="chat-details-submit-btn">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}Send My Details
      </BrandButton>
    </form>
  );
}
