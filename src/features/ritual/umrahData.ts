// Canonical Umrah checklist (lib/src/features/ritual/data/umrah_checklist_data.dart).

export type ItemType = 'fard' | 'wajib' | 'sunnah'
export type TrackStage = 'tawaf' | 'sai' | 'halq'

export type ChecklistItem = {
  id: string
  title: string
  arabic?: string
  description?: string
  type: ItemType
  trackingStage?: TrackStage
}

export type Phase = { id: string; name: string; arabic: string; description: string; items: ChecklistItem[] }

export const UMRAH_PHASES: Phase[] = [
  {
    id: 'umrah_ihram',
    name: 'Ihram',
    arabic: 'الإحرام',
    description: 'Enter the state of Ihram before reaching the Miqat.',
    items: [
      {
        id: 'umrah_ihram_ghusl',
        title: 'Perform Ghusl and wear the Ihram garments',
        description: 'Cleanse yourself and put on the two white unstitched cloths (men). Women may wear ordinary modest clothing.',
        type: 'sunnah',
      },
      {
        id: 'umrah_ihram_niyyah',
        title: 'Make the intention (Niyyah) for Umrah',
        arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً',
        description: 'Form the intention to perform Umrah for the sake of Allah.',
        type: 'fard',
      },
      {
        id: 'umrah_ihram_talbiyah',
        title: 'Recite the Talbiyah',
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ',
        description: 'Begin reciting the Talbiyah frequently until you start Tawaf.',
        type: 'wajib',
      },
    ],
  },
  {
    id: 'umrah_tawaf',
    name: 'Tawaf',
    arabic: 'الطواف',
    description: 'Circle the Kaaba seven times, beginning at the Black Stone.',
    items: [
      {
        id: 'umrah_tawaf_perform',
        title: 'Perform Tawaf — 7 circuits around the Kaaba',
        arabic: 'الطواف',
        description: 'Complete seven circuits counter-clockwise, starting and ending at the Black Stone (Hajar al-Aswad).',
        type: 'fard',
        trackingStage: 'tawaf',
      },
      {
        id: 'umrah_tawaf_prayer',
        title: "Pray two rak'ah behind Maqam Ibrahim",
        description: 'After Tawaf, offer two units of prayer behind the Station of Ibrahim if possible, otherwise anywhere in the mosque.',
        type: 'sunnah',
      },
      { id: 'umrah_tawaf_zamzam', title: 'Drink Zamzam water', type: 'sunnah' },
    ],
  },
  {
    id: 'umrah_sai',
    name: "Sa'i",
    arabic: 'السعي',
    description: 'Walk seven times between the hills of Safa and Marwah.',
    items: [
      {
        id: 'umrah_sai_perform',
        title: "Perform Sa'i — 7 trips between Safa and Marwah",
        arabic: 'السعي',
        description: 'Begin at Safa and end at Marwah. Each one-way trip counts as one, for a total of seven.',
        type: 'fard',
        trackingStage: 'sai',
      },
    ],
  },
  {
    id: 'umrah_halq',
    name: 'Halq / Taqsir',
    arabic: 'الحلق أو التقصير',
    description: 'Shave or trim the hair to exit the state of Ihram.',
    items: [
      {
        id: 'umrah_halq_perform',
        title: 'Shave (Halq) or trim (Taqsir) the hair',
        arabic: 'الحلق أو التقصير',
        description: 'Men shave or trim all around; women trim a fingertip length. This completes the Umrah.',
        type: 'wajib',
        trackingStage: 'halq',
      },
      {
        id: 'umrah_complete_exit',
        title: 'Exit Ihram — your Umrah is complete',
        description: 'The restrictions of Ihram are now lifted. May Allah accept your Umrah.',
        type: 'sunnah',
      },
    ],
  },
]

export const ALL_ITEMS = UMRAH_PHASES.flatMap((p) => p.items)
