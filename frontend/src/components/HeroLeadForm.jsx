import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { BUDGETS, INTENTS, LOCATIONS, METHOD_LABEL, contactPayload, emptyContact, validateContact } from "@/lib/site";
import { Field, SelectInput } from "@/components/brand/Field";
import { ContactFields } from "@/components/brand/ContactFields";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { BrandButton } from "@/components/brand/BrandButton";
import { cn } from "@/lib/utils";

const STEPS = ["prefs", "clarify", "contact", "review"];

export function HeroLeadForm() {
  const [step, setStep] = useState("prefs");
  const [prefs, setPrefs] = useState({ intent: "Buy", location: "", budget: "" });
  const [clarify, setClarify] = useState(null);
  const [answer, setAnswer] = useState("");
  const [contact, setContact] = useState(emptyContact);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const findOptions = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!prefs.location) errs.location = "Please choose a location.";
    if (!prefs.budget) errs.budget = "Please choose a budget range.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/lead/clarify", prefs);
      setClarify(data); setAnswer(""); setStep("clarify");
    } catch (err) {
      setError(formatApiError(err));
    } finally { setBusy(false); }
  };

  const toReview = (e) => {
    e.preventDefault();
    const errs = validateContact(contact);
    setErrors(errs);
    if (!Object.keys(errs).length) setStep("review");
  };

  const send = async () => {
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/enquiries", {
        source: "hero", ...prefs, ...contactPayload(contact),
        follow_up_question: answer ? clarify?.question : null, follow_up_answer: answer || null,
      });
      setResult(data); setStep("done");
    } catch (err) {
      setError(formatApiError(err, "We could not save your enquiry. Please try again."));
    } finally { setBusy(false); }
  };

  const reset = () => { setStep("prefs"); setPrefs({ intent: "Buy", location: "", budget: "" }); setContact(emptyContact); setResult(null); setAnswer(""); };
  const idx = STEPS.indexOf(step);

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/[0.92] p-6 shadow-[0_30px_80px_-30px_rgba(16,43,77,0.55)] backdrop-blur-xl sm:p-8" data-testid="hero-lead-form">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight text-midnight">{step === "done" ? "Enquiry received." : "Let's find what fits."}</h2>
        {idx >= 0 && <StepDots idx={idx} />}
      </div>
      <div className="mt-6" key={step}>
        <div className="animate-fade-up">
          {step === "prefs" && <PrefsStep prefs={prefs} setPrefs={setPrefs} errors={errors} busy={busy} onSubmit={findOptions} />}
          {step === "clarify" && <ClarifyStep clarify={clarify} answer={answer} setAnswer={setAnswer} onBack={() => setStep("prefs")} onNext={() => setStep("contact")} />}
          {step === "contact" && (
            <form onSubmit={toReview} noValidate className="space-y-5">
              <ContactFields idPrefix="hero" value={contact} onChange={setContact} errors={errors} compact />
              <NavRow onBack={() => setStep("clarify")} nextLabel="Review My Enquiry" testId="hero-contact-next-btn" />
            </form>
          )}
          {step === "review" && <ReviewStep prefs={prefs} clarify={clarify} answer={answer} contact={contact} busy={busy} onBack={() => setStep("contact")} onSend={send} />}
          {step === "done" && <DoneStep result={result} contact={contact} onReset={reset} />}
        </div>
        {error && <StatusMessage type="error" className="mt-4" testId="hero-form-error">{error}</StatusMessage>}
      </div>
    </div>
  );
}

function StepDots({ idx }) {
  return (
    <div className="flex gap-1.5" aria-label={`Step ${idx + 1} of 4`}>
      {STEPS.map((s, i) => <span key={s} className={cn("h-1.5 rounded-full transition-[width,background-color] duration-300", i === idx ? "w-6 bg-ember" : i < idx ? "w-1.5 bg-sapphire" : "w-1.5 bg-line")} />)}
    </div>
  );
}

function NavRow({ onBack, nextLabel, testId, onNext, busy }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <button type="button" onClick={onBack} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slateink hover:text-midnight" data-testid={`${testId}-back`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />Back
      </button>
      <BrandButton type={onNext ? "button" : "submit"} onClick={onNext} className="flex-1" disabled={busy} data-testid={testId}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}{nextLabel}<ArrowRight className="h-4 w-4" strokeWidth={1.75} />
      </BrandButton>
    </div>
  );
}

function PrefsStep({ prefs, setPrefs, errors, busy, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-1.5 font-display text-[13px] font-semibold text-midnight">What are you looking for?</legend>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-soft p-1" role="radiogroup">
          {INTENTS.map((i) => (
            <button key={i} type="button" role="radio" aria-checked={prefs.intent === i} onClick={() => setPrefs({ ...prefs, intent: i })} data-testid={`hero-intent-${i.toLowerCase()}`}
              className={cn("h-10 rounded-full text-sm font-semibold transition-colors", prefs.intent === i ? "bg-midnight text-white" : "text-slateink hover:text-midnight")}>{i}</button>
          ))}
        </div>
      </fieldset>
      <Field id="hero-location" label="Preferred location" error={errors.location}>
        <SelectInput id="hero-location" options={LOCATIONS} placeholder="Choose an area" value={prefs.location} invalid={errors.location} onChange={(e) => setPrefs({ ...prefs, location: e.target.value })} />
      </Field>
      <Field id="hero-budget" label="Approximate budget" error={errors.budget}>
        <SelectInput id="hero-budget" options={BUDGETS} placeholder="Choose a range" value={prefs.budget} invalid={errors.budget} onChange={(e) => setPrefs({ ...prefs, budget: e.target.value })} />
      </Field>
      <BrandButton type="submit" variant="accent" size="lg" className="w-full" disabled={busy} data-testid="hero-find-options-btn">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.75} />}Find My Options
      </BrandButton>
      <p className="text-center text-xs text-slateink">Takes about a minute. No account needed.</p>
    </form>
  );
}

function ClarifyStep({ clarify, answer, setAnswer, onBack, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sapphire"><Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />One quick question</p>
        <p className="mt-2 font-display text-lg font-semibold leading-snug text-midnight" data-testid="hero-clarify-question">{clarify?.question}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {clarify?.options?.map((o, i) => (
          <button key={o} type="button" onClick={() => setAnswer(o)} aria-pressed={answer === o} data-testid={`hero-clarify-option-${i}`}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors", answer === o ? "border-sapphire bg-sapphire text-white" : "border-line bg-white text-charcoal hover:border-sapphire")}>
            {answer === o && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}{o}
          </button>
        ))}
      </div>
      <NavRow onBack={onBack} onNext={onNext} nextLabel={answer ? "Continue" : "Skip This Question"} testId="hero-clarify-next-btn" />
    </div>
  );
}

function ReviewStep({ prefs, clarify, answer, contact, busy, onBack, onSend }) {
  const rows = [
    ["Looking to", prefs.intent], ["Location", prefs.location], ["Budget", prefs.budget],
    answer && [clarify?.question, answer], ["Name", contact.name.trim()],
    ["Contact by", `${METHOD_LABEL[contact.contact_method]} · ${contact.contact_method === "email" ? contact.email : contact.phone}`],
  ].filter(Boolean);
  return (
    <div className="space-y-5">
      <p className="text-sm text-slateink">Please check your details before sending.</p>
      <dl className="divide-y divide-line rounded-2xl border border-line bg-soft/60" data-testid="hero-review-summary">
        {rows.map(([k, v]) => <div key={k} className="grid grid-cols-5 gap-3 px-4 py-2.5 text-sm"><dt className="col-span-2 text-slateink">{k}</dt><dd className="col-span-3 font-medium text-midnight">{v}</dd></div>)}
      </dl>
      <NavRow onBack={onBack} onNext={onSend} busy={busy} nextLabel="Send My Enquiry" testId="hero-send-enquiry-btn" />
    </div>
  );
}

function DoneStep({ result, contact, onReset }) {
  const n = result?.matches?.length || 0;
  return (
    <div className="space-y-4" data-testid="hero-confirmation">
      <StatusMessage type="success">Thank you, {contact.name.split(" ")[0]}. Your enquiry is saved and the Prayan team will contact you by {METHOD_LABEL[contact.contact_method]}.</StatusMessage>
      <div className="rounded-2xl border border-line bg-soft/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sapphire">Your requirements</p>
        <p className="mt-2 text-sm leading-relaxed text-charcoal" data-testid="hero-confirmation-summary">{result?.summary}</p>
      </div>
      <p className="text-sm text-slateink" data-testid="hero-confirmation-matches">
        {n > 0 ? <>{n} listing{n > 1 ? "s" : ""} on this site match{n === 1 ? "es" : ""} your location and budget.{result.matches.some((m) => m.is_sample) && " Listings marked as samples are demonstrations, not available properties."} </>
          : <>No listings on this site currently match your location and budget. The team will follow up with suitable next steps. </>}
        <Link to="/properties" className="font-semibold text-sapphire underline underline-offset-2" data-testid="hero-confirmation-explore-link">Explore Properties</Link>
      </p>
      <button type="button" onClick={onReset} className="text-sm font-semibold text-slateink underline underline-offset-2 hover:text-midnight" data-testid="hero-start-over-btn">Start a new enquiry</button>
    </div>
  );
}
