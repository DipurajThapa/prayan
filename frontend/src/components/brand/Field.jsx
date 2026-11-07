import { cn } from "@/lib/utils";

export function Field({ id, label, error, hint, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label htmlFor={id} className="block font-display text-[13px] font-semibold text-midnight">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-slateink">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" data-testid={`${id}-error`} className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput({ id, invalid, className, ...props }) {
  return <input id={id} aria-invalid={!!invalid} aria-describedby={invalid ? `${id}-error` : undefined}
    className={cn("field", invalid && "border-red-400", className)} data-testid={id} {...props} />;
}

export function TextArea({ id, invalid, className, ...props }) {
  return <textarea id={id} aria-invalid={!!invalid} aria-describedby={invalid ? `${id}-error` : undefined}
    className={cn("field min-h-[120px] resize-y", invalid && "border-red-400", className)} data-testid={id} {...props} />;
}

export function SelectInput({ id, invalid, options, placeholder, className, ...props }) {
  return (
    <select id={id} aria-invalid={!!invalid} className={cn("field appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10", invalid && "border-red-400", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2351627D' stroke-width='1.75' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      data-testid={id} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
