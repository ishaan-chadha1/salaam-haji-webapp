/** Build-time feature flags (lib/src/core/util/feature_flags.dart). */
export const FeatureFlags = {
  /** Hajj rituals are parked for the Umrah-focused pilot. */
  hajjEnabled: false,
  /** Food and transport ordering, paused for the pilot: Home tiles show
   *  "Coming soon", the carousel shows announcements, and /food, /transport
   *  and /orders go to Home. Nothing is deleted. */
  ordersEnabled: false,
  /** Require 15-120 m from the Kaaba to start Tawaf. Off for testing. */
  enforceTawafProximity: false,
  /** Require 120 m of Safa or Marwah to start Sa'i. Off for testing. */
  enforceSaiProximity: false,
} as const
