import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const BASE =
  "group inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold tracking-tight transition-[background-color,color,border-color,transform,box-shadow] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sapphire/25";

const VARIANTS = {
  primary: "bg-midnight text-white hover:bg-sapphire shadow-[0_10px_24px_-12px_rgba(16,43,77,0.6)]",
  accent: "bg-ember text-white hover:bg-[#f0682a] shadow-[0_10px_24px_-12px_rgba(255,122,56,0.7)]",
  secondary: "border border-midnight/15 bg-white text-midnight hover:border-sapphire hover:text-sapphire",
  light: "border border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white hover:text-midnight",
  ghost: "text-sapphire hover:text-midnight px-0",
};

const SIZES = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-[15px]", lg: "h-[52px] px-7 text-base" };

export function BrandButton({ variant = "primary", size = "md", to, href, className, children, ...props }) {
  const cls = cn(BASE, VARIANTS[variant], variant !== "ghost" && SIZES[size], className);
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...props}>{children}</a>;
  return <button type="button" className={cls} {...props}>{children}</button>;
}
