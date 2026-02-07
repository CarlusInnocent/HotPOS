-- Multi-Branch Company Database - PostgreSQL Implementation
-- Author: Database Design for Emergency Project
-- Created: 2026-02-03

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Branches Table
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_branches_active ON branches(is_active);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'stock_keeper')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);

-- Categories Table (with self-referencing for subcategories)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_name ON categories(name);

-- Suppliers Table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_active ON customers(is_active);

-- ============================================================================
-- PRODUCT AND INVENTORY TABLES
-- ============================================================================

-- Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) NOT NULL, -- pcs, kg, liters, etc
    requires_serial BOOLEAN DEFAULT false, -- TRUE for phones, laptops, etc
    reorder_level INTEGER DEFAULT 10,
    selling_price DECIMAL(15,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_requires_serial ON products(requires_serial);
CREATE INDEX idx_products_name ON products(name);

-- Stock Items Table (product inventory per branch)
CREATE TABLE stock_items (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_price DECIMAL(15,2) NOT NULL, -- Average cost
    last_stock_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_product_per_branch UNIQUE (product_id, branch_id)
);

CREATE INDEX idx_stock_branch ON stock_items(branch_id);
CREATE INDEX idx_stock_product ON stock_items(product_id);

-- Serial Numbers Table (for serialized products)
CREATE TABLE serial_numbers (
    id SERIAL PRIMARY KEY,
    stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_stock' 
        CHECK (status IN ('in_stock', 'sold', 'transferred', 'returned', 'defective')),
    purchase_id INTEGER, -- References purchases(id), added later
    sale_id INTEGER,     -- References sales(id), added later
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_serial_numbers_serial ON serial_numbers(serial_number);
CREATE INDEX idx_serial_numbers_stock_item ON serial_numbers(stock_item_id);
CREATE INDEX idx_serial_numbers_status ON serial_numbers(status);

-- ============================================================================
-- TRANSACTION TABLES - PURCHASES
-- ============================================================================

-- Purchases Table (Header)
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'partial', 'paid')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_number ON purchases(purchase_number);
CREATE INDEX idx_purchases_branch ON purchases(branch_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_status ON purchases(payment_status);

-- Purchase Items Table (Line Items)
CREATE TABLE purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product ON purchase_items(product_id);

-- ============================================================================
-- TRANSACTION TABLES - SALES
-- ============================================================================

-- Sales Table (Header)
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL, -- NULL for walk-ins
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL 
        CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'credit', 'bank_transfer')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'paid' 
        CHECK (payment_status IN ('paid', 'partial', 'pending')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_number ON sales(sale_number);
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_status ON sales(payment_status);

-- Sale Items Table (Line Items)
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    cost_price DECIMAL(15,2) NOT NULL, -- For profit calculation
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ============================================================================
-- TRANSACTION TABLES - RETURNS (to suppliers)
-- ============================================================================

-- Returns Table (Header)
CREATE TABLE returns (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_returns_number ON returns(return_number);
CREATE INDEX idx_returns_branch ON returns(branch_id);
CREATE INDEX idx_returns_supplier ON returns(supplier_id);
CREATE INDEX idx_returns_purchase ON returns(purchase_id);
CREATE INDEX idx_returns_date ON returns(return_date);

-- Return Items Table (Line Items)
CREATE TABLE return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_return_items_return ON return_items(return_id);
CREATE INDEX idx_return_items_product ON return_items(product_id);

-- ============================================================================
-- TRANSACTION TABLES - REFUNDS (from customers)
-- ============================================================================

-- Refunds Table (Header)
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    refund_number VARCHAR(50) UNIQUE NOT NULL,
    refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    refund_method VARCHAR(20) NOT NULL 
        CHECK (refund_method IN ('cash', 'card', 'mobile_money', 'credit', 'bank_transfer')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refunds_number ON refunds(refund_number);
CREATE INDEX idx_refunds_branch ON refunds(branch_id);
CREATE INDEX idx_refunds_customer ON refunds(customer_id);
CREATE INDEX idx_refunds_sale ON refunds(sale_id);
CREATE INDEX idx_refunds_date ON refunds(refund_date);

-- Refund Items Table (Line Items)
CREATE TABLE refund_items (
    id SERIAL PRIMARY KEY,
    refund_id INTEGER NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refund_items_refund ON refund_items(refund_id);
CREATE INDEX idx_refund_items_product ON refund_items(product_id);

-- ============================================================================
-- TRANSACTION TABLES - TRANSFERS
-- ============================================================================

-- Transfers Table (Header)
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    from_branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    to_branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_transit', 'received', 'rejected')),
    sent_at TIMESTAMP,
    received_at TIMESTAMP,
    received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_branches CHECK (from_branch_id != to_branch_id)
);

CREATE INDEX idx_transfers_number ON transfers(transfer_number);
CREATE INDEX idx_transfers_from_branch ON transfers(from_branch_id);
CREATE INDEX idx_transfers_to_branch ON transfers(to_branch_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_date ON transfers(transfer_date);

-- Transfer Items Table (Line Items)
CREATE TABLE transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_price DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_product ON transfer_items(product_id);

-- ============================================================================
-- EXPENSE TRACKING
-- ============================================================================

-- Expenses Table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- rent, utilities, salaries, transport, etc
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(20) NOT NULL 
        CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'cheque')),
    receipt_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_number ON expenses(expense_number);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS FOR SERIAL NUMBERS
-- (Added after tables are created to avoid circular dependencies)
-- ============================================================================

ALTER TABLE serial_numbers 
    ADD CONSTRAINT fk_serial_purchase 
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL;

ALTER TABLE serial_numbers 
    ADD CONSTRAINT fk_serial_sale 
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_serial_numbers_updated_at BEFORE UPDATE ON serial_numbers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON transfers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USEFUL VIEWS FOR REPORTING
-- ============================================================================

-- Current stock levels with product details
CREATE VIEW v_current_stock AS
SELECT 
    s.id,
    b.name AS branch_name,
    b.code AS branch_code,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    s.quantity,
    p.requires_serial,
    s.cost_price,
    p.selling_price,
    (p.selling_price - s.cost_price) AS potential_profit_per_unit,
    p.reorder_level,
    CASE 
        WHEN s.quantity <= p.reorder_level THEN 'LOW STOCK'
        WHEN s.quantity = 0 THEN 'OUT OF STOCK'
        ELSE 'OK'
    END AS stock_status,
    s.last_stock_date
FROM stock_items s
JOIN products p ON s.product_id = p.id
JOIN branches b ON s.branch_id = b.id
JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- Sales summary by date and branch
CREATE VIEW v_sales_summary AS
SELECT 
    s.sale_date,
    b.name AS branch_name,
    COUNT(s.id) AS total_sales,
    SUM(s.grand_total) AS total_revenue,
    SUM(si.cost_price * si.quantity) AS total_cost,
    SUM(s.grand_total) - SUM(si.cost_price * si.quantity) AS total_profit,
    AVG(s.grand_total) AS average_sale_value
FROM sales s
JOIN branches b ON s.branch_id = b.id
JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.sale_date, b.name;

-- Product profitability analysis
CREATE VIEW v_product_profitability AS
SELECT 
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    COUNT(DISTINCT si.sale_id) AS times_sold,
    SUM(si.quantity) AS total_quantity_sold,
    SUM(si.total_price) AS total_revenue,
    SUM(si.cost_price * si.quantity) AS total_cost,
    SUM(si.total_price - (si.cost_price * si.quantity)) AS total_profit,
    AVG(si.unit_price - si.cost_price) AS avg_profit_per_unit
FROM sale_items si
JOIN products p ON si.product_id = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY p.sku, p.name, c.name
ORDER BY total_profit DESC;

-- Low stock alert view
CREATE VIEW v_low_stock_alerts AS
SELECT 
    b.name AS branch_name,
    p.sku,
    p.name AS product_name,
    s.quantity AS current_quantity,
    p.reorder_level,
    (p.reorder_level - s.quantity) AS shortage,
    s.last_stock_date
FROM stock_items s
JOIN products p ON s.product_id = p.id
JOIN branches b ON s.branch_id = b.id
WHERE s.quantity <= p.reorder_level 
  AND p.is_active = true
ORDER BY (p.reorder_level - s.quantity) DESC;

-- Serial number tracking view
CREATE VIEW v_serial_number_status AS
SELECT 
    sn.serial_number,
    p.sku,
    p.name AS product_name,
    b.name AS branch_name,
    sn.status,
    sn.created_at AS registered_date,
    CASE 
        WHEN sn.purchase_id IS NOT NULL THEN pur.purchase_number
        ELSE NULL
    END AS purchase_reference,
    CASE 
        WHEN sn.sale_id IS NOT NULL THEN sal.sale_number
        ELSE NULL
    END AS sale_reference
FROM serial_numbers sn
JOIN stock_items si ON sn.stock_item_id = si.id
JOIN products p ON si.product_id = p.id
JOIN branches b ON si.branch_id = b.id
LEFT JOIN purchases pur ON sn.purchase_id = pur.id
LEFT JOIN sales sal ON sn.sale_id = sal.id;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE products IS 'Master product catalog. requires_serial flag determines if individual serial tracking is needed';
COMMENT ON TABLE stock_items IS 'Branch-specific inventory levels. For serialized items, quantity should match count of serial_numbers with status=in_stock';
COMMENT ON TABLE serial_numbers IS 'Individual serial number tracking for high-value items like phones, laptops';
COMMENT ON TABLE transfers IS 'Inter-branch stock transfers with status tracking';
COMMENT ON COLUMN products.requires_serial IS 'When TRUE, each unit must have a unique serial number in serial_numbers table';
COMMENT ON COLUMN stock_items.quantity IS 'For non-serialized: actual count. For serialized: should match count of related serial_numbers';
COMMENT ON COLUMN stock_items.cost_price IS 'Average cost price for the product at this branch';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
