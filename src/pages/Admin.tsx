import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MeditationApp } from '@/components/MeditationApp'

interface User {
  user_id: string
  name: string
  email: string
  role: string
  department: string
}

interface Course {
  course_id: string
  title: string
  category: string
}

export function Admin() {
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [syncResult, setSyncResult] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<string>('')
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showCoursesModal, setShowCoursesModal] = useState(false)
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showMeditationModal, setShowMeditationModal] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{question: string, answer: string, timestamp: Date}>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [lastMessage, setLastMessage] = useState('')
  const [autoRetryUsed, setAutoRetryUsed] = useState(false)
  const queryClient = useQueryClient()

  const motivationalSlogans = [
    '⚡ Powering safety through technology',
    '🚀 Streamlining EHS management',
    '🎯 Precision in safety administration',
    '💪 Empowering safety professionals',
    '🌟 Excellence in EHS operations',
    '🔥 Transforming safety workflows',
    '⚡ Your safety management command center',
    '🎉 Making EHS administration efficient',
    '🛡️ Advanced safety system control',
    '🌈 Intelligent EHS automation',
    '🎪 Streamlined safety operations',
    '🏆 Mastering EHS administration',
    '💎 Premium safety management tools',
    '🚁 Elevated EHS oversight',
    '🎨 Creative safety solutions'
  ]
  
  const getThemeColors = () => {
    return {
      background: '#1a1a1a',
      cardBg: '#2d2d2d',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#404040',
      headerBg: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      progressBg: '#2d2d2d',
      progressBar: '#475569',
      modalBg: '#2d2d2d',
      inputBg: '#404040',
      inputBorder: '#64748b',
      chatBg: '#1e1e1e',
      chatUserBg: '#374151',
      chatAiBg: '#1f2937'
    }
  }

  const themeColors = getThemeColors()
  
  const randomSlogan = motivationalSlogans[Math.floor(Math.random() * motivationalSlogans.length)]

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUsersModal(false)
        setShowCoursesModal(false)
        setShowAssignmentsModal(false)
        setShowChatModal(false)
        setShowMeditationModal(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}))
          const retryAfter = errorData.detail?.retry_after || errorData.retry_after || 30
          throw new Error(`RATE_LIMIT:${Math.ceil(retryAfter)}`)
        }
        throw new Error(`HTTP ${response.status}`)
      }
      
      return response.json()
    },
    onMutate: () => setIsTyping(true),
    onSettled: () => setIsTyping(false),
    onSuccess: (data) => {
      const response = data.reply || 'No response received'
      setChatHistory(prev => [...prev, {
        question: lastMessage,
        answer: response,
        timestamp: new Date()
      }])
    },
    onError: (error: Error) => {
      if (error.message.startsWith('RATE_LIMIT:')) {
        const retryAfter = parseInt(error.message.split(':')[1]) || 30
        
        if (!autoRetryUsed) {
          setAutoRetryUsed(true)
          setRetryCountdown(retryAfter)
          
          const countdown = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdown)
                setTimeout(() => {
                  chatMutation.mutate(lastMessage)
                }, 500)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
      }
    }
  })

  const handleChatSubmit = () => {
    if (!chatInput.trim() || retryCountdown > 0 || isTyping) return
    const message = chatInput.trim()
    setLastMessage(message)
    setAutoRetryUsed(false)
    setChatInput('')
    chatMutation.mutate(message)
  }
  
  const handleRetry = () => {
    if (!lastMessage || retryCountdown > 0) return
    setAutoRetryUsed(false)
    chatMutation.mutate(lastMessage)
  }

  // Fetch users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/stats/users`)
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`)
      return response.json()
    },
    retry: 3,
    retryDelay: 2000
  })

  // Fetch courses
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/stats/courses`)
      if (!response.ok) throw new Error(`Failed to fetch courses: ${response.status}`)
      return response.json()
    },
    retry: 3,
    retryDelay: 2000
  })

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async ({ user_id, course_id }: { user_id: string, course_id: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/assignments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, course_id, status: 'assigned' })
      })
      if (!response.ok) throw new Error('Failed to create assignment')
      return response.json()
    },
    onSuccess: () => {
      setSyncResult('Assignment created successfully!')
    },
    onError: () => {
      setSyncResult('Failed to create assignment')
    }
  })

  // Sync assignments mutation
  const syncMutation = useMutation({
    mutationFn: async (user_id?: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/assignments/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id })
      })
      if (!response.ok) throw new Error('Failed to sync')
      return response.json()
    },
    onSuccess: (data) => {
      setSyncResult(`Synced ${data.synced} assignments`)
    },
    onError: () => {
      setSyncResult('Failed to sync assignments')
    }
  })

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source', 'ADMIN_UPLOAD')
      formData.append('title', file.name)
      
      const uploadResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload/pdf`, {
        method: 'POST',
        body: formData
      })
      if (!uploadResponse.ok) throw new Error('Upload failed')
      const uploadData = await uploadResponse.json()
      
      if (uploadData.duplicate) {
        return { ...uploadData, processed: false }
      }
      
      const processResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: uploadData.doc_id, region: 'US-CA', frequency: 'annual' })
      })
      if (!processResponse.ok) throw new Error('Processing failed')
      const processData = await processResponse.json()
      
      return { ...uploadData, ...processData, processed: true }
    },
    onSuccess: (data) => {
      if (data.duplicate) {
        setUploadResult(`⚠️ Document already exists: ${data.message}`)
      } else {
        const roleInfo = data.role_detection ? ` (AI detected role: ${data.role} - ${Math.round(data.role_detection.confidence * 100)}% confidence)` : ''
        setUploadResult(`✅ Processed ${data.filename}: ${data.inserted} courses extracted, ${data.assignments?.inserted || 0} assignments created${roleInfo}`)
      }
      setFile(null)
    },
    onError: (error) => {
      setUploadResult(`❌ Upload failed: ${error.message}`)
    }
  })

  const handleCreateAssignment = () => {
    if (selectedUser && selectedCourse) {
      createAssignmentMutation.mutate({ user_id: selectedUser, course_id: selectedCourse })
    }
  }

  const handleSyncAll = () => {
    syncMutation.mutate()
  }

  const handleSyncUser = () => {
    if (selectedUser) {
      syncMutation.mutate(selectedUser)
    }
  }



  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif', background: themeColors.background, minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        background: themeColors.headerBg,
        color: 'white',
        padding: 'clamp(16px, 3vw, 24px) 0',
        borderBottom: `1px solid ${themeColors.border}`
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 clamp(16px, 3vw, 24px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'clamp(12px, 2vw, 16px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 24px)' }}>
            <img 
              src="https://ucm.calpoly.edu/sites/default/files/inline-images/logo_page_graphics-03%20%281%29.png" 
              alt="Cal Poly" 
              height="96" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <div style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 600 }}>
                🛡️ EHS Admin Dashboard
              </div>
              <div style={{ fontSize: 'clamp(16px, 3vw, 20px)', opacity: 0.8, marginTop: '4px', fontStyle: 'italic' }}>
                {randomSlogan}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 16px)' }}>
            <button 
              onClick={() => setShowChatModal(true)}
              style={{
                background: '#64748b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: '12px',
                transition: 'all 0.3s ease',
                fontSize: '14px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#475569'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#64748b'
              }}
            >
              🤖 AI ASSISTANT
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(20px, 4vw, 40px) clamp(16px, 3vw, 24px)' }}>
        {/* Overview Section */}
        <section style={{ marginBottom: 'clamp(24px, 4vw, 40px)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(500px, 100%), 1fr))',
            gap: 'clamp(20px, 4vw, 40px)'
          }}>
            {/* Admin Controls Block */}
            <div style={{
              background: themeColors.cardBg,
              borderRadius: '12px',
              padding: 'clamp(20px, 4vw, 32px)',
              boxShadow: '0 8px 32px rgba(0,0,0,.4)',
              border: `1px solid ${themeColors.border}`
            }}>
              <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, margin: '0 0 clamp(20px, 3vw, 24px) 0', color: themeColors.text }}>
                📋 Administration Panel
              </h1>
              
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{
                  background: '#374151',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: `1px solid ${themeColors.border}`,
                  transition: 'all 0.2s ease'
                }} onClick={() => setShowUsersModal(true)}
                onMouseOver={(e) => e.currentTarget.style.background = '#4b5563'}
                onMouseOut={(e) => e.currentTarget.style.background = '#374151'}>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {usersError ? '⚠️' : (users?.length || 0)}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Users</div>
                </div>
                
                <div style={{
                  background: '#374151',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: `1px solid ${themeColors.border}`,
                  transition: 'all 0.2s ease'
                }} onClick={() => setShowCoursesModal(true)}
                onMouseOver={(e) => e.currentTarget.style.background = '#4b5563'}
                onMouseOut={(e) => e.currentTarget.style.background = '#374151'}>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {coursesError ? '⚠️' : (courses?.length || 0)}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Courses</div>
                </div>
                
                <div style={{
                  background: '#374151',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: `1px solid ${themeColors.border}`,
                  transition: 'all 0.2s ease'
                }} onClick={() => setShowAssignmentsModal(true)}
                onMouseOver={(e) => e.currentTarget.style.background = '#4b5563'}
                onMouseOut={(e) => e.currentTarget.style.background = '#374151'}>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>569</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assignments</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleSyncAll}
                  style={{
                    flex: 1,
                    background: '#64748b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#475569'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#64748b'
                  }}
                >
                  🔄 Sync All Users
                </button>
              </div>
              
              {syncResult && (
                <div style={{
                  marginTop: '16px',
                  background: syncResult.includes('Failed') ? '#fee2e2' : '#dcfce7',
                  border: `1px solid ${syncResult.includes('Failed') ? '#dc2626' : '#16a34a'}`,
                  color: syncResult.includes('Failed') ? '#dc2626' : '#15803d',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  {syncResult}
                </div>
              )}
            </div>
            
            {/* Document Upload Block */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f97316 100%)',
              color: 'white',
              borderRadius: 'clamp(16px, 3vw, 32px)',
              padding: 'clamp(20px, 4vw, 40px)',
              boxShadow: '0 20px 40px rgba(245, 158, 11, 0.3)',
              textAlign: 'center'
            }}>
              <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, margin: '0 0 clamp(16px, 3vw, 24px) 0', color: '#000' }}>
                🪄 AI DocumentMagic
              </h1>
              <p style={{ opacity: 0.85, lineHeight: 1.5, margin: '0 0 clamp(20px, 3vw, 32px) 0', fontSize: 'clamp(16px, 3vw, 18px)' }}>
                Drop PDFs → AI extracts rules → Auto-assigns training
              </p>
              
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <div
                  onDrop={(e) => {
                    e.preventDefault()
                    const droppedFile = e.dataTransfer.files[0]
                    if (droppedFile && droppedFile.type === 'application/pdf') {
                      setFile(droppedFile)
                      uploadMutation.mutate(droppedFile)
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => e.preventDefault()}
                  style={{
                    width: '100%',
                    padding: '32px 16px',
                    border: '3px dashed rgba(255,255,255,0.6)',
                    borderRadius: '16px',
                    fontSize: '16px',
                    marginBottom: '20px',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.pdf'
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement
                      if (target.files?.[0]) {
                        setFile(target.files[0])
                        uploadMutation.mutate(target.files[0])
                      }
                    }
                    input.click()
                  }}
                >
                  📤 Drop your PDFs here! Our AI will work its magic with Bedrock and create personalized training assignments
                </div>
                
                {file && (
                  <p style={{ margin: '16px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                    ✓ {file.name} ({Math.round(file.size / 1024)} KB)
                    {uploadMutation.isPending && <span style={{ marginLeft: '8px' }}>⏳ Processing with Bedrock AI...</span>}
                  </p>
                )}

                {uploadResult && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    textAlign: 'left',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {uploadResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section>
          <div 
            data-section="help-support"
            style={{
              background: themeColors.cardBg,
              borderRadius: '12px',
              padding: 'clamp(20px, 4vw, 32px)',
              boxShadow: '0 8px 32px rgba(0,0,0,.4)',
              border: `1px solid ${themeColors.border}`
            }}>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 700, margin: '0 0 clamp(16px, 3vw, 20px) 0', color: themeColors.text }}>
              📱 Support Resources
            </h1>
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* AI Assistant Block */}
              <div style={{
                background: '#374151',
                borderRadius: '8px',
                padding: '20px',
                border: `1px solid ${themeColors.border}`
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0', color: '#e2e8f0' }}>
                  🤖 AI Assistant
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: 'none'
                }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.5, color: themeColors.textSecondary, fontSize: '18px' }}>
                      AI chatbot for EHS administration and safety management
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '16px', color: themeColors.text }}>
                      <span>Available 24/7</span>
                      <span>Admin support</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChatModal(true)}
                    style={{
                      background: '#64748b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    CONSULT AI
                  </button>
                </div>
              </div>

              {/* Mindful Break Block */}
              <div style={{
                background: '#374151',
                borderRadius: '8px',
                padding: '20px',
                border: `1px solid ${themeColors.border}`
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0', color: '#e2e8f0' }}>
                  🧘 Wellness Break
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: 'none'
                }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.5, color: themeColors.textSecondary, fontSize: '18px' }}>
                      Take a moment to relax and recharge with guided meditation
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '16px', color: themeColors.text }}>
                      <span>Stress relief</span>
                      <span>Focus enhancement</span>
                      <span>Mental wellness</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMeditationModal(true)}
                    style={{
                      background: '#64748b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    START SESSION
                  </button>
                </div>
              </div>

              {/* Contact EHS Block */}
              <div style={{
                background: '#374151',
                borderRadius: '8px',
                padding: '20px',
                border: `1px solid ${themeColors.border}`
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0', color: '#e2e8f0' }}>
                  📞 EHS Office
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: 'none'
                }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.5, color: themeColors.textSecondary, fontSize: '18px' }}>
                      Environmental Health & Safety Office support
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '16px', color: themeColors.text }}>
                      <span>Phone: (805) 756-6661</span>
                      <span>Email: <a href="mailto:ehs@calpoly.edu" style={{ color: themeColors.text, textDecoration: 'none' }}>ehs@calpoly.edu</a></span>
                    </div>
                  </div>
                  <button
                    style={{
                      background: '#64748b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                    onClick={() => window.open('mailto:ehs@calpoly.edu')}
                  >
                    Contact
                  </button>
                </div>
              </div>

              {/* Follow Cal Poly Block */}
              <div style={{
                background: '#374151',
                borderRadius: '8px',
                padding: '20px',
                border: `1px solid ${themeColors.border}`
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0', color: '#e2e8f0' }}>
                  📱 Cal Poly Network
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: 'none'
                }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.5, color: themeColors.textSecondary, fontSize: '18px' }}>
                      Stay connected with Cal Poly on social media
                    </p>
                    <div style={{ fontSize: '16px', color: themeColors.text }}>
                      <a href="https://www.calpoly.edu/" target="_blank" style={{ color: themeColors.text, textDecoration: 'none' }}>Website</a> • <a href="https://www.instagram.com/calpoly/" target="_blank" style={{ color: themeColors.text, textDecoration: 'none' }}>Instagram</a> • <a href="https://x.com/calpoly" target="_blank" style={{ color: themeColors.text, textDecoration: 'none' }}>X</a> • <a href="https://www.facebook.com/CalPoly" target="_blank" style={{ color: themeColors.text, textDecoration: 'none' }}>Facebook</a> • <a href="https://www.linkedin.com/school/california-polytechnic-state-university-san-luis-o/" target="_blank" style={{ color: themeColors.text, textDecoration: 'none' }}>LinkedIn</a> • <a href="https://www.youtube.com/@CalPoly" target="_blank" style={{ color: themeColors.text, textDecoration: 'none' }}>YouTube</a>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '180px' }}>
                    <a href="https://www.calpoly.edu/" target="_blank" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                      background: '#2a7d2e', borderRadius: '50%', color: 'white', textDecoration: 'none', transition: 'transform 0.3s ease'
                    }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM11 19.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </a>
                    <a href="https://www.instagram.com/calpoly/" target="_blank" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                      background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                      borderRadius: '50%', color: 'white', textDecoration: 'none', transition: 'transform 0.3s ease'
                    }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </a>
                    <a href="https://x.com/calpoly" target="_blank" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                      background: '#000000', borderRadius: '50%', color: 'white', textDecoration: 'none', transition: 'transform 0.3s ease'
                    }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                    <a href="https://www.facebook.com/CalPoly" target="_blank" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                      background: '#1877f2', borderRadius: '50%', color: 'white', textDecoration: 'none', transition: 'transform 0.3s ease'
                    }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                    <a href="https://www.linkedin.com/school/california-polytechnic-state-university-san-luis-o/" target="_blank" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                      background: '#0077b5', borderRadius: '50%', color: 'white', textDecoration: 'none', transition: 'transform 0.3s ease'
                    }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                    <a href="https://www.youtube.com/@CalPoly" target="_blank" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
                      background: '#ff0000', borderRadius: '50%', color: 'white', textDecoration: 'none', transition: 'transform 0.3s ease'
                    }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </a>
                  </div>
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

      {/* Footer */}
      <footer style={{ background: '#111827', padding: '40px 0', borderTop: `1px solid ${themeColors.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px', color: '#9ca3af', fontSize: '16px', fontWeight: 600 }}>
            <a href="https://www.sergey-ulyanov.pro" target="_blank" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 'bold' }}>
              Sergey Ulyanov
            </a>, AI Matchmakers Team
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
            Digital Transformation Hub (DxHub) × Amazon Web Services (AWS) — September 2025<br/>
            📧 ulyanoow@gmail.com | 📱 (310) 713-7738
          </div>
          <div style={{ 
            background: '#374151', 
            border: '1px solid #4b5563', 
            borderRadius: '8px', 
            padding: '12px', 
            margin: '20px auto', 
            maxWidth: '600px',
            color: '#d1d5db', 
            fontSize: '12px' 
          }}>
            ⚠️ <strong>Demo Educational Tool</strong> - Not a substitute for OSHA/EPA compliance. For official guidance, consult your EHS office.
          </div>
        </div>
      </footer>


      {/* Users Modal */}
      {showUsersModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowUsersModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>👥 Users ({users?.length || 0})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>ID</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Name</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.slice(0, 20).map((user: User) => (
                    <tr key={user.user_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{user.user_id}</td>
                      <td style={{ padding: '8px', fontSize: '12px' }}>{user.name}</td>
                      <td style={{ padding: '8px', fontSize: '12px' }}>{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setShowUsersModal(false)}
              style={{
                marginTop: '16px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Courses Modal */}
      {showCoursesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCoursesModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>📚 Courses ({courses?.length || 0})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>ID</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Title</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {courses?.slice(0, 20).map((course: Course) => (
                    <tr key={course.course_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{course.course_id}</td>
                      <td style={{ padding: '8px', fontSize: '12px' }}>{course.title}</td>
                      <td style={{ padding: '8px', fontSize: '12px' }}>{course.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setShowCoursesModal(false)}
              style={{
                marginTop: '16px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Assignments Modal */}
      {showAssignmentsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowAssignmentsModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0' }}>📋 Assignment Management</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select User...</option>
                {users?.slice(0, 10).map((user: User) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_id} - {user.name}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select Course...</option>
                {courses?.slice(0, 10).map((course: Course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_id} - {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={handleCreateAssignment}
                disabled={!selectedUser || !selectedCourse}
                style={{
                  background: selectedUser && selectedCourse ? '#16a34a' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: selectedUser && selectedCourse ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Create Assignment
              </button>
              
              <button
                onClick={handleSyncUser}
                disabled={!selectedUser}
                style={{
                  background: selectedUser ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: selectedUser ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Sync User
              </button>
            </div>

            <button
              onClick={() => setShowAssignmentsModal(false)}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showChatModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: themeColors.modalBg, borderRadius: '16px', padding: 'clamp(16px, 3vw, 24px)', 
            maxWidth: '700px', width: 'clamp(95%, 90vw, 90%)',
            height: 'clamp(500px, 80vh, 600px)', display: 'flex', flexDirection: 'column',
            border: 'none',
            color: themeColors.text
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🤖 AI Safety Assistant</h2>
              <button onClick={() => setShowChatModal(false)} style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
              }}>×</button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ margin: '16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                  placeholder="e.g., How to manage EHS compliance?"
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: `2px solid ${themeColors.inputBorder}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    background: themeColors.inputBg,
                    color: themeColors.text
                  }}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isTyping || retryCountdown > 0}
                  style={{
                    background: '#ff8533',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: 'pointer',
                    opacity: (!chatInput.trim() || isTyping || retryCountdown > 0) ? 0.5 : 1
                  }}
                >
                  {retryCountdown > 0 ? `Wait ${retryCountdown}s` : 'Ask AI'}
                </button>
              </div>
              
              <div style={{
                flex: 1,
                overflowY: 'auto',
                background: themeColors.chatBg,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${themeColors.border}`,
                minHeight: '400px',
                maxHeight: '400px'
              }}>
                {chatHistory.length === 0 && !isTyping && (
                  <div style={{ textAlign: 'center', color: themeColors.textSecondary, padding: '40px', fontSize: '16px' }}>
                    💬 Start a conversation with the AI Safety Assistant
                  </div>
                )}
                {chatHistory.slice(-10).reverse().map((chat, idx) => (
                  <div key={idx} style={{ marginBottom: '20px', fontSize: '15px' }}>
                    <div style={{ 
                      color: themeColors.text, 
                      fontWeight: 'bold', 
                      marginBottom: '6px',
                      padding: '6px 12px',
                      background: themeColors.chatUserBg,
                      borderRadius: '6px',
                      display: 'inline-block',
                      maxWidth: '100%',
                      wordWrap: 'break-word'
                    }}>
                      You: {chat.question}
                    </div>
                    <div style={{ 
                      color: '#2a7d2e',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      padding: '12px',
                      background: themeColors.chatAiBg,
                      borderRadius: '6px',
                      marginTop: '6px',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      🤖 {chat.answer}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ fontSize: '15px', color: themeColors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                    🤔 AI is thinking...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat History Button */}
      {chatHistory.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
          <button
            onClick={() => setChatHistory([])}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '20px'
            }}
            title="Clear chat history"
          >
            🗑️
          </button>
        </div>
      )}

      {/* Meditation Modal */}
      {showMeditationModal && <MeditationApp onClose={() => setShowMeditationModal(false)} />}
    </div>
  )
}