# Multi-Branch Company Database - Implementation Guide

## Overview
This database design supports a multi-branch retail/wholesale company with complex inventory tracking including serialized items, purchases, sales, returns, refunds, transfers, and expense management.

---

## Key Design Patterns

### 1. **Branch Isolation Pattern**
Every major entity is tied to a specific branch via `branch_id`:
- **Users** belong to branches (can only see their branch data)
- **Stock** is branch-specific (prevents accidental cross-branch operations)
- **Transactions** (sales, purchases, expenses) are recorded per branch
- **Transfers** explicitly move stock between branches with audit trail

**Implementation in Application Layer:**
```sql
-- Example: User can only see their branch's sales
SELECT * FROM sales WHERE branch_id = :current_user_branch_id;

-- Admins might see all branches
SELECT * FROM sales WHERE branch_id IN (
    SELECT id FROM branches WHERE is_active = true
);
```

---

### 2. **Header-Items Transaction Pattern**
All transactions follow a two-table structure:

**Header Table** (purchases, sales, returns, refunds, transfers)
- Contains: totals, dates, status, customer/supplier info
- One record per transaction

**Items Table** (purchase_items, sale_items, return_items, etc.)
- Contains: individual products, quantities, prices
- Multiple records per transaction

**Why this pattern?**
- Clean separation of transaction metadata from line items
- Easy to calculate totals, taxes, discounts at header level
- Flexible for adding/removing products
- Better for reporting and queries

**Example Usage:**
```sql
-- Insert a sale with multiple products
BEGIN;

-- 1. Create sale header
INSERT INTO sales (branch_id, customer_id, user_id, sale_number, sale_date, 
                   total_amount, grand_total, payment_method)
VALUES (1, 5, 10, 'SAL-2026-001', CURRENT_DATE, 1500.00, 1500.00, 'cash')
RETURNING id; -- Returns sale_id = 123

-- 2. Add sale items
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, 
                        total_price, cost_price)
VALUES 
    (123, 50, 2, 500.00, 1000.00, 300.00),  -- Product 50: qty 2
    (123, 51, 1, 500.00, 500.00, 250.00);   -- Product 51: qty 1

-- 3. Update stock
UPDATE stock_items 
SET quantity = quantity - 2 
WHERE product_id = 50 AND branch_id = 1;

UPDATE stock_items 
SET quantity = quantity - 1 
WHERE product_id = 51 AND branch_id = 1;

COMMIT;
```

---

### 3. **Dual Inventory Tracking: Serialized vs Bulk**

**The Challenge:**
Some products (phones, laptops) need individual serial number tracking, while others (cables, boxes) only need quantity counts.

**The Solution:**
- `products.requires_serial` BOOLEAN flag
- When FALSE: use `stock_items.quantity` only
- When TRUE: create entry in `serial_numbers` for each unit

**Serialized Item Flow:**

```sql
-- Example: Purchasing 3 laptops (serialized product)

-- 1. Product setup
INSERT INTO products (category_id, sku, name, requires_serial, selling_price)
VALUES (5, 'LAP-001', 'Dell Latitude 7490', true, 1200.00);

-- 2. Record purchase
INSERT INTO purchases (branch_id, supplier_id, user_id, purchase_number, 
                       purchase_date, total_amount, grand_total, payment_status)
VALUES (1, 10, 5, 'PUR-2026-001', CURRENT_DATE, 3000.00, 3000.00, 'paid')
RETURNING id; -- purchase_id = 200

-- 3. Add purchase items
INSERT INTO purchase_items (purchase_id, product_id, quantity, 
                            unit_cost, total_cost)
VALUES (200, 100, 3, 1000.00, 3000.00);

-- 4. Update stock_items (quantity = 3)
INSERT INTO stock_items (product_id, branch_id, quantity, cost_price)
VALUES (100, 1, 3, 1000.00)
ON CONFLICT (product_id, branch_id) 
DO UPDATE SET quantity = stock_items.quantity + 3;

-- 5. Register each serial number
INSERT INTO serial_numbers (stock_item_id, serial_number, status, purchase_id)
VALUES 
    (50, 'SN123456789', 'in_stock', 200),
    (50, 'SN987654321', 'in_stock', 200),
    (50, 'SN456789123', 'in_stock', 200);

-- stock_item_id 50 is the id from stock_items table for this product/branch combo
```

**When Selling Serialized Item:**
```sql
-- Sale process for 1 laptop
BEGIN;

-- 1. Create sale
INSERT INTO sales (branch_id, user_id, sale_number, total_amount, 
                   grand_total, payment_method)
VALUES (1, 8, 'SAL-2026-002', 1200.00, 1200.00, 'card')
RETURNING id; -- sale_id = 300

-- 2. Add sale item
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, 
                        total_price, cost_price)
VALUES (300, 100, 1, 1200.00, 1200.00, 1000.00);

-- 3. Update stock quantity
UPDATE stock_items 
SET quantity = quantity - 1 
WHERE product_id = 100 AND branch_id = 1;

-- 4. Update serial number status
UPDATE serial_numbers 
SET status = 'sold', sale_id = 300 
WHERE serial_number = 'SN123456789';

COMMIT;

-- IMPORTANT: Your app should let user select which specific serial 
-- number they're selling (via barcode scan or dropdown)
```

**Non-Serialized Item (Simple):**
```sql
-- Selling 10 USB cables (non-serialized)
BEGIN;

INSERT INTO sales (...) VALUES (...) RETURNING id; -- sale_id = 301

INSERT INTO sale_items (sale_id, product_id, quantity, ...)
VALUES (301, 75, 10, ...);

-- Just update quantity, no serial number tracking
UPDATE stock_items 
SET quantity = quantity - 10 
WHERE product_id = 75 AND branch_id = 1;

COMMIT;
```

---

### 4. **Stock Transfer Between Branches**

**Transfer Workflow:**
1. **Pending**: Transfer initiated by source branch
2. **In Transit**: Items shipped to destination
3. **Received**: Destination branch confirms receipt
4. **Rejected**: Destination rejects (items stay at source)

**Example Transfer:**
```sql
-- Branch 1 transfers 5 monitors to Branch 2
BEGIN;

-- 1. Create transfer
INSERT INTO transfers (from_branch_id, to_branch_id, user_id, 
                       transfer_number, transfer_date, status)
VALUES (1, 2, 10, 'TRF-2026-001', CURRENT_DATE, 'pending')
RETURNING id; -- transfer_id = 400

-- 2. Add transfer items
INSERT INTO transfer_items (transfer_id, product_id, quantity, cost_price)
VALUES (400, 80, 5, 150.00);

-- 3. Reduce stock at source branch (status still pending)
UPDATE stock_items 
SET quantity = quantity - 5 
WHERE product_id = 80 AND branch_id = 1;

-- 4. Update status to in_transit
UPDATE transfers 
SET status = 'in_transit', sent_at = CURRENT_TIMESTAMP 
WHERE id = 400;

COMMIT;

-- Later, when destination receives:
BEGIN;

UPDATE transfers 
SET status = 'received', 
    received_at = CURRENT_TIMESTAMP, 
    received_by = 15 -- user_id of receiving user
WHERE id = 400;

-- Add stock to destination branch
INSERT INTO stock_items (product_id, branch_id, quantity, cost_price)
VALUES (80, 2, 5, 150.00)
ON CONFLICT (product_id, branch_id) 
DO UPDATE SET quantity = stock_items.quantity + 5;

COMMIT;
```

**For Serialized Items in Transfers:**
```sql
-- Transfer serialized items (e.g., 2 laptops)
BEGIN;

-- Create transfer
INSERT INTO transfers (...) RETURNING id; -- 401

-- Add items
INSERT INTO transfer_items (transfer_id, product_id, quantity, cost_price)
VALUES (401, 100, 2, 1000.00);

-- Update serial numbers to 'transferred' status
UPDATE serial_numbers 
SET status = 'transferred' 
WHERE serial_number IN ('SN123456789', 'SN987654321');

-- Reduce source stock
UPDATE stock_items SET quantity = quantity - 2 
WHERE product_id = 100 AND branch_id = 1;

-- Mark as in_transit
UPDATE transfers SET status = 'in_transit', sent_at = NOW() WHERE id = 401;

COMMIT;

-- On receipt at destination:
BEGIN;

-- Get destination stock_item_id or create new one
INSERT INTO stock_items (product_id, branch_id, quantity, cost_price)
VALUES (100, 2, 2, 1000.00)
ON CONFLICT (product_id, branch_id) 
DO UPDATE SET quantity = stock_items.quantity + 2
RETURNING id; -- new_stock_item_id = 60

-- Update serial numbers to new branch
UPDATE serial_numbers 
SET stock_item_id = 60, status = 'in_stock' 
WHERE serial_number IN ('SN123456789', 'SN987654321');

-- Complete transfer
UPDATE transfers 
SET status = 'received', received_at = NOW(), received_by = 15 
WHERE id = 401;

COMMIT;
```

---

### 5. **Returns vs Refunds**

**Returns** = Returning items TO suppliers (purchase reversal)
**Refunds** = Refunding items FROM customers (sale reversal)

**Return to Supplier Example:**
```sql
-- Returning 2 defective monitors to supplier
BEGIN;

INSERT INTO returns (branch_id, supplier_id, purchase_id, user_id, 
                     return_number, total_amount, status, reason)
VALUES (1, 10, 200, 5, 'RET-2026-001', 300.00, 'pending', 'Defective screens')
RETURNING id; -- return_id = 500

INSERT INTO return_items (return_id, product_id, quantity, unit_cost, total_cost)
VALUES (500, 80, 2, 150.00, 300.00);

-- Reduce stock (items going back to supplier)
UPDATE stock_items 
SET quantity = quantity - 2 
WHERE product_id = 80 AND branch_id = 1;

COMMIT;

-- When supplier approves:
UPDATE returns SET status = 'approved' WHERE id = 500;
```

**Refund to Customer Example:**
```sql
-- Customer returns 1 item from sale
BEGIN;

INSERT INTO refunds (branch_id, customer_id, sale_id, user_id, 
                     refund_number, total_amount, refund_method, status, reason)
VALUES (1, 5, 300, 8, 'REF-2026-001', 1200.00, 'cash', 'approved', 
        'Customer changed mind')
RETURNING id; -- refund_id = 600

INSERT INTO refund_items (refund_id, product_id, quantity, unit_price, total_price)
VALUES (600, 100, 1, 1200.00, 1200.00);

-- Add stock back (item returned by customer)
UPDATE stock_items 
SET quantity = quantity + 1 
WHERE product_id = 100 AND branch_id = 1;

-- If serialized, update serial number
UPDATE serial_numbers 
SET status = 'returned', sale_id = NULL 
WHERE serial_number = 'SN123456789';

COMMIT;
```

---

## Important Business Rules to Implement in Application

### Stock Validation
```sql
-- Before selling, check if enough stock exists
SELECT quantity 
FROM stock_items 
WHERE product_id = :product_id 
  AND branch_id = :branch_id;

-- If quantity < :requested_quantity, reject sale
```

### Serial Number Validation
```sql
-- For serialized products, ensure serial exists and is available
SELECT id, status 
FROM serial_numbers 
WHERE serial_number = :scanned_serial 
  AND stock_item_id IN (
      SELECT id FROM stock_items 
      WHERE product_id = :product_id 
        AND branch_id = :branch_id
  );

-- Status must be 'in_stock' to sell
```

### Prevent Negative Stock
```sql
-- Add CHECK constraint (already in schema)
ALTER TABLE stock_items 
ADD CONSTRAINT stock_quantity_non_negative 
CHECK (quantity >= 0);
```

### Transfer Validation
```sql
-- Prevent transferring to same branch (already in schema)
ALTER TABLE transfers 
ADD CONSTRAINT different_branches 
CHECK (from_branch_id != to_branch_id);
```

---

## Recommended Indexes (Already Included)

All important indexes are already created in the SQL file:
- Primary keys (automatic)
- Foreign keys (for JOIN performance)
- Date fields (for date range queries)
- Status fields (for filtering by status)
- Unique constraints (SKU, serial numbers, transaction numbers)

---

## Sample Queries for Reports

### 1. Daily Sales Report by Branch
```sql
SELECT 
    b.name AS branch,
    COUNT(s.id) AS total_sales,
    SUM(s.grand_total) AS revenue,
    AVG(s.grand_total) AS avg_sale
FROM sales s
JOIN branches b ON s.branch_id = b.id
WHERE s.sale_date = CURRENT_DATE
GROUP BY b.name;
```

### 2. Top Selling Products
```sql
SELECT 
    p.name,
    SUM(si.quantity) AS total_sold,
    SUM(si.total_price) AS revenue
FROM sale_items si
JOIN products p ON si.product_id = p.id
WHERE si.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.name
ORDER BY total_sold DESC
LIMIT 10;
```

### 3. Low Stock Alert
```sql
SELECT 
    b.name AS branch,
    p.sku,
    p.name AS product,
    s.quantity AS current_stock,
    p.reorder_level
FROM stock_items s
JOIN products p ON s.product_id = p.id
JOIN branches b ON s.branch_id = b.id
WHERE s.quantity <= p.reorder_level
  AND p.is_active = true
ORDER BY s.quantity ASC;
```

### 4. Profit Analysis
```sql
SELECT 
    p.name AS product,
    SUM(si.quantity) AS units_sold,
    SUM(si.total_price) AS revenue,
    SUM(si.cost_price * si.quantity) AS cost,
    SUM(si.total_price - (si.cost_price * si.quantity)) AS profit
FROM sale_items si
JOIN products p ON si.product_id = p.id
WHERE si.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.name
ORDER BY profit DESC;
```

### 5. Serial Number Audit Trail
```sql
SELECT 
    sn.serial_number,
    p.name AS product,
    sn.status,
    b.name AS current_branch,
    pur.purchase_number AS purchased_in,
    sal.sale_number AS sold_in
FROM serial_numbers sn
JOIN stock_items si ON sn.stock_item_id = si.id
JOIN products p ON si.product_id = p.id
JOIN branches b ON si.branch_id = b.id
LEFT JOIN purchases pur ON sn.purchase_id = pur.id
LEFT JOIN sales sal ON sn.sale_id = sal.id
WHERE sn.serial_number = 'SN123456789';
```

---

## Security Considerations

### Row-Level Security (RLS) in PostgreSQL
Enable for branch isolation:
```sql
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY branch_isolation_policy ON sales
    USING (branch_id = current_setting('app.current_branch_id')::INTEGER);

-- In your application, set the branch:
SET app.current_branch_id = 1;
```

### User Permissions
```sql
-- Create roles
CREATE ROLE branch_manager;
CREATE ROLE cashier;
CREATE ROLE stock_keeper;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON sales, sale_items TO cashier;
GRANT SELECT ON products, stock_items TO cashier;

GRANT ALL ON stock_items, products TO stock_keeper;
GRANT SELECT ON sales TO stock_keeper;
```

---

## Maintenance Tasks

### 1. Archive Old Transactions
```sql
-- Move sales older than 2 years to archive table
CREATE TABLE sales_archive (LIKE sales INCLUDING ALL);

INSERT INTO sales_archive 
SELECT * FROM sales 
WHERE sale_date < CURRENT_DATE - INTERVAL '2 years';

DELETE FROM sales 
WHERE sale_date < CURRENT_DATE - INTERVAL '2 years';
```

### 2. Recalculate Stock Quantities
```sql
-- Audit: verify serialized item quantities match serial count
SELECT 
    si.id,
    si.quantity AS recorded_quantity,
    COUNT(sn.id) AS actual_serial_count
FROM stock_items si
JOIN products p ON si.product_id = p.id
LEFT JOIN serial_numbers sn ON si.id = sn.stock_item_id 
    AND sn.status = 'in_stock'
WHERE p.requires_serial = true
GROUP BY si.id, si.quantity
HAVING si.quantity != COUNT(sn.id);
```

### 3. Clean Up Inactive Records
```sql
-- Disable products not sold in 1 year
UPDATE products 
SET is_active = false 
WHERE id NOT IN (
    SELECT DISTINCT product_id 
    FROM sale_items 
    WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
);
```

---

## Testing Data

See the companion file `sample_data.sql` for realistic test data to populate your database.

---

## Next Steps for Your Emergency Project

1. **Import schema**: Run `multibranch_db_postgres.sql` in pgAdmin or psql
2. **Visualize**: Import `multibranch_db_schema.dbml` to dbdiagram.io
3. **Test**: Run sample queries from this guide
4. **Build UI**: Start with basic CRUD for products, then sales
5. **Add business logic**: Implement stock validation, serial tracking
6. **Security**: Set up user roles and branch isolation

Good luck with your project! 🚀
