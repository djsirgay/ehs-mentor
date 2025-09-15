import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface Assignment {
  course_id: string
  title: string
  category?: string
  status: string
  due_date?: string
}

export interface AssignmentListResponse {
  user_id: string
  count: number
  items: Assignment[]
}

export async function getAssignments(
  userId: string, 
  limit: number = 100, 
  offset: number = 0
): Promise<AssignmentListResponse> {
  const url = `${API_BASE_URL}/api/assignments-v2?user_id=${encodeURIComponent(userId)}&limit=${limit}&offset=${offset}`
  
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  
  if (!res.ok) {
    throw { 
      status: res.status, 
      detail: data.detail || data 
    }
  }
  
  return data as AssignmentListResponse
}