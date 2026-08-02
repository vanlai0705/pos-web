import { useGenericPostMutation } from '@/store/slice/users/api/api'

interface ApiRequest {
  url: string
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
}

export function useApiMutation<T = any>(
  buildRequest: (args: T) => ApiRequest,
  options?: { onSuccess?: (data?: any) => void; onError?: (err?: any) => void }
) {
  const [genericPost, { isLoading }] = useGenericPostMutation()

  async function mutate(args: T) {
    const req = buildRequest(args)
    try {
      const result = await genericPost(req).unwrap()
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      options?.onError?.(err)
      throw err
    }
  }

  return { mutate, isLoading }
}
