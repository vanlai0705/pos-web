import type { Action,ThunkAction } from "@reduxjs/toolkit"
import storage from "redux-persist/lib/storage"
import { combineSlices, configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"
import { persistReducer, persistStore } from "redux-persist"
import { userApiSlice } from "./slice/users/api"
import { userSlice } from "./slice/users/app"

const userPersistConfig = {
  key: "user",
  storage,
  whitelist: ["auth"],
};

const persistedUserReducer = persistReducer(
  userPersistConfig,
  userSlice.reducer,
);

export const apiSlice = [
  userApiSlice,
];

const apiSliceMiddleware = apiSlice.map((api) => api.middleware);

const rootReducer = combineSlices({ user: persistedUserReducer }, ...apiSlice);

export type TRootState = ReturnType<typeof rootReducer>;

export const makeStore = (
  preloadedState?: Partial<TRootState>,
): { store: TAppStore; persistor: ReturnType<typeof persistStore> } => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat([
        ...apiSliceMiddleware,
      ]),
    preloadedState,
  });

  const persistor = persistStore(store);

  setupListeners(store.dispatch);

  return { store, persistor };
};

export const { store, persistor }: any = makeStore();

export type TAppStore = typeof store;
export type TAppDispatch = TAppStore["dispatch"];
export type TThunkAction<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  TRootState,
  unknown,
  Action
>;

const dispatch = store.dispatch;

export const resetAllApiStates = () => () => {
  apiSlice.forEach((api) => {
    dispatch(api.util.resetApiState());
  });
};
