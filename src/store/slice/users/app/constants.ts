import { TUserSliceState } from "../types"
export const userSliceName = "user";

export const initialState: TUserSliceState = {
  auth: {
    data: null,
    isLoadding: false,
    error: "",
    info: null,
    userWareHouseSelected: null,
    menu: [],
  },
};
