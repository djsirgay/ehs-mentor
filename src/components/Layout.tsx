import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FileText, Settings, Bell, User } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  theme?: 'light' | 'dark'
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assignments', href: '/assignments', icon: ClipboardList },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Admin', href: '/admin', icon: Settings },
]

export function Layout({ children, theme = 'light' }: LayoutProps) {
  const location = useLocation()
  const isDark = theme === 'dark'

  const sidebarStyle = {
    width: '256px',
    backgroundColor: isDark ? '#1e293b' : 'white',
    borderRight: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh'
  }

  const mainStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc'
  }

  const topbarStyle = {
    height: '4rem',
    backgroundColor: isDark ? '#1e293b' : 'white',
    borderBottom: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            backgroundColor: '#3b82f6',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.875rem'
          }}>
            EHS
          </div>
          <span style={{
            fontWeight: '600',
            fontSize: '1.125rem',
            color: isDark ? 'white' : '#1f2937'
          }}>
            EHS Mentor
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                to={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: isActive 
                    ? (isDark ? 'white' : '#1d4ed8')
                    : (isDark ? '#9ca3af' : '#6b7280'),
                  backgroundColor: isActive 
                    ? (isDark ? '#2563eb' : '#dbeafe')
                    : 'transparent',
                  border: isActive && !isDark ? '1px solid #bfdbfe' : 'none'
                }}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main content */}
      <div style={mainStyle}>
        {/* Top bar */}
        <header style={topbarStyle}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: isDark ? 'white' : '#1f2937'
          }}>
            {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              background: 'none',
              border: 'none',
              color: isDark ? '#9ca3af' : '#6b7280',
              cursor: 'pointer'
            }}>
              <Bell size={20} />
            </button>
            <button style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              background: 'none',
              border: 'none',
              color: isDark ? '#9ca3af' : '#6b7280',
              cursor: 'pointer'
            }}>
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}