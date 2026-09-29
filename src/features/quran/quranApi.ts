import { load, save } from '../../lib/storage'

// Quran text from api.alquran.cloud (free, no key, CORS-enabled). The service
// worker caches every response, so surahs opened once — or everything, after
// "Offline Quran" — keep working without a connection.

export const QURAN_API = 'https://api.alquran.cloud/v1'

export type SurahMeta = { number: number; name: string; englishName: string; englishNameTranslation: string; numberOfAyahs: number; revelationType: string }
export type Ayah = { number: number; numberInSurah: number; juz: number; arabic: string; transliteration: string; translation: string }
export type SurahText = { meta: SurahMeta; ayahs: Ayah[] }

export async function fetchSurahList(): Promise<SurahMeta[]> {
  const cached = load<SurahMeta[] | null>('quran_surahs_v1', null)
  if (cached?.length === 114) return cached
  const j = await (await fetch(`${QURAN_API}/surah`)).json()
  const list = j.data as SurahMeta[]
  save('quran_surahs_v1', list)
  return list
}

export const surahUrl = (n: number) => `${QURAN_API}/surah/${n}/editions/quran-uthmani,en.transliteration,en.sahih`

export async function fetchSurah(n: number): Promise<SurahText> {
  const res = await fetch(surahUrl(n))
  if (!res.ok) throw new Error('Could not load this surah')
  type Edition = SurahMeta & { ayahs: { number: number; numberInSurah: number; juz: number; text: string }[] }
  const [ar, tr, en] = (await res.json()).data as Edition[]
  return {
    meta: { number: ar.number, name: ar.name, englishName: ar.englishName, englishNameTranslation: ar.englishNameTranslation, numberOfAyahs: ar.numberOfAyahs, revelationType: ar.revelationType },
    ayahs: ar.ayahs.map((a, i) => ({
      number: a.number,
      numberInSurah: a.numberInSurah,
      juz: a.juz,
      // The first ayah of most surahs carries the Basmala in this edition; it is shown separately.
      arabic: n !== 1 && n !== 9 && i === 0 ? a.text.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '') : a.text,
      transliteration: tr.ayahs[i]?.text ?? '',
      translation: en.ayahs[i]?.text ?? '',
    })),
  }
}

/** Mishary Alafasy recitation, by global ayah number. */
export const ayahAudio = (globalNumber: number) => `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNumber}.mp3`

// ---- Bookmarks and last read (this device) ----

export type Bookmark = { surah: number; surahName: string; ayah: number; globalNumber: number; savedAt: number; note?: string }
const BM_KEY = 'quran_bookmarks_v1'
const LAST_KEY = 'quran_last_read_v1'

export const getBookmarks = () => load<Bookmark[]>(BM_KEY, [])
export function toggleBookmark(b: Omit<Bookmark, 'savedAt'>): boolean {
  const list = getBookmarks()
  const exists = list.some((x) => x.globalNumber === b.globalNumber)
  save(BM_KEY, exists ? list.filter((x) => x.globalNumber !== b.globalNumber) : [{ ...b, savedAt: Date.now() }, ...list])
  return !exists
}
export function removeBookmark(globalNumber: number) {
  save(BM_KEY, getBookmarks().filter((x) => x.globalNumber !== globalNumber))
}

export type LastRead = { surah: number; surahName: string; ayah: number }
export const getLastRead = () => load<LastRead | null>(LAST_KEY, null)
export const setLastRead = (l: LastRead) => save(LAST_KEY, l)
