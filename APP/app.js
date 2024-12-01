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
  viewOrders,
  applyVoucher,
  loginPage,
  login,
  logout,
  accountManagement,
  updateProfile,
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
app.get("/", requireAuth, getHomePage);
app.get("/account-management", requireAuth, accountManagement);
app.post("/update-profile", requireAuth, updateProfile);
app.get("/add-product", requireAuth, addProductPage);
app.post("/add-product", requireAuth, addProduct);
app.get("/edit-product/:id", requireAuth, editProductPage);
app.post("/edit-product/:id", requireAuth, editProduct);
app.get("/delete-product/:id", requireAuth, deleteProduct);
app.get("/user-profile/:id", requireAuth, viewUserProfile);
app.post("/place-order", requireAuth, placeOrder);
app.get("/place-order", requireAuth, placeOrderPage);
app.get("/view-orders", requireAuth, viewOrders);
app.post("/apply-voucher", requireAuth, applyVoucher);
app.get("/add-product", requireAuth, addProductPage);

// Start server
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
