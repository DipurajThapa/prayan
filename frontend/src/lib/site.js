export const CONTACT = {
  phone: "+971563565659",
  phoneDisplay: "+971 56 356 5659",
  whatsapp: "https://wa.me/971563565659",
  email: "dipuraj.thapa@gmail.com",
  city: "Dubai, UAE",
};

export const SITE_URL = process.env.REACT_APP_SITE_URL;

export const LOCATIONS = [
  "Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Dubai Hills Estate",
  "Business Bay", "Jumeirah Village Circle", "Open to suggestions",
];
export const BUDGETS = ["Under AED 2M", "AED 2M – 5M", "AED 5M – 10M", "AED 10M+", "Not sure yet"];
export const INTENTS = ["Buy", "Invest", "Explore"];
export const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Penthouse"];

export const formatAED = (n) => `AED ${Number(n).toLocaleString("en-US")}`;

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Explore Properties" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/contact", label: "Contact" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
export const isEmail = (v) => EMAIL_RE.test((v || "").trim());

export const emptyContact = { name: "", contact_method: "email", email: "", phone: "", consent: false };

export function validateContact(v) {
  const e = {};
  if (!v.name || v.name.trim().length < 2) e.name = "Please add your name.";
  if (v.contact_method === "email") {
    if (!isEmail(v.email)) e.email = "Please add a valid email address.";
  } else if (!PHONE_RE.test((v.phone || "").trim())) {
    e.phone = "Please add a valid phone number, including the country code.";
  }
  if (!v.consent) e.consent = "Please agree to be contacted so we can respond.";
  return e;
}

export const contactPayload = (v) => ({
  name: v.name.trim(),
  contact_method: v.contact_method,
  email: v.contact_method === "email" ? v.email.trim() : null,
  phone: v.contact_method !== "email" ? v.phone.trim() : null,
  consent: v.consent,
});

export const METHOD_LABEL = { email: "email", phone: "phone", whatsapp: "WhatsApp" };
