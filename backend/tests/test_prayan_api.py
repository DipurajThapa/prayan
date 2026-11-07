import json
import uuid
import pytest
import requests
from conftest import BASE_URL, OWNER_EMAIL, OWNER_PASSWORD

A = f"{BASE_URL}/api"


# ---------- Properties ----------
class TestProperties:
    def test_list_all(self, api):
        d = api.get(f"{A}/properties").json()
        assert len(d) == 6
        assert all("_id" not in p and p.get("is_sample") for p in d)

    def test_filters(self, api):
        d = api.get(f"{A}/properties", params={"location": "Dubai Marina"}).json()
        assert [p["location"] for p in d] == ["Dubai Marina"]
        d = api.get(f"{A}/properties", params={"type": "Villa"}).json()
        assert len(d) == 2 and all(p["type"] == "Villa" for p in d)
        d = api.get(f"{A}/properties", params={"bedrooms": 3}).json()
        assert all(p["bedrooms"] >= 3 for p in d) and len(d) == 4
        d = api.get(f"{A}/properties", params={"max_price": 3000000}).json()
        assert all(p["price_aed"] <= 3000000 for p in d) and len(d) == 2
        d = api.get(f"{A}/properties", params={"location": "Palm Jumeirah", "max_price": 1000000}).json()
        assert d == []

    def test_detail_and_404(self, api):
        r = api.get(f"{A}/properties/palm-jumeirah-frond-villa")
        assert r.status_code == 200 and r.json()["slug"] == "palm-jumeirah-frond-villa"
        assert api.get(f"{A}/properties/nope-xyz").status_code == 404


# ---------- Lead clarify (AI) ----------
class TestClarify:
    def test_clarify_ai(self, api):
        r = api.post(f"{A}/lead/clarify", json={"intent": "Buy", "location": "Dubai Marina", "budget": "AED 2M – 5M"}, timeout=90)
        assert r.status_code == 200
        d = r.json()
        print("clarify:", d)
        assert d["question"] and 2 <= len(d["options"]) <= 6
        # ai flag tells us whether real LLM was used
        assert d["ai"] is True, "Clarify fell back to static question - LLM call failed"

    def test_clarify_bad_budget(self, api):
        r = api.post(f"{A}/lead/clarify", json={"intent": "Buy", "location": "Dubai Marina", "budget": "x"})
        assert r.status_code == 422


# ---------- Enquiries ----------
def hero_payload(**kw):
    p = {"source": "hero", "name": "TEST_Hero User", "contact_method": "email", "email": "test_hero@example.com",
         "consent": True, "intent": "Buy", "location": "Dubai Marina", "budget": "Under AED 2M",
         "follow_up_question": "What type?", "follow_up_answer": "Apartment"}
    p.update(kw)
    return p


class TestEnquiries:
    def test_hero_enquiry_and_persist(self, api, owner, created_ids):
        r = api.post(f"{A}/enquiries", json=hero_payload(), timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        created_ids["enquiries"].append(d["id"])
        assert d["summary"]
        assert [m["slug"] for m in d["matches"]] == ["dubai-marina-one-bedroom-apartment"]
        g = owner.get(f"{A}/admin/enquiries/{d['id']}").json()
        assert g["source"] == "hero" and g["status"] == "new" and g["email"] == "test_hero@example.com"

    def test_viewing_enquiry(self, api, created_ids):
        r = api.post(f"{A}/enquiries", json={"source": "viewing", "name": "TEST_Viewer", "contact_method": "whatsapp",
                                             "phone": "+971 50 123 4567", "consent": True,
                                             "property_slug": "dubai-hills-estate-family-villa",
                                             "preferred_date": "2026-02-15"}, timeout=90)
        assert r.status_code == 200, r.text
        created_ids["enquiries"].append(r.json()["id"])

    def test_contact_requires_message(self, api):
        r = api.post(f"{A}/enquiries", json={"source": "contact", "name": "TEST_C", "contact_method": "email",
                                             "email": "test_c@example.com", "consent": True})
        assert r.status_code == 422
        assert "message" in json.dumps(r.json()).lower()

    @pytest.mark.parametrize("override,needle", [
        ({"consent": False}, "agree"),
        ({"email": None}, "email"),
        ({"contact_method": "phone", "email": None, "phone": "abc"}, "phone"),
        ({"location": None}, "preferences"),
        ({"email": "not-an-email"}, "email"),
    ])
    def test_validation(self, api, override, needle):
        r = api.post(f"{A}/enquiries", json=hero_payload(**override))
        assert r.status_code == 422
        assert needle in json.dumps(r.json()).lower()

    def test_unknown_property_404(self, api):
        r = api.post(f"{A}/enquiries", json={"source": "property", "name": "TEST_P", "contact_method": "email",
                                             "email": "test_p@example.com", "consent": True, "property_slug": "zzz"})
        assert r.status_code == 404

    def test_honeypot(self, api):
        r = api.post(f"{A}/enquiries", json=hero_payload(website="spam"))
        assert r.status_code == 400


# ---------- Chat ----------
def stream(api, sid, msg, slug=None):
    r = api.post(f"{A}/chat/stream", json={"session_id": sid, "message": msg, "property_slug": slug}, stream=True, timeout=120)
    assert r.status_code == 200
    assert "text/event-stream" in r.headers.get("content-type", "")
    full, err, done = "", None, False
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            d = json.loads(line[6:])
            full += d.get("delta", "")
            err = err or d.get("error")
            done = done or d.get("done", False)
    return full, err, done


class TestChat:
    def test_chat_context_and_enquiry(self, api, owner, mongo, created_ids):
        sid = f"chat_TEST_{uuid.uuid4().hex[:10]}"
        created_ids["chat_sessions"].append(sid)
        t1, err, done = stream(api, sid, "Hi, I want to buy a 3 bedroom villa in Dubai Hills with budget around AED 9M.")
        print("T1:", t1)
        assert not err and done and t1
        t2, err, _ = stream(api, sid, "What budget did I just mention?")
        print("T2:", t2)
        assert not err and ("9" in t2)
        t3, err, _ = stream(api, sid, "Is the Dubai Hills villa available to move in next week, and what is the service charge?")
        print("T3:", t3)
        assert not err
        sess = mongo.chat_sessions.find_one({"session_id": sid})
        assert len(sess["messages"]) == 6
        r = api.post(f"{A}/chat/enquiry", json={"session_id": sid, "name": "TEST_Chat User", "contact_method": "email",
                                                "email": "test_chat@example.com", "consent": True}, timeout=90)
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        created_ids["enquiries"].append(eid)
        g = owner.get(f"{A}/admin/enquiries/{eid}").json()
        print("chat enquiry:", {k: g.get(k) for k in ("intent", "location", "budget", "bedrooms", "summary")})
        assert g["source"] == "chat"

    def test_chat_enquiry_validation(self, api):
        r = api.post(f"{A}/chat/enquiry", json={"session_id": "chat_TEST_x1", "name": "TEST", "contact_method": "email",
                                                "email": "test@example.com", "consent": False})
        assert r.status_code == 422


# ---------- Newsletter ----------
class TestNewsletter:
    def test_subscribe_dup_unsubscribe(self, api, mongo, created_ids):
        email = f"test_nl_{uuid.uuid4().hex[:8]}@example.com"
        created_ids["subscribers"].append(email)
        r = api.post(f"{A}/newsletter/subscribe", json={"email": email, "consent": True}, timeout=60)
        assert r.status_code == 200 and r.json()["status"] == "subscribed"
        print("email_sent:", r.json()["email_sent"])
        r = api.post(f"{A}/newsletter/subscribe", json={"email": email.upper(), "consent": True})
        assert r.json()["status"] == "already_subscribed"
        tok = mongo.subscribers.find_one({"email": email})["token"]
        r = api.post(f"{A}/newsletter/unsubscribe", json={"token": tok})
        assert r.json()["status"] == "unsubscribed"
        r = api.post(f"{A}/newsletter/unsubscribe", json={"token": tok})
        assert r.json()["status"] == "already_unsubscribed"
        assert api.post(f"{A}/newsletter/unsubscribe", json={"token": "invalidtoken123"}).status_code == 404

    def test_subscribe_validation(self, api):
        assert api.post(f"{A}/newsletter/subscribe", json={"email": "bad", "consent": True}).status_code == 422
        assert api.post(f"{A}/newsletter/subscribe", json={"email": "test_x@example.com", "consent": False}).status_code == 422


# ---------- Auth & admin ----------
class TestAuthAdmin:
    def test_login_cookies(self):
        s = requests.Session()
        r = s.post(f"{A}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
        assert r.status_code == 200 and r.json()["email"] == OWNER_EMAIL
        sc = r.headers.get("set-cookie", "")
        assert "access_token" in sc and "HttpOnly" in sc and "refresh_token" in sc
        assert s.get(f"{A}/auth/me").status_code == 200

    def test_wrong_password_and_lockout(self):
        email = f"test_lock_{uuid.uuid4().hex[:6]}@example.com"
        codes = [requests.post(f"{A}/auth/login", json={"email": email, "password": "x"}).status_code for _ in range(6)]
        assert codes[:5] == [401] * 5 and codes[5] == 429

    @pytest.mark.parametrize("path", ["/admin/stats", "/admin/enquiries", "/auth/me"])
    def test_unauth_401(self, path):
        assert requests.get(f"{A}{path}").status_code == 401

    def test_bcrypt_hash(self, mongo):
        u = mongo.users.find_one({"email": OWNER_EMAIL})
        assert u["password_hash"].startswith("$2b$")

    def test_stats_and_patch_and_followup(self, api, owner, created_ids):
        s = owner.get(f"{A}/admin/stats").json()
        assert {"new", "awaiting_follow_up", "viewing_requests", "subscribers", "total"} <= set(s)
        r = api.post(f"{A}/enquiries", json=hero_payload(name="TEST_Follow Up", location="Palm Jumeirah", budget="AED 10M+"), timeout=90)
        eid = r.json()["id"]
        created_ids["enquiries"].append(eid)
        r = owner.patch(f"{A}/admin/enquiries/{eid}", json={"status": "awaiting_follow_up"})
        assert r.status_code == 200 and r.json()["status"] == "awaiting_follow_up"
        assert owner.patch(f"{A}/admin/enquiries/{eid}", json={"status": "bogus"}).status_code == 422
        r = owner.post(f"{A}/admin/enquiries/{eid}/followup", timeout=120)
        assert r.status_code == 200, r.text
        draft = r.json()["followup_draft"]
        print("DRAFT:", draft)
        assert "Follow" in draft or "Prayan" in draft
        r = owner.patch(f"{A}/admin/enquiries/{eid}", json={"followup_draft": "TEST edited draft"})
        assert owner.get(f"{A}/admin/enquiries/{eid}").json()["followup_draft"] == "TEST edited draft"
        assert owner.get(f"{A}/admin/enquiries/enq_nope").status_code == 404
        lst = owner.get(f"{A}/admin/enquiries", params={"status": "awaiting_follow_up"}).json()
        assert any(e["id"] == eid for e in lst)
