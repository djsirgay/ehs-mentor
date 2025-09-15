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

export const getAssignments = async (userId: string): Promise<AssignmentsResponse> => {
  const response = await apiClient.post('/api/assignments/list', { user_id: userId })
  return response.data
}

export const reassignCourse = async (userId: string, courseId: string): Promise<void> => {
  await apiClient.post('/api/assignments/reassign', { 
    user_id: userId, 
    course_id: courseId 
  })
}