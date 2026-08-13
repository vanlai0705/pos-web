import type { TAppDispatch,TRootState } from "./store"
import { useDispatch, useSelector } from "react-redux"
export const useAppDispatch = useDispatch.withTypes<TAppDispatch>()
export const useAppSelector = useSelector.withTypes<TRootState>()
