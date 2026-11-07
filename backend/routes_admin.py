import json
import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

import ai
from core import db, get_current_owner, now_iso

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_owner)])

STATUSES = ("new", "awaiting_follow_up", "contacted", "closed")


@router.get("/stats")
async def stats():
    return {
        "new": await db.enquiries.count_documents({"status": "new"}),
        "awaiting_follow_up": await db.enquiries.count_documents({"status": "awaiting_follow_up"}),
        "viewing_requests": await db.enquiries.count_documents({"wants_viewing": True, "status": {"$ne": "closed"}}),
        "total": await db.enquiries.count_documents({}),
        "subscribers": await db.subscribers.count_documents({"status": "active"}),
    }


@router.get("/enquiries")
async def list_enquiries(status: Optional[str] = None, viewing: Optional[bool] = None,
                         limit: int = Query(100, ge=1, le=500)):
    q: dict = {}
    if status:
        q["status"] = status
    if viewing:
        q["wants_viewing"] = True
    return await db.enquiries.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)


@router.get("/enquiries/{enquiry_id}")
async def get_enquiry(enquiry_id: str):
    enq = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return enq


class EnquiryUpdate(BaseModel):
    status: Optional[Literal["new", "awaiting_follow_up", "contacted", "closed"]] = None
    followup_draft: Optional[str] = Field(None, max_length=4000)


@router.patch("/enquiries/{enquiry_id}")
async def update_enquiry(enquiry_id: str, body: EnquiryUpdate):
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Nothing to update")
    changes["updated_at"] = now_iso()
    res = await db.enquiries.update_one({"id": enquiry_id}, {"$set": changes})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})


FOLLOWUP_SYSTEM = (
    "You draft a single follow-up message from the Prayan team (a Dubai real estate company) to a customer. "
    "Use ONLY the enquiry facts provided. Do not invent prices, availability, viewing times, property names or "
    "promises. If they asked about a listing marked as sample data, do not claim it is available. "
    "Address the customer by first name, acknowledge what they asked for, ask one helpful next-step question, "
    "and sign off as 'The Prayan team'. Keep it under 120 words. Match the channel: WhatsApp/phone = short and "
    "conversational with no subject line; email = include a first line 'Subject: ...'. Plain text only."
)


@router.post("/enquiries/{enquiry_id}/followup")
async def generate_followup(enquiry_id: str):
    enq = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    facts = {k: enq.get(k) for k in ("name", "contact_method", "intent", "location", "budget", "property_type",
                                     "bedrooms", "timeline", "follow_up_question", "follow_up_answer",
                                     "property_title", "wants_viewing", "preferred_date", "message", "summary")
             if enq.get(k)}
    if enq.get("property_title"):
        facts["listing_note"] = "The listing is sample data on a preview website."
    try:
        draft = await ai.complete(FOLLOWUP_SYSTEM, json.dumps(facts))
    except Exception as e:
        logger.error("followup AI failed: %s", e)
        raise HTTPException(status_code=503, detail="The AI draft could not be generated. Please try again.")
    await db.enquiries.update_one({"id": enquiry_id}, {"$set": {"followup_draft": draft, "updated_at": now_iso()}})
    return {"followup_draft": draft}
