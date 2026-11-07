import asyncio
import io
import logging
import re
import uuid
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, field_validator

from core import db, get_current_owner, now_iso
from storage import APP_NAME, get_object, put_object

logger = logging.getLogger(__name__)
admin = APIRouter(prefix="/admin", dependencies=[Depends(get_current_owner)])
public = APIRouter()

LISTING_LOCATIONS = ["Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Dubai Hills Estate", "Business Bay",
                     "Jumeirah Village Circle"]
ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_BYTES = 8 * 1024 * 1024
MAIN_EDGE, THUMB_WIDTH = 2000, 800  # longest edge of the stored photo; width of the card/thumbnail copy


class ListingImage(BaseModel):
    path: str = Field(min_length=5, max_length=200)
    thumb: Optional[str] = Field(default=None, min_length=5, max_length=200)
    alt: str = Field(min_length=3, max_length=200)


class ListingIn(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    location: Literal["Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Dubai Hills Estate", "Business Bay",
                      "Jumeirah Village Circle"]
    type: Literal["Apartment", "Villa", "Townhouse", "Penthouse"]
    completion: Literal["Ready", "Off-plan"]
    price_aed: int = Field(gt=0, lt=10**10)
    bedrooms: int = Field(ge=0, le=20)
    bathrooms: int = Field(ge=0, le=20)
    area_sqft: int = Field(gt=0, lt=10**6)
    summary: str = Field(min_length=10, max_length=300)
    description: str = Field(min_length=20, max_length=4000)
    amenities: List[str] = Field(default_factory=list, max_length=30)
    nearby: List[str] = Field(default_factory=list, max_length=20)
    images: List[ListingImage | str] = Field(default_factory=list, max_length=20)
    featured: bool = False
    published: bool = True
    is_sample: bool = False

    @field_validator("amenities", "nearby")
    @classmethod
    def clean_list(cls, v):
        return [s.strip()[:80] for s in v if s and s.strip()]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80]


def optimise_photo(data: bytes) -> tuple[bytes, bytes]:
    """Return (main, thumb) WebP bytes. Phone photos arrive at 3-8 MB; this stores at most 2000px on the
    long edge (~200-400 KB) plus an 800px-wide copy for cards. Applies the EXIF rotation, then drops all
    metadata, including any GPS location the camera recorded."""
    with Image.open(io.BytesIO(data)) as src:
        im = ImageOps.exif_transpose(src)
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info else "RGB")
    im.thumbnail((MAIN_EDGE, MAIN_EDGE), Image.LANCZOS)
    out = []
    for img, quality in ((im, 80), (im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
                                    if im.width > THUMB_WIDTH else im, 75)):
        b = io.BytesIO()
        img.save(b, "WEBP", quality=quality, method=4)
        out.append(b.getvalue())
    return out[0], out[1]


async def unique_slug(base: str) -> str:
    slug, n = base, 2
    while await db.properties.find_one({"slug": slug}, {"_id": 1}):
        slug, n = f"{base}-{n}", n + 1
    return slug


def to_doc(body: ListingIn) -> dict:
    doc = body.model_dump()
    if doc["published"] and not doc["images"]:
        raise HTTPException(status_code=422, detail="Add at least one photo before publishing.")
    return doc


def _paths(images) -> set:
    return {p for i in images or [] if isinstance(i, dict) for p in (i.get("path"), i.get("thumb")) if p}


async def release_files(old_images, new_images=()):
    gone = _paths(old_images) - _paths(new_images)
    if gone:
        await db.files.update_many({"storage_path": {"$in": list(gone)}}, {"$set": {"is_deleted": True}})


@admin.get("/properties")
async def admin_list():
    return await db.properties.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)


@admin.post("/properties", status_code=201)
async def admin_create(body: ListingIn):
    doc = to_doc(body)
    doc["slug"] = await unique_slug(slugify(f"{body.location} {body.title}"))
    doc["created_at"] = doc["updated_at"] = now_iso()
    await db.properties.insert_one(dict(doc))
    return doc


@admin.put("/properties/{slug}")
async def admin_update(slug: str, body: ListingIn):
    doc = to_doc(body)
    doc["updated_at"] = now_iso()
    old = await db.properties.find_one({"slug": slug}, {"_id": 0, "images": 1})
    if not old:
        raise HTTPException(status_code=404, detail="Listing not found")
    await db.properties.update_one({"slug": slug}, {"$set": doc})
    await release_files(old.get("images"), doc["images"])
    return await db.properties.find_one({"slug": slug}, {"_id": 0})


@admin.delete("/properties/{slug}")
async def admin_delete(slug: str):
    old = await db.properties.find_one_and_delete({"slug": slug}, {"_id": 0, "images": 1})
    if not old:
        raise HTTPException(status_code=404, detail="Listing not found")
    await release_files(old.get("images"))
    return {"ok": True}


@admin.post("/uploads", status_code=201)
async def upload_photo(file: UploadFile = File(...), owner: dict = Depends(get_current_owner)):
    ext = ALLOWED_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=415, detail="Please upload a JPG, PNG or WebP image.")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Each photo must be 8 MB or smaller.")
    if not data:
        raise HTTPException(status_code=422, detail="The file is empty.")
    try:
        with Image.open(io.BytesIO(data)) as im:
            real = (im.format or "").lower()
            im.verify()
    except Exception:
        raise HTTPException(status_code=415, detail="This file is not a valid image.")
    if real not in ("jpeg", "png", "webp"):
        raise HTTPException(status_code=415, detail="Please upload a JPG, PNG or WebP image.")
    try:
        main, thumb = await asyncio.to_thread(optimise_photo, data)
    except Exception:
        raise HTTPException(status_code=415, detail="This file is not a valid image.")
    name = uuid.uuid4().hex
    stored = {}
    for kind, path, body in (("path", f"{APP_NAME}/listings/{name}.webp", main),
                             ("thumb", f"{APP_NAME}/listings/{name}-{THUMB_WIDTH}.webp", thumb)):
        try:
            result = await put_object(path, body, "image/webp")
        except Exception as e:
            logger.error("upload failed: %s", e)
            raise HTTPException(status_code=503, detail="The photo could not be uploaded. Please try again.")
        await db.files.insert_one({"id": uuid.uuid4().hex, "storage_path": result["path"], "original_filename": file.filename,
                                   "content_type": "image/webp", "size": result.get("size", len(body)),
                                   "original_size": len(data), "variant": kind,
                                   "uploaded_by": owner["user_id"], "is_deleted": False, "created_at": now_iso()})
        stored[kind] = result["path"]
    return stored


@public.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ctype = await get_object(path)
    except Exception as e:
        logger.error("file fetch failed: %s", e)
        raise HTTPException(status_code=503, detail="File temporarily unavailable")
    return Response(content=data, media_type=record.get("content_type") or ctype,
                    # Every upload gets a new random name and is never changed in place, so it can be cached for a year.
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})
