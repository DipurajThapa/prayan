import { MessageSquareText } from "lucide-react";
import { BrandButton } from "@/components/brand/BrandButton";
import { useChat } from "@/context/ChatContext";

export function CtaSection({
  title = "Tell us what you are looking for.",
  body = "Send your requirements in a couple of minutes. The Prayan team reviews every enquiry and replies using the contact method you choose.",
}) {
  const { openChat } = useChat();
  return (
    <section className="container-x py-20 lg:py-28" data-testid="cta-section">
      <div className="relative overflow-hidden rounded-[28px] bg-midnight px-7 py-14 sm:px-12 lg:px-16 lg:py-20">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-30 invert" aria-hidden="true" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-[40px] border border-white/10" aria-hidden="true" />
        <div className="absolute right-16 top-16 h-3 w-3 rounded-[3px] bg-ember" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
          <p className="mt-5 text-base leading-relaxed text-white/75 md:text-lg">{body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <BrandButton to="/contact" variant="accent" size="lg" data-testid="cta-start-enquiry-btn">Start My Enquiry</BrandButton>
            <BrandButton variant="light" size="lg" onClick={() => openChat()} data-testid="cta-talk-to-prayan-btn">
              <MessageSquareText className="h-4 w-4" strokeWidth={1.75} />Talk to Prayan
            </BrandButton>
          </div>
        </div>
      </div>
    </section>
  );
}
