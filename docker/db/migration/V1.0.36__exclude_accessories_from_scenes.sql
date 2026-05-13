-- 饰品/首饰类商品不参与场景商品关联。
-- 清理历史关联，避免轮播场景页继续展示饰品。

DELETE cgs
FROM clothing_goods_scene cgs
JOIN litemall_goods g ON g.id = cgs.goods_id
JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
WHERE c.name = '饰品'
   OR c.name LIKE '%首饰%'
   OR c.keywords LIKE '%饰品%'
   OR c.keywords LIKE '%首饰%';

UPDATE litemall_goods g
JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
SET g.scene_tags = NULL,
    g.update_time = NOW()
WHERE c.name = '饰品'
   OR c.name LIKE '%首饰%'
   OR c.keywords LIKE '%饰品%'
   OR c.keywords LIKE '%首饰%';
