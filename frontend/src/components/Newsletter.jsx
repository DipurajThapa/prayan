import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { isEmail } from "@/lib/site";
import { ConsentCheckbox } from "@/components/brand/ConsentCheckbox";
import { StatusMessage } from "@/components/brand/StatusMessage";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ status: "idle" });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEmail(email)) errs.email = "Please enter a valid email address.";
    if (!consent) errs.consent = "Please confirm you would like to receive updates.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState({ status: "loading" });
    try {
      const { data } = await api.post("/newsletter/subscribe", { email: email.trim(), consent });
      setState({ status: data.status, emailSent: data.email_sent });
      if (data.status === "subscribed") { setEmail(""); setConsent(false); }
    } catch (err) {
      setState({ status: "error", message: formatApiError(err, "We could not save your subscription. Please try again.") });
    }
  };

  return (
    <form onSubmit={submit} noValidate data-testid="newsletter-form">
      <p className="font-display text-lg font-bold text-white">Dubai property updates</p>
      <p className="mt-2 text-[15px] leading-relaxed text-white/70">Occasional news about new listings and the Dubai market. Unsubscribe at any time.</p>
      <div className="mt-5 flex rounded-full border border-white/20 bg-white/5 p-1.5 focus-within:border-white/60">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input id="newsletter-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-white placeholder:text-white/40 focus:outline-none" aria-invalid={!!errors.email} data-testid="newsletter-email-input" />
        <button type="submit" disabled={state.status === "loading"} data-testid="newsletter-submit-btn"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-5 font-display text-sm font-semibold text-midnight transition-colors hover:bg-ember hover:text-white disabled:opacity-60">
          {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Subscribe<ArrowRight className="h-4 w-4" strokeWidth={1.75} /></>}
        </button>
      </div>
      {errors.email && <p role="alert" className="mt-2 pl-4 text-xs font-medium text-red-300" data-testid="newsletter-email-error">{errors.email}</p>}
      <div className="mt-4">
        <ConsentCheckbox id="newsletter-consent" dark checked={consent} onChange={setConsent} error={errors.consent}>
          Yes, send me Prayan property updates by email. I can unsubscribe at any time.
        </ConsentCheckbox>
      </div>
      <NewsletterResult state={state} />
    </form>
  );
}

function NewsletterResult({ state }) {
  if (state.status === "subscribed") {
    return <StatusMessage type="success" className="mt-4" testId="newsletter-success">
      You are subscribed. {state.emailSent ? "A confirmation email with an unsubscribe link is on its way." : "We could not send a confirmation email right now, but your subscription is saved."}
    </StatusMessage>;
  }
  if (state.status === "already_subscribed") return <StatusMessage type="info" className="mt-4" testId="newsletter-duplicate">This email is already subscribed. No action needed.</StatusMessage>;
  if (state.status === "error") return <StatusMessage type="error" className="mt-4" testId="newsletter-error">{state.message}</StatusMessage>;
  return null;
}
