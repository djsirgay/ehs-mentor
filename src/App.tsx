import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Learner } from '@/pages/Learner'
import { Admin } from '@/pages/Admin'
import { Upload } from '@/pages/Upload'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/learner" replace />} />
          <Route path="/learner" element={<Learner theme="light" />} />
          <Route
            path="/dashboard"
            element={
              <Layout theme="light">
                <Dashboard theme="light" userRole="admin" />
              </Layout>
            }
          />
          <Route
            path="/assignments"
            element={
              <Layout theme="light">
                <div>Assignments Page (Coming Soon)</div>
              </Layout>
            }
          />
          <Route
            path="/documents"
            element={<Upload />}
          />
          <Route
            path="/admin"
            element={<Admin />}
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App