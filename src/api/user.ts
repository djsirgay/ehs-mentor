import apiClient from './client'

export interface UserProfile {
  user_id: string
  name: string
  email: string
  role: string
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await apiClient.get(`/api/user/profile?user_id=${userId}`)
  return response.data
}

export const getAvailableUsers = async (): Promise<UserProfile[]> => {
  const response = await apiClient.get('/api/users/list')
  return response.data.users || []
}