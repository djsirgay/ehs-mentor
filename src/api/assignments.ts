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

// FIXED: OpenAPI shows GET /api/assignments/list?user_id=xxx
export const getAssignments = async (userId: string): Promise<AssignmentsResponse> => {
  const response = await apiClient.get(`/api/assignments/list?user_id=${userId}`)
  return response.data
}

export const reassignCourse = async (userId: string, courseId: string): Promise<void> => {
  await apiClient.post('/api/assignments/reassign', { 
    user_id: userId, 
    course_id: courseId,
    new_status: 'assigned'  // Required field per OpenAPI
  })
}