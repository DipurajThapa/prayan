import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQS = [
  { q: "What does Prayan do?", a: "Prayan helps you explore Dubai property options, answers your questions and passes your requirements to a real person who follows up. You can browse listings, ask the AI assistant or send an enquiry directly." },
  { q: "Are the properties on this site available to buy?", a: "Not yet. The listings currently shown are clearly labelled sample data used to preview the website. Prices, specifications and photography are illustrative and do not represent available properties." },
  { q: "What can the Prayan assistant help with?", a: "The assistant answers general questions, explains the listing details on this site, helps you narrow down location, budget and property type, and records a viewing or call-back request. It does not invent prices, confirm availability or book appointments." },
  { q: "What happens after I send an enquiry?", a: "Your enquiry is saved with a short summary of your requirements. The Prayan team reviews it and contacts you using the method you chose. Nothing is sent to you automatically." },
  { q: "Which areas of Dubai can I ask about?", a: "You can ask about any Dubai community. The sample listings cover Downtown Dubai, Dubai Marina, Palm Jumeirah, Dubai Hills Estate, Business Bay and Jumeirah Village Circle." },
  { q: "How is my personal information used?", a: "We only use your details to respond to your enquiry or to send updates you subscribed to. We ask for your consent before saving contact details. Read the Privacy Policy for full details." },
];

export const faqJsonLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export function FaqAccordion({ items = FAQS }) {
  return (
    <Accordion type="single" collapsible className="divide-y divide-line border-y border-line" data-testid="faq-accordion">
      {items.map((f, i) => (
        <AccordionItem key={f.q} value={`faq-${i}`} className="border-0">
          <AccordionTrigger className="py-6 text-left font-display text-lg font-semibold text-midnight hover:no-underline md:text-xl" data-testid={`faq-trigger-${i}`}>
            {f.q}
          </AccordionTrigger>
          <AccordionContent className="max-w-2xl pb-6 text-base leading-relaxed text-slateink">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
