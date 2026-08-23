import os

import redis
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

r = redis.Redis(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", "6379")),
    decode_responses=True,
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/price/{sku}")
def price(sku: str):
    unit_price = r.get(f"price:{sku}")
    if unit_price is None:
        return JSONResponse(status_code=404, content={"error": "sku not found"})
    return {"sku": sku, "unit_price": float(unit_price), "currency": "USD"}
