import { getBaseQueryWithReauth } from '@/store/utils'
import { createApi } from '@reduxjs/toolkit/query/react'
import { EUserTagTypes } from './tag-types'
export const userApiSlice = createApi({
  baseQuery: getBaseQueryWithReauth(),
  reducerPath: 'userApi',
  tagTypes: [EUserTagTypes.UserInfo],
  endpoints: () => ({}),
});
