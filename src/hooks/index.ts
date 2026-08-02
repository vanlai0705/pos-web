import { useAppDispatch } from "@/store/hooks"
import { useAuth } from "./useAuth"
import { apiSlice } from "@/store/store"
import { persistor } from "@/store/store"

export const useLogout = () => {
  const dispatch = useAppDispatch()
  const { logout } = useAuth()

  const handleLogout = async () => {
    apiSlice.forEach((api) => {
      dispatch(api.util.resetApiState())
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    await persistor.purge()

    logout()
  }

  return { logout: handleLogout }
}
