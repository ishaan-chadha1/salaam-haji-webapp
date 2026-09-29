// End-to-end: signed-in Family screens against a fake Supabase.
// Build first with VITE_SUPABASE_URL=https://fake.supabase.co and serve on :4174.
import { chromium } from 'playwright'

const out = process.argv[2]
const base = process.env.BASE_URL ?? 'http://localhost:4174'
const ME = '11111111-1111-1111-1111-111111111111'
const WIFE = '22222222-2222-2222-2222-222222222222'
const FAM = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const now = new Date().toISOString()
const ago = (min) => new Date(Date.now() - min * 60000).toISOString()

const db = {
  family_groups: [{ id: FAM, name: 'Chadha Family', head_id: ME, invite_code: 'K7M2QX', description: null, created_at: now }],
  family_members: [
    { family_group_id: FAM, user_id: ME, name: 'Ishaan', role: 'head', joined_at: ago(900), is_location_sharing_enabled: false, last_active_at: ago(1) },
    { family_group_id: FAM, user_id: WIFE, name: 'Sara', role: 'member', joined_at: ago(800), is_location_sharing_enabled: true, last_active_at: ago(3) },
  ],
  family_join_requests: [{ id: 'req-1', family_group_id: FAM, requester_user_id: '33333333-3333-3333-3333-333333333333', requester_name: 'Ayaan', status: 'pending', created_at: ago(12) }],
  family_locations: [{ user_id: WIFE, family_group_id: FAM, latitude: 21.4231, longitude: 39.8259, accuracy: 8, timestamp: ago(2) }],
  family_progress: [{ user_id: WIFE, family_group_id: FAM, ritual_session_id: 'r1', current_stage: 'tawaf', is_active: true, last_progress_update: ago(1) }],
  family_messages: [{ id: 'm1', family_group_id: FAM, sender_id: WIFE, message: 'At gate 79, see you after Asr', message_type: 'text', metadata: null, timestamp: ago(20), read_by: [] }],
  saved_locations: [{ id: 'p1', user_id: WIFE, label: 'Hotel', category: 'home', note: 'Room 812', latitude: 21.4189, longitude: 39.8256, address: null, created_at: now, updated_at: now }],
}
const writes = []

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
await ctx.addInitScript(([uid]) => {
  const session = {
    access_token: 'fake', refresh_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: uid, aud: 'authenticated', email: 'ishaan@example.com', user_metadata: { full_name: 'Ishaan' }, app_metadata: {}, created_at: new Date().toISOString() },
  }
  localStorage.setItem('sb-fake-auth-token', JSON.stringify(session))
}, [ME])

await ctx.route(/fake\.supabase\.co/, async (route) => {
  const req = route.request()
  const url = new URL(req.url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
  const m = url.pathname.match(/\/rest\/v1\/(rpc\/)?([a-z_]+)/)
  if (!m) return route.fulfill({ status: 200, headers: cors, body: '{}' })
  const table = m[2]
  const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
  if (req.method() !== 'GET') {
    writes.push({ method: req.method(), table, body: req.postData() })
    let body = req.postDataJSON?.() ?? {}
    if (table === 'family_messages' && req.method() === 'POST') body = { id: `m${writes.length}`, ...body }
    return route.fulfill({ status: 201, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(single ? body : [body]) })
  }
  let rows = [...(db[table] ?? [])]
  for (const [k, v] of url.searchParams) {
    if (v.startsWith('eq.')) rows = rows.filter((r) => String(r[k]) === v.slice(3))
    if (v.startsWith('in.')) rows = rows.filter((r) => v.slice(4, -1).split(',').map((s) => s.replace(/"/g, '')).includes(String(r[k])))
  }
  if (table === 'family_members' && url.searchParams.get('select')?.includes('family_groups')) rows = rows.map((r) => ({ family_group_id: r.family_group_id, role: r.role, family_groups: { name: 'Chadha Family' } }))
  const body = single ? rows[0] ?? null : rows
  route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) })
})
await ctx.route(/tile\.openstreetmap|nominatim|aladhan|fonts\.g/, (r) => r.abort())

const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const shot = (n) => page.screenshot({ path: `${out}/${n}.png`, fullPage: true })

await page.goto(base + '/family', { waitUntil: 'networkidle' })
await page.getByText('K7M2QX').waitFor({ timeout: 10000 })
await page.waitForTimeout(500)
await shot('family_home')
console.log('head sees request from Ayaan:', await page.getByText('Ayaan').isVisible())
console.log('Sara shown doing Tawaf:', await page.getByText('Doing Tawaf now').isVisible())
await page.getByRole('button', { name: 'Approve' }).click()
await page.waitForTimeout(500)

await page.goto(base + '/family/chat', { waitUntil: 'networkidle' })
await page.getByText('At gate 79').waitFor()
await page.getByPlaceholder('Message your family').fill('On my way')
await page.getByRole('button', { name: 'Send' }).click()
await page.getByText('On my way').waitFor()
await shot('family_chat')

await page.goto(base + '/family/map', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await shot('family_map')

console.log('writes:')
for (const w of writes) console.log(' ', w.method, w.table, (w.body ?? '').slice(0, 140))
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors')
await browser.close()
