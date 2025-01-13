export interface TimetableActivity {
    id: number
    name: string
    start: string
    end: string
    length: number
    color: string
    shortName: string
}

export interface Requirement {
    type: 'Osobná' | 'Predmetová'
    subject: string
    createdAt: string
}

export enum RequirementType {
    Personal = 'Personal',
    Subject = 'Subject',
}

export interface Subject {
    id: number
    name: string
    shortName: string
    code: string
    color: string
}

export interface Equipment {
    id: number
    name: string
}

export interface RoomType {
    id: number
    name: string
}

export interface Room {
    id: number
    name: string
    capacity: number
    roomType: RoomType
    equipment: Equipment[]
}