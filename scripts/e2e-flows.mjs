// End-to-end: food and transport enquiries, and the API-backed screens, in
// preview mode. External APIs are answered with fixtures shaped like the
// documented responses (the test sandbox has no internet).
import { chromium } from 'playwright'

const out = process.argv[2]
const base = process.env.BASE_URL ?? 'http://localhost:4173'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({
  viewport: { width: 400, height: 860 },
  geolocation: { latitude: 21.4189, longitude: 39.8256 },
  permissions: ['geolocation'],
})
await ctx.addInitScript(() => {
  if (!localStorage.getItem('preview_user_v1'))
    localStorage.setItem('preview_user_v1', JSON.stringify({ id: 'preview-user', email: null, name: 'Ishaan', metadata: {}, isPreview: true }))
})

const json = (body) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
const today = new Date()
const dd = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
await ctx.route('https://api.aladhan.com/v1/timings/**', (r) => {
  const date = r.request().url().split('/timings/')[1].split('?')[0]
  r.fulfill(json({ code: 200, data: {
    timings: { Fajr: '04:58', Sunrise: '06:13', Dhuhr: '12:10', Asr: '15:33', Sunset: '18:07', Maghrib: '18:07', Isha: '19:37', Imsak: '04:48', Midnight: '00:10' },
    date: { readable: date, hijri: { day: '14', month: { number: 4, en: 'Rabīʿ al-thānī' }, year: '1448', weekday: { en: 'Al Thalaata' } } },
  } }))
})
await ctx.route('https://api.aladhan.com/v1/asmaAlHusna', (r) => r.fulfill(json({ code: 200, data: Array.from({ length: 99 }, (_, i) => ({ number: i + 1, name: i === 0 ? 'الرَّحْمَنُ' : 'الرَّحِيمُ', transliteration: i === 0 ? 'Ar Rahmaan' : `Name ${i + 1}`, en: { meaning: i === 0 ? 'The Beneficent' : 'Meaning' } })) })))
await ctx.route('https://open.er-api.com/v6/latest/USD', (r) => r.fulfill(json({ result: 'success', rates: { USD: 1, SAR: 3.75, INR: 83.2, GBP: 0.79, EUR: 0.92, PKR: 278 } })))
await ctx.route('https://api.alquran.cloud/v1/surah', (r) => r.fulfill(json({ data: [{ number: 1, name: 'سُورَةُ ٱلْفَاتِحَةِ', englishName: 'Al-Faatiha', englishNameTranslation: 'The Opening', numberOfAyahs: 7, revelationType: 'Meccan' }, ...Array.from({ length: 113 }, (_, i) => ({ number: i + 2, name: 'سُورَةُ', englishName: `Surah ${i + 2}`, englishNameTranslation: 'x', numberOfAyahs: 3, revelationType: 'Medinan' }))] })))
await ctx.route('https://api.alquran.cloud/v1/surah/1/**', (r) => {
  const ed = (texts) => ({ number: 1, name: 'سُورَةُ ٱلْفَاتِحَةِ', englishName: 'Al-Faatiha', englishNameTranslation: 'The Opening', numberOfAyahs: 7, revelationType: 'Meccan', ayahs: texts.map((text, i) => ({ number: i + 1, numberInSurah: i + 1, juz: 1, text })) })
  r.fulfill(json({ data: [
    ed(['بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ']),
    ed(['Bismi Allahi alrrahmani alrraheemi', 'Alhamdu lillahi rabbi alAAalameena', 'Alrrahmani alrraheemi']),
    ed(['In the name of Allah, the Entirely Merciful, the Especially Merciful.', '[All] praise is [due] to Allah, Lord of the worlds -', 'The Entirely Merciful, the Especially Merciful,']),
  ] }))
})
await ctx.route(/nominatim|tile\.openstreetmap|arcgisonline|fonts\.g/, (r) => r.abort())

const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
const step = async (label) => { await page.getByRole('button', { name: label, exact: true }).click(); await page.waitForTimeout(250) }

// --- Food enquiry ---
await page.goto(base + '/food', { waitUntil: 'networkidle' })
await page.getByText('Makkah', { exact: true }).click()
await step('Next')
const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
await page.getByLabel('Arrival').fill(iso(10))
await page.getByLabel('Departure').fill(iso(12))
await page.getByLabel('First meal (arrival day)').selectOption('lunch')
await page.getByLabel('Last meal (departure day)').selectOption('breakfast')
await page.getByRole('button', { name: 'Gold full day' }).nth(1).click()
await page.getByRole('button', { name: /^Dinner/ }).first().click()
await shot('food_meals')
await step('Next')
await page.getByLabel('Hotel name').fill('Hilton Suites')
await page.getByLabel('Hotel address').fill('Ibrahim Al Khalil St')
await page.getByRole('button', { name: 'Azizia', exact: true }).click()
await page.getByRole('button', { name: 'Use current location' }).click()
await page.getByText('Hotel District Pickup').click()
await shot('food_hotel')
await step('Next')
await shot('food_review')
await step('Next')
await page.getByLabel('WhatsApp number').fill('+966500000000')
await page.getByLabel('Email').fill('test@example.com')
await page.getByRole('button', { name: 'More People' }).click()
await page.getByLabel('I have read and accept these terms').check()
await shot('food_contact')
await page.getByRole('button', { name: /Submit enquiry/ }).click()
await page.getByText('Enquiry submitted').waitFor()
await shot('food_done')
const food = await page.evaluate(() => JSON.parse(localStorage.getItem('food_orders_v1'))[0])
console.log('food order:', food.menuTier, food.selections.length, 'meals, total SAR', food.totalAmount, 'pax', food.pax)

// --- Transport enquiry ---
await page.goto(base + '/transport', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /01.*Jeddah Airport/ }).click()
await step('Next')
await page.getByLabel('Hotel name').fill('Swissotel')
await page.getByLabel('Hotel address').fill('Abraj Al Bait')
await step('Next')
await page.getByText('Standard SUV').click()
await page.getByRole('button', { name: 'More Passengers' }).click()
await step('Next')
await page.getByLabel('Pickup date').fill(iso(10))
await page.getByLabel('Pickup time').fill('14:30')
await page.getByLabel('Airline').fill('Saudia')
await page.getByLabel('Flight number').fill('sv 123')
await shot('transport_schedule')
await step('Next')
await page.getByLabel('WhatsApp number').fill('+966500000000')
await page.getByLabel('Email').fill('test@example.com')
await page.getByLabel('I have read and accept these terms').check()
await page.getByRole('button', { name: /Submit enquiry/ }).click()
await page.getByText('Enquiry submitted').waitFor()
const tr = await page.evaluate(() => JSON.parse(localStorage.getItem('transport_orders_v1'))[0])
console.log('transport order:', tr.sectorName, tr.vehicleTypeId, tr.passengers, 'pax, SAR', tr.totalAmount, tr.airline?.flightNumber)

await page.goto(base + '/orders', { waitUntil: 'networkidle' })
await shot('orders')
await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await shot('home_with_bookings')

// --- API-backed screens ---
for (const p of ['/prayer', '/fasting', '/names', '/currency', '/quran', '/quran/1', '/qibla']) {
  await page.goto(base + p, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(p.slice(1).replace(/\//g, '_'))
}
// Tasbih count
await page.goto(base + '/tasbih', { waitUntil: 'networkidle' })
for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Count SubhanAllah' }).click()
await shot('tasbih')

// Dua: add from library, then paste import
await page.goto(base + '/dua', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'My list' }).first().click()
await page.getByRole('button', { name: 'Inbox · share' }).click()
await page.getByPlaceholder('Paste here').fill('My dua\nالْحَمْدُ لِلَّهِ\n\nAlhamdu lillaah.\n\nPraise Allah.\n\nNote: for my family\n\n— Shared from Salaam Haji')
await page.getByRole('button', { name: 'Add to my list' }).click()
await page.getByRole('button', { name: /^My list/ }).click()
await page.waitForTimeout(300)
await shot('dua_mylist')
const duas = await page.evaluate(() => JSON.parse(localStorage.getItem('user_duas_v1')).map((d) => d.title))
console.log('my duas:', duas)

// Chat
await page.goto(base + '/chat', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Dua for Ihram/ }).click()
await page.getByText('Here is a beautiful dua').waitFor()
await shot('chat')

// Dark mode + desktop
await page.goto(base + '/settings', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Dark' }).click()
await page.setViewportSize({ width: 1280, height: 860 })
await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await shot('home_dark_desktop')

console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors')
await browser.close()
