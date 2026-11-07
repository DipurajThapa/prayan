import json
import logging
import re
import secrets
from typing import Literal, Optional

import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

import ai
from core import db, new_id, now_iso
from emailer import newsletter_confirmation_html, send_email

logger = logging.getLogger(__name__)
router = APIRouter()

BUDGETS = {
    "Under AED 2M": (0, 2_000_000),
    "AED 2M – 5M": (2_000_000, 5_000_000),
    "AED 5M – 10M": (5_000_000, 10_000_000),
    "AED 10M+": (10_000_000, 10**12),
    "Not sure yet": (0, 10**12),
}
LOCATIONS = ["Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Dubai Hills Estate", "Business Bay",
             "Jumeirah Village Circle", "Open to suggestions"]
PHONE_RE = re.compile(r"^\+?[0-9 ()-]{7,20}$")
PUBLIC_FIELDS = {"_id": 0}
_HITS: dict = defaultdict(deque)


def rate_limit(request: Request):
    """Max 40 AI-backed requests per client per 10 minutes."""
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    q, now_t = _HITS[ip], time.monotonic()
    while q and now_t - q[0] > 600:
        q.popleft()
    if len(q) >= 40:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a few minutes and try again.")
    q.append(now_t)


# ---------- Properties ----------
@router.get("/properties")
async def list_properties(location: Optional[str] = None, type: Optional[str] = None,
                          bedrooms: Optional[int] = Query(None, ge=0, le=10),
                          max_price: Optional[int] = Query(None, ge=0), featured: Optional[bool] = None):
    q: dict = {}
    if location:
        q["location"] = location
    if type:
        q["type"] = type
    if bedrooms is not None:
        q["bedrooms"] = {"$gte": bedrooms}
    if max_price is not None:
        q["price_aed"] = {"$lte": max_price}
    if featured is not None:
        q["featured"] = featured
    return await db.properties.find(q, PUBLIC_FIELDS).sort("price_aed", -1).to_list(100)


@router.get("/properties/{slug}")
async def get_property(slug: str):
    prop = await db.properties.find_one({"slug": slug}, PUBLIC_FIELDS)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


async def matching_properties(location: Optional[str], budget: Optional[str]) -> list:
    q: dict = {}
    if location and location in LOCATIONS and location != "Open to suggestions":
        q["location"] = location
    if budget in BUDGETS and budget != "Not sure yet":
        lo, hi = BUDGETS[budget]
        q["price_aed"] = {"$gte": lo, "$lte": hi}
    if not q:
        return []
    return await db.properties.find(q, {"_id": 0, "slug": 1, "title": 1, "location": 1}).to_list(20)


# ---------- Hero lead: clarifying question ----------
class ClarifyIn(BaseModel):
    intent: Literal["Buy", "Invest", "Explore"]
    location: str = Field(min_length=2, max_length=80)
    budget: str

    @field_validator("budget")
    @classmethod
    def budget_known(cls, v):
        if v not in BUDGETS:
            raise ValueError("Please choose a budget range.")
        return v


CLARIFY_SYSTEM = (
    "You help a Dubai real estate company called Prayan understand a visitor's needs. "
    "Given what the visitor has shared, ask exactly ONE short, friendly follow-up question about the single most "
    "useful missing detail (property type, number of bedrooms, timeline, or investment goal). "
    "Never mention prices, availability or specific listings. "
    'Return JSON: {"question": string (max 18 words), "field": one of '
    '"property_type"|"bedrooms"|"timeline"|"goal", "options": array of 3-5 short answer options}.'
)
FALLBACK_CLARIFY = {
    "Buy": {"question": "What type of home would suit you best?", "field": "property_type",
            "options": ["Apartment", "Villa", "Townhouse", "Penthouse", "Not sure yet"]},
    "Invest": {"question": "What matters most for this investment?", "field": "goal",
               "options": ["Rental income", "Long-term growth", "Holiday home", "Not sure yet"]},
    "Explore": {"question": "When are you hoping to make a move?", "field": "timeline",
                "options": ["Within 3 months", "3–6 months", "6–12 months", "Just exploring"]},
}


@router.post("/lead/clarify", dependencies=[Depends(rate_limit)])
async def lead_clarify(body: ClarifyIn):
    result = None
    try:
        data = await ai.complete_json(CLARIFY_SYSTEM, json.dumps(body.model_dump()))
        if data.get("question") and isinstance(data.get("options"), list) and 2 <= len(data["options"]) <= 6:
            result = {"question": str(data["question"])[:160], "field": str(data.get("field", "detail"))[:30],
                      "options": [str(o)[:40] for o in data["options"]], "ai": True}
    except Exception as e:
        logger.warning("clarify AI failed: %s", e)
    return result or {**FALLBACK_CLARIFY[body.intent], "ai": False}


# ---------- Enquiries ----------
class EnquiryIn(BaseModel):
    source: Literal["hero", "contact", "property", "viewing"]
    name: str = Field(min_length=2, max_length=80)
    contact_method: Literal["email", "phone", "whatsapp"]
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=24)
    consent: bool
    intent: Optional[Literal["Buy", "Invest", "Explore"]] = None
    location: Optional[str] = Field(None, max_length=80)
    budget: Optional[str] = Field(None, max_length=40)
    follow_up_question: Optional[str] = Field(None, max_length=200)
    follow_up_answer: Optional[str] = Field(None, max_length=80)
    message: Optional[str] = Field(None, max_length=1500)
    property_slug: Optional[str] = Field(None, max_length=120)
    preferred_date: Optional[str] = Field(None, max_length=40)
    website: Optional[str] = None  # honeypot

    @model_validator(mode="after")
    def check(self):
        if not self.consent:
            raise ValueError("Please agree to be contacted so we can respond to your enquiry.")
        if self.contact_method == "email" and not self.email:
            raise ValueError("Please add your email address.")
        if self.contact_method in ("phone", "whatsapp"):
            if not self.phone or not PHONE_RE.match(self.phone.strip()):
                raise ValueError("Please add a valid phone number, including the country code.")
        if self.source in ("hero",) and not (self.intent and self.location and self.budget):
            raise ValueError("Please complete your property preferences.")
        if self.source == "contact" and not (self.message and self.message.strip()):
            raise ValueError("Please add a short message.")
        return self


SUMMARY_SYSTEM = (
    "You write internal enquiry summaries for Prayan, a Dubai real estate company. "
    "Write 2-3 plain sentences summarising ONLY the facts provided. Do not add assumptions, prices, "
    "availability or recommendations. Omit empty fields."
)


def fallback_summary(e: dict) -> str:
    parts = []
    if e.get("intent"):
        parts.append(f"Wants to {e['intent'].lower()}")
    if e.get("location"):
        parts.append(f"in {e['location']}")
    if e.get("budget"):
        parts.append(f"with a budget of {e['budget']}")
    s = " ".join(parts) + "." if parts else ""
    if e.get("property_title"):
        s += f" Asked about {e['property_title']}."
    if e.get("follow_up_answer"):
        s += f" {e.get('follow_up_question') or 'Detail'}: {e['follow_up_answer']}."
    if e.get("wants_viewing"):
        s += " Requested a viewing" + (f" around {e['preferred_date']}." if e.get("preferred_date") else ".")
    if e.get("message"):
        s += f" Message: {e['message'][:200]}"
    return s.strip() or "General enquiry."


async def build_summary(e: dict) -> str:
    facts = {k: e.get(k) for k in ("intent", "location", "budget", "follow_up_question", "follow_up_answer",
                                    "property_title", "wants_viewing", "preferred_date", "message",
                                    "property_type", "bedrooms", "timeline") if e.get(k)}
    try:
        text = await ai.complete(SUMMARY_SYSTEM, json.dumps(facts))
        if text:
            return text[:800]
    except Exception as ex:
        logger.warning("summary AI failed: %s", ex)
    return fallback_summary(e)


async def save_enquiry(doc: dict) -> dict:
    doc.update({"id": new_id("enq"), "status": "new", "created_at": now_iso(), "updated_at": now_iso(),
                "followup_draft": None})
    doc["summary"] = await build_summary(doc)
    await db.enquiries.insert_one(dict(doc))
    return doc


@router.post("/enquiries", dependencies=[Depends(rate_limit)])
async def create_enquiry(body: EnquiryIn):
    if body.website:
        raise HTTPException(status_code=400, detail="Submission rejected.")
    data = body.model_dump(exclude={"website"})
    data["name"] = data["name"].strip()
    data["wants_viewing"] = body.source == "viewing"
    if body.property_slug:
        prop = await db.properties.find_one({"slug": body.property_slug}, {"_id": 0, "title": 1, "location": 1})
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        data["property_title"] = prop["title"]
        data["location"] = data.get("location") or prop["location"]
    data["consent_at"] = now_iso()
    saved = await save_enquiry(data)
    matches = await matching_properties(body.location, body.budget) if body.source == "hero" else []
    return {"id": saved["id"], "summary": saved["summary"], "matches": matches}


# ---------- AI assistant ----------
class ChatIn(BaseModel):
    session_id: str = Field(min_length=6, max_length=60)
    message: str = Field(min_length=1, max_length=1200)
    property_slug: Optional[str] = None


async def assistant_system(property_slug: Optional[str]) -> str:
    props = await db.properties.find({}, {"_id": 0, "images": 0}).to_list(50)
    focus = f"\nThe visitor is currently viewing the listing with slug '{property_slug}'." if property_slug else ""
    return (
        "You are Prayan's property assistant for a Dubai real estate website. Scope: general Dubai property "
        "enquiries, questions about the listings below, clarifying location and preferences, collecting budget and "
        "requirements, viewing requests, summarising needs, and arranging a human follow-up.\n"
        "Rules:\n- Be concise: 1-3 short sentences, warm and professional International English.\n"
        "- Ask at most ONE question per reply. Never repeat a question already answered in this conversation.\n"
        "- The listings below are SAMPLE DATA for demonstration. Whenever you mention one, say it is a sample listing. "
        "Use only these facts; never invent prices, availability, service charges, yields, legal advice or bookings.\n"
        "- You cannot book viewings. For a viewing or human follow-up, say the Prayan team can confirm, and invite the "
        "visitor to share their details using the form. When it is the right moment to collect contact details "
        "(the visitor wants a viewing, a call back, or has shared their requirements), end your reply with the exact "
        "token [[SHARE_DETAILS]].\n"
        "- Never ask for contact details in free text; the form collects them with consent.\n"
        "- For questions outside scope or unknown facts, say so plainly and offer to pass the question to the team.\n"
        "- Do not use markdown headings or tables. Plain text only.\n"
        f"SAMPLE LISTINGS (JSON): {json.dumps(props)}{focus}"
    )


@router.post("/chat/stream", dependencies=[Depends(rate_limit)])
async def chat_stream(body: ChatIn):
    session = await db.chat_sessions.find_one({"session_id": body.session_id}, {"_id": 0})
    history = [{"role": m["role"], "content": m["content"]} for m in (session or {}).get("messages", [])][-20:]
    system = await assistant_system(body.property_slug)

    async def gen():
        chunks = []
        try:
            async for delta in ai.stream_reply(system, history, body.message, body.session_id):
                chunks.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            logger.error("chat stream failed: %s", e)
            yield f"data: {json.dumps({'error': 'The assistant is unavailable right now. Please try again or use the contact form.'})}\n\n"
            return
        reply = "".join(chunks)
        await db.chat_sessions.update_one(
            {"session_id": body.session_id},
            {"$push": {"messages": {"$each": [
                {"role": "user", "content": body.message, "ts": now_iso()},
                {"role": "assistant", "content": reply, "ts": now_iso()}]}},
             "$setOnInsert": {"created_at": now_iso()}, "$set": {"updated_at": now_iso()}},
            upsert=True)
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class ChatEnquiryIn(BaseModel):
    session_id: str = Field(min_length=6, max_length=60)
    name: str = Field(min_length=2, max_length=80)
    contact_method: Literal["email", "phone", "whatsapp"]
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=24)
    consent: bool
    property_slug: Optional[str] = None

    @model_validator(mode="after")
    def check(self):
        if not self.consent:
            raise ValueError("Please agree to be contacted so we can follow up.")
        if self.contact_method == "email" and not self.email:
            raise ValueError("Please add your email address.")
        if self.contact_method in ("phone", "whatsapp") and (not self.phone or not PHONE_RE.match(self.phone.strip())):
            raise ValueError("Please add a valid phone number, including the country code.")
        return self


EXTRACT_SYSTEM = (
    "Extract the visitor's property requirements from this chat transcript for Prayan, a Dubai real estate company. "
    "Use only what the VISITOR stated. Return JSON with keys: intent ('Buy'|'Invest'|'Explore'|null), location, budget, "
    "property_type, bedrooms, timeline, wants_viewing (bool), preferred_date, summary (2-3 sentences of facts only). "
    "Use null for anything not stated."
)


@router.post("/chat/enquiry", dependencies=[Depends(rate_limit)])
async def chat_enquiry(body: ChatEnquiryIn):
    existing = await db.enquiries.find_one({"chat_session_id": body.session_id}, {"_id": 0, "id": 1, "summary": 1})
    if existing:
        return {"id": existing["id"], "summary": existing["summary"], "already_saved": True}
    session = await db.chat_sessions.find_one({"session_id": body.session_id}, {"_id": 0})
    messages = (session or {}).get("messages", [])
    transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages[-30:])
    extracted: dict = {}
    if transcript:
        try:
            extracted = await ai.complete_json(EXTRACT_SYSTEM, transcript)
        except Exception as e:
            logger.warning("extract AI failed: %s", e)
    allowed = ("location", "budget", "property_type", "bedrooms", "timeline", "preferred_date")
    doc = {k: (str(extracted[k])[:80] if extracted.get(k) not in (None, "") else None) for k in allowed}
    doc["intent"] = extracted.get("intent") if extracted.get("intent") in ("Buy", "Invest", "Explore") else None
    doc["wants_viewing"] = bool(extracted.get("wants_viewing"))
    doc.update({"source": "chat", "name": body.name.strip(), "contact_method": body.contact_method,
                "email": body.email, "phone": body.phone, "consent": True, "consent_at": now_iso(),
                "chat_session_id": body.session_id,
                "message": "\n".join(m["content"] for m in messages if m["role"] == "user")[-1500:] or None})
    if body.property_slug:
        prop = await db.properties.find_one({"slug": body.property_slug}, {"_id": 0, "title": 1})
        if prop:
            doc["property_slug"], doc["property_title"] = body.property_slug, prop["title"]
    doc.update({"id": new_id("enq"), "status": "new", "created_at": now_iso(), "updated_at": now_iso(),
                "followup_draft": None})
    doc["summary"] = str(extracted.get("summary") or "")[:800] or fallback_summary(doc)
    await db.enquiries.insert_one(dict(doc))
    return {"id": doc["id"], "summary": doc["summary"]}


# ---------- Newsletter ----------
class SubscribeIn(BaseModel):
    email: EmailStr
    consent: bool


class UnsubscribeIn(BaseModel):
    token: str = Field(min_length=10, max_length=80)


@router.post("/newsletter/subscribe")
async def subscribe(body: SubscribeIn):
    if not body.consent:
        raise HTTPException(status_code=422, detail="Please confirm you would like to receive Prayan updates.")
    email = body.email.lower()
    existing = await db.subscribers.find_one({"email": email}, {"_id": 0})
    if existing and existing["status"] == "active":
        return {"status": "already_subscribed", "email_sent": False}
    token = secrets.token_urlsafe(24)
    if existing:
        await db.subscribers.update_one({"email": email}, {"$set": {
            "status": "active", "token": token, "consent_at": now_iso(), "updated_at": now_iso()}})
    else:
        await db.subscribers.insert_one({"id": new_id("sub"), "email": email, "status": "active", "token": token,
                                         "consent_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso()})
    sent = await send_email(to=email, subject="You are subscribed to Prayan updates",
                            html=newsletter_confirmation_html(token))
    return {"status": "subscribed", "email_sent": sent}


@router.post("/newsletter/unsubscribe")
async def unsubscribe(body: UnsubscribeIn):
    res = await db.subscribers.update_one({"token": body.token, "status": "active"},
                                          {"$set": {"status": "unsubscribed", "updated_at": now_iso()}})
    if res.matched_count == 0:
        already = await db.subscribers.find_one({"token": body.token}, {"_id": 0, "status": 1})
        if already:
            return {"status": "already_unsubscribed"}
        raise HTTPException(status_code=404, detail="This unsubscribe link is not valid.")
    return {"status": "unsubscribed"}
