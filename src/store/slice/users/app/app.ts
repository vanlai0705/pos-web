import type { TPosMenuItem } from "@/utils/pos-menu-converter"
import type { TUserSliceState,TUserWarehouseSelect } from "../types"
import type { TPosLoginData,TPosUser } from "../types/pos-types"
import { PayloadAction, ReducerCreators } from "@reduxjs/toolkit"
import { buildSlice } from "../../../utils"
import { initialState, userSliceName } from "./constants"
export const userSlice = buildSlice({
  name: userSliceName,
  initialState: initialState,
  reducers: (create: ReducerCreators<TUserSliceState>) => ({
    setUser: create.reducer((state, action: PayloadAction<TPosLoginData>) => {
      state.auth.data = action.payload;
    }),
    setUserInfo: create.reducer(
      (state, action: PayloadAction<TPosUser>) => {
        state.auth.info = action.payload;
      }
    ),
    setMenu: create.reducer(
      (state, action: PayloadAction<TPosMenuItem[]>) => {
        state.auth.menu = action.payload;
      }
    ),
    setWarehouseSelected: create.reducer(
      (state, action: PayloadAction<TUserWarehouseSelect | null>) => {
        state.auth.userWareHouseSelected = action.payload;
      }
    ),
    destroyStatus: create.reducer(() => {}),
    logout: create.reducer((state) => {
      state.auth.data = null;
      state.auth.info = null;
      state.auth.userWareHouseSelected = null;
      state.auth.menu = [];
    }),
  }),
  selectors: {
    selectAuth: (state) => state.auth,
  },
});

export const {
  setUser,
  setWarehouseSelected,
  setUserInfo,
  setMenu,
  destroyStatus,
  logout,
} = userSlice.actions;

export const { selectAuth } = userSlice.selectors;
