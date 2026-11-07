# Prayan – PRD

## Original problem statement
"PRAYAN: Premium AI-Powered Dubai Real Estate Website" master build prompt (full text in conversation): premium, mobile-first Dubai real estate site with immersive hero + AI lead form ("Let's find what fits." Buy/Invest/Explore, location, budget, "Find My Options", one follow-up, contact, consent, summary, save, confirmation), Home / Explore Properties / Property Details / How It Works / Contact / Owner Dashboard (protected, AI editable follow-up) / Privacy / Terms, shared component system, newsletter w/ consent, duplicates, unsubscribe, AI assistant with controlled scope, SEO/AEO, media registry, no invented claims. Colours #102B4D #245DCC #FF7A38 #F7F9FC #16233B, fonts Manrope + DM Sans, Lucide icons.

User choices: Claude Opus 5.5; owner login email/password AND Emergent Google (allow-listed); sample listings clearly labelled; newsletter saves AND sends confirmation email; contacts +971563565659, dipuraj.thapa@gmail.com, Dubai UAE.

## Architecture
- Backend FastAPI: core.py (db, JWT, owner dependency), ai.py (claude-opus-5-5 via emergentintegrations), emailer.py (Emergent managed Resend + guardrail gate), routes_public.py, routes_auth.py, routes_admin.py, seed_data.py (6 sample listings).
- Mongo collections: users, user_sessions, login_attempts, properties, enquiries, chat_sessions, subscribers.
- Frontend React: lib/site.js (constants+validation), lib/media.js (media registry: source/licence/usage/alt), components/brand/* (BrandButton, Field, ContactFields, ConsentCheckbox, StatusMessage, Seo/Logo/SampleBadge), layout (Header, Footer, SiteLayout), HeroLeadForm, ChatWidget (SSE), EnquiryForm, PropertyCard, FaqAccordion, CtaSection, Newsletter. React 19 native head tags for SEO; robots.txt, sitemap.xml.

## Personas
Property seekers (buyers/investors/explorers); Owner (reviews enquiries, drafts follow-ups).

## Implemented (2026-11-07, iteration 2)
- Listing Manager at /dashboard/listings (owner only): create/edit/delete, publish/draft, featured, sample flag, photo upload to Emergent object storage (JPG/PNG/WebP ≤8MB, verified with PIL), alt text, reorder, cover; removed photos marked deleted; public /api/files/{path}
- Real (non-sample) listings render without sample labels; AI assistant/follow-ups distinguish sample vs real
- Hero video on desktop (Pexels 31977028, 14s muted loop, 4.7MB, pause button, reduced-motion respected); photo on mobile
- Tested iteration_2: backend 44/44, frontend flows pass; mobile overflow, scroll-to-editor, error clearing, nested link fixed afterwards

## Implemented (2026-11-07)
- All pages + shared design system; hero AI clarify → contact → review → save → accurate confirmation with sample matches
- AI assistant: streaming, session memory, sample-data guarded, [[SHARE_DETAILS]] consented capture → chat enquiry (deduped per session)
- Owner dashboard: stats, tabs, detail, status, AI follow-up generate/edit/save/copy (never sends)
- Newsletter: validation, consent, duplicate, unsubscribe page; confirmation email attempted (currently 402 insufficient credits → UI says saved)
- Auth: JWT cookies + refresh, brute-force lockout by email, Google allow-list, simple per-IP rate limit on AI endpoints
- Tested iteration_1: backend 25/26 → fixed lockout; UI issues fixed (single hero form, dark newsletter messages, mobile overflow, clean filter URLs, consent order)

## Backlog
- P0 before launch: replace sample listings with verified data; set SITE_URL/REACT_APP_SITE_URL, sitemap/robots to production domain; top up credits for email; legal review of Privacy/Terms
- P1: owner listing editor (CRUD + photo upload); hero video variant
- P2: shadcn date picker for viewings; persistent rate limiting
