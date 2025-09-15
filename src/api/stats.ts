import apiClient from './client'

export interface Stats {
  users: number
  courses: number
  assignments: number
  documents: number
}

export const getStats = async (): Promise<Stats> => {
  const response = await apiClient.get('/api/stats')
  return response.data
}