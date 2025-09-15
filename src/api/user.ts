import apiClient from './client'

export interface UserProfile {
  user_id: string
  display_name: string
  email: string
  role: string
}

export interface UsersListResponse {
  total: number
  items: UserProfile[]
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await apiClient.get(`/api/user/profile?user_id=${userId}`)
  return response.data
}

export const getAvailableUsers = async (params?: {
  query?: string
  limit?: number
  offset?: number
}): Promise<UsersListResponse> => {
  const searchParams = new URLSearchParams()
  if (params?.query) searchParams.set('query', params.query)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  
  const response = await apiClient.get(`/api/users/list?${searchParams}`)
  return response.data
}