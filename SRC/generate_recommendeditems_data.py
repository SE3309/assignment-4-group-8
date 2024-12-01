import random

with open("recommendeditems_data.sql", "w") as file:
    for i in range(6, 301):  # Generate 300 recommended items
        user_id = random.randint(6, 3000)  # Joinable with User
        product_id = random.randint(6, 3000)  # Joinable with Inventory
        sql = f"INSERT INTO RecommendedItems (recommendation_id, user_id, product_id) " \
              f"VALUES ({i}, {user_id}, {product_id});\n"
        file.write(sql)
