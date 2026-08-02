import { asyncThunkCreator, buildCreateSlice } from "@reduxjs/toolkit";

export const buildSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});
