import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStats } from '@/api/stats'
import { getAssignments, reassignCourse } from '@/api/assignments'
import { getUserProfile } from '@/api/user'
import { UserSwitcher } from '@/components/UserSwitcher'

interface LearnerProps {
  theme?: 'light' | 'dark'
  initialUserId?: string
}

export function Learner({ theme = 'light', initialUserId = 'u001' }: LearnerProps) {
  const [currentUserId, setCurrentUserId] = useState(initialUserId)
  const [chatInput, setChatInput] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const queryClient = useQueryClient()

  const { data: userProfile } = useQuery({
    queryKey: ['user', currentUserId],
    queryFn: () => getUserProfile(currentUserId),
  })

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  })

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', currentUserId],
    queryFn: () => getAssignments(currentUserId),
  })

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user_id: currentUserId })
      })
      if (!response.ok) throw new Error('Chat API error')
      return response.json()
    },
    onMutate: () => setIsTyping(true),
    onSettled: () => setIsTyping(false),
    onSuccess: (data) => setChatResponse(data.reply || 'No response received'),
    onError: () => setChatResponse('Sorry, I encountered an error. Please try again.')
  })

  // Clear chat when user changes
  useEffect(() => {
    setChatResponse('')
    setChatInput('')
  }, [currentUserId])

  const completedCount = assignments?.items?.filter(a => a.status === 'completed').length || 0
  const totalCount = assignments?.count || 0
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const nextAssignment = assignments?.items?.find(a => a.status === 'assigned')

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return
    chatMutation.mutate(chatInput)
    setChatInput('')
  }

  const handleUserChange = (userId: string) => {
    setCurrentUserId(userId)
    // Invalidate queries for new user
    queryClient.invalidateQueries({ queryKey: ['assignments', userId] })
    queryClient.invalidateQueries({ queryKey: ['user', userId] })
  }

  const headerStyle = {
    background: '#2a7d2e',
    color: 'white',
    padding: '20px 0',
    borderRadius: '0 0 24px 24px'
  }

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  }

  const heroStyle = {
    background: 'white',
    padding: '40px',
    borderRadius: '32px',
    margin: '20px 0',
    boxShadow: '0 20px 40px rgba(16,24,40,.18)'
  }

  const progressBarStyle = {
    maxWidth: '620px',
    background: 'white',
    borderRadius: '24px',
    padding: '14px 16px',
    boxShadow: '0 6px 16px rgba(21, 94, 21, .15)',
    border: '1px solid #e7ece7',
    display: 'grid',
    gap: '10px'
  }

  const trainingCardStyle = {
    background: '#ffe3a3',
    borderRadius: '24px',
    padding: '18px',
    boxShadow: '0 6px 16px rgba(21, 94, 21, .15)',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    transition: 'transform .18s ease'
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0, background: '#f5f5f5' }}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ ...containerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img 
              src="https://ucm.calpoly.edu/sites/default/files/inline-images/logo_page_graphics-03%20%281%29.png" 
              alt="Cal Poly" 
              height="96" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <div style={{ fontSize: '28px', fontWeight: '600' }}>
                👋 Hello, <strong style={{ textDecoration: 'underline', textDecorationThickness: '1px', textUnderlineOffset: '4px' }}>
                  {userProfile?.name || 'Loading...'}
                </strong>
              </div>
              <div style={{ fontSize: '20px', opacity: '.8', marginTop: '4px', fontStyle: 'italic' }}>
                ✨ A perfect day to make yourself safer
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <UserSwitcher 
              currentUserId={currentUserId}
              onUserChange={handleUserChange}
            />
            <button style={{
              background: '#fff',
              color: '#2a7d2e',
              border: '2px solid #2a7d2e',
              borderRadius: '16px',
              padding: '12px 20px',
              fontWeight: '700',
              cursor: 'pointer'
            }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Overview Section */}
        <section style={containerStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Progress Card */}
            <div style={heroStyle}>
              <h1 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 24px 0' }}>📈 Progress & History</h1>
              
              <div style={progressBarStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: '700', letterSpacing: '.2px' }}>Training Progress</span>
                  <span style={{ fontWeight: '800' }}>{progressPercent}%</span>
                </div>

                <div style={{
                  position: 'relative',
                  height: '12px',
                  background: '#e9efe8',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #2a7d2e, #66d36f)',
                    borderRadius: 'inherit',
                    transition: 'width .8s cubic-bezier(.22,1,.36,1)'
                  }}></div>
                </div>

                <div style={{ display: 'flex', gap: '16px', color: '#6b6f6c', fontSize: '12px', letterSpacing: '.2px' }}>
                  <span><strong>{completedCount}</strong> Completed</span>
                  <span><strong>{totalCount}</strong> Total</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button style={{
                  flex: 1,
                  background: '#fff',
                  color: '#2a7d2e',
                  border: '2px solid #2a7d2e',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}>
                  📅 Training History
                </button>
                <button style={{
                  flex: 1,
                  background: '#fff',
                  color: '#2a7d2e',
                  border: '2px solid #2a7d2e',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}>
                  📄 Progress Report
                </button>
              </div>
            </div>
            
            {/* Next Action Card */}
            <div style={{ ...heroStyle, background: '#1edc3b', color: 'white' }}>
              <h1 style={{ fontSize: '46px', fontWeight: '800', margin: '0 0 24px 0' }}>🔔 Next Action Required</h1>
              {nextAssignment ? (
                <div>
                  <h3 style={{ margin: '0 0 12px', fontWeight: '800', fontSize: '20px' }}>
                    {nextAssignment.title}
                  </h3>
                  <p style={{ opacity: '.85', margin: '0 0 16px', fontSize: '15px', lineHeight: '1.5' }}>
                    Course ID: {nextAssignment.course_id}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', margin: '0 0 24px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: nextAssignment.category === 'chemical' ? '#ff4444' : '#ffe3a3',
                      color: nextAssignment.category === 'chemical' ? 'white' : '#000'
                    }}>
                      {nextAssignment.category.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '13px', opacity: '.7' }}>
                      Due: {nextAssignment.due_date}
                    </span>
                  </div>
                  <button style={{
                    background: '#ff8533',
                    color: 'white',
                    borderRadius: '16px',
                    padding: '14px 20px',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}>
                    Start Training
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ opacity: '.85', fontSize: '18px' }}>
                    🎉 All training assignments completed!
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* All Training Section */}
        <section style={{ ...containerStyle, marginTop: '-80px' }}>
          <div style={heroStyle}>
            <h1 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 24px 0' }}>📚 All Training</h1>
            <div>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading assignments for {userProfile?.name}...</div>
              ) : assignments?.items?.length ? (
                assignments.items.map((assignment) => (
                  <div key={assignment.course_id} style={{
                    ...trainingCardStyle,
                    background: assignment.status === 'completed' ? '#e8f5e8' : 
                               assignment.category === 'chemical' ? '#ffc0d3' :
                               assignment.category === 'lab' ? '#ffe3a3' : '#cfe0ff'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontWeight: '800',
                        fontSize: '26px',
                        margin: '0 0 8px 0',
                        lineHeight: '1.2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ fontSize: '32px', lineHeight: 1, flexShrink: 0 }}>
                          {assignment.category === 'chemical' ? '⚠️' : 
                           assignment.category === 'lab' ? '🔬' : '📋'}
                        </span>
                        {assignment.title}
                      </h3>
                      <p style={{
                        margin: '8px 0 16px 0',
                        lineHeight: '1.5',
                        color: 'rgba(0,0,0,.7)',
                        fontSize: '17px'
                      }}>
                        Course ID: {assignment.course_id}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        margin: '12px 0',
                        fontSize: '15px'
                      }}>
                        <span>Category: {assignment.category}</span>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: assignment.status === 'completed' ? '#28a745' : '#ffc107',
                          color: assignment.status === 'completed' ? 'white' : '#000'
                        }}>
                          {assignment.status.toUpperCase()}
                        </span>
                        <span>Due: {assignment.due_date}</span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: 'auto', alignSelf: 'center' }}>
                      <button style={{
                        background: assignment.status === 'completed' ? '#28a745' : '#2a7d2e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '12px 20px',
                        fontWeight: '700',
                        fontSize: '16px',
                        minWidth: '120px',
                        cursor: assignment.status === 'completed' ? 'default' : 'pointer',
                        opacity: assignment.status === 'completed' ? 0.7 : 1
                      }}>
                        {assignment.status === 'completed' ? '✓ Completed' : 'Start Training'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  No training assignments found for {userProfile?.name}.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* AI Assistant Section */}
        <section style={{ ...containerStyle, marginTop: '-100px' }}>
          <div style={heroStyle}>
            <h1 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 24px 0' }}>🤖 AI Safety Assistant</h1>
            <div style={{ ...trainingCardStyle, background: '#e8f5e8' }}>
              <div style={{ width: '100%' }}>
                <h3 style={{
                  fontWeight: '800',
                  fontSize: '26px',
                  margin: '0 0 16px 0',
                  lineHeight: '1.2'
                }}>
                  Ask me anything about EHS policies and procedures
                </h3>
                <div style={{ margin: '16px 0' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="e.g., What PPE do I need in the lab?"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #2a7d2e',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {(chatResponse || isTyping) && (
                  <div style={{
                    margin: '16px 0',
                    padding: '16px',
                    background: '#f9f9f9',
                    borderRadius: '8px',
                    minHeight: '60px'
                  }}>
                    {isTyping ? (
                      <div style={{ color: '#666' }}>🤔 Thinking...</div>
                    ) : (
                      <>
                        <div style={{ color: '#2a7d2e', fontWeight: 'bold', marginBottom: '8px' }}>
                          🤖 EHS Assistant:
                        </div>
                        <div>{chatResponse}</div>
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isTyping}
                  style={{
                    background: '#2a7d2e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    fontWeight: '700',
                    fontSize: '16px',
                    marginTop: '12px',
                    cursor: 'pointer',
                    opacity: (!chatInput.trim() || isTyping) ? 0.5 : 1
                  }}
                >
                  Ask Assistant
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Help & Support Section */}
        <section style={{ ...containerStyle, marginTop: '-100px' }}>
          <div style={heroStyle}>
            <h1 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 24px 0' }}>📱 Help & Support</h1>
            <div style={{ ...trainingCardStyle, background: '#fff' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontWeight: '800',
                  fontSize: '26px',
                  margin: '0 0 8px 0',
                  lineHeight: '1.2'
                }}>
                  Contact EHS Office
                </h3>
                <p style={{
                  margin: '8px 0 16px 0',
                  lineHeight: '1.5',
                  color: 'rgba(0,0,0,.7)',
                  fontSize: '17px'
                }}>
                  Environmental Health & Safety Office support
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '12px 0',
                  fontSize: '15px'
                }}>
                  <span>Phone: (805) 756-6661</span>
                  <span>Email: ehs@calpoly.edu</span>
                </div>
              </div>
              <div style={{ flexShrink: 0, marginLeft: 'auto', alignSelf: 'center' }}>
                <button
                  onClick={() => window.open('mailto:ehs@calpoly.edu')}
                  style={{
                    background: '#2a7d2e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    fontWeight: '700',
                    fontSize: '16px',
                    minWidth: '120px',
                    cursor: 'pointer'
                  }}
                >
                  Contact
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          color: '#856404'
        }}>
          ⚠️ <strong>Demo Educational Tool</strong> - Not a substitute for OSHA/EPA compliance.
        </div>
        <a href="https://www.sergey-ulyanov.pro" target="_blank" style={{ color: '#2a7d2e', textDecoration: 'none', fontWeight: 'bold' }}>
          Sergey Ulyanov
        </a>, AI Matchmakers Team<br />
        Digital Transformation Hub (DxHub) × Amazon Web Services (AWS) — August 2025
      </footer>
    </div>
  )
}