import { CSSProperties } from 'vue'

export interface TimeSlot {
  from: string
  to: string
  index: number
}

export interface TimeConfig {
  SLOT_COUNT: number
  SLOT_DURATION: number
  BREAK_DURATION: number
  START_HOUR: number
  START_MINUTE: number
}

export interface TimetableConfig {
  CELL_WIDTH: number
  CELL_HEIGHT: number
  HEADER_HEIGHT: number
  DAY_COLUMN_WIDTH: number
}

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  SLOT_COUNT: 12,
  SLOT_DURATION: 50,
  BREAK_DURATION: 10,
  START_HOUR: 8,
  START_MINUTE: 0
}

export const DEFAULT_TIMETABLE_CONFIG: TimetableConfig = {
  CELL_WIDTH: 120,
  CELL_HEIGHT: 60,
  HEADER_HEIGHT: 40,
  DAY_COLUMN_WIDTH: 100
}

export const COMPACT_TIMETABLE_CONFIG: TimetableConfig = {
  CELL_WIDTH: 80,
  CELL_HEIGHT: 50,
  HEADER_HEIGHT: 40,
  DAY_COLUMN_WIDTH: 100
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function generateTimeSlots(config: TimeConfig = DEFAULT_TIME_CONFIG): TimeSlot[] {
  const slots: TimeSlot[] = []
  let currentHour = config.START_HOUR
  let currentMinute = config.START_MINUTE

  for (let i = 0; i < config.SLOT_COUNT; i++) {
    const fromHour = currentHour.toString().padStart(2, '0')
    const fromMinute = currentMinute.toString().padStart(2, '0')
    const from = `${fromHour}:${fromMinute}`

    let endHour = currentHour
    let endMinute = currentMinute + config.SLOT_DURATION

    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60)
      endMinute = endMinute % 60
    }

    const toHour = endHour.toString().padStart(2, '0')
    const toMinute = endMinute.toString().padStart(2, '0')
    const to = `${toHour}:${toMinute}`

    slots.push({ from, to, index: i })

    currentMinute += config.SLOT_DURATION + config.BREAK_DURATION
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60)
      currentMinute = currentMinute % 60
    }
  }

  return slots
}

export function getBaseTimetableStyles(days: string[], timeSlots: TimeSlot[], config: TimetableConfig) {
  const getHeaderStyle = (index: number): CSSProperties => {
    return {
      position: 'absolute',
      left: `${config.DAY_COLUMN_WIDTH + config.CELL_WIDTH * index}px`,
      top: '0',
      width: `${config.CELL_WIDTH}px`,
      height: `${config.HEADER_HEIGHT}px`,
      borderRight: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      boxSizing: 'border-box',
    }
  }

  const getDayStyle = (index: number): CSSProperties => {
    return {
      position: 'absolute',
      left: '0',
      top: `${config.HEADER_HEIGHT + config.CELL_HEIGHT * index}px`,
      width: `${config.DAY_COLUMN_WIDTH}px`,
      height: `${config.CELL_HEIGHT}px`,
      borderRight: '1px solid #e0e0e0',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      boxSizing: 'border-box',
      fontWeight: 'bold',
    }
  }

  const cornerCellStyle: CSSProperties = {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${config.DAY_COLUMN_WIDTH}px`,
    height: `${config.HEADER_HEIGHT}px`,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
    boxSizing: 'border-box',
  }

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: `${config.DAY_COLUMN_WIDTH + config.CELL_WIDTH * timeSlots.length}px`,
    height: `${config.HEADER_HEIGHT + config.CELL_HEIGHT * days.length}px`,
    border: '1px solid #e0e0e0',
    borderBottom: 'none',
    borderRight: 'none',
    fontFamily: 'Arial, sans-serif',
  }

  return {
    getHeaderStyle,
    getDayStyle,
    cornerCellStyle,
    containerStyle,
  }
}
