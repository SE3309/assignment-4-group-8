with open("user_data.sql", "w") as file:
    for i in range(6, 3001):  # Generate 3,000 users
        sql = f"INSERT INTO User (user_id, username, password, email, shipping_address, billing_address, phone_number) " \
              f"VALUES ({i}, 'User{i}', 'password{i}', 'user{i}@example.com', '123 Address {i}', '123 Address {i}', '12345{i:05d}');\n"
        file.write(sql)
