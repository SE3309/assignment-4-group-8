const bcrypt = require("bcrypt");

module.exports = {
  // Login Page Route
  loginPage: (req, res) => {
    // Check if user is already logged in
    if (req.session.user) {
      return res.redirect("/");
    }
    res.render("login.ejs", {
      title: "Login",
      message: req.flash("error"), // Use flash messages for errors
    });
  },

  // Login Route
  login: (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      req.flash("error", "Please enter both username and password");
      return res.redirect("/login");
    }

    // Query to find user
    const query = "SELECT * FROM User WHERE username = ?";

    db.query(query, [username], (err, results) => {
      if (err) {
        console.error("Login error:", err);
        req.flash("error", "An error occurred during login");
        return res.redirect("/login");
      }

      // Check if user exists
      if (results.length === 0) {
        req.flash("error", "Invalid username or password");
        return res.redirect("/login");
      }

      // Compare password (note: in a real app, use proper password hashing)
      const user = results[0];

      // Simple password comparison (replace with bcrypt in production)
      if (password !== user.password) {
        req.flash("error", "Invalid username or password");
        return res.redirect("/login");
      }

      // Store user info in session
      req.session.user = {
        id: user.user_id,
        username: user.username,
      };

      // Redirect to home page after successful login
      res.redirect("/");
    });
  },

  // Logout Route
  logout: (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/login");
    });
  },

  addProductPage: (req, res) => {
    res.render("add-product.ejs", {
      title: "Add New Product",
      message: "",
    });
  },

  addProduct: (req, res) => {
    let {
      quantity_in_stock,
      price,
      description,
      size,
      color,
      category,
      supplier_id,
    } = req.body;

    // Parse price to ensure it's a valid number
    price = parseFloat(price) || 0.0; // Ensures price is a number or defaults to 0.00

    let query =
      "INSERT INTO Inventory (quantity_in_stock, price, description, size, color, category, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?)";

    db.query(
      query,
      [
        quantity_in_stock,
        price,
        description,
        size,
        color,
        category,
        supplier_id,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting product:", err);
          return res.status(500).send("Failed to add product.");
        }
        res.redirect("/"); // Redirect to home or a product list page
      }
    );
  },

  editProductPage: (req, res) => {
    let productId = req.params.id;
    let query = "SELECT * FROM Inventory WHERE product_id = ?";
    db.query(query, [productId], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.render("edit-product.ejs", {
        title: "Edit Product",
        product: result[0],
        message: "",
      });
    });
  },

  editProduct: (req, res) => {
    let productId = req.params.id;
    let { quantity_in_stock, price, description, size, color, category } =
      req.body;

    // Parse price to ensure it's a number
    price = parseFloat(price) || 0.0;

    let query =
      "UPDATE Inventory SET quantity_in_stock = ?, price = ?, description = ?, size = ?, color = ?, category = ? WHERE product_id = ?";
    db.query(
      query,
      [quantity_in_stock, price, description, size, color, category, productId],
      (err, result) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.redirect("/");
      }
    );
  },

  deleteProduct: (req, res) => {
    let productId = req.params.id;

    // Delete product query
    let deleteProductQuery = "DELETE FROM Inventory WHERE product_id = ?";

    db.query(deleteProductQuery, [productId], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }

      // Redirect to the homepage or product list after deletion
      res.redirect("/");
    });
  },

  viewUserProfile: (req, res) => {
    let userId = req.params.id;
    let query = "SELECT * FROM User WHERE user_id = ?";
    db.query(query, [userId], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.render("user-profile.ejs", {
        title: "User Profile",
        user: result[0],
      });
    });
  },

  placeOrderPage: (req, res) => {
    res.render("place-order.ejs", {
      title: "Place Order",
      message: "",
    });
  },
  placeOrder: (req, res) => {
    let {
      user_id,
      total_amount,
      order_status,
      shipping_address,
      billing_address,
    } = req.body;

    // Validate input data (example)
    if (!user_id || !total_amount || !shipping_address || !billing_address) {
      return res.status(400).send("Missing required fields");
    }

    // Get the current date for order_date
    let order_date = new Date().toISOString().slice(0, 10); // Format as YYYY-MM-DD

    // Insert order into Orders table
    let query = `INSERT INTO Orders (user_id, order_date, total_amount, order_status, shipping_address, billing_address) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(
      query,
      [
        user_id,
        order_date,
        total_amount,
        order_status,
        shipping_address,
        billing_address,
      ],
      (err, result) => {
        if (err) {
          console.error("Error placing order:", err);
          return res.status(500).send("Failed to place order.");
        }

        // Redirect to orders page after successfully placing the order
        res.redirect("/view-orders");
      }
    );
  },

  viewOrders: (req, res) => {
    // Get the logged-in user's ID from the session
    const userId = req.session.user.id;

    // Query to select only orders for the logged-in user
    let query =
      "SELECT * FROM Orders WHERE user_id = ? ORDER BY order_date DESC";

    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error("Error fetching orders:", err);
        return res.status(500).send("Error retrieving orders");
      }

      res.render("view-orders.ejs", {
        title: "My Orders",
        orders: result,
        // Add a message if no orders exist
        noOrders: result.length === 0,
      });
    });
  },

  applyVoucher: (req, res) => {
    let { voucher_id, order_id } = req.body;
    let query =
      "INSERT INTO VoucherOrders (voucher_id, order_id, new_total) VALUES (?, ?, ?)";

    // You would typically calculate the new total based on the voucher here
    let newTotal = 100; // Placeholder calculation

    db.query(query, [voucher_id, order_id, newTotal], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.redirect("/view-orders");
    });
  },
};
