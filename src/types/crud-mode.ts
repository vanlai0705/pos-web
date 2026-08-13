export const CrudMode = {
  Create: "create",
  Edit: "edit",
} as const;

export type CrudMode = typeof CrudMode[keyof typeof CrudMode];

