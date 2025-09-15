import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getAssignments } from '@/api/assignments'

interface LearnerProps {
  theme?: 'light' | 'dark'
}

export function Learner({ theme = 'light' }: LearnerProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUserId = searchParams.get('user_id') || 'u001'
  
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', currentUserId],
    queryFn: () => getAssignments(currentUserId, 100, 0),
  })

  const completedCount = assignments?.items?.filter(item => item.status === 'completed').length || 0
  const totalCount = assignments?.count || 0
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const pendingAssignments = assignments?.items?.filter(item => item.status !== 'completed') || []
  const nextAssignment = pendingAssignments[0]

  const getModuleIcon = (title: string) => {
    if (title.includes('Chemical')) return '🧪'
    if (title.includes('Safety')) return '⚠️'
    if (title.includes('PPE')) return '🛡️'
    if (title.includes('Fire')) return '🔥'
    if (title.includes('Bloodborne')) return '🩸'
    if (title.includes('Biosafety')) return '🦠'
    if (title.includes('Ergonomics')) return '💺'
    if (title.includes('Forklift')) return '🚛'
    if (title.includes('Hazard')) return '☢️'
    if (title.includes('HAZWOPER')) return '🧯'
    if (title.includes('Heat')) return '🌡️'
    if (title.includes('Lab')) return '🔬'
    if (title.includes('Ladder')) return '🪜'
    if (title.includes('Laser')) return '🔴'
    if (title.includes('Lockout')) return '🔒'
    if (title.includes('OSHA')) return '🏢'
    if (title.includes('Radiation')) return '☢️'
    if (title.includes('Respirator')) return '😷'
    if (title.includes('Waste')) return '♻️'
    return '📋'
  }

  const getPriorityBadge = (category: string) => {
    const priorities = {
      'chemical': 'high',
      'biosafety': 'high', 
      'radiation': 'high',
      'electrical': 'medium',
      'fire': 'medium',
      'general': 'low',
      'ergonomics': 'low',
      'ppe': 'medium'
    }
    return priorities[category as keyof typeof priorities] || 'medium'
  }

  const renderTrainingCard = (assignment: any) => {
    const isCompleted = assignment.status === 'completed'
    const icon = getModuleIcon(assignment.title)
    const priority = getPriorityBadge(assignment.category)
    
    const priorityStyles = {
      high: { background: '#B71C1C', color: '#fff' },
      medium: { background: '#F9A825', color: '#222' },
      low: { background: '#5CB8B2', color: 'white' }
    }

    return (
      <div key={assignment.course_id} style={{
        background: '#ffe3a3',
        borderRadius: '24px',
        padding: '18px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'transform 0.18s ease'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontWeight: 800,
            fontSize: '26px',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '32px' }}>{icon}</span>
            {assignment.title}
          </h3>
          <p style={{
            margin: '8px 0 16px 0',
            color: 'rgba(0,0,0,.7)',
            fontSize: '17px'
          }}>
            Course ID: {assignment.course_id}
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '15px',
            alignItems: 'center'
          }}>
            <span>Type: Full Training</span>
            <span>Duration: 30 min</span>
            <span style={{
              ...priorityStyles[priority as keyof typeof priorityStyles],
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '12px'
            }}>
              {priority.toUpperCase()}
            </span>
            <span>Status: {assignment.status}</span>
            {assignment.due_date && <span>Due: {assignment.due_date}</span>}
          </div>
        </div>
        <div>
          <button
            style={{
              background: isCompleted ? '#28a745' : '#2a7d2e',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 20px',
              fontWeight: 700,
              cursor: isCompleted ? 'default' : 'pointer',
              fontSize: '16px',
              minWidth: '120px'
            }}
            disabled={isCompleted}
            onClick={() => !isCompleted && alert('Training simulation - would start training module')}
          >
            {isCompleted ? '✓ Completed' : 'Start Training'}
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b6f6c' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p>Loading your training modules...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b6f6c' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <p>Error loading training data.</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #2a7d2e 0%, #66d36f 100%)',
        color: 'white',
        padding: '24px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img 
              src="https://ucm.calpoly.edu/sites/default/files/inline-images/logo_page_graphics-03%20%281%29.png" 
              alt="Cal Poly" 
              height="96" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>
                👋 Hello, <strong>Merry Warner</strong>
              </div>
              <div style={{ fontSize: '20px', opacity: 0.8, marginTop: '4px', fontStyle: 'italic' }}>
                ✨ A perfect day to make yourself safer
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{
              background: '#2a7d2e',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 20px',
              fontWeight: 700,
              cursor: 'pointer'
            }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Overview Section */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '40px'
          }}>
            {/* Progress Block */}
            <div style={{
              background: '#ffffff',
              borderRadius: '32px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(16,24,40,.18)'
            }}>
              <h1 style={{ fontSize: '48px', fontWeight: 800, margin: '0 0 40px 0' }}>
                📈 Progress & History
              </h1>
              
              {/* EHS Progress Bar */}
              <div style={{
                maxWidth: '620px',
                background: '#ffffff',
                borderRadius: '24px',
                padding: '14px 16px',
                boxShadow: '0 6px 16px rgba(21, 94, 21, .15)',
                border: '1px solid #e7ece7',
                display: 'grid',
                gap: '10px',
                marginBottom: '48px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, letterSpacing: '0.2px' }}>Training Progress</span>
                  <span style={{ fontWeight: 800 }}>{progressPercent}%</span>
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
                    inset: '0 auto 0 0',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #ff8533, #28a745)',
                    borderRadius: 'inherit',
                    transition: 'width .8s cubic-bezier(.22,1,.36,1)'
                  }} />
                </div>

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  color: '#6b6f6c',
                  fontSize: '12px',
                  letterSpacing: '0.2px'
                }}>
                  <span><strong style={{ color: '#1a1f1c' }}>{completedCount}</strong> Completed</span>
                  <span><strong style={{ color: '#1a1f1c' }}>{totalCount}</strong> Total</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{
                  flex: 1,
                  background: '#f8fff8',
                  color: '#2a7d2e',
                  border: '1px solid #e7ece7',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  📅 Training History
                </button>
                <button style={{
                  flex: 1,
                  background: '#f8fff8',
                  color: '#2a7d2e',
                  border: '1px solid #e7ece7',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  📄 Progress Report
                </button>
              </div>
            </div>
            
            {/* Next Action Block */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f97316 100%)',
              color: 'white',
              borderRadius: '32px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(245, 158, 11, 0.3)'
            }}>
              <h1 style={{ fontSize: '46px', fontWeight: 800, margin: '0 0 24px 0' }}>
                🔔 Next Action Required
              </h1>
              <div style={{ margin: '24px 0' }}>
                {nextAssignment ? (
                  <>
                    <h3 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '20px' }}>
                      {nextAssignment.title}
                    </h3>
                    <p style={{ opacity: 0.85, margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.5 }}>
                      Course ID: {nextAssignment.course_id}
                    </p>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      margin: '0 0 24px 0',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        background: '#F9A825',
                        color: '#222',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}>
                        {getPriorityBadge(nextAssignment.category).toUpperCase()}
                      </span>
                      <span style={{ fontSize: '13px', opacity: 0.7 }}>Duration: 30 min</span>
                      <span style={{ fontSize: '13px', opacity: 0.7 }}>
                        Status: {nextAssignment.status}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '20px' }}>
                      All Training Complete!
                    </h3>
                    <p style={{ opacity: 0.85, margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.5 }}>
                      You have completed all required training modules.
                    </p>
                  </>
                )}
              </div>
              <button
                style={{
                  background: '#ff8533',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '14px 20px',
                  border: 'none',
                  fontWeight: 700,
                  cursor: nextAssignment ? 'pointer' : 'default',
                  fontSize: '16px'
                }}
                disabled={!nextAssignment}
                onClick={() => nextAssignment && alert('Training simulation - would start next training')}
              >
                {nextAssignment ? 'Start Training' : 'All Done 🎉'}
              </button>
            </div>
          </div>
        </section>

        {/* Training Sections */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(16,24,40,.18)'
          }}>
            <h1 style={{ fontSize: '48px', fontWeight: 800, margin: '0 0 24px 0' }}>
              📚 All Training
            </h1>
            <div>
              {assignments?.items && assignments.items.length > 0 ? (
                assignments.items
                  .sort((a, b) => {
                    if (a.status === 'completed' && b.status !== 'completed') return 1
                    if (a.status !== 'completed' && b.status === 'completed') return -1
                    return 0
                  })
                  .map(renderTrainingCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b6f6c' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                  <p>No training assignments found.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(16,24,40,.18)'
          }}>
            <h1 style={{ fontSize: '48px', fontWeight: 800, margin: '0 0 24px 0' }}>
              📱 Help & Support
            </h1>
            <div>
              {/* AI Assistant Card */}
              <div style={{
                background: '#fff',
                borderRadius: '24px',
                padding: '18px',
                boxShadow: '0 6px 16px rgba(21, 94, 21, .15)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontWeight: 800,
                    fontSize: '26px',
                    margin: '0 0 8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    🤖 AI Safety Assistant
                  </h3>
                  <p style={{ margin: '8px 0 16px 0', lineHeight: 1.5, color: 'rgba(0,0,0,.7)', fontSize: '17px' }}>
                    Ask questions about EHS policies and procedures
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                    <span>Available 24/7</span>
                    <span>Instant responses</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: 'auto', alignSelf: 'center' }}>
                  <button
                    style={{
                      background: '#ff8533',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      fontSize: '16px',
                      minWidth: '120px',
                      cursor: 'pointer'
                    }}
                    onClick={() => alert('AI Safety Assistant feature coming soon!')}
                  >
                    Ask AI
                  </button>
                </div>
              </div>

              {/* Contact EHS Card */}
              <div style={{
                background: '#fff',
                borderRadius: '24px',
                padding: '18px',
                boxShadow: '0 6px 16px rgba(21, 94, 21, .15)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontWeight: 800,
                    fontSize: '26px',
                    margin: '0 0 8px 0'
                  }}>
                    Contact EHS Office
                  </h3>
                  <p style={{ margin: '8px 0 16px 0', lineHeight: 1.5, color: 'rgba(0,0,0,.7)', fontSize: '17px' }}>
                    Environmental Health & Safety Office support
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                    <span>Phone: (805) 756-6661</span>
                    <span>Email: ehs@calpoly.edu</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: 'auto', alignSelf: 'center' }}>
                  <button
                    style={{
                      background: '#2a7d2e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      fontSize: '16px',
                      minWidth: '120px',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open('mailto:ehs@calpoly.edu')}
                  >
                    Contact
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* AWS Powered By */}
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ marginBottom: '16px', color: '#495057', fontSize: '16px', fontWeight: 600 }}>
          AI Safety Assistant Powered By AWS
        </div>
        <img 
          src="./AWS_2007_logo_white.jpg" 
          alt="Powered by AWS" 
          style={{ height: '80px', opacity: 0.9 }}
        />
      </div>
    </div>
  )
}