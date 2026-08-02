import { PayloadAction } from "@reduxjs/toolkit";
import { userSliceName } from "./constants";

export const refreshTokenAction = (payload: any): PayloadAction<any> => ({
  type: `${userSliceName}/refreshToken`,
  payload,
});
