export const EUserTagTypes = {
  UserInfo: "UserInfo",
  Tables: "Tables",
} as const;

export type EUserTagTypes = typeof EUserTagTypes[keyof typeof EUserTagTypes];
