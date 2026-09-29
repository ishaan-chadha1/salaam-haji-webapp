import { describe, expect, test } from 'vitest'
import { normalizeWhitespace, parseSharedDua, shareText } from './duaRepo'

// Port of test/dua_shared_text_parser_test.dart.

describe('parseSharedDua', () => {
  test('parses Salaam Haji WhatsApp shape', () => {
    const raw = `
Morning praise (brief)
أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ

Asbahnaa wa asbahal-mulku lillaah walhamdu lillaah laa ilaaha illallaahu wahdahu laa shareeka lah.

We have reached the morning and kingship belongs to Allah; all praise is for Allah; there is none worthy of worship except Allah alone, without partner.

— Shared from Salaam Haji
`
    const p = parseSharedDua(raw)!
    expect(p.title).toBe('Morning praise (brief)')
    expect(p.arabicText).toContain('أَصْبَحْنَا')
    expect(p.transliteration).toContain('Asbahnaa')
    expect(p.translation).toContain('We have reached')
  })

  test('strips forwarded noise', () => {
    const p = parseSharedDua(`
Forwarded from Friend
Morning praise
الْحَمْدُ لِلَّهِ

Alhamdu lillaah.

All praise is for Allah.

— Shared from Salaam Haji
`)!
    expect(p.title).toBe('Morning praise')
  })

  test('extracts Note line into notes', () => {
    const p = parseSharedDua(`
My dua
الْحَمْدُ لِلَّهِ

Alhamdu lillaah.

Praise Allah.

Note: make dua for my family

— Shared from Salaam Haji
`)!
    expect(p.notes).toContain('make dua for my family')
    expect(p.translation ?? '').not.toContain('Note:')
  })

  test('normalizeWhitespace strips BOM', () => {
    expect(normalizeWhitespace('﻿Hello\nworld')).toBe('Hello\nworld')
  })

  test('latin-only two lines → title + translation', () => {
    const p = parseSharedDua('Title only line\nRest is translation body.')!
    expect(p.title).toBe('Title only line')
    expect(p.translation).toBe('Rest is translation body.')
  })

  test('arabic-first line uses derived title', () => {
    const p = parseSharedDua(`
الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ

Alhamdu lillaahi rabbil-'aalameen.

Praise be to Allah.
`)!
    expect(p.arabicText).toContain('الْحَمْدُ')
    expect(p.title.length).toBeGreaterThan(0)
  })

  test('our own share text round-trips', () => {
    const text = shareText({ title: 'Entering the masjid', arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', transliteration: 'Allaahum-maf-tah lee abwaaba rahmatika.', translation: 'O Allah, open for me the doors of Your mercy.', notes: 'for Ammi' })
    const p = parseSharedDua(text)!
    expect(p.title).toBe('Entering the masjid')
    expect(p.transliteration).toBe('Allaahum-maf-tah lee abwaaba rahmatika.')
    expect(p.translation).toBe('O Allah, open for me the doors of Your mercy.')
    expect(p.notes).toBe('for Ammi')
  })
})
