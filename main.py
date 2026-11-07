from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

import psycopg
from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from psycopg.types.json import Jsonb

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "public" / "Rice_Mill"
WEBSITE_DIR = BASE_DIR / "website"
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="MillMate", version="2.1.0", docs_url=None, redoc_url=None, openapi_url=None)
SESSION_COOKIE = "millmate_admin_session"
SESSION_SECONDS = 8 * 60 * 60
LOGIN_WINDOW_SECONDS = 15 * 60
MAX_LOGIN_ATTEMPTS = 5
login_attempts: dict[str, deque[float]] = defaultdict(deque)

TABLES = {
    "products": "products",
    "bills": "bills",
    "repayments": "repayments",
    "units": "units",
    "settings": "settings",
}


class LoginRequest(BaseModel):
    username: str
    password: str


def session_secret() -> str:
    value = os.getenv("SESSION_SECRET", "")
    if len(value) < 32:
        raise RuntimeError("SESSION_SECRET must contain at least 32 characters. Set it in .env.")
    return value


def make_session() -> str:
    issued = str(int(time.time()))
    nonce = secrets.token_urlsafe(24)
    payload = f"{issued}.{nonce}"
    signature = hmac.new(session_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def valid_session(token: str | None) -> bool:
    if not token:
        return False
    try:
        issued, nonce, supplied = token.split(".", 2)
        timestamp = int(issued)
        if timestamp > int(time.time()) + 60 or int(time.time()) - timestamp > SESSION_SECONDS:
            return False
        payload = f"{issued}.{nonce}"
        expected = hmac.new(session_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(supplied, expected)
    except (ValueError, RuntimeError):
        return False


def db_connect() -> psycopg.Connection:
    password = os.getenv("PGPASSWORD")
    if not password:
        raise RuntimeError("PGPASSWORD is missing. Configure it in the local .env file.")
    return psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.getenv("PGDATABASE", "flourmill_db"),
        user=os.getenv("PGUSER", "postgres"),
        password=password,
    )


@app.middleware("http")
async def protect_admin_and_api(request: Request, call_next):
    path = request.url.path
    public_paths = {
        "/", "/api/login", "/api/logout", "/app/login.html",
        "/app/css/style.css", "/app/js/auth.js",
    }
    is_public_asset = path.startswith("/assets/")
    needs_auth = (path.startswith("/api/") or path.startswith("/app")) and path not in public_paths
    if needs_auth and not is_public_asset and not valid_session(request.cookies.get(SESSION_COOKIE)):
        if path.startswith("/api/"):
            return JSONResponse({"detail": "Administrator authentication required."}, status_code=401)
        return RedirectResponse(url="/app/login.html", status_code=303)
    return await call_next(request)


@app.on_event("startup")
def initialize_database() -> None:
    # Validate admin secrets at startup so the app never runs with an open login.
    if not os.getenv("ADMIN_USERNAME") or not os.getenv("ADMIN_PASSWORD"):
        raise RuntimeError("Set ADMIN_USERNAME and ADMIN_PASSWORD in .env before starting MillMate.")
    session_secret()
    try:
        with db_connect() as conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                data JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )""")
        print("MillMate PostgreSQL initialization successful.")
    except Exception as exc:
        print(f"Could not initialize PostgreSQL: {exc}")
        raise


@app.post("/api/login")
def login(payload: LoginRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = login_attempts[client_ip]
    while attempts and now - attempts[0] > LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    expected_user = os.getenv("ADMIN_USERNAME", "")
    expected_password = os.getenv("ADMIN_PASSWORD", "")
    user_ok = secrets.compare_digest(payload.username, expected_user)
    password_ok = secrets.compare_digest(payload.password, expected_password)
    if not (user_ok and password_ok):
        attempts.append(now)
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    attempts.clear()
    response = JSONResponse({"ok": True})
    response.set_cookie(
        key=SESSION_COOKIE,
        value=make_session(),
        max_age=SESSION_SECONDS,
        httponly=True,
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        path="/",
    )
    return response


@app.post("/api/logout")
def logout(response: Response):
    result = JSONResponse({"ok": True})
    result.delete_cookie(SESSION_COOKIE, path="/")
    return result


@app.get("/api/health")
def health() -> dict[str, Any]:
    try:
        with db_connect() as conn:
            conn.execute("SELECT 1")
        return {"ok": True, "database": "connected"}
    except Exception as exc:
        print(f"Database health check failed: {exc}")
        raise HTTPException(status_code=500, detail="Database connection failed. Check local configuration.")


@app.get("/api/{collection}")
def get_collection(collection: str) -> list[dict[str, Any]]:
    table = TABLES.get(collection)
    if table is None:
        raise HTTPException(status_code=404, detail="Unknown collection")
    try:
        with db_connect() as conn:
            rows = conn.execute(f"SELECT data FROM {table} ORDER BY created_at ASC").fetchall()
        return [row[0] for row in rows]
    except Exception as exc:
        print(f"Could not read {collection}: {exc}")
        raise HTTPException(status_code=500, detail="Could not read records")


@app.put("/api/{collection}")
def replace_collection(collection: str, records: list[dict[str, Any]] = Body(...)) -> dict[str, Any]:
    table = TABLES.get(collection)
    if table is None:
        raise HTTPException(status_code=404, detail="Unknown collection")
    for item in records:
        if not isinstance(item, dict) or not item.get("id"):
            raise HTTPException(status_code=400, detail="Each record must be an object with an id")
    try:
        with db_connect() as conn:
            conn.execute(f"DELETE FROM {table}")
            for item in records:
                conn.execute(f"INSERT INTO {table} (id, data) VALUES (%s, %s)", (str(item["id"]), Jsonb(item)))
        return {"ok": True, "count": len(records)}
    except Exception as exc:
        print(f"Could not save {collection}: {exc}")
        raise HTTPException(status_code=400, detail="Records were not saved. Check the data and try again.")


@app.get("/")
def public_home() -> FileResponse:
    return FileResponse(WEBSITE_DIR / "index.html")


app.mount("/assets", StaticFiles(directory=str(WEBSITE_DIR / "assets")), name="website-assets")
app.mount("/app", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="admin-app")
