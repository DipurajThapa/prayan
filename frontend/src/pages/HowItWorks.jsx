import { CircleCheck, CircleX } from "lucide-react";
import { media } from "@/lib/media";
import { Seo } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";
import { FAQS, FaqAccordion, faqJsonLd } from "@/components/FaqAccordion";
import { CtaSection } from "@/components/CtaSection";
import { JOURNEY } from "@/pages/Home";

const DETAIL = [
  "Use the filters to compare areas, property types, bedrooms and price. Open any listing to see its specifications, amenities and location.",
  "Ask the Prayan assistant about an area or a listing. It answers from the data on this site and tells you when it does not know something.",
  "Use the enquiry form or the assistant to share your location, budget and priorities, then choose email, phone or WhatsApp.",
  "Your enquiry is saved with a short summary. The Prayan team reviews it and contacts you with a suitable next step, such as a call or a viewing.",
];
const DOES = ["Answers questions about listings on this site", "Helps you narrow down area, budget and type", "Records viewing and call-back requests", "Summarises your requirements for the team"];
const DOESNT = ["Invent prices, availability or service charges", "Book or confirm viewings by itself", "Give legal, mortgage or tax advice", "Save your details without consent"];
const HOW_FAQS = FAQS.filter((_, i) => [1, 2, 3].includes(i));

export default function HowItWorks() {
  return (
    <>
      <Seo title="How It Works" path="/how-it-works" description="How Prayan works: explore Dubai properties, ask questions, share your requirements and receive a next step from a real team." jsonLd={faqJsonLd(HOW_FAQS)} />
      <section className="container-x grid gap-10 pb-16 pt-14 lg:grid-cols-12 lg:items-end lg:pt-20">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-4">How it works</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-midnight sm:text-5xl lg:text-6xl">Four steps from browsing to a real conversation.</h1>
        </div>
        <p className="lead lg:col-span-5">Prayan keeps the process simple. You explore at your own pace, ask what you need to know and only share your details when you are ready.</p>
      </section>
      <section className="container-x">
        <img src={media("house-glass-walls").src} alt={media("house-glass-walls").alt} loading="lazy" className="aspect-[16/7] w-full rounded-[24px] object-cover" />
      </section>
      <section className="container-x py-20 lg:py-28">
        <ol className="grid gap-px overflow-hidden rounded-[24px] border border-line bg-line md:grid-cols-2">
          {JOURNEY.map(({ Icon, title }, i) => (
            <li key={title} className="bg-white p-8 lg:p-12" data-testid={`how-step-${i + 1}`}>
              <div className="flex items-center justify-between">
                <Icon className="h-7 w-7 text-sapphire" strokeWidth={1.75} />
                <span className="font-display text-5xl font-extrabold text-line">0{i + 1}</span>
              </div>
              <h2 className="mt-8 font-display text-2xl font-bold text-midnight">{title}</h2>
              <p className="mt-3 text-base leading-relaxed text-slateink">{DETAIL[i]}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <BrandButton to="/properties" data-testid="how-explore-btn">Explore Properties</BrandButton>
          <BrandButton to="/contact" variant="secondary" data-testid="how-enquiry-btn">Start My Enquiry</BrandButton>
        </div>
      </section>
      <section className="border-y border-line bg-white py-20 lg:py-28">
        <div className="container-x">
          <p className="eyebrow mb-4">The Prayan assistant</p>
          <h2 className="h2 max-w-2xl">What the assistant does, and what it does not.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <List title="It will" items={DOES} Icon={CircleCheck} tone="text-sapphire" />
            <List title="It will not" items={DOESNT} Icon={CircleX} tone="text-ember" />
          </div>
        </div>
      </section>
      <section className="container-x grid gap-12 py-20 lg:grid-cols-12 lg:py-28">
        <h2 className="h2 lg:col-span-4">Common questions about the process.</h2>
        <div className="lg:col-span-8"><FaqAccordion items={HOW_FAQS} /></div>
      </section>
      <CtaSection />
    </>
  );
}

function List({ title, items, Icon, tone }) {
  return (
    <div className="rounded-2xl border border-line bg-soft p-8">
      <h3 className="font-display text-xl font-bold text-midnight">{title}</h3>
      <ul className="mt-5 space-y-3">{items.map((t) => <li key={t} className="flex items-start gap-3 text-[15px] text-charcoal"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} strokeWidth={1.75} />{t}</li>)}</ul>
    </div>
  );
}
