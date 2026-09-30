import { AlertTriangle, BookOpen, Hand, Heart, Navigation, Sparkles } from 'lucide-react'
import { Card } from '../../../components/ui'
import { formatDistance } from '../../../lib/geo'
import type { TawafLiveInfo } from '../engine/tracker'

/** Directions to Hajar al-Aswad before lap 1 (tawaf_start_guide_card.dart). */
export function StartGuideCard({ live }: { live: TawafLiveInfo | null }) {
  const far = live && live.distanceFromCenter > 200
  return (
    <Card>
      <p className="flex items-center gap-2 font-bold text-ink">
        <Navigation className="size-5 text-gold" /> Head to the start (Hajar al-Aswad)
      </p>
      <p className="mt-1 text-sm text-muted">Lap 1 starts at the Black Stone corner. Laps are counted automatically once you reach it.</p>
      {!live ? (
        <p className="mt-3 text-sm text-ink">Finding your location…</p>
      ) : far ? (
        <p className="mt-3 text-sm text-ink">
          You are {formatDistance(live.distanceFromCenter)} from the {live.siteName}. Directions to the start appear once you are there. To try it now, end this Tawaf and turn on Demo mode on the Ritual tab.
        </p>
      ) : (
        <>
          <p className="mt-3">
            <span className={`text-4xl font-bold ${live.guidance.status === 'atStart' ? 'text-primary' : 'text-gold'}`}>{Math.round(live.guidance.metresToStart)} m</span>
            <span className="ml-2 text-sm text-muted">to the start</span>
          </p>
          <p className="mt-1 text-sm text-ink">
            {live.guidance.status === 'atStart' && 'You are at the start. Keep the Kaaba on your left and start walking — lap 1 begins as you cross the line.'}
            {live.guidance.status === 'passedStart' && `You have just passed the start. Turn around and walk back about ${Math.round(live.guidance.metresToStart)} m.`}
            {live.guidance.status === 'startAhead' && 'Keep the Kaaba on your left and walk to the start.'}
          </p>
        </>
      )}
    </Card>
  )
}

const TAKBIR_FRACTION = 0.12
const RUKN_AL_YAMANI_FRACTION = 0.75

/** Du'a for where the pilgrim is on the lap (tawaf_dua_card.dart). */
export function DuaCard({ laps, totalLaps, lapFraction }: { laps: number; totalLaps: number; lapFraction: number }) {
  if (laps >= totalLaps) return null
  if (lapFraction < TAKBIR_FRACTION) {
    return (
      <DuaContent
        highlight
        icon={<Hand />}
        heading={laps === 0 ? 'Begin at Hajar al-Aswad' : `Lap ${laps} done · at Hajar al-Aswad`}
        arabic="بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ"
        transliteration="Bismillah, Allahu Akbar"
        note="Face the Black Stone and raise your right hand towards it, then continue with the Kaaba on your left."
      />
    )
  }
  if (lapFraction >= RUKN_AL_YAMANI_FRACTION) {
    return (
      <DuaContent
        icon={<Sparkles />}
        heading="Between Rukn al-Yamani and Hajar al-Aswad"
        arabic="رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"
        transliteration="Rabbana atina fid-dunya hasanah, wa fil-akhirati hasanah, wa qina 'adhaban-nar"
        note="Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire. (Qur'an 2:201)"
      />
    )
  }
  return (
    <DuaContent
      icon={<Heart />}
      heading={`Lap ${laps + 1} of ${totalLaps}`}
      note="Remember Allah, make du'a in your own words, or recite Qur'an. There is no fixed du'a for each lap."
    />
  )
}

function DuaContent({ icon, heading, arabic, transliteration, note, highlight }: { icon: React.ReactNode; heading: string; arabic?: string; transliteration?: string; note: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-gold/60 bg-gold-soft' : ''}>
      <p className="flex items-center gap-2 font-bold text-ink [&>svg]:size-5 [&>svg]:text-gold">
        {icon} {heading}
      </p>
      {arabic && <p className="arabic mt-2 text-right text-2xl text-ink">{arabic}</p>}
      {transliteration && <p className="mt-1 text-sm text-ink italic">{transliteration}</p>}
      <p className="mt-1 text-sm text-muted">{note}</p>
    </Card>
  )
}

/** What to say during Sa'i (SaiDuaCard in sai_cards.dart): Qur'an 2:158
 *  setting off from Safa, takbir and tahlil at each hill, free du'a between.
 *  Wording to be checked by a scholar before the pilot. */
export function SaiDuaCard({ laps, totalLaps, tripFraction, heading }: { laps: number; totalLaps: number; tripFraction: number; heading: 1 | -1 }) {
  if (laps >= totalLaps) return null
  const atHill = tripFraction < 0.12
  if (atHill && laps === 0) {
    return (
      <DuaContent
        highlight
        icon={<BookOpen />}
        heading="Begin at Safa"
        arabic="إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ"
        transliteration="Innas-Safa wal-Marwata min sha'a'irillah"
        note="Indeed, Safa and Marwah are among the symbols of Allah. (Qur'an 2:158). Face the Kaaba, raise your hands and make du'a, then walk towards Marwah."
      />
    )
  }
  if (atHill) {
    return (
      <DuaContent
        highlight
        icon={<Hand />}
        heading={`Trip ${laps} done · at ${heading === 1 ? 'Safa' : 'Marwah'}`}
        arabic="اللَّهُ أَكْبَرُ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ"
        transliteration="Allahu Akbar, La ilaha illallahu wahdahu la sharika lah"
        note={`Face the Kaaba, raise your hands and make du'a, then set off on trip ${laps + 1}.`}
      />
    )
  }
  return (
    <DuaContent
      icon={<Heart />}
      heading={`Trip ${laps + 1} of ${totalLaps}`}
      note="Remember Allah and make du'a in your own words. Men walk briskly between the green lights."
    />
  )
}

export function WrongWayBanner() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-danger px-4 py-3 text-white">
      <AlertTriangle className="size-6 shrink-0" />
      <div>
        <p className="font-bold">Wrong direction</p>
        <p className="text-sm text-white/85">Tawaf goes anticlockwise — keep the Kaaba on your left.</p>
      </div>
    </div>
  )
}
