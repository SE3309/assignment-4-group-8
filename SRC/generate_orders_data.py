import random

with open("orders_data.sql", "w") as file:
    for i in range(6, 301):  # Generate 300 orders
        user_id = i  # Sequentially assign user_id to match a user from the User table
        sql = f"INSERT INTO Orders (order_id, user_id, order_date, total_amount, order_status, shipping_address, billing_address, review_id) " \
              f"VALUES ({i}, {user_id}, '2024-11-{random.randint(1, 30):02d}', {random.uniform(20.0, 1000.0):.2f}, 'Shipped', '123 Address {user_id}', '123 Address {user_id}', NULL);\n"
        file.write(sql)

