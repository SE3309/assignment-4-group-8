const express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const path = require("path");
const flash = require("req-flash");
const app = express();
const fs = require("fs");

const port = 5000;

const session = require("express-session");
// Add session middleware
app.use(
  session({
    secret: "your_secret_key", // Replace with a strong secret key
    resave: false, // Avoid saving unchanged sessions
    saveUninitialized: true, // Save sessions that are new but unmodified
  })
);

// Initialize req-flash after session middleware
app.use(flash());

// Create connection to database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ecommerce_db",
  port: 3307,
});

// Connect to database
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connected to database");
});
global.db = db;

// ---- UNCOMMENT WHENA YOU NEED TO FILL THE DATABASE ----

// // Read the SQL file
// const sqlFilePath = "../SRC/inventory_data.sql";
// fs.readFile(sqlFilePath, "utf8", (err, sql) => {
//   if (err) {
//     console.error("Error reading the SQL file:", err);
//     return;
//   }

//   // Split the file into separate queries by looking for semicolons
//   const queries = sql.split(";").filter((query) => query.trim() !== "");

//   // Execute each query separately
//   queries.forEach((query) => {
//     db.query(query, (err, result) => {
//       if (err) {
//         console.error("Error executing SQL:", err);
//       } else {
//         console.log("SQL executed successfully");
//       }
//     });
//   });
// });

// const sqlFilePath1 = "../SRC/user_data.sql";
// fs.readFile(sqlFilePath1, "utf8", (err, sql) => {
//   if (err) {
//     console.error("Error reading the SQL file:", err);
//     return;
//   }

//   // Split the file into separate queries by looking for semicolons
//   const queries = sql.split(";").filter((query) => query.trim() !== "");

//   // Execute each query separately
//   queries.forEach((query) => {
//     db.query(query, (err, result) => {
//       if (err) {
//         console.error("Error executing SQL:", err);
//       } else {
//         console.log("SQL executed successfully");
//       }
//     });
//   });
// });

// Configure middleware
app.set("port", process.env.port || port);
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
app.use(flash());
// Add this middleware after session setup
app.use((req, res, next) => {
  // Make session user available to all views
  res.locals.user = req.session.user || null;
  next();
});

// Import routes
const { getHomePage } = require("./routes/index.js");
const {
  addProductPage,
  addProduct,
  editProductPage,
  editProduct,
  deleteProduct,
  viewUserProfile,
  placeOrder,
  placeOrderPage,
  getOrderDetails,
  viewOrders,
  applyVoucher,
  createVoucher,
  loginPage,
  login,
  addToCart,
  logout,
  register,
  registerPage,
  accountManagement,
  updateProfile,
  getRecommendedItems,
  voucherPage,
} = require("./routes/ecommerce.js");

// Middleware to check authentication (add this before other routes)
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Please login to access this page");
    return res.redirect("/login");
  }
  next();
};

// Define routes
app.get("/login", loginPage);
app.post("/login", login);
app.get("/logout", logout);
app.get("/register", registerPage);
app.post("/register", register);
app.get("/", requireAuth, getHomePage);
app.get("/account-management", requireAuth, accountManagement);
app.post("/update-profile", requireAuth, updateProfile);

// Product routes
app.get("/add-product", requireAuth, addProductPage); // Page to add a product
app.post("/add-product", requireAuth, addProduct); // Add product to database
app.get("/edit-product/:id", requireAuth, editProductPage); // Page to edit product
app.post("/edit-product/:id", requireAuth, editProduct); // Update product
app.post("/delete-product/:id", requireAuth, deleteProduct); // Delete product

// Order routes
app.get("/view-orders", requireAuth, viewOrders); // View all orders
app.get("/view-orders/:id", requireAuth, getOrderDetails); // View order details

// Voucher routes
app.get("/create-voucher", voucherPage); // Page to create voucher
app.post("/create-voucher", createVoucher); // Create a voucher
app.post("/apply-voucher", applyVoucher); // Apply voucher to an order

// Cart and Order routes
app.post("/add-to-cart", requireAuth, addToCart); // Add product to cart
app.post("/place-order", requireAuth, placeOrder); // Place the order
app.get("/place-order", requireAuth, placeOrderPage); // Page for order placement

// User routes
app.get("/recommended-items", requireAuth, getRecommendedItems); // Get recommended items
app.get("/view-user-profile", requireAuth, viewUserProfile); // View user profile

// Start server
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
