import { useState } from "react";
import { CalendarDays, Loader2, Send } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { contactPayload, emptyContact, METHOD_LABEL, validateContact } from "@/lib/site";
import { ContactFields } from "@/components/brand/ContactFields";
import { Field, TextArea, TextInput } from "@/components/brand/Field";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { BrandButton } from "@/components/brand/BrandButton";
import { cn } from "@/lib/utils";

// Shared enquiry form: contact page, property questions and viewing requests.
export function EnquiryForm({ propertySlug, allowViewing, idPrefix = "enquiry", messageRequired }) {
  const [mode, setMode] = useState("property");
  const [contact, setContact] = useState(emptyContact);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [honey, setHoney] = useState("");
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ status: "idle" });
  const viewing = allowViewing && mode === "viewing";

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateContact(contact);
    if (messageRequired && !message.trim()) errs.message = "Please add a short message.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState({ status: "loading" });
    try {
      const source = propertySlug ? (viewing ? "viewing" : "property") : "contact";
      await api.post("/enquiries", {
        ...contactPayload(contact), source, message: message.trim() || null,
        property_slug: propertySlug || null, preferred_date: viewing && date ? date : null, website: honey || null,
      });
      setState({ status: "success", method: contact.contact_method, viewing });
      setContact(emptyContact); setMessage(""); setDate("");
    } catch (err) {
      setState({ status: "error", message: formatApiError(err, "We could not send your enquiry. Please try again.") });
    }
  };

  if (state.status === "success") {
    return (
      <StatusMessage type="success" testId={`${idPrefix}-success`}>
        <p className="font-semibold">Thank you. Your {state.viewing ? "viewing request" : "enquiry"} has been saved.</p>
        <p className="mt-1">The Prayan team will review it and contact you by {METHOD_LABEL[state.method]}.{state.viewing && " A viewing is only confirmed once the team contacts you."}</p>
        <button type="button" className="mt-3 text-sm font-semibold text-sapphire underline underline-offset-2" onClick={() => setState({ status: "idle" })} data-testid={`${idPrefix}-new-btn`}>Send another enquiry</button>
      </StatusMessage>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" data-testid={`${idPrefix}-form`}>
      {allowViewing && (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-soft p-1" role="tablist">
          {[["property", "Ask About This Property"], ["viewing", "Request a Viewing"]].map(([m, label]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} data-testid={`${idPrefix}-mode-${m}`}
              className={cn("h-10 whitespace-nowrap rounded-full px-2 text-[12px] font-semibold transition-colors sm:text-sm", mode === m ? "bg-white text-midnight shadow-sm" : "text-slateink hover:text-midnight")}>{label}</button>
          ))}
        </div>
      )}
      <ContactFields idPrefix={idPrefix} value={contact} onChange={setContact} errors={errors} beforeConsent={<>
        {viewing && (
          <Field id={`${idPrefix}-date`} label="Preferred viewing date (optional)" hint="The team will confirm a time that works.">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slateink" strokeWidth={1.75} />
              <TextInput id={`${idPrefix}-date`} type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
            </div>
          </Field>
        )}
        <Field id={`${idPrefix}-message`} label={messageRequired ? "Your message" : "Anything else? (optional)"} error={errors.message}>
          <TextArea id={`${idPrefix}-message`} value={message} maxLength={1500} invalid={errors.message} onChange={(e) => setMessage(e.target.value)}
            placeholder={propertySlug ? "For example: Is there a payment plan? Which floor is it on?" : "Tell us what you are looking for, or ask a question."} />
        </Field>
      </>} />
      <input type="text" tabIndex={-1} autoComplete="off" value={honey} onChange={(e) => setHoney(e.target.value)} className="hidden" aria-hidden="true" />
      {state.status === "error" && <StatusMessage type="error" testId={`${idPrefix}-error`}>{state.message}</StatusMessage>}
      <BrandButton type="submit" size="lg" className="w-full" disabled={state.status === "loading"} data-testid={`${idPrefix}-submit-btn`}>
        {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.75} />}
        {viewing ? "Request a Viewing" : "Send My Enquiry"}
      </BrandButton>
    </form>
  );
}
