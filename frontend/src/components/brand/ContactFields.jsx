import { Mail, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, TextInput } from "@/components/brand/Field";
import { ConsentCheckbox } from "@/components/brand/ConsentCheckbox";

const METHODS = [
  { value: "email", label: "Email", Icon: Mail },
  { value: "phone", label: "Phone", Icon: Phone },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
];

export function ContactFields({ idPrefix, value, onChange, errors = {}, compact }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <Field id={`${idPrefix}-name`} label="Your name" error={errors.name}>
        <TextInput id={`${idPrefix}-name`} autoComplete="name" value={value.name} invalid={errors.name}
          onChange={(e) => set("name")(e.target.value)} placeholder="First and last name" />
      </Field>
      <fieldset>
        <legend className="mb-1.5 font-display text-[13px] font-semibold text-midnight">How should we contact you?</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {METHODS.map(({ value: m, label, Icon }) => (
            <button key={m} type="button" role="radio" aria-checked={value.contact_method === m}
              onClick={() => set("contact_method")(m)} data-testid={`${idPrefix}-method-${m}`}
              className={cn("flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors",
                value.contact_method === m ? "border-sapphire bg-sapphire/5 text-sapphire" : "border-line bg-white text-slateink hover:border-midnight/30")}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />{label}
            </button>
          ))}
        </div>
      </fieldset>
      {value.contact_method === "email" ? (
        <Field id={`${idPrefix}-email`} label="Email address" error={errors.email}>
          <TextInput id={`${idPrefix}-email`} type="email" autoComplete="email" value={value.email} invalid={errors.email}
            onChange={(e) => set("email")(e.target.value)} placeholder="you@example.com" />
        </Field>
      ) : (
        <Field id={`${idPrefix}-phone`} label={value.contact_method === "whatsapp" ? "WhatsApp number" : "Phone number"} error={errors.phone}>
          <TextInput id={`${idPrefix}-phone`} type="tel" autoComplete="tel" value={value.phone} invalid={errors.phone}
            onChange={(e) => set("phone")(e.target.value)} placeholder="+971 50 000 0000" />
        </Field>
      )}
      <ConsentCheckbox id={`${idPrefix}-consent`} checked={value.consent} onChange={set("consent")} error={errors.consent} />
    </div>
  );
}
