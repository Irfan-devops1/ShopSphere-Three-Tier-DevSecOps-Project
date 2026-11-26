const express = require("express");
const helmet = require("helmet");
const client = require("prom-client");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(helmet());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "shopsphere",
  user: process.env.DB_USER || "shopsphere",
  password: process.env.DB_PASSWORD
});

const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      service: "catalog-service",
      database: "connected"
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected"
    });
  }
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, price, stock FROM products ORDER BY id"
    );

    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows
    });
  } catch (error) {
    console.error("Product retrieval failed:", error.message);
    res.status(500).json({ error: "Unable to retrieve products" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, price, stock FROM products WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Product lookup failed:", error.message);
    res.status(500).json({ error: "Unable to retrieve product" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Catalog service listening on port ${PORT}`);
});
