import os

import redis

r = redis.Redis(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", "6379")),
    decode_responses=True,
)

PRICES = {
    "SKU-1001": 49.99,
    "SKU-1002": 12.50,
    "SKU-1003": 99.00,
    "SKU-1004": 5.25,
    "SKU-1005": 250.00,
}

for sku, price in PRICES.items():
    r.set(f"price:{sku}", price)

print(f"seeded {len(PRICES)} prices")
