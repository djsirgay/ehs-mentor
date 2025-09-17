const API_BASE_URL = 'https://ehs-mentor-api-prod.onrender.com'

export interface TrainingHistoryItem {
  course_id: string
  title: string
  category: string
  status: string
  due_date?: string
  completed_date?: string
}

export interface TrainingHistoryResponse {
  user_id: string
  total_assignments: number
  completed: number
  in_progress: number
  assigned: number
  completion_rate: number
  items: TrainingHistoryItem[]
}

export interface ProgressReportResponse {
  user_id: string
  summary: {
    total_assignments: number
    completed: number
    in_progress: number
    assigned: number
    completion_rate: number
  }
  by_category: Record<string, {
    total: number
    completed: number
    completion_rate: number
  }>
  recent_completions: TrainingHistoryItem[]
  upcoming_deadlines: TrainingHistoryItem[]
}

export async function getTrainingHistory(userId: string): Promise<TrainingHistoryResponse> {
  const url = `${API_BASE_URL}/api/reports/training-history?user_id=${encodeURIComponent(userId)}`
  const res = await fetch(url)
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw { status: res.status, detail: data.detail || data }
  }
  
  return res.json()
}

export async function getProgressReport(userId: string): Promise<ProgressReportResponse> {
  const url = `${API_BASE_URL}/api/reports/progress-report?user_id=${encodeURIComponent(userId)}`
  const res = await fetch(url)
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw { status: res.status, detail: data.detail || data }
  }
  
  return res.json()
}