package org.linlinjava.litemall.db.domain;

import java.time.LocalDateTime;

public class ClothingGoodsScene {
    private Integer id;
    private Integer goodsId;
    private Integer sceneId;
    private LocalDateTime addTime;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getGoodsId() { return goodsId; }
    public void setGoodsId(Integer goodsId) { this.goodsId = goodsId; }
    public Integer getSceneId() { return sceneId; }
    public void setSceneId(Integer sceneId) { this.sceneId = sceneId; }
    public LocalDateTime getAddTime() { return addTime; }
    public void setAddTime(LocalDateTime addTime) { this.addTime = addTime; }
}
