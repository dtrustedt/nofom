// Quick placeholder icon generator — replace with real brand icon later
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0f6cbf'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.2)
  ctx.fill()

  // Letter N
  ctx.fillStyle = '#ffffff'
  ctx.font      = `bold ${size * 0.55}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', size / 2, size / 2)

  writeFileSync(`public/${filename}`, canvas.toBuffer('image/png'))
  console.log(`✅ Generated ${filename}`)
}

generateIcon(192, 'pwa-192x192.png')
generateIcon(512, 'pwa-512x512.png')
generateIcon(180, 'apple-touch-icon.png')
