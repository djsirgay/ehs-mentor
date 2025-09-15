import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAvailableUsers } from '@/api/user'

interface UserSwitcherProps {
  currentUserId: string
  onUserChange: (userId: string) => void
}

export function UserSwitcher({ currentUserId, onUserChange }: UserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getAvailableUsers,
  })
  
  const currentUser = users.find(u => u.user_id === currentUserId)

  if (isLoading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '14px'
      }}>
        Loading users...
      </div>
    )
  }

  if (!users.length) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '14px'
      }}>
        👤 {currentUserId}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        👤 {currentUser?.name || currentUserId} ({users.length} users)
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          minWidth: '250px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {users.map((user, index) => (
            <button
              key={user.user_id}
              onClick={() => {
                onUserChange(user.user_id)
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: user.user_id === currentUserId ? '#f3f4f6' : 'white',
                color: '#1f2937',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                borderRadius: index === 0 ? '8px 8px 0 0' : 
                            index === users.length - 1 ? '0 0 8px 8px' : '0'
              }}
              onMouseEnter={(e) => {
                if (user.user_id !== currentUserId) {
                  e.currentTarget.style.background = '#f9fafb'
                }
              }}
              onMouseLeave={(e) => {
                if (user.user_id !== currentUserId) {
                  e.currentTarget.style.background = 'white'
                }
              }}
            >
              <div style={{ fontWeight: '600' }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {user.user_id} • {user.role}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}