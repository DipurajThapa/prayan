# Listing Manager admin API + uploads + public file serving tests (iteration 2)
import io
import os
import uuid
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def own(owner_creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=owner_creds)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    s.headers.update({"Authorization": f"Bearer {s.cookies.get('access_token')}"})
    return s


@pytest.fixture(scope="module")
def slugs(own):
    created = []
    yield created
    for s in created:
        own.delete(f"{BASE_URL}/api/admin/properties/{s}")


def jpg_bytes():
    b = io.BytesIO()
    Image.new("RGB", (64, 40), (30, 90, 200)).save(b, "JPEG")
    return b.getvalue()


@pytest.fixture(scope="module")
def uploaded(own):
    r = own.post(f"{BASE_URL}/api/admin/uploads", files={"file": ("test_photo.jpg", jpg_bytes(), "image/jpeg")})
    assert r.status_code == 201, r.text
    return r.json()["path"]


def payload(path=None, **kw):
    d = {"title": f"TEST_Listing {uuid.uuid4().hex[:6]}", "location": "Dubai Marina", "type": "Apartment",
         "completion": "Ready", "price_aed": 2500000, "bedrooms": 2, "bathrooms": 2, "area_sqft": 1200,
         "summary": "Test summary for listing", "description": "Test description for the listing long enough.",
         "amenities": ["Pool", " ", "Gym"], "nearby": ["Metro"],
         "images": [{"path": path, "alt": "Test photo alt"}] if path else [],
         "featured": False, "published": True, "is_sample": False}
    d.update(kw)
    return d


# Auth required
class TestAuthRequired:
    @pytest.mark.parametrize("method,path", [("get", "/api/admin/properties"), ("post", "/api/admin/properties"),
                                             ("put", "/api/admin/properties/x"), ("delete", "/api/admin/properties/x"),
                                             ("post", "/api/admin/uploads")])
    def test_401(self, method, path):
        r = getattr(requests, method)(f"{BASE_URL}{path}")
        assert r.status_code == 401


class TestListings:
    def test_admin_list_has_samples(self, own):
        r = own.get(f"{BASE_URL}/api/admin/properties")
        assert r.status_code == 200
        data = r.json()
        assert sum(1 for p in data if p.get("is_sample")) >= 6
        assert all("_id" not in p for p in data)

    def test_upload_and_serve(self, own, uploaded):
        assert uploaded.startswith("prayan/listings/") and uploaded.endswith(".jpg")
        r = requests.get(f"{BASE_URL}/api/files/{uploaded}")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/jpeg")
        assert r.content[:2] == b"\xff\xd8"

    def test_unknown_file_404(self):
        assert requests.get(f"{BASE_URL}/api/files/prayan/listings/nope.jpg").status_code == 404

    def test_upload_non_image_rejected(self, own):
        r = own.post(f"{BASE_URL}/api/admin/uploads", files={"file": ("a.txt", b"hello", "text/plain")})
        assert r.status_code == 415
        assert "JPG" in r.json()["detail"]

    def test_upload_empty_rejected(self, own):
        r = own.post(f"{BASE_URL}/api/admin/uploads", files={"file": ("a.jpg", b"", "image/jpeg")})
        assert r.status_code == 422

    def test_upload_too_large(self, own):
        r = own.post(f"{BASE_URL}/api/admin/uploads", files={"file": ("big.jpg", b"\xff" * (8 * 1024 * 1024 + 10), "image/jpeg")})
        assert r.status_code == 413

    def test_publish_without_photo_422(self, own):
        r = own.post(f"{BASE_URL}/api/admin/properties", json=payload())
        assert r.status_code == 422

    def test_validation_422(self, own):
        r = own.post(f"{BASE_URL}/api/admin/properties", json=payload(title="ab", price_aed=0, location="Mars"))
        assert r.status_code == 422

    def test_create_published_public(self, own, uploaded, slugs):
        r = own.post(f"{BASE_URL}/api/admin/properties", json=payload(uploaded))
        assert r.status_code == 201, r.text
        d = r.json()
        slugs.append(d["slug"])
        assert d["slug"].startswith("dubai-marina-test-listing")
        assert d["amenities"] == ["Pool", "Gym"]
        assert d["is_sample"] is False
        pub = requests.get(f"{BASE_URL}/api/properties/{d['slug']}")
        assert pub.status_code == 200
        assert pub.json()["images"][0]["path"] == uploaded
        assert any(p["slug"] == d["slug"] for p in requests.get(f"{BASE_URL}/api/properties").json())

    def test_draft_not_public(self, own, slugs):
        r = own.post(f"{BASE_URL}/api/admin/properties", json=payload(published=False))
        assert r.status_code == 201
        slug = r.json()["slug"]
        slugs.append(slug)
        assert requests.get(f"{BASE_URL}/api/properties/{slug}").status_code == 404
        assert all(p["slug"] != slug for p in requests.get(f"{BASE_URL}/api/properties").json())

    def test_duplicate_title_unique_slug(self, own, uploaded, slugs):
        p = payload(uploaded)
        a = own.post(f"{BASE_URL}/api/admin/properties", json=p).json()
        b = own.post(f"{BASE_URL}/api/admin/properties", json=p).json()
        slugs += [a["slug"], b["slug"]]
        assert a["slug"] != b["slug"] and b["slug"].endswith("-2")

    def test_update_persists_and_delete(self, own, uploaded, slugs):
        d = own.post(f"{BASE_URL}/api/admin/properties", json=payload(uploaded)).json()
        slug = d["slug"]
        slugs.append(slug)
        up = payload(uploaded, title="TEST_Updated Title", price_aed=3100000, published=False)
        r = own.put(f"{BASE_URL}/api/admin/properties/{slug}", json=up)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Updated Title" and r.json()["slug"] == slug
        got = [p for p in own.get(f"{BASE_URL}/api/admin/properties").json() if p["slug"] == slug][0]
        assert got["price_aed"] == 3100000 and got["published"] is False
        assert requests.get(f"{BASE_URL}/api/properties/{slug}").status_code == 404
        assert own.delete(f"{BASE_URL}/api/admin/properties/{slug}").status_code == 200
        assert own.delete(f"{BASE_URL}/api/admin/properties/{slug}").status_code == 404

    def test_update_unknown_404(self, own, uploaded):
        assert own.put(f"{BASE_URL}/api/admin/properties/nope-xyz", json=payload(uploaded)).status_code == 404
