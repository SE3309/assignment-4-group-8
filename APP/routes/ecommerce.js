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

  registerPage: (req, res) => {
    res.render("register.ejs", {
      title: "Register",
      message: req.flash("error"),
    });
  },

  register: async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      req.flash("error", "All fields are required");
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/register");
    }

    try {
      // Check if the username already exists
      const userExistsQuery = "SELECT * FROM User WHERE username = ?";
      const [existingUser] = await new Promise((resolve, reject) => {
        db.query(userExistsQuery, [username], (err, results) => {
          if (err) reject(err);
          resolve(results);
        });
      });

      if (existingUser) {
        req.flash("error", "Username is already taken");
        return res.redirect("/register");
      }
      // Insert new user into the database
      const insertUserQuery = `
        INSERT INTO User (username, email, password) 
        VALUES (?, ?, ?)`;

      db.query(insertUserQuery, [username, email, password], (err) => {
        if (err) {
          console.error("Error registering user:", err);
          req.flash("error", "An error occurred during registration");
          return res.redirect("/register");
        }

        // Redirect to login after successful registration
        req.flash("success", "Registration successful! Please log in.");
        res.redirect("/login");
      });
    } catch (error) {
      console.error("Registration error:", error);
      req.flash("error", "An unexpected error occurred");
      res.redirect("/register");
    }
  },

  // Account Management Page
  accountManagement: (req, res) => {
    const userId = req.session.user.id;

    const query = "SELECT * FROM User WHERE user_id = ?";

    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching user details:", err);
        return res.status(500).send("Error retrieving user details");
      }

      if (results.length === 0) {
        // Logout user if no user found
        req.session.destroy();
        return res.redirect("/login");
      }

      const user = results[0];

      res.render("account-management.ejs", {
        title: "Account Management",
        user: user,
        message: req.flash("message") || "",
        messageType: req.flash("messageType") || "alert-info",
      });
    });
  },

  // Update Profile Route
  updateProfile: async (req, res) => {
    const userId = req.session.user.id;
    const {
      email,
      shipping_address,
      billing_address,
      phone_number,
      current_password,
      new_password,
      confirm_password,
    } = req.body;

    try {
      // First, verify current user
      const userQuery = "SELECT * FROM User WHERE user_id = ?";
      const [user] = await new Promise((resolve, reject) => {
        db.query(userQuery, [userId], (err, results) => {
          if (err) reject(err);
          resolve(results);
        });
      });

      // Prepare update queries
      const updateFields = {
        email,
        shipping_address,
        billing_address,
        phone_number,
      };

      // Handle password change if new password provided
      if (new_password) {
        // Validate current password
        if (!current_password) {
          req.flash(
            "message",
            "Current password is required to change password"
          );
          req.flash("messageType", "alert-danger");
          return res.redirect("/account-management");
        }

        // Verify current password
        const passwordMatch = current_password === user.password; // Replace with proper bcrypt comparison in production
        if (!passwordMatch) {
          req.flash("message", "Current password is incorrect");
          req.flash("messageType", "alert-danger");
          return res.redirect("/account-management");
        }

        // Validate new password
        if (new_password !== confirm_password) {
          req.flash("message", "New passwords do not match");
          req.flash("messageType", "alert-danger");
          return res.redirect("/account-management");
        }

        // Add new password to update fields
        updateFields.password = new_password; // In production, use bcrypt.hash()
      }

      // Construct dynamic update query
      const updateQuery = `
        UPDATE User 
        SET ${Object.keys(updateFields)
          .map((key) => `${key} = ?`)
          .join(", ")} 
        WHERE user_id = ?
      `;

      const queryParams = [...Object.values(updateFields), userId];

      // Execute update
      db.query(updateQuery, queryParams, (err) => {
        if (err) {
          console.error("Update error:", err);
          req.flash("message", "Error updating profile");
          req.flash("messageType", "alert-danger");
          return res.redirect("/account-management");
        }

        req.flash("message", "Profile updated successfully");
        req.flash("messageType", "alert-success");
        res.redirect("/account-management");
      });
    } catch (error) {
      console.error("Profile update error:", error);
      req.flash("message", "An unexpected error occurred");
      req.flash("messageType", "alert-danger");
      res.redirect("/account-management");
    }
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
    let userId = req.session.user.id;
    console.log(userId);
    let query = "SELECT * FROM User WHERE user_id = ?";
    db.query(query, [userId], (err, result) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.render("place-order.ejs", {
        title: "Place Order",
        user: result[0],
      });
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
