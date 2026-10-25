-- Apply once to an existing PostgreSQL database before setting JPA_DDL_AUTO=validate.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;

ALTER TABLE product ADD COLUMN IF NOT EXISTS sku varchar(64);
ALTER TABLE product ADD COLUMN IF NOT EXISTS brand varchar(100);
ALTER TABLE product ADD COLUMN IF NOT EXISTS model varchar(150);
ALTER TABLE product ADD COLUMN IF NOT EXISTS warranty_months integer;
ALTER TABLE product ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE product ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;
UPDATE product SET sku = NULL WHERE sku IS NOT NULL AND btrim(sku) = '';
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_sku ON product (sku);

ALTER TABLE address ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS inventory_reserved boolean NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;
ALTER TABLE purchase_history ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_orders_status_created_at ON orders (order_status, created_at);
