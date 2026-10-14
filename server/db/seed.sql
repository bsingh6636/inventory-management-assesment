INSERT INTO products (name, sku, category, unit_price, current_stock, minimum_stock) VALUES
  ('Laptop',   'LAP-001', 'Electronics', 55000.00, 10,  5),
  ('Keyboard', 'KEY-001', 'Electronics',  1200.00, 25, 10),
  ('Mouse',    'MOU-001', 'Electronics',   650.00, 30, 10)
ON DUPLICATE KEY UPDATE name = VALUES(name);
