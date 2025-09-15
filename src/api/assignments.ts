import apiClient from './client'

export interface Assignment {
  course_id: string
  title: string
  category: string
  status: string
  due_date: string
}

export interface AssignmentsResponse {
  user_id: string
  count: number
  items: Assignment[]
}

export const getAssignments = async (userId: string = 'u001'): Promise<AssignmentsResponse> => {
  // Try multiple possible endpoints
  const endpoints = [
    '/api/assignments/list',
    '/assignments/list',
    '/api/api/assignments/list'
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.post(endpoint, { user_id: userId })
      return response.data
    } catch (error) {
      continue
    }
  }
  
  throw new Error('All assignment endpoints failed')
}

export const reassignCourse = async (userId: string, courseId: string): Promise<void> => {
  await apiClient.post('/api/assignments/reassign', { 
    user_id: userId, 
    course_id: courseId 
  })
}