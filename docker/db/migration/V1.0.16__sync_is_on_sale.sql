-- 一次性同步：确保 is_on_sale 与 status 一致
-- status='published' -> is_on_sale=1
-- 其他 status -> is_on_sale=0
UPDATE litemall_goods SET is_on_sale = 1 WHERE status = 'published' AND (is_on_sale = 0 OR is_on_sale IS NULL);
UPDATE litemall_goods SET is_on_sale = 0 WHERE status != 'published' AND (is_on_sale = 1 OR is_on_sale IS NULL);
