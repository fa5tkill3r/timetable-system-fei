export interface TimeSlot {
  from: string
  to: string
  index: number
}

export interface CalendarEvent {
  id: number | null
  day: string | null
  start_time: string | null
  end_time: string | null
  start_index?: number
  title: string
  shortcut: string
  color: string
  room_id?: number | null
  room_name?: string | null
  subject_id?: number | null
  event_type?: number | null
  duration?: number
  original_eventId?: number | null
  weeks_bitmask: number
}
