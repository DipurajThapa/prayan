import asyncio
import logging
import os
from contextlib import suppress

from fastapi import APIRouter, FastAPI
from pymongo import ASCENDING, DESCENDING, IndexModel
from starlette.middleware.cors import CORSMiddleware

from core import client, db, hash_password, new_id, now
from routes_admin import router as admin_router
from routes_auth import router as auth_router
from routes_public import router as public_router
from routes_listings import admin as listings_admin, public as files_public
from storage import init_storage
from seed_data import SAMPLE_PROPERTIES

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("email", ASCENDING)], name="email", unique=True),
              IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "user_sessions": [IndexModel([("session_token", ASCENDING)], name="session_token")],
    "login_attempts": [IndexModel([("identifier", ASCENDING)], name="identifier")],
    "properties": [IndexModel([("slug", ASCENDING)], name="slug", unique=True),
                   IndexModel([("location", ASCENDING), ("price_aed", DESCENDING)], name="loc_price")],
    "enquiries": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                  IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
                  IndexModel([("created_at", DESCENDING)], name="created_desc")],
    "chat_sessions": [IndexModel([("session_id", ASCENDING)], name="session_id", unique=True)],
    "subscribers": [IndexModel([("email", ASCENDING)], name="email", unique=True),
                    IndexModel([("token", ASCENDING)], name="token")],
    "files": [IndexModel([("storage_path", ASCENDING)], name="storage_path", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


async def seed() -> None:
    email = os.environ["ADMIN_EMAIL"].lower()
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({"user_id": new_id("user"), "email": email, "name": "Prayan Owner", "role": "owner",
                                   "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]), "created_at": now()})
    for p in SAMPLE_PROPERTIES:
        await db.properties.update_one({"slug": p["slug"]}, {"$setOnInsert": {**p, "is_sample": True}}, upsert=True)


app = FastAPI(title="Prayan API")
api = APIRouter(prefix="/api")


@api.get("/")
async def health():
    return {"status": "ok"}


api.include_router(auth_router)
api.include_router(public_router)
api.include_router(admin_router)
api.include_router(listings_admin)
api.include_router(files_public)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ["CORS_ORIGINS"].split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await seed()
    try:
        await asyncio.to_thread(init_storage)
    except Exception as e:
        logger.error("Storage init failed: %s", e)
    app.state.index_task = asyncio.create_task(ensure_indexes())


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
