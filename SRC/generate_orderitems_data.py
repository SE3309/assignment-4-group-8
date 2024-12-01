import random

# To store generated pairs and ensure uniqueness
generated_pairs = set()

with open("orderitems_data.sql", "w") as file:
    for i in range(6, 3001): 
        while True:
            order_id = random.randint(6, 300)  
            product_id = random.randint(6, 3000)  
            if (order_id, product_id) not in generated_pairs:
                generated_pairs.add((order_id, product_id))
                break
        quantity = random.randint(1, 5)
        category = f"Category {product_id}"
        sql = f"INSERT INTO OrderItems (order_id, product_id, quantity, category) " \
              f"VALUES ({order_id}, {product_id}, {quantity}, '{category}');\n"
        file.write(sql)
