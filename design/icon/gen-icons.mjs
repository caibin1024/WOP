import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const RES = 'E:/project/WOP/android/app/src/main/res'

// ---- 哑铃几何（旋转前，中心在原点）----
// 手柄更短更粗、杠铃片更厚，整体更敦实
const handleW = 150, handleH = 20        // 手柄
const innerW = 30, innerH = 76, innerX = 100   // 内片（浅橙）
const outerW = 20, outerH = 54, outerX = 118   // 外片
const ROT = -22                              // 倾角

const dumbbell = (s, cx, cy) => `
  <g transform="translate(${cx},${cy}) scale(${s}) rotate(${ROT})">
    <!-- 手柄 + 顶部高光 -->
    <rect x="${-handleW / 2}" y="${-handleH / 2}" width="${handleW}" height="${handleH}" rx="${handleH / 2}" fill="#F97316"/>
    <rect x="${-handleW / 2 + 8}" y="${-handleH / 2 + 3}" width="${handleW - 16}" height="${handleH / 4}" rx="2" fill="#FFFFFF" opacity="0.16"/>
    <!-- 左内片 / 左外片 -->
    <rect x="${-innerX}" y="${-innerH / 2}" width="${innerW}" height="${innerH}" rx="14" fill="#FB923C"/>
    <rect x="${-outerX}" y="${-outerH / 2}" width="${outerW}" height="${outerH}" rx="10" fill="#F97316"/>
    <!-- 右内片 / 右外片 -->
    <rect x="${innerX - innerW}" y="${-innerH / 2}" width="${innerW}" height="${innerH}" rx="14" fill="#FB923C"/>
    <rect x="${outerX - outerW}" y="${-outerH / 2}" width="${outerW}" height="${outerH}" rx="10" fill="#F97316"/>
  </g>`

// 哑铃旋转后的包围盒半高/半宽（用于精确排版）
const rad = (-ROT) * Math.PI / 180
const dBoundW = outerX * Math.cos(rad) + (innerH / 2) * Math.sin(rad)   // 236 cos + 38 sin
const dBoundH = outerX * Math.sin(rad) + (innerH / 2) * Math.cos(rad)   // 236 sin + 38 cos

// ---------- 自适应前景（108dp 画布，透明底）----------
const fgMaster = 432
const fgS = 0.82
const fgCx = fgMaster / 2
const fgCy = 160
const fgFont = 76
const fgBaseline = 322
const fgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${fgMaster}" height="${fgMaster}" viewBox="0 0 ${fgMaster} ${fgMaster}">
  <defs>
    <radialGradient id="glow" cx="0.5" cy="0.44" r="0.52">
      <stop offset="0" stop-color="#F97316" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#F97316" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${fgCx}" cy="178" r="175" fill="url(#glow)"/>
  ${dumbbell(fgS, fgCx, fgCy)}
  <text x="${fgCx}" y="${fgBaseline}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="${fgFont}" font-weight="800" letter-spacing="6" fill="#EDEDEF">WOP</text>
</svg>`

// ---------- 旧版整幅图标（圆角方块，烘焙背景）----------
const legMaster = 512
const legS = 0.95
const legCx = legMaster / 2
const legCy = 194
const legFont = 92
const legBaseline = 378
const legacySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${legMaster}" height="${legMaster}" viewBox="0 0 ${legMaster} ${legMaster}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#12152B"/>
      <stop offset="1" stop-color="#05060A"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.40" r="0.55">
      <stop offset="0" stop-color="#F97316" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#F97316" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${legMaster}" height="${legMaster}" rx="115" fill="url(#bg)"/>
  <circle cx="${legCx}" cy="208" r="215" fill="url(#glow)"/>
  ${dumbbell(legS, legCx, legCy)}
  <text x="${legCx}" y="${legBaseline}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="${legFont}" font-weight="800" letter-spacing="6" fill="#EDEDEF">WOP</text>
</svg>`

// ---------- 闪屏 ----------
const splashSvg = (W, H) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0A0E27"/>
      <stop offset="1" stop-color="#05060A"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.5">
      <stop offset="0" stop-color="#F97316" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#F97316" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W / 2}" cy="${H * 0.40}" r="${Math.min(W, H) * 0.5}" fill="url(#glow)"/>
  ${dumbbell(W * 0.24 / (outerX * 2), W / 2, H * 0.40)}
  <text x="${W / 2}" y="${H * 0.57}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="${W * 0.14}" font-weight="800" letter-spacing="${W * 0.01}" fill="#EDEDEF">WOP</text>
</svg>`

async function writePng(name, svg, sizes) {
  for (const [dir, size] of sizes) {
    const p = path.join(RES, dir, name)
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(p)
  }
}

// 预览图（供 ASCII 检查）
await sharp(Buffer.from(legacySvg)).png().toFile('design/icon/_preview_legacy.png')
await sharp(Buffer.from(fgSvg)).png().toFile('design/icon/_preview_foreground.png')

await writePng('ic_launcher_foreground.png', fgSvg, [
  ['mipmap-mdpi', 108], ['mipmap-hdpi', 162], ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324], ['mipmap-xxxhdpi', 432],
])

const legSizes = [
  ['mipmap-mdpi', 48], ['mipmap-hdpi', 72], ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144], ['mipmap-xxxhdpi', 192],
]
await writePng('ic_launcher.png', legacySvg, legSizes)
await writePng('ic_launcher_round.png', legacySvg, legSizes)

const splashPort = {
  'drawable-port-mdpi': 320, 'drawable-port-hdpi': 480, 'drawable-port-xhdpi': 640,
  'drawable-port-xxhdpi': 960, 'drawable-port-xxxhdpi': 1280,
}
for (const [dir, w] of Object.entries(splashPort)) {
  const h = Math.round(w * 1.5)
  await sharp(Buffer.from(splashSvg(w, h))).png().toFile(path.join(RES, dir, 'splash.png'))
}
const splashLand = {
  'drawable-land-mdpi': 480, 'drawable-land-hdpi': 720, 'drawable-land-xhdpi': 960,
  'drawable-land-xxhdpi': 1440, 'drawable-land-xxxhdpi': 1920,
}
for (const [dir, w] of Object.entries(splashLand)) {
  const h = Math.round(w / 1.5)
  await sharp(Buffer.from(splashSvg(w, h))).png().toFile(path.join(RES, dir, 'splash.png'))
}
await sharp(Buffer.from(splashSvg(480, 320))).png().toFile(path.join(RES, 'drawable', 'splash.png'))

// 打印排版数值，便于人工核对
console.log(`dumbbell bound W=~${(dBoundW * 2 * legS).toFixed(0)} H=~${(dBoundH * 2 * legS).toFixed(0)} (legacy @ ${legS}x)`)
console.log(`legacy content: x ${(legCx - dBoundW * legS).toFixed(0)}..${(legCx + dBoundW * legS).toFixed(0)}, y ${(legCy - dBoundH * legS).toFixed(0)}..${legBaseline}`)
console.log(`fg content: x ${(fgCx - dBoundW * fgS).toFixed(0)}..${(fgCx + dBoundW * fgS).toFixed(0)}, y ${(fgCy - dBoundH * fgS).toFixed(0)}..${fgBaseline}`)
console.log('All PNGs written.')
