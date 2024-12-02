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

  getOrderDetails: (req, res) => {
    const orderId = req.params.id;
    const userId = req.session.user.id;

    // Query to get order items with product details
    const query = `
        SELECT oi.quantity, i.description, i.price, i.product_id, i.category
        FROM OrderItems oi
        JOIN Inventory i ON oi.product_id = i.product_id
        JOIN Orders o ON oi.order_id = o.order_id
        WHERE oi.order_id = ? AND o.user_id = ?
    `;

    db.query(query, [orderId, userId], (err, results) => {
      if (err) {
        console.error("Error fetching order details:", err);
        return res
          .status(500)
          .json({ error: "Failed to retrieve order details" });
      }

      // If no results found, it could mean the order doesn't belong to the user
      if (results.length === 0) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to order details" });
      }

      console.log(results);

      // Send order items as JSON response
      res.json(results);
    });
  },

  // Modify placeOrderPage to include cart items
  placeOrderPage: (req, res) => {
    const userId = req.session.user.id;

    const userQuery = "SELECT * FROM User WHERE user_id = ?";
    db.query(userQuery, [userId], (err, userResult) => {
      if (err) {
        return res.status(500).send(err);
      }

      // Get cart items and total
      const query = `
            SELECT sc.quantity, i.* 
            FROM Shoppingcart sc 
            JOIN Inventory i ON sc.product_id = i.product_id 
            WHERE sc.user_id = ?
        `;

      db.query(query, [userId], (cartErr, cartItems) => {
        if (cartErr) {
          return res.status(500).send(cartErr);
        }

        console.log(cartItems);

        // Calculate total amount
        const totalAmount = cartItems.reduce((total, item) => {
          return total + item.price * item.quantity;
        }, 0);

        res.render("place-order.ejs", {
          title: "Place Order",
          user: userResult[0],
          cartItems: cartItems,
          totalAmount: totalAmount.toFixed(2),
        });
      });
    });
  },

  placeOrder: (req, res) => {
    const userId = req.session.user.id;
    const { total_amount, order_status, shipping_address, billing_address } =
      req.body;

    // First, get cart items
    const cartQuery = `
        SELECT sc.quantity, i.* 
        FROM Shoppingcart sc 
        JOIN Inventory i ON sc.product_id = i.product_id 
        WHERE sc.user_id = ?
    `;

    db.query(cartQuery, [userId], (cartErr, cartItems) => {
      if (cartErr) {
        console.error("Cart retrieval error:", cartErr);
        return res.status(500).send("Error processing order");
      }

      // Validate cart is not empty
      if (cartItems.length === 0) {
        return res.status(400).send("Cart is empty");
      }

      // Calculate total amount
      const calculatedTotal = cartItems.reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);

      // Get the current date for order_date
      const order_date = new Date().toISOString().slice(0, 10);

      // Insert order
      const orderQuery = `
            INSERT INTO Orders (user_id, order_date, total_amount, order_status, shipping_address, billing_address) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

      db.query(
        orderQuery,
        [
          userId,
          order_date,
          calculatedTotal,
          order_status,
          shipping_address,
          billing_address,
        ],
        (orderErr, orderResult) => {
          if (orderErr) {
            console.error("Order insertion error:", orderErr);
            return res.status(500).send("Error creating order");
          }

          const orderId = orderResult.insertId;

          // Insert order items
          const orderItemsQuery = `
                    INSERT INTO OrderItems (order_id, product_id, quantity, category) 
                    VALUES ?
                `;

          const orderItemsValues = cartItems.map((item) => [
            orderId,
            item.product_id,
            item.quantity,
            item.category,
          ]);

          db.query(orderItemsQuery, [orderItemsValues], (orderItemsErr) => {
            if (orderItemsErr) {
              console.error("Order items insertion error:", orderItemsErr);
              return res.status(500).send("Error processing order items");
            }

            // Clear the shopping cart after order
            const clearCartQuery = "DELETE FROM Shoppingcart WHERE user_id = ?";
            db.query(clearCartQuery, [userId], async (clearErr) => {
              if (clearErr) {
                console.error("Cart clearing error:", clearErr);
              }

              try {
                // Update recommended items after the order
                await module.exports.updateRecommendedItems(userId, db);
                res.redirect("/view-orders");
              } catch (updateErr) {
                console.error("Error updating recommendations:", updateErr);
                res.redirect("/view-orders");
              }
            });
          });
        }
      );
    });
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

  // Add Item to Cart
  addToCart: (req, res) => {
    const userId = req.session.user.id;
    const { product_id, quantity } = req.body;

    // Validate input
    if (!product_id || !quantity) {
      return res.status(400).send("Product ID and Quantity are required");
    }

    // First, check if the product exists in inventory
    const checkProductQuery = "SELECT * FROM Inventory WHERE product_id = ?";
    db.query(checkProductQuery, [product_id], (err, productResults) => {
      if (err) {
        console.error("Error checking product:", err);
        return res.status(500).send("Error adding to cart");
      }

      if (productResults.length === 0) {
        return res.status(404).send("Product not found");
      }

      // Check if product is already in cart, if so, update quantity
      const checkCartQuery =
        "SELECT * FROM Shoppingcart WHERE user_id = ? AND product_id = ?";
      db.query(checkCartQuery, [userId, product_id], (err, cartResults) => {
        if (err) {
          console.error("Error checking cart:", err);
          return res.status(500).send("Error adding to cart");
        }

        if (cartResults.length > 0) {
          // Update existing cart item
          const updateQuery =
            "UPDATE Shoppingcart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?";
          db.query(updateQuery, [quantity, userId, product_id], (err) => {
            if (err) {
              console.error("Error updating cart:", err);
              return res.status(500).send("Error updating cart");
            }
            res.redirect("/place-order");
          });
        } else {
          // Insert new cart item
          const insertQuery =
            "INSERT INTO Shoppingcart (user_id, product_id, quantity) VALUES (?, ?, ?)";
          db.query(insertQuery, [userId, product_id, quantity], (err) => {
            if (err) {
              console.error("Error inserting to cart:", err);
              return res.status(500).send("Error adding to cart");
            }
            res.redirect("/place-order");
          });
        }
      });
    });
  },

  // Get Shopping Cart Items
  getShoppingCart: (req, res) => {
    const userId = req.session.user.id;

    const query = `
        SELECT sc.quantity, i.* 
        FROM Shoppingcart sc 
        JOIN Inventory i ON sc.product_id = i.product_id 
        WHERE sc.user_id = ?
    `;

    db.query(query, [userId], (err, cartItems) => {
      if (err) {
        console.error("Error fetching cart:", err);
        return res.status(500).send("Error retrieving cart");
      }

      // Calculate total amount
      const totalAmount = cartItems.reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);

      return { cartItems, totalAmount };
    });
  },
  // Updates recommended items for the user
  updateRecommendedItems: async (userId, db) => {
    try {
      const orderHistoryQuery = `
        SELECT oi.category, i.color, COUNT(*) AS frequency
        FROM Orders o
        JOIN OrderItems oi ON o.order_id = oi.order_id
        JOIN Inventory i ON oi.product_id = i.product_id
        WHERE o.user_id = ?
        GROUP BY oi.category, i.color
        ORDER BY frequency DESC`;

      const [orderHistory] = await db.promise().query(orderHistoryQuery, [userId]);

      let recommendations = [];
      if (orderHistory.length > 0) {
        const rankedQuery = `
          SELECT i.product_id
          FROM Inventory i
          WHERE i.category IN (?) OR i.color IN (?)
          ORDER BY RAND()
          LIMIT 10`;

        const categories = orderHistory.map((item) => item.category);
        const colors = orderHistory.map((item) => item.color);

        const [rankedRecommendations] = await db.promise().query(rankedQuery, [categories, colors]);
        recommendations = rankedRecommendations.map((item) => item.product_id);
      }

      if (recommendations.length < 10) {
        const randomQuery = `
          SELECT product_id
          FROM Inventory
          WHERE product_id NOT IN (?)
          ORDER BY RAND()
          LIMIT ?`;

        const excludedProducts = recommendations.length > 0 ? recommendations : [0];
        const remainingSlots = 10 - recommendations.length;

        const [randomRecommendations] = await db.promise().query(randomQuery, [excludedProducts, remainingSlots]);
        recommendations.push(...randomRecommendations.map((item) => item.product_id));
      }

      await db.promise().query("DELETE FROM RecommendedItems WHERE user_id = ?", [userId]);

      if (recommendations.length > 0) {
        const insertQuery = `
          INSERT INTO RecommendedItems (user_id, product_id)
          VALUES ?`;
        const values = recommendations.map((productId) => [userId, productId]);
        await db.promise().query(insertQuery, [values]);
      }

      console.log(`Updated recommendations for user ${userId}`);
    } catch (error) {
      console.error("Error updating recommended items:", error);
      throw new Error("Failed to update recommended items");
    }
  },
  // Fetch recommended items for the logged-in user
  getRecommendedItems: (req, res) => {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.redirect("/login");
    }

    const query = `
      SELECT i.product_id, i.description, i.price, i.quantity_in_stock, i.category, i.color
      FROM RecommendedItems r
      JOIN Inventory i ON r.product_id = i.product_id
      WHERE r.user_id = ?`;

    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching recommended items:", err);
        return res.status(500).send("An error occurred while retrieving recommendations.");
      }

      res.render("recommended-items.ejs", {
        title: "Recommended Items",
        recommendations: results,
      });
    });
  },
};
