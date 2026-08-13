import { useAppDispatch } from "@/store/hooks"
import { apiSlice, persistor } from "@/store/store"
import { useAuth } from "./useAuth"
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
