
import { useEffect, useState } from "react";

const API = {
  catalog: "/api/catalog/products",
  orders: "/api/orders",
};

const productImages = {
  1: {
    src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    alt: "Wireless Headphones",
  },
  2: {
    src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
    alt: "Smart Watch",
  },
  3: {
    src: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
    alt: "Laptop Backpack",
  },
  4: {
    src: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600",
    alt: "Mechanical Keyboard",
  },
};

function formatPrice(amount) {
  return Number(amount || 0).toLocaleString("en-IN");
}

function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [message, setMessage] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const loadData = async () => {
    try {
      setError("");

      const [productsResponse, ordersResponse] = await Promise.all([
        fetch(API.catalog),
        fetch(API.orders),
      ]);

      if (!productsResponse.ok || !ordersResponse.ok) {
        throw new Error("Unable to load ShopSphere data.");
      }

      const productsData = await productsResponse.json();
      const ordersData = await ordersResponse.json();

      setProducts(
        Array.isArray(productsData)
          ? productsData
          : productsData.products || []
      );

      setOrders(
        Array.isArray(ordersData)
          ? ordersData
          : ordersData.orders || []
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate cart item count and total.
  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  // Add a product or increase its quantity.
  const addToCart = (product) => {
    if (Number(product.stock) <= 0) {
      setMessage("This product is currently out of stock.");
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        if (existingItem.quantity >= Number(product.stock)) {
          setMessage(`Only ${product.stock} units are available.`);
          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });

    setMessage(`${product.name} added to your cart.`);
  };

  // Increase or decrease the quantity of a cart item.
  const updateQuantity = (productId, change) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) return item;

        const newQuantity = item.quantity + change;

        const currentProduct = products.find(
          (product) => product.id === productId
        );

        if (newQuantity < 1) return item;

        if (
          currentProduct &&
          newQuantity > Number(currentProduct.stock)
        ) {
          setMessage(
            `Only ${currentProduct.stock} units are available for ${item.name}.`
          );
          return item;
        }

        return { ...item, quantity: newQuantity };
      })
    );
  };

  // Remove a product from the cart.
  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );

    setMessage("Product removed from your cart.");
  };

  // Process one payment for the complete cart.
  const placeOrder = async () => {
    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    try {
      setOrdering(true);
      setMessage("");

      const response = await fetch(API.orders, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Payment failed."
        );
      }

      const orderNumber =
        result.orderNumber || "Order confirmed";

      setCart([]);
      setCheckoutOpen(false);

      setMessage(
        `Payment successful! Your Order Number: ${orderNumber}`
      );

      await loadData();
    } catch (err) {
      setMessage(err.message || "Unable to process payment.");
    } finally {
      setOrdering(false);
    }
  };

  // Group order line items by their shared order number.
  const groupedOrders = Object.values(
    orders.reduce((groups, order) => {
      const orderNumber =
        order.order_number ||
        `ORD-${String(order.id).padStart(6, "0")}`;

      if (!groups[orderNumber]) {
        groups[orderNumber] = {
          orderNumber,
          items: [],
          total: 0,
          status: order.status || "CONFIRMED",
          createdAt: order.created_at,
        };
      }

      groups[orderNumber].items.push(order);
      groups[orderNumber].total += Number(order.total || 0);

      return groups;
    }, {})
  ).sort((a, b) => {
    return (
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
    );
  });

  return (
    <div className="app">
      <header className="header">
        <a href="#home" className="brand">
          <span className="brand-icon">S</span>
          <span>ShopSphere</span>
        </a>

        <nav>
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#cart">Cart ({cartCount})</a>
          <a href="#orders">Orders</a>
        </nav>

        <div className="header-tag">
          <strong>Built by Irfan-DevOps1</strong>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}

        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">Welcome to ShopSphere</span>

            <h1>
              Discover Products.
              <br />
              Experience <span>Smart Shopping.</span>
            </h1>

            <p className="hero-description">
              Explore our collection of products and enjoy a simple,
              seamless and reliable shopping experience.
            </p>

            <a href="#products" className="shop-button">
              Explore Products <span>→</span>
            </a>
          </div>

          <div className="hero-card">
            <div className="hero-card-icon">🛍️</div>
            <span className="hero-card-label">SHOPSPHERE STORE</span>
            <strong>Shop Smart.</strong>
            <p>Discover something you will love.</p>
            <div className="hero-card-decoration">S</div>
          </div>
        </section>

        {/* PRODUCTS SECTION */}

        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Our Collection</span>
              <h2>Featured Products</h2>
              <p>Explore our latest collection.</p>
            </div>

            <span className="product-count">
              {products.length} Products
            </span>
          </div>

          {loading ? (
            <p className="message">Loading products...</p>
          ) : error ? (
            <p className="message error">{error}</p>
          ) : products.length === 0 ? (
            <p className="message">No products available yet.</p>
          ) : (
            <div className="product-grid">
              {products.map((product) => {
                const image = productImages[product.id];

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image">
                      {image ? (
                        <img
                          src={image.src}
                          alt={image.alt}
                          loading="lazy"
                        />
                      ) : (
                        <span>🛍️</span>
                      )}
                    </div>

                    <div className="product-details">
                      <span className="product-category">
                        ShopSphere Collection
                      </span>

                      <h3>{product.name}</h3>

                      <div className="product-bottom">
                        <strong>
                          ₹{formatPrice(product.price)}
                        </strong>
                        <span>Stock: {product.stock}</span>
                      </div>

                      <div className="product-actions">
                        <button
                          className="shop-button order-button"
                          onClick={() => {
                            addToCart(product);
                            setCheckoutOpen(true);
                            setMessage("");
                          }}
                          disabled={Number(product.stock) <= 0}
                        >
                          {Number(product.stock) <= 0
                            ? "Out of Stock"
                            : "Order Now →"}
                        </button>

                        <button
                          className="shop-button add-cart-button"
                          onClick={() => addToCart(product)}
                          disabled={Number(product.stock) <= 0}
                        >
                          Add to Cart +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SHOPPING CART SECTION */}

        <section className="cart-section" id="cart">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Your Selection</span>
              <h2>Shopping Cart</h2>
              <p>Review your products before checkout.</p>
            </div>

            <span className="product-count">
              {cartCount} Items
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Add products from our collection to get started.</p>
              <a href="#products" className="shop-button">
                Browse Products →
              </a>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {cart.map((item) => {
                  const image = productImages[item.id];

                  return (
                    <div className="cart-item" key={item.id}>
                      <div className="cart-item-image">
                        {image && (
                          <img src={image.src} alt={image.alt} />
                        )}
                      </div>

                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <span>
                          ₹{formatPrice(item.price)} each
                        </span>
                      </div>

                      <div className="quantity-control">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={ordering}
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          −
                        </button>

                        <strong>{item.quantity}</strong>

                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={
                            ordering ||
                            item.quantity >= Number(item.stock)
                          }
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          +
                        </button>
                      </div>

                      <strong className="cart-item-total">
                        ₹
                        {formatPrice(
                          Number(item.price) * item.quantity
                        )}
                      </strong>

                      <button
                        className="remove-cart-item"
                        onClick={() => removeFromCart(item.id)}
                        disabled={ordering}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="cart-summary">
                <div>
                  <span>Subtotal ({cartCount} items)</span>
                  <strong>₹{formatPrice(cartTotal)}</strong>
                </div>

                <div>
                  <span>Delivery</span>
                  <strong>Free</strong>
                </div>

                <div className="cart-grand-total">
                  <span>Total Amount</span>
                  <strong>₹{formatPrice(cartTotal)}</strong>
                </div>

                <button
                  className="shop-button cart-checkout-button"
                  onClick={() => {
                    setCheckoutOpen(true);
                    setMessage("");
                  }}
                  disabled={ordering || cart.length === 0}
                >
                  Proceed to Checkout →
                </button>
              </div>
            </>
          )}

          {message && <p className="message">{message}</p>}
        </section>

        {/* CHECKOUT MODAL */}

        {checkoutOpen && (
          <div className="checkout-overlay">
            <div className="checkout-modal">
              <button
                className="checkout-close"
                onClick={() => setCheckoutOpen(false)}
                disabled={ordering}
                aria-label="Close checkout"
              >
                ×
              </button>

              <span className="eyebrow">Secure Checkout</span>
              <h2>Complete Your Order</h2>

              <div className="checkout-items">
                {cart.map((item) => (
                  <div className="checkout-product" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span className="checkout-quantity">
                        Quantity: {item.quantity}
                      </span>
                    </div>

                    <strong>
                      ₹
                      {formatPrice(
                        Number(item.price) * item.quantity
                      )}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="checkout-total">
                <span>Total Amount</span>
                <strong>₹{formatPrice(cartTotal)}</strong>
              </div>

              <div className="checkout-payment-note">
                <strong>Demo Payment</strong>
                <p>
                  This portfolio checkout uses simulated payment.
                  No real money will be charged.
                </p>
              </div>

              {message && <p className="message">{message}</p>}

              <button
                className="shop-button checkout-pay-button"
                onClick={placeOrder}
                disabled={ordering || cart.length === 0}
              >
                {ordering
                  ? "Processing Payment..."
                  : `Pay ₹${formatPrice(cartTotal)} Now →`}
              </button>

              <button
                className="checkout-cancel"
                onClick={() => setCheckoutOpen(false)}
                disabled={ordering}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {/* RECENT ORDERS SECTION */}

        <section className="orders-section" id="orders">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Order Activity</span>
              <h2>Recent Orders</h2>
              <p>Your latest shopping activity.</p>
            </div>
          </div>

          {groupedOrders.length === 0 ? (
            <p className="message">
              No orders available yet. Place your first order!
            </p>
          ) : (
            <div className="orders-list">
              {groupedOrders.slice(0, 5).map((order) => (
                <div className="order-row" key={order.orderNumber}>
                  <div className="order-info">
                    <strong>
                      Order Number: {order.orderNumber}
                    </strong>

                    <span>
                      {order.items
                        .map(
                          (item) =>
                            `${item.product_name} × ${item.quantity}`
                        )
                        .join(", ")}
                    </span>
                  </div>

                  <strong>₹{formatPrice(order.total)}</strong>

                  <span className="order-status">
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}

      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <strong>ShopSphere.</strong>
            <p>Your shopping experience, reimagined.</p>
            <span className="footer-built">
              Built by Irfan-DevOps1
            </span>
          </div>

          <div className="footer-profile">
            <span className="footer-label">
              Designed &amp; Developed by
            </span>

            <h2>Irfan Ahmad</h2>

            <p className="footer-role">
              DevOps Engineer | Cloud Infrastructure | Automation
            </p>

            <div className="footer-divider"></div>

            <h3>Connect With Me</h3>

            <div className="social-links">
              <a
                href="https://www.linkedin.com/in/irfan-ahmad-1b52098b/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>LinkedIn: Irfan Ahmad</strong>
              </a>

              <a
                href="https://github.com/Irfan-devops1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>GitHub: Irfan-devops1</strong>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <strong>© 2026 ShopSphere. All rights reserved.</strong>
          <strong>Deployed on Kubernetes Cluster (K8s) </strong>
        </div>
      </footer>
    </div>
  );
}

export default App;

