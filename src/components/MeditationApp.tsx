import { useState, useEffect } from 'react'

interface MeditationAppProps {
  onClose: () => void
}

export function MeditationApp({ onClose }: MeditationAppProps) {
  const [currentSession, setCurrentSession] = useState<'breathing' | 'focus' | 'stress' | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')
  const [breathCount, setBreathCount] = useState(0)
  const [selectedDuration, setSelectedDuration] = useState(5)


  const sessions = [
    { id: 'breathing', name: 'Deep Breathing', icon: '🫁', description: 'Calm your mind with guided breathing exercises', color: 'linear-gradient(135deg, #10b981, #34d399)' },
    { id: 'focus', name: 'Focus &\nClarity', icon: '🎯', description: 'Enhance concentration and mental clarity', color: 'linear-gradient(135deg, #8b5cf6, #a855f7)' },
    { id: 'stress', name: 'Stress\nRelief', icon: '😌', description: 'Release tension\nand find\ninner peace', color: 'linear-gradient(135deg, #06b6d4, #0891b2)' }
  ]

  const durations = [3, 5, 10, 15]





  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setIsActive(false)
      setCurrentSession(null)
    }
    return () => clearInterval(interval)
  }, [isActive, timeLeft])



  useEffect(() => {
    let breathInterval: NodeJS.Timeout
    if (isActive && currentSession === 'breathing') {
      breathInterval = setInterval(() => {
        setBreathPhase(phase => {
          if (phase === 'inhale') return 'hold'
          if (phase === 'hold') return 'exhale'
          setBreathCount(count => count + 1)
          return 'inhale'
        })
      }, 4000)
    }
    return () => clearInterval(breathInterval)
  }, [isActive, currentSession])

  const startSession = (sessionType: 'breathing' | 'focus' | 'stress') => {
    setCurrentSession(sessionType)
    setTimeLeft(selectedDuration * 60)
    setIsActive(true)
    setBreathCount(0)
    setBreathPhase('inhale')
  }

  const pauseResume = () => {
    setIsActive(!isActive)
  }

  const resetSession = () => {
    setIsActive(false)
    setTimeLeft(selectedDuration * 60)
    setBreathCount(0)
    setBreathPhase('inhale')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSessionContent = () => {
    switch (currentSession) {
      case 'breathing':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${breathPhase === 'inhale' ? '#4ade80' : breathPhase === 'hold' ? '#fbbf24' : '#60a5fa'}, transparent)`,
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              transform: breathPhase === 'inhale' ? 'scale(1.2)' : 'scale(1)',
              transition: 'all 4s ease-in-out'
            }}>
              🫁
            </div>
            <h3 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>
              {breathPhase === 'inhale' ? 'Breathe In...' : breathPhase === 'hold' ? 'Hold...' : 'Breathe Out...'}
            </h3>
            <p style={{ fontSize: '18px', color: '#666', margin: '0 0 16px 0' }}>Breath Count: {breathCount}</p>
          </div>
        )
      case 'focus':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #8b5cf6, #a855f7)',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              animation: 'pulse 2s infinite'
            }}>
              🎯
            </div>
            <h3 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>Focus on the Center</h3>
            <p style={{ fontSize: '18px', color: '#666' }}>Let your thoughts settle and find clarity</p>
          </div>
        )
      case 'stress':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #06b6d4, #0891b2)',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              animation: 'float 3s ease-in-out infinite'
            }}>
              😌
            </div>
            <h3 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>Release and Relax</h3>
            <p style={{ fontSize: '18px', color: '#666' }}>Let go of tension and find peace</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
      <div style={{
        background: 'white', borderRadius: '24px', padding: '32px', maxWidth: '600px', width: '90%',
        maxHeight: '80vh', overflow: 'auto', textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '28px' }}>🧘 Mindful Break</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
          }}>×</button>
        </div>

        {!currentSession ? (
          <div>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>
              Take a moment to recharge your mind and reduce stress
            </p>
            
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Session Duration</h3>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {durations.map(duration => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    style={{
                      padding: '8px 16px',
                      border: selectedDuration === duration ? '2px solid #2a7d2e' : '2px solid #e0e0e0',
                      borderRadius: '8px',
                      background: selectedDuration === duration ? '#f0f8f0' : 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: selectedDuration === duration ? 'bold' : 'normal'
                    }}
                  >
                    {duration} min
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
              {sessions.map(session => (
                <div key={session.id} style={{
                  border: 'none',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: session.color,
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }} onClick={() => startSession(session.id as any)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}>
                  <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', textAlign: 'center', whiteSpace: 'pre-line', color: 'white' }}>{session.name}</h3>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{session.icon}</div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0, textAlign: 'center', whiteSpace: 'pre-line' }}>{session.description}</p>
                </div>
              ))}
            </div>
            
            {/* Cafeteria Notice */}
            <div style={{
              marginTop: '32px',
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <div style={{ color: '#666' }}>
                <a href="#" style={{ 
                  textDecoration: 'none',
                  fontSize: '14px', 
                  color: '#666',
                  fontWeight: '400'
                }}>
                  🥐 <span style={{ textDecoration: 'underline' }}>Have you tried the new low-calorie pastries in the cafeteria?</span>
                </a>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#999' }}>
                  Say "meditation" and get 10% off
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '24px', margin: '0 0 16px 0' }}>
                {sessions.find(s => s.id === currentSession)?.name}
              </h3>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2a7d2e', marginBottom: '16px' }}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {getSessionContent()}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '32px', flexWrap: 'wrap' }}>
              <button
                onClick={pauseResume}
                style={{
                  background: isActive ? '#f59e0b' : '#2a7d2e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {isActive ? '⏸️ Pause' : '▶️ Resume'}
              </button>

              <button
                onClick={resetSession}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🔄 Reset
              </button>
              <button
                onClick={() => setCurrentSession(null)}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🏠 Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}