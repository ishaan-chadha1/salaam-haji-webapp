// End-to-end: demo Tawaf from start to completion in a real browser.
import { chromium } from 'playwright'

const out = process.argv[2]
const base = process.env.BASE_URL ?? 'http://localhost:4173'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, ignoreHTTPSErrors: true })
await ctx.addInitScript(() => {
  if (!localStorage.getItem('preview_user_v1'))
    localStorage.setItem('preview_user_v1', JSON.stringify({ id: 'preview-user', email: null, name: 'Ishaan', metadata: {}, isPreview: true }))
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(base + '/ritual', { waitUntil: 'networkidle' })
await page.getByText('Demo mode').click()
await page.screenshot({ path: `${out}/ritual.png`, fullPage: true })
await page.getByText('Start Tawaf').click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/tawaf_start.png`, fullPage: true })
await page.getByRole('button', { name: 'Play demo walk' }).click()
await page.waitForTimeout(30000)
await page.screenshot({ path: `${out}/tawaf_mid.png`, fullPage: true })
await page.getByText('Congratulations!').waitFor({ timeout: 120000 })
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/tawaf_done.png`, fullPage: true })
const history = await page.evaluate(() => JSON.parse(localStorage.getItem('ritual_history_v1') || '[]'))
console.log('history laps:', history[0]?.laps, 'completion:', history[0]?.completion, 'route pts:', history[0]?.route?.length / 2)

// Sa'i demo
await page.goto(base + '/ritual', { waitUntil: 'networkidle' })
await page.getByText("Start Sa'i").click()
await page.getByRole('button', { name: 'Play demo walk' }).click()
await page.waitForTimeout(12000)
await page.screenshot({ path: `${out}/sai_mid.png`, fullPage: true })
await page.getByText('Congratulations!').waitFor({ timeout: 120000 })
const h2 = await page.evaluate(() => JSON.parse(localStorage.getItem('ritual_history_v1') || '[]'))
console.log('sai laps:', h2[0]?.laps, h2[0]?.stage)
await page.goto(base + '/ritual/history', { waitUntil: 'networkidle' })
await page.screenshot({ path: `${out}/history.png`, fullPage: true })
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
await browser.close()
