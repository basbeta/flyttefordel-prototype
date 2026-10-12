// CR-020: Single source of truth for valid event types and channels.
// Existing values are unchanged because adminQueries groups on them.

export const EVENT_TYPES = [
  'benefit_viewed',
  'benefit_opened',
  'benefit_selected',
  'code_revealed',
  'code_copied',
  'qr_opened',
  'external_link_clicked',
  'lead_form_started',
  'lead_submitted',
  'benefit_saved',
  'benefit_unsaved',
  'hero_clicked',
] as const

export type TrackableEventType = (typeof EVENT_TYPES)[number]

// 'web' and 'email' are reserved, no code uses them yet.
export const CHANNELS = ['web', 'app', 'email'] as const
export type Channel = (typeof CHANNELS)[number]
export const DEFAULT_CHANNEL: Channel = 'app'

export const MAX_TRACKING_STRING_LENGTH = 64

export function isTrackableEventType(value: unknown): value is TrackableEventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value)
}

export function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && (CHANNELS as readonly string[]).includes(value)
}
