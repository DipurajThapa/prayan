import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConsentCheckbox({ id, checked, onChange, error, children, dark }) {
  return (
    <div>
      <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed", dark ? "text-white/80" : "text-slateink")}>
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
            className={cn("peer h-5 w-5 cursor-pointer appearance-none rounded-md border bg-white transition-colors checked:border-sapphire checked:bg-sapphire", error ? "border-red-400" : "border-midnight/25")}
            aria-invalid={!!error} data-testid={id} />
          <Check className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
        </span>
        <span>
          {children || (
            <>I agree that Prayan may store these details and contact me about this enquiry. See the{" "}
              <Link to="/privacy" className={cn("underline underline-offset-2", dark ? "text-white" : "text-sapphire")}>Privacy Policy</Link>.</>
          )}
        </span>
      </label>
      {error && <p role="alert" data-testid={`${id}-error`} className="mt-1.5 pl-8 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
