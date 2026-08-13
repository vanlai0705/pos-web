export const STATUS = {
  ACTIVE: 0,
  LOCKED: 1,
  DELETED: 2,
} as const

export type StatusId = typeof STATUS[keyof typeof STATUS]
