const express = require("express");
const helmet = require("helmet");
const client = require("prom-client");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4003;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "shopsphere",
  user: process.env.DB_USER || "shopsphere",
  password: process.env.DB_PASSWORD
});

app.use(helmet());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "healthy",
      service: "payment-service",
      database: "connected"
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected"
    });
  }
});

// Prometheus metrics
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Get all payments
app.get("/payments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, payment_id, amount, status, created_at
       FROM payments
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: "Unable to retrieve payments"
    });
  }
});

// Create mock payment
app.post("/payments", async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: "A valid positive payment amount is required"
      });
    }

    const paymentId = crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO payments (payment_id, amount, status)
       VALUES ($1, $2, $3)
       RETURNING payment_id, amount, status, created_at`,
      [paymentId, amount, "SUCCESS"]
    );

    const payment = result.rows[0];

    res.status(201).json({
      success: true,
      message: "Mock payment processed successfully",
      paymentId: payment.payment_id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.created_at
    });
  } catch (error) {
    res.status(500).json({
      error: "Payment processing failed"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Payment service running on port ${PORT}`);
});
