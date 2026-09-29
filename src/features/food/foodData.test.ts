import { describe, expect, test } from 'vitest'
import { goldAllDays, hasValidSelections, orderTotal, pruneToWindow, subtotals, toggleGoldDay, toggleSilverMeal, type MealPlanInput } from './foodData'
import { priceFor, VEHICLES } from '../transport/transportData'

// Rules from food_meal_rules.dart and transport_pricing.dart.

const base: MealPlanInput = {
  selections: [],
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  firstMeal: 'lunch',
  lastMeal: 'breakfast',
  cityId: 'makkah',
  isInAzizia: false,
}

describe('food meal rules', () => {
  test('Gold is only offered on full days inside the trip', () => {
    // Arrival at lunch and departure after breakfast: only the middle day is a full day.
    const sel = goldAllDays(base)
    expect(sel).toHaveLength(3)
    expect(new Set(sel.map((s) => s.date))).toEqual(new Set(['2026-10-02']))
    expect(toggleGoldDay(base, '2026-10-01')).toEqual([])
  })

  test('Silver is SAR 26 a meal, Gold SAR 60 a day, times people', () => {
    let p = { ...base, selections: toggleGoldDay(base, '2026-10-02') }
    p = { ...p, selections: toggleSilverMeal(p, '2026-10-01', 'dinner') }
    p = { ...p, selections: toggleSilverMeal(p, '2026-10-01', 'lunch') }
    expect(subtotals(p)).toEqual({ meal: 60 + 52, azizia: 0 })
    expect(orderTotal(p, 3)).toBe(336)
    expect(hasValidSelections(p)).toBe(true)
  })

  test('Azizia adds SAR 10 per Gold day plus 10 if any Silver', () => {
    let p: MealPlanInput = { ...base, isInAzizia: true }
    p = { ...p, selections: toggleGoldDay(p, '2026-10-02') }
    p = { ...p, selections: toggleSilverMeal(p, '2026-10-03', 'breakfast') }
    expect(subtotals(p).azizia).toBe(20)
  })

  test('a Silver meal on a Gold day replaces the Gold day', () => {
    let p = { ...base, selections: toggleGoldDay(base, '2026-10-02') }
    p = { ...p, selections: toggleSilverMeal(p, '2026-10-02', 'lunch') }
    expect(p.selections).toEqual([{ date: '2026-10-02', meal: 'lunch', tier: 'silver' }])
  })

  test('meals before arrival are pruned when the first meal changes', () => {
    let p = { ...base, firstMeal: 'breakfast' as const }
    p = { ...p, selections: toggleSilverMeal(p, '2026-10-01', 'breakfast') }
    expect(pruneToWindow({ ...p, firstMeal: 'dinner' })).toEqual([])
  })

  test('a first meal is required once dates are set', () => {
    const p = { ...base, firstMeal: null, selections: [{ date: '2026-10-02', meal: 'lunch' as const, tier: 'silver' as const }] }
    expect(hasValidSelections(p)).toBe(false)
  })
})

describe('transport pricing', () => {
  const sedan = VEHICLES[0]
  const van = VEHICLES.find((v) => v.id === 'van_standard')!
  test('route base for a sedan, scaled by vehicle rate', () => {
    expect(priceFor({ enquiryType: 'transfer', tourDuration: 'halfDay', routeId: 'jed_airport_to_makkah_hotel' }, sedan)).toBe(180)
    expect(priceFor({ enquiryType: 'transfer', tourDuration: 'halfDay', routeId: 'jed_airport_to_makkah_hotel' }, van)).toBe(300)
  })
  test('tours and custom trips', () => {
    expect(priceFor({ enquiryType: 'dayTour', tourDuration: 'fullDay', routeId: null }, sedan)).toBe(350)
    expect(priceFor({ enquiryType: 'custom', tourDuration: 'halfDay', routeId: null }, van)).toBe(0)
  })
})
