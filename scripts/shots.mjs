// Screenshots for manual review: node scripts/shots.mjs <outDir> <path[,path...]> [--desktop] [--dark]
import { chromium } from 'playwright'

const [outDir, paths = '/', ...flags] = process.argv.slice(2)
const desktop = flags.includes('--desktop')
const dark = flags.includes('--dark')
const base = process.env.BASE_URL ?? 'http://localhost:4173'

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy })
const ctx = await browser.newContext({
  viewport: desktop ? { width: 1280, height: 860 } : { width: 400, height: 860 },
  deviceScaleFactor: 1,
  geolocation: { latitude: 21.4225, longitude: 39.8262 },
  permissions: ['geolocation'],
  ignoreHTTPSErrors: true,
})
await ctx.addInitScript((dark) => {
  localStorage.setItem('preview_user_v1', JSON.stringify({ id: 'preview-user', email: null, name: 'Ishaan', metadata: {}, isPreview: true }))
  const s = JSON.parse(localStorage.getItem('settings_v1') || '{}')
  localStorage.setItem('settings_v1', JSON.stringify({ ...s, theme: dark ? 'dark' : 'light' }))
}, dark)
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
for (const p of paths.split(',')) {
  await page.goto(base + p, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(800)
  const name = p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'
  await page.screenshot({ path: `${outDir}/${name}${desktop ? '_desktop' : ''}${dark ? '_dark' : ''}.png`, fullPage: true })
}
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'))
await browser.close()
