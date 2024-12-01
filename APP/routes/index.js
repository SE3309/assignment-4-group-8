module.exports = {
  getHomePage: (req, res) => {
    let query = "SELECT * FROM Inventory ORDER BY product_id ASC";

    db.query(query, (err, result) => {
      if (err) {
        return res.redirect("/"); // Handle error by redirecting or sending an error message
      }

      // Check if there are no products in the inventory
      const noProducts = result.length === 0;

      res.render("index.ejs", {
        title: "Welcome to E-Commerce Store",
        products: result,
        noProducts: noProducts, // Pass the flag to the view
      });
    });
  },
};
