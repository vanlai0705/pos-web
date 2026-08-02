export const EUserTagTypes = {
  UserInfo: "UserInfo",
} as const;

export type EUserTagTypes = typeof EUserTagTypes[keyof typeof EUserTagTypes];
