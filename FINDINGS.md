# orders-demo-app: measured findings

All measured 2026-08-23, mirrord 3.250.0, kind cluster `loan-chaos`, namespace `orders-demo`.
orders-service run locally under `mirrord exec`, PORT overridden to 3100.

## 1. Decoy: pricingClient.ts is unbounded (an agent finds this from source)

`getQuote` is a plain `fetch`. No timeout, no retry. `/customers/:id/summary` calls it
once per open order, sequentially, so the delay multiplies by row count.

Rule: 3000ms read latency on `pricing-service:8000`.

| customer | open orders | result |
|---|---|---|
| cust-3 | 1 | 200 in 3.03s |
| cust-1 | 2 | 200 in 6.13s |

## 2. The trap: `statement_timeout` is not a bound on network latency

`db.ts` configures the pool with `statement_timeout: 1_000`, alongside
`connectionTimeoutMillis: 2_000`. Reading that, the endpoint looks bounded at 1s.

Rule: 2000ms read latency on `postgres:5432`.

**Warm pool** (the realistic case: service running, network then degrades):

```
req 1: 200  2.008s   chaos hits=1
req 2: 200  2.012s   chaos hits=1
req 3: 200  2.008s   chaos hits=1
req 4: 200  2.009s   chaos hits=1
```

Twice the configured timeout, returning success, so nothing alarms.
`statement_timeout` is a Postgres server-side limit on statement execution. The server
executed this in microseconds. The two seconds were network transit, which no
server-side timeout can see.

**Cold pool** (same rule, no established connection): 502 in 2.01s, because
`connectionTimeoutMillis` fires instead. Same fault, same endpoint, opposite outcome,
decided by pool state that appears nowhere in the source.

### 2b. The cliff: it survives on traffic, and dies on quiet

Decisive run, no rule churn anywhere. The only variable is whether requests keep
arriving. Fault applied once at step 2 and never touched again.

```
1. no fault, warm the pool
   200  0.059s
   200  0.004s
2. apply 2000ms read latency to postgres
   200  2.016s
   200  2.011s
   200  2.015s
3. one request every 3s for 12s (connection stays alive)
   200  2.024s
   200  2.024s
   200  2.017s
   200  2.012s
4. go quiet for 15s, past idleTimeoutMillis (10s), fault unchanged
   502  2.012s
   502  2.004s
   502  2.015s
```

The service rides out the degradation for as long as it stays busy. The moment traffic
drops long enough for the pool to reap its idle connection, every request fails and keeps
failing, because re-establishing a connection needs a handshake that cannot finish inside
`connectionTimeoutMillis`. Removing the fault recovers it in 3ms, so nothing is corrupted.

The trigger for a total outage is therefore **ten seconds of quiet**, not the network event.
A service can survive this all day under load and go hard down when traffic dips overnight.

Two independent measurements initially disagreed here, one seeing slow successes and one
seeing total failure. Both were right, on opposite sides of this cliff.

## 3. Bonus: a slow request kills the next one

Discriminating test, 3000ms latency on pricing-service:

| preceding request | its duration | the next request |
|---|---|---|
| cust-1 | 6.15s (> 5s) | **502 in 1.91s** |
| cust-3 | 3.16s (< 5s) | 200 in 3.06s |

uvicorn's default `timeout_keep_alive` is 5 seconds. When injected latency stretches a
request past it, the server closes the connection; undici then reuses the dead socket
and the *following* request fails with `fetch failed`.

Three pieces of code nobody in this repo wrote: undici's connection pool, uvicorn's
keep-alive default, and the interaction between them. The failure does not land on the
request that was slow.
