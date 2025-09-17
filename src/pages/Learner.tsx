import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getAssignments } from '@/api/assignments'
import { getTrainingHistory, getProgressReport } from '@/api/reports'
import { MeditationApp } from '@/components/MeditationApp'


interface LearnerProps {
  initialTheme?: 'light' | 'dark'
}

export function Learner({ initialTheme = 'light' }: LearnerProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUserId = searchParams.get('user_id') || ''
  
  const [chatInput, setChatInput] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [lastMessage, setLastMessage] = useState('')
  const [autoRetryUsed, setAutoRetryUsed] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showMeditationModal, setShowMeditationModal] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{question: string, answer: string, timestamp: Date}>>([])
  const queryClient = useQueryClient()
  const [startingTraining, setStartingTraining] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  const getThemeColors = () => {
    if (isDarkMode) {
      return {
        background: '#1a1a1a',
        cardBg: '#2d2d2d',
        text: '#ffffff',
        textSecondary: '#b0b0b0',
        border: '#404040',
        headerBg: 'linear-gradient(135deg, #1e4a22 0%, #2d5a30 100%)',
        progressBg: '#333333',
        progressBar: '#e9efe8',
        modalBg: '#2d2d2d',
        inputBg: '#404040',
        inputBorder: '#555555',
        chatBg: '#333333',
        chatUserBg: '#1e3a8a',
        chatAiBg: '#1e4a22'
      }
    }
    return {
      background: '#f5f5f5',
      cardBg: '#ffffff',
      text: '#000000',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      headerBg: 'linear-gradient(135deg, #2a7d2e 0%, #66d36f 100%)',
      progressBg: '#ffffff',
      progressBar: '#e9efe8',
      modalBg: '#ffffff',
      inputBg: '#ffffff',
      inputBorder: '#2a7d2e',
      chatBg: '#f9f9f9',
      chatUserBg: '#e3f2fd',
      chatAiBg: '#f0f8f0'
    }
  }

  const themeColors = getThemeColors()

  const motivationalSlogans = [
    'Take a mindful break, then conquer safety! 🧘',
    'Breathe deep, learn safe, live well ✨',
    'Relax your mind, strengthen your safety 🌸',
    'Pause, breathe, then master your training 🍃',
    'Start with calm, end with confidence 🌅',
    'Refresh your mind, refresh your safety 💆',
    'Meditation + Training = Perfect balance 🧘‍♀️',
    'Flow through stress, flow through safety 🌊',
    'Light up your mind, light up your skills 🕯️',
    'Bloom with peace, grow with knowledge 🌺',
    'Transform stress into safety mastery 🦋',
    'Rest your mind, boost your learning 🌙',
    'Balance wellness with workplace safety ☯️',
    'Nurture your mind, nurture your safety 🌿',
    'Bend like bamboo, learn like a master 🎋'
  ]
  
  const randomSlogan = motivationalSlogans[Math.floor(Math.random() * motivationalSlogans.length)]

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHistoryModal(false)
        setShowReportModal(false)
        setShowChatModal(false)
        setShowMeditationModal(false)
        setSelectedCategory(null)
        setSelectedStatus(null)
        setShowUserModal(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])
  
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', currentUserId],
    queryFn: () => getAssignments(currentUserId, 100, 0),
    retry: 1,
    enabled: !!currentUserId,
  })

  const { data: trainingHistory } = useQuery({
    queryKey: ['trainingHistory', currentUserId],
    queryFn: () => getTrainingHistory(currentUserId),
    enabled: !!currentUserId,
  })

  const { data: progressReport } = useQuery({
    queryKey: ['progressReport', currentUserId],
    queryFn: () => getProgressReport(currentUserId),
    enabled: !!currentUserId && showReportModal,
  })





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
      setChatResponse('')
    },
    onError: (error: Error) => {
      if (error.message.startsWith('RATE_LIMIT:')) {
        const retryAfter = parseInt(error.message.split(':')[1]) || 30
        
        if (!autoRetryUsed) {
          setAutoRetryUsed(true)
          setChatResponse(`⏳ Rate limited. Auto-retrying in ${retryAfter}s...`)
          setRetryCountdown(retryAfter)
          
          const countdown = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdown)
                setChatResponse('🔄 Retrying...')
                setTimeout(() => {
                  chatMutation.mutate(lastMessage)
                }, 500)
                return 0
              }
              setChatResponse(`⏳ Rate limited. Auto-retrying in ${prev - 1}s...`)
              return prev - 1
            })
          }, 1000)
        } else {
          setChatResponse('⏳ Rate limited. Click "Retry" to try again.')
          setRetryCountdown(0)
        }
      } else {
        setChatResponse(`❌ Error: ${error.message}`)
      }
    }
  })

  useEffect(() => {
    setChatResponse('')
    setChatInput('')
    setAutoRetryUsed(false)
  }, [currentUserId])

  const completedCount = trainingHistory?.completed || 0
  const totalCount = trainingHistory?.total_assignments || 0
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
      'ppe': 'medium',
      'safety': 'medium',
      'hazmat': 'high',
      'lab': 'medium'
    }
    return priorities[category?.toLowerCase() as keyof typeof priorities] || 'medium'
  }

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

  const handleUserChange = (userId: string) => {
    if (userId.trim()) {
      setSearchParams({ user_id: userId.trim() })
    } else {
      setSearchParams({})
    }
  }

  const handleUserClick = async () => {
    if (!currentUserId) return
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${currentUserId}/profile`)
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
        setShowUserModal(true)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const handleDownloadPdf = async () => {
    if (!currentUserId || downloadingPdf) return
    
    setDownloadingPdf(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/pdf/${currentUserId}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF report')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EHS_Progress_Report_${currentUserId}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF download error:', error)
      alert('Failed to download PDF report. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleStartTraining = async (courseId: string, courseTitle: string) => {
    if (!currentUserId) return
    
    setStartingTraining(courseId)
    
    try {
      // Start training
      const startResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/assignments/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, course_id: courseId })
      })
      
      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to start training')
      }
      
      const startData = await startResponse.json()
      
      // Simulate external training (in real app, user would go to external site)
      const confirmed = window.confirm(
        `Starting training: ${courseTitle}\n\nIn a real system, you would be redirected to the training platform.\n\nSimulate completion now?`
      )
      
      if (confirmed) {
        // Simulate training completion
        const score = Math.floor(Math.random() * 30) + 70 // Random score 70-100
        const completionTime = Math.floor(Math.random() * 25) + 15 // Random time 15-40 minutes
        
        const completeResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/assignments/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user_id: currentUserId, 
            course_id: courseId,
            score,
            completion_time: completionTime
          })
        })
        
        if (!completeResponse.ok) {
          const errorData = await completeResponse.json().catch(() => ({}))
          throw new Error(errorData.detail || 'Failed to complete training')
        }
        
        // Refresh assignments data
        queryClient.invalidateQueries({ queryKey: ['assignments', currentUserId] })
        
        alert(`Training completed!\nScore: ${score}%\nTime: ${completionTime} minutes`)
      }
      
    } catch (error) {
      console.error('Training error:', error)
      alert('Error starting training. Please try again.')
    } finally {
      setStartingTraining(null)
    }
  }

  if (!currentUserId) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0, background: themeColors.background, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: themeColors.cardBg,
          padding: '40px',
          borderRadius: '32px',
          boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,.4)' : '0 20px 40px rgba(16,24,40,.18)',
          textAlign: 'center',
          maxWidth: '400px',
          border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
        }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 24px 0' }}>👋</h1>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 16px 0', color: themeColors.text }}>
            Welcome to EHS Mentor
          </h2>
          <p style={{ color: themeColors.textSecondary, marginBottom: '24px' }}>
            Enter your User ID to access your training dashboard
          </p>
          <input
            type="text"
            placeholder="Enter User ID (e.g., u001)"
            onChange={(e) => handleUserChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${themeColors.inputBorder}`,
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              marginBottom: '16px',
              background: themeColors.inputBg,
              color: themeColors.text
            }}
            onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.value.trim() && handleUserChange(e.currentTarget.value)}
          />
          <p style={{ fontSize: '12px', color: themeColors.textSecondary }}>
            No account? Contact your EHS administrator
          </p>
        </div>
      </div>
    )
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

    const cardColors = {
      high: '#ffebee',    // Light red
      medium: '#fff8e1',  // Light yellow  
      low: '#e0f2f1'      // Light teal
    }

    return (
      <div key={assignment.course_id} className={`training-card ${priority}`} style={{
        background: isDarkMode ? 
          (priority === 'high' ? '#4a1a1a' : priority === 'medium' ? '#4a3a00' : '#1a3a3a') :
          (priority === 'high' ? '#ffebee' : priority === 'medium' ? '#fff8e1' : '#e0f2f1'),
        border: isDarkMode ? '1px solid #666' : 'none'
      }}>
        <div className="training-content">
          <h3 className="training-title" style={{ color: themeColors.text }}>
            <span className="training-icon">{icon}</span>
            {assignment.title}
          </h3>
          <p className="training-desc" style={{ color: themeColors.textSecondary }}>
            Course ID: {assignment.course_id}
          </p>
          <div className="training-meta" style={{ color: themeColors.textSecondary }}>
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
            {assignment.status !== 'assigned' && <span>Status: {assignment.status}</span>}
            {assignment.due_date && (() => {
              const dueDate = new Date(assignment.due_date)
              const today = new Date()
              const diffTime = dueDate.getTime() - today.getTime()
              const diffMinutes = Math.floor(diffTime / (1000 * 60))
              const isOverdue = diffMinutes <= 0
              
              const getTimeUnits = (minutes) => {
                const absMinutes = Math.abs(minutes)
                const weeks = Math.floor(absMinutes / 10080)
                const days = Math.floor((absMinutes % 10080) / 1440)
                const hours = Math.floor((absMinutes % 1440) / 60)
                const mins = absMinutes % 60
                return { weeks, days, hours, mins }
              }
              
              const { weeks, days, hours, mins } = getTimeUnits(diffMinutes)
              
              const FlipDigit = ({ value, label }) => (
                <div style={{ display: 'inline-flex', alignItems: 'center', margin: '0 1px' }}>
                  <div style={{
                    background: isOverdue ? 'linear-gradient(180deg, #dc2626, #b91c1c)' : 'linear-gradient(180deg, #374151, #1f2937)',
                    color: 'white',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    minWidth: '16px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {String(value).padStart(2, '0')}
                  </div>
                  <span style={{ fontSize: '8px', color: '#666', marginLeft: '2px' }}>{label}</span>
                </div>
              )
              
              // Smart display logic
              const getDisplayUnits = () => {
                if (weeks > 0) return [{ value: weeks, label: 'w' }, { value: days, label: 'd' }]
                if (days > 0) return [{ value: days, label: 'd' }, { value: hours, label: 'h' }]
                if (hours > 0) return [{ value: hours, label: 'h' }, { value: mins, label: 'm' }]
                return [{ value: mins, label: 'm' }]
              }
              
              return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
                  <span style={{ fontSize: '8px', color: isOverdue ? '#dc2626' : '#666', marginRight: '2px' }}>
                    📅 {isOverdue ? 'OVERDUE' : 'DUE IN'}
                  </span>
                  {getDisplayUnits().map((unit, idx) => (
                    <FlipDigit key={idx} value={unit.value} label={unit.label} />
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
        <div className="training-action">
          <button
            className="training-btn"

            onMouseOver={(e) => {
              if (!isCompleted) {
                e.currentTarget.style.background = '#1e5a22'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(42,125,46,.3)'
              }
            }}
            onMouseOut={(e) => {
              if (!isCompleted) {
                e.currentTarget.style.background = '#2a7d2e'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
            disabled={isCompleted || startingTraining === assignment.course_id}
            onClick={() => !isCompleted && handleStartTraining(assignment.course_id, assignment.title)}
          >
            {isCompleted ? '✓ COMPLETED' : startingTraining === assignment.course_id ? 'STARTING...' : 'START TRAINING'}
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: themeColors.textSecondary, background: themeColors.background, minHeight: '100vh' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p>Loading your training modules...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: themeColors.textSecondary, background: themeColors.background, minHeight: '100vh' }}>
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
        padding: 'clamp(16px, 3vw, 24px) 0'
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
                👋 Hello, <strong 
                  style={{ 
                    textDecoration: 'underline', 
                    textDecorationThickness: '1px', 
                    textUnderlineOffset: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={handleUserClick}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {currentUserId}
                </strong>
              </div>
              <div 
                style={{ 
                  fontSize: 'clamp(16px, 3vw, 20px)', 
                  opacity: 0.8, 
                  marginTop: '4px', 
                  fontStyle: 'italic',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => {
                  const helpSection = document.querySelector('[data-section="help-support"]')
                  if (helpSection) {
                    helpSection.scrollIntoView({ behavior: 'smooth' })
                    setTimeout(() => setShowMeditationModal(true), 800)
                  }
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <span style={{ textDecoration: 'underline', textDecorationThickness: '1px', textUnderlineOffset: '4px' }}>{randomSlogan.split(' ').slice(0, -1).join(' ')}</span> {randomSlogan.split(' ').slice(-1)[0]}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 16px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', opacity: '0.8' }}>User ID:</span>
              <input
                type="text"
                value={currentUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '14px',
                  width: '80px'
                }}
                placeholder="User ID"
              />
            </div>
            <button 
              onClick={() => setShowChatModal(true)}
              style={{
                background: '#2a7d2e',
                color: '#fff',
                border: 'none',
                borderRadius: '16px',
                padding: '12px 20px',
                fontWeight: 700,
                cursor: 'pointer',
                marginRight: '12px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#1e5a22'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#2a7d2e'
              }}
            >
              🤖 ASK AI FRIEND
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.2)',
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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(20px, 4vw, 40px) clamp(16px, 3vw, 24px)' }}>
        {/* Overview Section */}
        <section style={{ marginBottom: 'clamp(24px, 4vw, 40px)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(500px, 100%), 1fr))',
            gap: 'clamp(20px, 4vw, 40px)'
          }}>
            {/* Progress Block */}
            <div style={{
              background: themeColors.cardBg,
              borderRadius: 'clamp(16px, 3vw, 32px)',
              padding: 'clamp(20px, 4vw, 40px)',
              boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,.4)' : '0 20px 40px rgba(16,24,40,.18)',
              border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
            }}>
              <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, margin: '0 0 clamp(24px, 4vw, 40px) 0', color: themeColors.text }}>
                📈 Progress & History
              </h1>
              
              {/* EHS Progress Bar */}
              <div style={{
                maxWidth: '620px',
                background: themeColors.progressBg,
                borderRadius: '24px',
                padding: '20px 16px',
                boxShadow: isDarkMode ? '0 6px 16px rgba(0,0,0,.3)' : '0 6px 16px rgba(21, 94, 21, .15)',
                border: `1px solid ${themeColors.border}`,
                display: 'grid',
                gap: '14px',
                marginBottom: '32px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, letterSpacing: '0.2px', color: themeColors.text }}>Training Progress</span>
                  <span style={{ fontWeight: 800, color: themeColors.text }}>{progressPercent}%</span>
                </div>

                <div style={{
                  position: 'relative',
                  height: '12px',
                  background: isDarkMode ? '#404040' : '#e9efe8',
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
                  color: themeColors.textSecondary,
                  fontSize: '12px',
                  letterSpacing: '0.2px'
                }}>
                  <span><strong style={{ color: themeColors.text }}>{completedCount}</strong> Completed</span>
                  <span><strong style={{ color: themeColors.text }}>{totalCount}</strong> Total</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowHistoryModal(true)}
                  style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.8)',
                  color: '#2a7d2e',
                  border: '2px solid rgba(42,125,46,0.2)',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
                  e.currentTarget.style.borderColor = 'rgba(42,125,46,0.4)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
                  e.currentTarget.style.borderColor = 'rgba(42,125,46,0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}>
                  📅 Training History
                </button>
                <button 
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  style={{
                  flex: 1,
                  background: downloadingPdf ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.8)',
                  color: '#2a7d2e',
                  border: '2px solid rgba(42,125,46,0.2)',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: downloadingPdf ? 'not-allowed' : 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  opacity: downloadingPdf ? 0.7 : 1
                }}
                onMouseOver={(e) => {
                  if (!downloadingPdf) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
                    e.currentTarget.style.borderColor = 'rgba(42,125,46,0.4)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!downloadingPdf) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
                    e.currentTarget.style.borderColor = 'rgba(42,125,46,0.2)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}>
                  {downloadingPdf ? '⏳ Generating PDF...' : '📥 Download Report'}
                </button>
              </div>
            </div>
            
            {/* Next Action Block */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f97316 100%)',
              color: 'white',
              borderRadius: 'clamp(16px, 3vw, 32px)',
              padding: 'clamp(20px, 4vw, 40px)',
              boxShadow: '0 20px 40px rgba(245, 158, 11, 0.3)'
            }}>
              <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, margin: '0 0 clamp(16px, 3vw, 24px) 0', color: '#000' }}>
                🔔 Next Action Required
              </h1>
              <div className="next-action-content" style={{ margin: '24px 0' }}>
                {nextAssignment ? (
                  <>
                    <h3>
                      {getModuleIcon(nextAssignment.title)} {nextAssignment.title}
                    </h3>
                    <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
                      Course ID: {nextAssignment.course_id}
                    </p>
                    <div className="next-action-meta" style={{
                      display: 'flex',
                      gap: '12px',
                      margin: '0 0 24px 0',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        background: '#F9A825',
                        color: '#222',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '18px'
                      }}>
                        {getPriorityBadge(nextAssignment.category).toUpperCase()}
                      </span>
                      <span style={{ opacity: 0.7, color: '#000' }}>Duration: 30 min</span>
                      {nextAssignment.due_date && (
                        <span style={{ opacity: 0.7, color: '#000' }}>
                          📅 Due: {new Date(nextAssignment.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3>
                      All Training Complete!
                    </h3>
                    <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
                      You have completed all required training modules.
                    </p>
                  </>
                )}
              </div>
              {nextAssignment ? (
                <button
                  className="next-action-btn"
                  onClick={() => handleStartTraining(nextAssignment.course_id, nextAssignment.title)}
                  style={{
                    background: '#ff8533',
                    color: 'white',
                    borderRadius: '16px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  START TRAINING
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
                  <button
                    className="next-action-btn"
                    style={{
                      background: '#ff8533',
                      color: 'white',
                      borderRadius: '16px',
                      border: 'none',
                      cursor: 'not-allowed',
                      opacity: 0.6,
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                    disabled
                  >
                    All Done 🎉
                  </button>
                  <button
                    onClick={() => setShowMeditationModal(true)}
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '16px 32px',
                      fontWeight: 700,
                      fontSize: '18px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    Now Relax & Meditate 🧘
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Training Sections - Only show if there are incomplete trainings */}
        {pendingAssignments.length > 0 && (
          <section style={{ marginBottom: 'clamp(24px, 4vw, 40px)' }}>
            <div style={{
              background: themeColors.cardBg,
              borderRadius: 'clamp(16px, 3vw, 32px)',
              padding: 'clamp(20px, 4vw, 40px)',
              boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,.4)' : '0 20px 40px rgba(16,24,40,.18)',
              border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
            }}>
              <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, margin: '0 0 clamp(16px, 3vw, 24px) 0', color: themeColors.text }}>
                📚 All Training
              </h1>
              <div>
                {assignments?.items && assignments.items.length > 0 ? (
                  assignments.items
                    .filter(assignment => assignment.status !== 'completed')
                    .filter((assignment, index) => {
                      // Skip the first pending assignment if it matches nextAssignment
                      if (nextAssignment && assignment.course_id === nextAssignment.course_id) {
                        return false
                      }
                      return true
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
        )}

        {/* Help Section */}
        <section>
          <div 
            data-section="help-support"
            style={{
              background: themeColors.cardBg,
              borderRadius: 'clamp(16px, 3vw, 32px)',
              padding: 'clamp(20px, 4vw, 40px)',
              boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,.4)' : '0 20px 40px rgba(16,24,40,.18)',
              border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
            }}>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800, margin: '0 0 clamp(16px, 3vw, 24px) 0', color: themeColors.text }}>
              📱 Help & Support
            </h1>
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* AI Assistant Block */}
              <div style={{
                background: isDarkMode ? '#333333' : '#f8f9fa',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0', color: '#2a7d2e' }}>
                  🤖 Ask AI Friend
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
                }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.5, color: themeColors.textSecondary, fontSize: '18px' }}>
                      AI chatbot makes boring workplace safety talks unforgettable
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '16px', color: themeColors.text }}>
                      <span>Available 24/7</span>
                      <span>Instant responses</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChatModal(true)}
                    style={{
                      background: '#2a7d2e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    ASK AI<br/>FRIEND
                  </button>
                </div>
              </div>

              {/* Mindful Break Block */}
              <div style={{
                background: isDarkMode ? '#333333' : '#f8f9fa',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0', color: '#f59e0b' }}>
                  🧘 Mindful Break
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
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
                      background: '#f59e0b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      lineHeight: '1.2'
                    }}
                  >
                    START<br/>SESSION
                  </button>
                </div>
              </div>

              {/* Contact EHS Block */}
              <div style={{
                background: isDarkMode ? '#333333' : '#f8f9fa',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0', color: '#2a7d2e' }}>
                  📞 Contact EHS Office
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
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
                      background: '#2a7d2e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                    onClick={() => window.open('mailto:ehs@calpoly.edu')}
                  >
                    Contact
                  </button>
                </div>
              </div>



              {/* Follow Cal Poly Block */}
              <div style={{
                background: isDarkMode ? '#333333' : '#f8f9fa',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0', color: '#2a7d2e' }}>
                  📱 Follow Cal Poly
                </h2>
                <div style={{
                  background: themeColors.cardBg,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: isDarkMode ? `1px solid ${themeColors.border}` : 'none'
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
      <footer style={{ background: isDarkMode ? '#2d2d2d' : '#f8f9fa', padding: '40px 0', borderTop: `1px solid ${themeColors.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px', color: themeColors.text, fontSize: '16px', fontWeight: 600 }}>
            <a href="https://www.sergey-ulyanov.pro" target="_blank" style={{ color: '#2a7d2e', textDecoration: 'none', fontWeight: 'bold' }}>
              Sergey Ulyanov
            </a>, AI Matchmakers Team
          </div>
          <div style={{ color: themeColors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            Digital Transformation Hub (DxHub) × Amazon Web Services (AWS) — September 2025<br/>
            📧 ulyanoow@gmail.com | 📱 (310) 713-7738
          </div>
          <div style={{ 
            background: isDarkMode ? '#3d3d00' : '#fff3cd', 
            border: `1px solid ${isDarkMode ? '#666600' : '#ffeaa7'}`, 
            borderRadius: '8px', 
            padding: '12px', 
            margin: '20px auto', 
            maxWidth: '600px',
            color: isDarkMode ? '#ffff99' : '#856404', 
            fontSize: '12px' 
          }}>
            ⚠️ <strong>Demo Educational Tool</strong> - Not a substitute for OSHA/EPA compliance. For official guidance, consult your EHS office.
          </div>
        </div>
      </footer>

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

      {/* Training History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: 'clamp(16px, 3vw, 24px)', 
            maxWidth: '800px', width: 'clamp(95%, 90vw, 90%)',
            maxHeight: '80vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📅 Training History</h2>
              <button onClick={() => setShowHistoryModal(false)} style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
              }}>×</button>
            </div>
            {trainingHistory ? (() => {
              const categories = [...new Set(trainingHistory.items.map(item => item.category))].sort()
              const statuses = ['completed', 'in_progress', 'assigned']
              
              let filteredItems = trainingHistory.items
              if (selectedCategory) {
                filteredItems = filteredItems.filter(item => item.category === selectedCategory)
              }
              if (selectedStatus) {
                filteredItems = filteredItems.filter(item => item.status === selectedStatus)
              }
              
              return (
                <div>
                  {/* Filter Header with Rate */}
                  <div style={{ marginBottom: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Filter By:</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2a7d2e' }}>
                        Rate: {trainingHistory.completion_rate}%
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', alignItems: 'center' }}>
                      {/* Total (clickable - shows all) */}
                      <button
                        onClick={() => { setSelectedCategory(null); setSelectedStatus(null) }}
                        style={{
                          padding: '6px 12px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 'bold',
                          background: !selectedCategory && !selectedStatus ? '#6c757d' : '#e9ecef',
                          color: !selectedCategory && !selectedStatus ? 'white' : '#495057',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                      >
                        Total: {trainingHistory.total_assignments}
                      </button>
                      
                      {/* Status Filters */}
                      <button
                        onClick={() => setSelectedStatus('completed')}
                        style={{
                          padding: '6px 12px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 'bold',
                          background: selectedStatus === 'completed' ? '#28a745' : '#d4edda',
                          color: selectedStatus === 'completed' ? 'white' : '#155724',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                      >
                        Completed: {trainingHistory.completed}
                      </button>
                      
                      <button
                        onClick={() => setSelectedStatus('in_progress')}
                        style={{
                          padding: '6px 12px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 'bold',
                          background: selectedStatus === 'in_progress' ? '#ffc107' : '#fff3cd',
                          color: selectedStatus === 'in_progress' ? '#212529' : '#856404',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                      >
                        In Progress: {trainingHistory.in_progress}
                      </button>
                      
                      <button
                        onClick={() => setSelectedStatus('assigned')}
                        style={{
                          padding: '6px 12px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 'bold',
                          background: selectedStatus === 'assigned' ? '#dc3545' : '#f8d7da',
                          color: selectedStatus === 'assigned' ? 'white' : '#721c24',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                      >
                        Assigned: {trainingHistory.assigned}
                      </button>
                      
                      {/* Category Filters */}
                      {categories.map(category => {
                        const count = trainingHistory.items.filter(item => item.category === category).length
                        return (
                          <button
                            key={category}
                            onClick={() => { setSelectedCategory(category); setSelectedStatus(null) }}
                            style={{
                              padding: '6px 12px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 'bold',
                              background: selectedCategory === category ? '#2a7d2e' : '#e9ecef',
                              color: selectedCategory === category ? 'white' : '#495057',
                              cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'capitalize'
                            }}
                          >
                            {category} ({count})
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {filteredItems.length > 0 ? filteredItems.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '12px', border: `1px solid ${themeColors.border}`, borderRadius: '8px',
                        marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: themeColors.cardBg
                      }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: themeColors.text }}>{item.title}</div>
                          <div style={{ fontSize: '14px', color: themeColors.textSecondary }}>{item.category} • {item.course_id}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                            background: item.status === 'completed' ? '#d4edda' : item.status === 'in_progress' ? '#fff3cd' : '#f8d7da',
                            color: item.status === 'completed' ? '#155724' : item.status === 'in_progress' ? '#856404' : '#721c24'
                          }}>
                            {item.status.toUpperCase()}
                          </div>
                          {item.due_date && <div style={{ fontSize: '12px', color: themeColors.textSecondary, marginTop: '4px' }}>
                            {item.status === 'completed' ? '📅 Completed: ' : '📅 Due: '}{item.due_date}
                          </div>}
                        </div>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No courses found{selectedCategory ? ` in "${selectedCategory}" category` : ''}{selectedStatus ? ` with "${selectedStatus}" status` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )
            })() : (
              <div>Loading...</div>
            )}
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
            border: isDarkMode ? `1px solid ${themeColors.border}` : 'none',
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
                  placeholder="e.g., What PPE do I need in the lab?"
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
              
              {chatResponse.includes('Click "Retry"') && (
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <button
                    onClick={handleRetry}
                    disabled={!lastMessage || isTyping}
                    style={{
                      background: '#ff8533',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      opacity: (!lastMessage || isTyping) ? 0.5 : 1
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: 'clamp(16px, 3vw, 24px)', 
            maxWidth: '900px', width: 'clamp(95%, 90vw, 90%)',
            maxHeight: '80vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📄 Progress Report</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  style={{
                    background: '#2a7d2e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: downloadingPdf ? 'not-allowed' : 'pointer',
                    opacity: downloadingPdf ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {downloadingPdf ? '⏳ Generating...' : '📥 Download PDF'}
                </button>
                <button onClick={() => setShowReportModal(false)} style={{
                  background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
                }}>×</button>
              </div>
            </div>
            {progressReport ? (
              <div>
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h3>Overall Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                    <div><strong>Total:</strong> {progressReport.summary.total_assignments}</div>
                    <div><strong>Completed:</strong> {progressReport.summary.completed}</div>
                    <div><strong>In Progress:</strong> {progressReport.summary.in_progress}</div>
                    <div><strong>Assigned:</strong> {progressReport.summary.assigned}</div>
                    <div><strong>Rate:</strong> {progressReport.summary.completion_rate}%</div>
                  </div>
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <h3>By Category</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {Object.entries(progressReport.by_category).map(([category, stats]) => (
                      <div key={category} style={{
                        padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{category}</div>
                        <div>{stats.completed}/{stats.total} ({stats.completion_rate}%)</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <h3>Recent Completions</h3>
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {progressReport.recent_completions.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '8px', border: '1px solid #e0e0e0', borderRadius: '4px', marginBottom: '4px'
                        }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.title}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Recently completed</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3>Upcoming Deadlines</h3>
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {progressReport.upcoming_deadlines.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '8px', border: '1px solid #e0e0e0', borderRadius: '4px', marginBottom: '4px'
                        }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.title}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Due: {item.due_date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </div>
        </div>
      )}

      {/* Meditation Modal */}
      {showMeditationModal && <MeditationApp onClose={() => setShowMeditationModal(false)} />}

      {/* User Profile Modal */}
      {showUserModal && userProfile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: 'clamp(16px, 3vw, 24px)', 
            maxWidth: '500px', width: 'clamp(95%, 90vw, 90%)',
            maxHeight: '80vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>👤 User Profile</h2>
              <button onClick={() => setShowUserModal(false)} style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
              }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ padding: '12px', background: isDarkMode ? '#333333' : '#f8f9fa', borderRadius: '6px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#2a7d2e', fontSize: '16px' }}>👤 Basic Information</h3>
                <div style={{ display: 'grid', gap: '4px', fontSize: '14px', color: themeColors.text }}>
                  <div><strong>User ID:</strong> {userProfile.user_id}</div>
                  <div><strong>Name:</strong> {userProfile.name || 'Not specified'}</div>
                  <div><strong>Email:</strong> {userProfile.email || 'Not specified'}</div>
                </div>
              </div>
              
              <div style={{ padding: '12px', background: isDarkMode ? '#333333' : '#f8f9fa', borderRadius: '6px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#2a7d2e', fontSize: '16px' }}>📊 Training Statistics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '14px', color: themeColors.text }}>
                  <div><strong>Total:</strong> {userProfile.total_assignments}</div>
                  <div><strong>Done:</strong> {userProfile.completed_assignments}</div>
                  <div><strong>Rate:</strong> {userProfile.completion_rate}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}