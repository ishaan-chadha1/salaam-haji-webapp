// Builds the install icons from the Flutter app's logo (assets/logo.png).
import sharp from 'sharp'

const src = new URL('../public/logo.png', import.meta.url).pathname
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname
const emerald = { r: 6, g: 78, b: 59, alpha: 1 }

async function padded(size, inner, file) {
  const logo = await sharp(src).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: emerald } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out(file))
}

await padded(192, 160, 'icon-192.png')
await padded(512, 424, 'icon-512.png')
// Maskable icons must keep the artwork inside the central 80% safe zone.
await padded(512, 330, 'icon-maskable-512.png')
console.log('icons written')
