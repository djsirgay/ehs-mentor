import { useQuery } from '@tanstack/react-query'
import { getStats } from '@/api/stats'
import { Users, BookOpen, ClipboardList, FileText } from 'lucide-react'

interface DashboardProps {
  theme?: 'light' | 'dark'
  userRole?: 'admin' | 'user' | 'manager'
}

export function Dashboard({ theme = 'light', userRole = 'admin' }: DashboardProps) {
  const isDark = theme === 'dark'
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div style={{
          width: '2rem',
          height: '2rem',
          border: '2px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Failed to load dashboard data
        </p>
      </div>
    )
  }

  const statCards = [
    { title: 'Users', value: stats?.users || 0, icon: Users, color: '#3b82f6' },
    { title: 'Courses', value: stats?.courses || 0, icon: BookOpen, color: '#22c55e' },
    { title: 'Assignments', value: stats?.assignments || 0, icon: ClipboardList, color: '#eab308' },
    { title: 'Documents', value: stats?.documents || 0, icon: FileText, color: '#a855f7' },
  ]

  const cardStyle = {
    backgroundColor: isDark ? '#334155' : 'white',
    borderRadius: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
    padding: '1.5rem'
  }

  return (
    <div>
      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: isDark ? '#9ca3af' : '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    {stat.title}
                  </p>
                  <p style={{
                    fontSize: '1.875rem',
                    fontWeight: 'bold',
                    color: isDark ? 'white' : '#1f2937'
                  }}>
                    {stat.value}
                  </p>
                </div>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#1e293b' : `${stat.color}20`
                }}>
                  <Icon size={24} color={stat.color} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Left Card - Progress */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: isDark ? 'white' : '#1f2937',
            marginBottom: '1rem'
          }}>
            {userRole === 'admin' ? 'System Overview' : 
             userRole === 'manager' ? 'Team Progress' : 'My Progress'}
          </h3>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Completion Rate
              </span>
              <span style={{
                fontWeight: '600',
                color: isDark ? 'white' : '#1f2937'
              }}>
                85%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: isDark ? '#1e293b' : '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '85%',
                height: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: '4px'
              }}></div>
            </div>
          </div>
        </div>

        {/* Right Card - Activity */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: isDark ? 'white' : '#1f2937',
            marginBottom: '1rem'
          }}>
            {userRole === 'admin' ? 'Recent Activity' : 
             userRole === 'manager' ? 'Team Status' : 'Next Steps'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#22c55e',
                borderRadius: '50%'
              }}></div>
              <span style={{
                fontSize: '0.875rem',
                color: isDark ? '#9ca3af' : '#6b7280'
              }}>
                {userRole === 'admin' ? 'System running normally' :
                 userRole === 'manager' ? '12 team members active' : 'Complete PPE-201 course'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#eab308',
                borderRadius: '50%'
              }}></div>
              <span style={{
                fontSize: '0.875rem',
                color: isDark ? '#9ca3af' : '#6b7280'
              }}>
                {userRole === 'admin' ? '3 documents processing' :
                 userRole === 'manager' ? '2 overdue assignments' : 'Review safety guidelines'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}