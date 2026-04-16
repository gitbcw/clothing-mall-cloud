/**
 * 商品分享海报生成（浏览器端 Canvas）
 *
 * 流程：Canvas 绘制 → toBlob → 供 cloudUploadFile 上传
 */
import app from './cloudbase'

const COS_BASE = `https://636c-${process.env.VUE_APP_CLOUDBASE_ENV}-1258700476.tcb.qcloud.la/`

/**
 * 生成商品分享海报
 * @param {Object} goods - { picUrl, name, retailPrice, specialPrice }
 * @returns {Promise<Blob>}
 */
export async function generateGoodsPoster(goods) {
  const W = 750
  const H = 1000
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // 背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // 加载商品主图
  const imgUrl = await resolveImageUrl(goods.picUrl)
  if (!imgUrl) throw new Error('商品图片为空，无法生成海报')
  const img = await loadImage(imgUrl)

  // 商品图（居中裁剪，上边距 50）
  drawImageCover(ctx, img, { x: 50, y: 50, w: W - 100, h: 540 })

  // 底部渐变遮罩，让图片底部到文字有过渡
  const grad = ctx.createLinearGradient(0, 480, 0, 600)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 480, W, 120)

  // 商品名称（最多 2 行）
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  wrapText(ctx, goods.name || '', 50, 660, W - 100, 50, 2)

  // 价格区域
  let priceY = 790
  if (goods.specialPrice && parseFloat(goods.specialPrice) > 0) {
    // 一口价（划线）
    ctx.fillStyle = '#999999'
    ctx.font = '28px "PingFang SC", sans-serif'
    const retailText = `一口价 ¥${goods.retailPrice}`
    ctx.fillText(retailText, 50, priceY)
    const tw = ctx.measureText(retailText).width
    ctx.strokeStyle = '#999999'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(50, priceY - 10)
    ctx.lineTo(50 + tw, priceY - 10)
    ctx.stroke()

    // 特卖价
    ctx.fillStyle = '#e4393c'
    ctx.font = 'bold 48px "PingFang SC", sans-serif'
    ctx.fillText(`¥${goods.specialPrice}`, 50, priceY + 58)
  } else {
    ctx.fillStyle = '#e4393c'
    ctx.font = 'bold 48px "PingFang SC", sans-serif'
    ctx.fillText(`¥${goods.retailPrice}`, 50, priceY)
  }

  // 底部分割线
  ctx.strokeStyle = '#eeeeee'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(50, H - 80)
  ctx.lineTo(W - 50, H - 80)
  ctx.stroke()

  // 底部提示
  ctx.fillStyle = '#bbbbbb'
  ctx.font = '24px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('长按保存图片，分享给好友', W / 2, H - 35)

  // 输出 Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('海报生成失败'))),
      'image/jpeg',
      0.92
    )
  })
}

// ---- 工具函数 ----

/**
 * 将云存储路径解析为可访问的 HTTP URL
 */
async function resolveImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // cloud:// 协议 → getTempFileURL
  if (path.startsWith('cloud://')) {
    try {
      const res = await app.getTempFileURL({ fileList: [path] })
      const item = res.fileList && res.fileList[0]
      if (item && item.tempFileURL) return item.tempFileURL
    } catch (e) {
      console.warn('[poster] getTempFileURL failed:', e)
    }
  }
  // 相对路径 uploads/xxx.jpg → 拼接 COS_BASE
  return COS_BASE + path
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('商品图片加载失败'))
    img.src = src
  })
}

/** 等价于 object-fit: cover */
function drawImageCover(ctx, img, area) {
  const { x, y, w, h } = area
  const imgRatio = img.width / img.height
  const areaRatio = w / h
  let sx, sy, sw, sh
  if (imgRatio > areaRatio) {
    sh = img.height; sw = sh * areaRatio
    sx = (img.width - sw) / 2; sy = 0
  } else {
    sw = img.width; sh = sw / areaRatio
    sx = 0; sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/** 文字自动换行，超 maxLines 截断加省略号 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  let line = ''
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const test = line + text[i]
    if (ctx.measureText(test).width > maxWidth) {
      count++
      if (count >= maxLines) {
        ctx.fillText(line.slice(0, -1) + '…', x, y)
        return
      }
      ctx.fillText(line, x, y)
      line = text[i]
      y += lineHeight
    } else {
      line = test
    }
  }
  ctx.fillText(line, x, y)
}
