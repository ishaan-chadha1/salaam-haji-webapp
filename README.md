# Salaam Haji — web app

The Salaam Haji app rebuilt for the browser: an installable Chrome web app (PWA)
that works on phones and desktops. It uses **the same Supabase project as the
Flutter app** ([Sirat-E-Mustaqeem-master](https://github.com/ishaan-chadha1/Sirat-E-Mustaqeem-master)),
so accounts, families, orders and dua lists are shared between the phone and the web.

## Run it

```bash
cp .env.example .env        # add your Supabase URL and anon key
npm install
npm run dev                 # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Tawaf/Sa'i counting, meal and transport pricing, dua parser) |
| `npm run icons` | Rebuild install icons from `public/logo.png` |

**Without Supabase keys** the app runs in *preview mode*: sign-in, Family and
server-side orders are off, and everything else works and saves in the browser.

## Deploy

**Vercel (set up):** import this repo at vercel.com/new, add the two
`VITE_SUPABASE_*` environment variables, and deploy. `vercel.json` handles
the build, page routing and service-worker caching. Every push to `main`
deploys automatically.

**Anywhere else:**

`npm run build` produces a static site in `dist/`. Host it anywhere that serves
static files with an SPA fallback to `index.html` (Firebase Hosting, Netlify,
Vercel, Cloudflare Pages, S3 + CloudFront). It must be served over **HTTPS**
for location, install and the service worker to work.

After deploying, in the Supabase dashboard → **Authentication → URL
Configuration**, add the site's URL to *Redirect URLs* (for Google sign-in,
email confirmation and password reset). For Google sign-in, also add it to the
authorised origins of the Google OAuth client used by Supabase.

## What's in it

| Area | Notes |
| --- | --- |
| Sign in | Email/password (with the same profile fields as the app) and Google |
| Home | Greeting, Hijri date, next prayer, upcoming bookings, all services |
| Ritual | Umrah checklist; live **Tawaf** and **Sa'i** counting; demo mode; history with route rings |
| Family | Create/join by invite code, head approves requests, live map, messages, saved places, ritual status — all realtime |
| Food / Transport | The same enquiry flows, menus, routes and prices; saved to `food_orders` / `transport_orders` |
| Quran | 114 surahs with transliteration and translation, recitation, bookmarks, last read, offline download |
| Dua | Library, "My list" checklist, share codes, send to family, paste-to-import |
| More | Adhkar, Tasbih, Qibla, 99 Names, Prayer and Fasting times, Home Finder, Currency |
| Mutawwif | Chat screen with voice typing; answers are the same built-in replies as the app (`src/features/chat/mutawwif.ts`) |

### Tawaf and Sa'i

`src/features/ritual/engine/` is a line-for-line port of the Flutter lap
counter, geometry, smoother and walk simulator, with the Flutter unit tests
ported alongside (`engine.test.ts`).

Browsers stop location updates when the screen is off or the tab is hidden, so
the tracking screen keeps the screen awake (Screen Wake Lock) and asks the
pilgrim to keep it open. A ritual interrupted by a reload comes back paused
with its laps kept.

## Differences from the phone app

- **No background tracking.** Lap counting and family location sharing run only while the page is open.
- **No offline prayer alarms.** Prayer alerts show only while the app is open.
- **Compass** needs a phone with motion sensors (iPhone asks for permission). Laptops get the Qibla bearing without live rotation.
- **Quran** comes from `api.alquran.cloud` rather than the app's downloaded SQLite database, so web bookmarks and last-read stay in the browser and are not synced with the phone.
- **Maps** use OpenStreetMap (and Esri satellite for the Haram), so no Google Maps key is needed.
- **Sa'i** counts a trip after walking 70% of the Safa–Marwah distance. The Flutter app uses a fixed 220 m, but its Safa and Marwah points are only ~188 m apart, so a single trip can never count there.

## Structure

```
src/
  lib/          Supabase client, geo maths, holy-site coordinates, storage, flags
  store/        auth, settings, location
  layout/       tab shell (bottom bar on phones, sidebar on desktop)
  components/   shared UI
  features/     one folder per area (ritual, family, food, transport, quran, …)
scripts/        icon builder and browser end-to-end checks
```
