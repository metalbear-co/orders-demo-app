import os
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

TTL_SECONDS = int(os.environ.get("TOKEN_TTL_SECONDS", "30"))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/token")
async def token(request: Request):
    body = await request.json()
    subject_token = body.get("subject_token")
    if not subject_token:
        return JSONResponse(status_code=400, content={"error": "subject_token required"})

    return {
        "access_token": f"at-{uuid.uuid4().hex[:16]}",
        "expires_in": TTL_SECONDS,
        "issued_at": int(time.time()),
    }
