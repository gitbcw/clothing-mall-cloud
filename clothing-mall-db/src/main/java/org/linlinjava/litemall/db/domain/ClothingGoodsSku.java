package org.linlinjava.litemall.db.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 商品 SKU 实体类（颜色+尺码组合）
 * 支持独立 SKU 库、AI 识别
 *
 * 注意：SKU 的 status 仅表示「可用/不可用」
 * 上架/下架是「商品」的行为，不是 SKU 的
 */
public class ClothingGoodsSku {
    public static final Boolean IS_DELETED = true;
    public static final Boolean NOT_DELETED = false;

    // SKU 状态常量（可用性，非上架状态）
    public static final String STATUS_ACTIVE = "active";     // 可用
    public static final String STATUS_INACTIVE = "inactive"; // 停用（尺码停产、质量问题等）

    private Integer id;
    private Integer goodsId;          // 商品ID（必填，SKU 必须关联商品）
    private String status;            // 状态：active(可用)/inactive(停用)
    private Integer categoryId;       // 分类ID
    private String brand;             // 品牌
    private String name;              // SKU名称（AI识别结果）
    private String brief;             // 简介
    private String material;          // 材质
    private String season;            // 季节
    private String style;             // 风格标签
    private Boolean aiRecognized;     // 是否AI识别录入
    private BigDecimal aiConfidence;  // AI识别置信度
    private String sourceImage;       // 源图片（拍照图片）
    private String skuCode;
    private String color;
    private String colorImage;
    private String size;
    private BigDecimal price;
    private Integer stock;
    private String imageUrl;
    private String barCode;
    private Boolean isDefault;
    private Boolean deleted;
    private LocalDateTime addTime;
    private LocalDateTime updateTime;

    // 关联查询字段
    private String goodsName;
    private String goodsImageUrl;
    private String categoryName;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getGoodsId() {
        return goodsId;
    }

    public void setGoodsId(Integer goodsId) {
        this.goodsId = goodsId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Integer categoryId) {
        this.categoryId = categoryId;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBrief() {
        return brief;
    }

    public void setBrief(String brief) {
        this.brief = brief;
    }

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public String getSeason() {
        return season;
    }

    public void setSeason(String season) {
        this.season = season;
    }

    public String getStyle() {
        return style;
    }

    public void setStyle(String style) {
        this.style = style;
    }

    public Boolean getAiRecognized() {
        return aiRecognized;
    }

    public void setAiRecognized(Boolean aiRecognized) {
        this.aiRecognized = aiRecognized;
    }

    public BigDecimal getAiConfidence() {
        return aiConfidence;
    }

    public void setAiConfidence(BigDecimal aiConfidence) {
        this.aiConfidence = aiConfidence;
    }

    public String getSourceImage() {
        return sourceImage;
    }

    public void setSourceImage(String sourceImage) {
        this.sourceImage = sourceImage;
    }

    public String getSkuCode() {
        return skuCode;
    }

    public void setSkuCode(String skuCode) {
        this.skuCode = skuCode;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getColorImage() {
        return colorImage;
    }

    public void setColorImage(String colorImage) {
        this.colorImage = colorImage;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getBarCode() {
        return barCode;
    }

    public void setBarCode(String barCode) {
        this.barCode = barCode;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public void setIsDefault(Boolean isDefault) {
        this.isDefault = isDefault;
    }

    public Boolean getDeleted() {
        return deleted;
    }

    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
    }

    public LocalDateTime getAddTime() {
        return addTime;
    }

    public void setAddTime(LocalDateTime addTime) {
        this.addTime = addTime;
    }

    public LocalDateTime getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(LocalDateTime updateTime) {
        this.updateTime = updateTime;
    }

    public String getGoodsName() {
        return goodsName;
    }

    public void setGoodsName(String goodsName) {
        this.goodsName = goodsName;
    }

    public String getGoodsImageUrl() {
        return goodsImageUrl;
    }

    public void setGoodsImageUrl(String goodsImageUrl) {
        this.goodsImageUrl = goodsImageUrl;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }
}
