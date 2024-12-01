import random

with open("inventory_data.sql", "w") as file:
    for i in range(6, 3001):  # Generate 3,000 inventory items
        sql = f"INSERT INTO Inventory (product_id, quantity_in_stock, price, description, size, color, category, supplier_id) " \
              f"VALUES ({i}, {random.randint(1, 500)}, {random.uniform(5.0, 500.0):.2f}, 'Product {i}', 'M', 'Color {i}', 'Category {i}', {random.randint(1, 100)});\n"
        file.write(sql)
