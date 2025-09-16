import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

interface UploadResult {
  doc_id: number
  filename: string
  bytes?: number
  duplicate?: boolean
  message?: string
}

interface ProcessResult {
  doc_id: number
  inserted: number
  skipped: number
  llm_suggestions: Array<{
    course_id: string
    confidence: number
    evidence: string
  }>
}

export function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [role, setRole] = useState('warehouse_worker')
  const [region, setRegion] = useState('US-CA')
  const [frequency, setFrequency] = useState('annual')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)
  const [step, setStep] = useState<'upload' | 'processing' | 'complete'>('upload')

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload/pdf`, {
        method: 'POST',
        body: formData
      })
      if (!response.ok) throw new Error('Upload failed')
      return response.json()
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data)
      if (!data.duplicate) {
        setStep('processing')
        processMutation.mutate({
          doc_id: data.doc_id,
          role,
          region,
          frequency
        })
      } else {
        setStep('complete')
      }
    }
  })

  // Process mutation
  const processMutation = useMutation({
    mutationFn: async (payload: { doc_id: number, role: string, region: string, frequency: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/documents/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('Processing failed')
      return response.json()
    },
    onSuccess: (data: ProcessResult) => {
      setProcessResult(data)
      setStep('complete')
    }
  })

  const handleUpload = () => {
    if (!file) return
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source', 'ADMIN_UPLOAD')
    formData.append('title', file.name)
    
    uploadMutation.mutate(formData)
  }

  const handleReset = () => {
    setFile(null)
    setUploadResult(null)
    setProcessResult(null)
    setStep('upload')
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '16px',
        marginBottom: '32px'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
          📄 Document Upload & Processing
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
          Upload PDF documents and extract training requirements using AI
        </p>
      </header>

      {step === 'upload' && (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px 0' }}>
            📤 Upload Document
          </h2>

          {/* File Upload */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Select PDF Document:
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            {file && (
              <p style={{ margin: '8px 0 0 0', color: '#16a34a', fontSize: '14px' }}>
                ✓ Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {/* Role Configuration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Target Role:
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="warehouse_worker">Warehouse Worker</option>
                <option value="forklift_operator">Forklift Operator</option>
                <option value="safety_manager">Safety Manager</option>
                <option value="maintenance_tech">Maintenance Tech</option>
                <option value="general_worker">General Worker</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Region:
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="US-CA">US-CA</option>
                <option value="US-TX">US-TX</option>
                <option value="US-NY">US-NY</option>
                <option value="EU-DE">EU-DE</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Frequency:
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploadMutation.isPending}
            style={{
              background: file && !uploadMutation.isPending ? '#7c3aed' : '#9ca3af',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: file && !uploadMutation.isPending ? 'pointer' : 'not-allowed',
              width: '100%'
            }}
          >
            {uploadMutation.isPending ? '⏳ Uploading...' : '🚀 Upload & Process Document'}
          </button>

          {uploadMutation.error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#fee2e2',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              color: '#dc2626'
            }}>
              ❌ Upload failed: {uploadMutation.error.message}
            </div>
          )}
        </div>
      )}

      {step === 'processing' && (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤖</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
            Processing with Amazon Bedrock
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            AI is analyzing the document and extracting training requirements...
          </p>
          <div style={{
            width: '100%',
            height: '4px',
            background: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
              animation: 'pulse 2s infinite'
            }} />
          </div>
        </div>
      )}

      {step === 'complete' && uploadResult && (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px 0' }}>
            ✅ Processing Complete
          </h2>

          {/* Upload Summary */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #16a34a',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#15803d' }}>Document Uploaded</h3>
            <p style={{ margin: 0, color: '#166534' }}>
              📄 {uploadResult.filename} 
              {uploadResult.bytes && ` (${Math.round(uploadResult.bytes / 1024)} KB)`}
            </p>
            {uploadResult.duplicate && (
              <p style={{ margin: '8px 0 0 0', color: '#ca8a04' }}>
                ⚠️ {uploadResult.message}
              </p>
            )}
          </div>

          {/* Processing Results */}
          {processResult && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #2563eb',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1d4ed8' }}>AI Processing Results</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                    {processResult.inserted}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Courses Added</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ca8a04' }}>
                    {processResult.skipped}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Already Existed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                    {processResult.llm_suggestions.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>AI Suggestions</div>
                </div>
              </div>

              {processResult.llm_suggestions.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Extracted Courses:</h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {processResult.llm_suggestions.map((suggestion, idx) => (
                      <div key={idx} style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ color: '#1f2937' }}>{suggestion.course_id}</strong>
                          <span style={{
                            background: suggestion.confidence > 0.7 ? '#dcfce7' : suggestion.confidence > 0.4 ? '#fef3c7' : '#fee2e2',
                            color: suggestion.confidence > 0.7 ? '#15803d' : suggestion.confidence > 0.4 ? '#92400e' : '#dc2626',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                          {suggestion.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleReset}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            📤 Upload Another Document
          </button>
        </div>
      )}
    </div>
  )
}