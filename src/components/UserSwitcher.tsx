import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAvailableUsers } from '@/api/user'

interface UserSwitcherProps {
  currentUserId: string
  onUserChange: (userId: string) => void
}

export function UserSwitcher({ currentUserId, onUserChange }: UserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['users', debouncedQuery],
    queryFn: () => getAvailableUsers({ 
      query: debouncedQuery || undefined, 
      limit: 20 
    }),
    enabled: isOpen,
  })

  const users = usersData?.items || []
  const currentUser = users.find(u => u.user_id === currentUserId)

  const handleOpen = () => {
    setIsOpen(true)
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  const handleClose = () => {
    setIsOpen(false)
    setSearchQuery('')
    setDebouncedQuery('')
  }

  const handleUserSelect = (userId: string) => {
    onUserChange(userId)
    handleClose()
  }

  if (error) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '14px'
      }}>
        ❌ Users API Error
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
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
        👤 {currentUser?.display_name || currentUserId}
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
          minWidth: '300px',
          maxHeight: '400px'
        }}>
          {/* Search Input */}
          <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Users List */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                {searchQuery ? 'No users found' : 'No users available'}
              </div>
            ) : (
              users.map((user, index) => (
                <button
                  key={user.user_id}
                  onClick={() => handleUserSelect(user.user_id)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: user.user_id === currentUserId ? '#f3f4f6' : 'white',
                    color: '#1f2937',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    borderRadius: index === 0 ? '0' : 
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
                  <div style={{ fontWeight: '600' }}>{user.display_name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {user.user_id} • {user.email} • {user.role}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Close button */}
          <div style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '8px',
                border: 'none',
                background: '#f9fafb',
                color: '#6b7280',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}