import { Mail, MapPin, MessageCircle, MessageSquareText, Phone } from "lucide-react";
import { CONTACT } from "@/lib/site";
import { Seo } from "@/components/brand/Seo";
import { EnquiryForm } from "@/components/EnquiryForm";
import { BrandButton } from "@/components/brand/BrandButton";
import { useChat } from "@/context/ChatContext";

const CHANNELS = [
  { Icon: Phone, label: "Call", value: CONTACT.phoneDisplay, href: `tel:${CONTACT.phone}`, id: "phone" },
  { Icon: MessageCircle, label: "WhatsApp", value: CONTACT.phoneDisplay, href: CONTACT.whatsapp, id: "whatsapp", external: true },
  { Icon: Mail, label: "Email", value: CONTACT.email, href: `mailto:${CONTACT.email}`, id: "email" },
  { Icon: MapPin, label: "Based in", value: CONTACT.city, id: "location" },
];

export default function Contact() {
  const { openChat } = useChat();
  return (
    <>
      <Seo title="Contact Prayan" path="/contact" description="Send your Dubai property enquiry to Prayan, or call, WhatsApp or email the team directly." />
      <section className="container-x grid gap-14 pb-24 pt-14 lg:grid-cols-12 lg:pt-20">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-4">Contact</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-midnight sm:text-5xl">Talk to Prayan.</h1>
          <p className="lead mt-5">Send a message with what you are looking for. The team reviews every enquiry and replies using the contact method you choose.</p>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {CHANNELS.map(({ Icon, label, value, href, id, external }) => (
              <li key={id} className="flex items-center gap-4 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-white"><Icon className="h-5 w-5 text-sapphire" strokeWidth={1.75} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slateink">{label}</p>
                  {href ? <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="break-all font-display text-lg font-semibold text-midnight hover:text-sapphire" data-testid={`contact-${id}-link`}>{value}</a>
                    : <p className="font-display text-lg font-semibold text-midnight">{value}</p>}
                </div>
              </li>
            ))}
          </ul>
          <BrandButton variant="secondary" className="mt-8" onClick={() => openChat()} data-testid="contact-ask-prayan-btn"><MessageSquareText className="h-4 w-4" strokeWidth={1.75} />Ask Prayan instead</BrandButton>
        </div>
        <div className="lg:col-span-7">
          <div className="card-soft p-6 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-midnight">Send My Enquiry</h2>
            <p className="mb-7 mt-1.5 text-[15px] text-slateink">All fields are required unless marked optional.</p>
            <EnquiryForm idPrefix="contact" messageRequired />
          </div>
        </div>
      </section>
    </>
  );
}
