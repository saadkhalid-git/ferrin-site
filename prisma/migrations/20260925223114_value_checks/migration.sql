-- Guard rails the application also validates: no negative money or stock, order lines of at least one piece.
ALTER TABLE "products" ADD CONSTRAINT "products_price_nonnegative" CHECK ("price" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_quantity_nonnegative" CHECK ("quantity" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_nonnegative" CHECK ("subtotal" >= 0 AND "total" >= 0 AND "shippingCost" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_amounts_nonnegative" CHECK ("unitPrice" >= 0 AND "lineTotal" >= 0);
