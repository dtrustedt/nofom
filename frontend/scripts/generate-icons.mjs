import sharp from 'sharp'
import { readFileSync } from 'fs'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })

const svg = readFileSync('public/icon-source.svg')

const sizes = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32,  name: 'favicon-32x32.png' },
]

for (const { size, name } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/${name}`)
  console.log(`✅ Generated public/${name}`)
}
