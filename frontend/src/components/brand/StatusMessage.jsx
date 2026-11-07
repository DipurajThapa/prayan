import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = {
  success: { cls: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  error: { cls: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle },
  info: { cls: "border-sapphire/20 bg-sapphire/5 text-midnight", Icon: Info },
  loading: { cls: "border-line bg-white text-slateink", Icon: Loader2 },
};

export function StatusMessage({ type = "info", children, className, testId }) {
  const { cls, Icon } = STYLES[type];
  return (
    <div role={type === "error" ? "alert" : "status"} data-testid={testId}
      className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed", cls, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", type === "loading" && "animate-spin")} strokeWidth={1.75} />
      <div>{children}</div>
    </div>
  );
}
