import os
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
OWNER_EMAIL = "dipurajthapa1@gmail.com"
OWNER_PASSWORD = "PrayanOwner-CTXK8bko"


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
def owner():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Owner login failed {r.status_code} {r.text}")
    tok = s.cookies.get("access_token")
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s
