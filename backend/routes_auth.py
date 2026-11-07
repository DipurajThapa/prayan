from datetime import timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr

from core import (OWNER_EMAILS, create_access_token, create_refresh_token, db, decode_token,
                  get_current_owner, new_id, now, verify_password)

router = APIRouter(prefix="/auth")
COOKIE = dict(httponly=True, secure=True, samesite="none", path="/")


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


def _public(user: dict) -> dict:
    return {k: user.get(k) for k in ("user_id", "email", "name", "role", "picture")}


def _set_jwt_cookies(response: Response, user: dict):
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]), max_age=900, **COOKIE)
    response.set_cookie("refresh_token", create_refresh_token(user["user_id"]), max_age=604800, **COOKIE)


@router.post("/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    ident = f"login:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt["last"].replace(tzinfo=attempt["last"].tzinfo or now().tzinfo) + timedelta(minutes=15)
        if locked_until > now():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": ident})
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one({"identifier": ident}, {"$inc": {"count": 1}, "$set": {"last": now()}}, upsert=True)
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    await db.login_attempts.delete_one({"identifier": ident})
    _set_jwt_cookies(response, user)
    return _public(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    payload = decode_token(request.cookies.get("refresh_token", ""), "refresh")
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Session expired")
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]), max_age=900, **COOKIE)
    return {"ok": True}


@router.post("/google/session")
async def google_session(body: SessionIn, response: Response):
    async with httpx.AsyncClient(timeout=20) as http:
        r = await http.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                           headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified.")
    data = r.json()
    email = data["email"].lower()
    if email not in OWNER_EMAILS:
        raise HTTPException(status_code=403, detail="This Google account does not have owner access.")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {"user_id": new_id("user"), "email": email, "name": data.get("name") or "Owner",
                "role": "owner", "created_at": now()}
        await db.users.insert_one(dict(user))
    await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture"), "role": "owner"}})
    user["picture"] = data.get("picture")
    await db.user_sessions.insert_one({"user_id": user["user_id"], "session_token": data["session_token"],
                                       "expires_at": now() + timedelta(days=7), "created_at": now()})
    response.set_cookie("session_token", data["session_token"], max_age=604800, **COOKIE)
    return _public(user)


@router.get("/me")
async def me(user: dict = Depends(get_current_owner)):
    return _public(user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    for name in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(name, path="/", secure=True, samesite="none")
    return {"ok": True}
