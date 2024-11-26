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