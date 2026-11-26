
const express = require("express");
const helmet = require("helmet");
const client = require("prom-client");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4002;

const CATALOG_URL =
  process.env.CATALOG_URL || "http://localhost:4001";

const PAYMENT_URL =
  process.env.PAYMENT_URL || "http://localhost:4003";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "shopsphere",
  user: process.env.DB_USER || "shopsphere",
  password: process.env.DB_PASSWORD
});

app.use(helmet());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "healthy",
      service: "order-service",
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

app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY id DESC"
    );

    res.json({
      success: true,
      count: result.rows.length,
      orders: result.rows
    });
  } catch (error) {
    console.error("Order retrieval failed:", error.message);
    res.status(500).json({
      error: "Unable to retrieve orders"
    });
  }
});

app.post("/orders", async (req, res) => {
  let dbClient;
  let transactionStarted = false;

  try {
    // Support both the old single-product request
    // and the new multiple-product cart request.
    const requestedItems = Array.isArray(req.body.items)
      ? req.body.items
      : [{
          productId: req.body.productId,
          quantity: req.body.quantity
        }];

    if (requestedItems.length === 0) {
      return res.status(400).json({
        error: "Your cart is empty"
      });
    }

    // Validate and combine duplicate product IDs.
    const itemMap = new Map();

    for (const item of requestedItems) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId < 1 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          error: "Valid product IDs and positive quantities are required"
        });
      }

      itemMap.set(
        productId,
        (itemMap.get(productId) || 0) + quantity
      );
    }

    const cartItems = [];
    let total = 0;

    // Retrieve each product and validate available stock.
    for (const [productId, quantity] of itemMap.entries()) {
      const catalogResponse = await fetch(
        `${CATALOG_URL}/products/${productId}`
      );

      if (!catalogResponse.ok) {
        return res.status(404).json({
          error: `Product ${productId} not found`
        });
      }

      const product = await catalogResponse.json();

      if (Number(product.stock) < quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}`
        });
      }

      const itemTotal = Number(product.price) * quantity;

      cartItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        itemTotal
      });

      total += itemTotal;
    }

    total = Number(total.toFixed(2));

    // Process one simulated payment for the complete cart.
    const paymentResponse = await fetch(
      `${PAYMENT_URL}/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: total })
      }
    );

    if (!paymentResponse.ok) {
      return res.status(502).json({
        error: "Payment failed"
      });
    }

    const payment = await paymentResponse.json();

    // Save all cart items under one shared order number.
    dbClient = await pool.connect();

    await dbClient.query("BEGIN");
    transactionStarted = true;

    const numberResult = await dbClient.query(
      `SELECT 'ORD-' ||
       LPAD(nextval('order_number_seq')::TEXT, 6, '0')
       AS order_number`
    );

    const orderNumber = numberResult.rows[0].order_number;
    const savedItems = [];

    for (const item of cartItems) {
      const result = await dbClient.query(
        `INSERT INTO orders
         (product_id, product_name, quantity, total,
          payment_id, status, order_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          item.productId,
          item.productName,
          item.quantity,
          item.itemTotal,
          payment.paymentId,
          "CONFIRMED",
          orderNumber
        ]
      );

      savedItems.push(result.rows[0]);
    }

    await dbClient.query("COMMIT");
    transactionStarted = false;

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderNumber,
      paymentId: payment.paymentId,
      total,
      items: savedItems
    });

  } catch (error) {
    if (transactionStarted && dbClient) {
      await dbClient.query("ROLLBACK");
    }

    console.error("Order creation failed:", error.message);

    res.status(500).json({
      error: "Unable to create order"
    });
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order service listening on port ${PORT}`);
});

