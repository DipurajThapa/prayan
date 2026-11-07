import os
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
# Owner credentials are never committed. Set TEST_OWNER_EMAIL / TEST_OWNER_PASSWORD in the
# environment or in /app/backend/.env (gitignored). Tests that need them are skipped otherwise.
OWNER_EMAIL = os.environ.get("TEST_OWNER_EMAIL", "").strip()
OWNER_PASSWORD = os.environ.get("TEST_OWNER_PASSWORD", "")
OWNER_CREDS_MISSING_MSG = (
    "Owner credentials not configured: set TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD "
    "(environment or /app/backend/.env) to run owner/admin tests."
)


def require_owner_creds():
    """Skip the calling test/fixture if owner credentials are not configured."""
    if not (OWNER_EMAIL and OWNER_PASSWORD):
        pytest.skip(OWNER_CREDS_MISSING_MSG)
    return {"email": OWNER_EMAIL, "password": OWNER_PASSWORD}


@pytest.fixture(scope="session")
def owner_creds():
    return require_owner_creds()


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(os.environ["MONGO_URL"])
    yield c[os.environ["DB_NAME"]]
    c.close()


@pytest.fixture(scope="session")
def created_ids():
    return {"enquiries": [], "subscribers": [], "chat_sessions": []}


@pytest.fixture(scope="session", autouse=True)
def cleanup(mongo, created_ids):
    yield
    # delete only records created by this run, by id
    if created_ids["enquiries"]:
        mongo.enquiries.delete_many({"id": {"$in": created_ids["enquiries"]}})
    if created_ids["subscribers"]:
        mongo.subscribers.delete_many({"email": {"$in": created_ids["subscribers"]}})
    if created_ids["chat_sessions"]:
        mongo.chat_sessions.delete_many({"session_id": {"$in": created_ids["chat_sessions"]}})


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def owner(owner_creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=owner_creds)
    if r.status_code != 200:
        pytest.skip(f"Owner login failed {r.status_code} {r.text}")
    tok = s.cookies.get("access_token")
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s
