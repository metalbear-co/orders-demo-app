import express from "express";
import { pool } from "./db.js";
import { getQuote } from "./pricingClient.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 3000;

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

/**
 * Look up a single order.
 */
app.get("/orders/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, customer_id, sku, quantity, status FROM orders WHERE id = $1",
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "order not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[orders] lookup failed: ${(err as Error).message}`);
    res.status(502).json({ error: "order lookup failed" });
  }
});

/**
 * Summarize a customer's open orders and what they are currently worth.
 */
app.get("/customers/:id/summary", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT sku, quantity FROM orders WHERE customer_id = $1 AND status = 'open'",
      [req.params.id]
    );

    let total = 0;
    for (const row of result.rows) {
      const quote = await getQuote(row.sku);
      if (quote) total += quote.unit_price * row.quantity;
    }

    res.json({ customer_id: req.params.id, open_orders: result.rowCount, total });
  } catch (err) {
    console.error(`[summary] failed: ${(err as Error).message}`);
    res.status(502).json({ error: "summary failed" });
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`orders-service listening on :${PORT}`);
});
