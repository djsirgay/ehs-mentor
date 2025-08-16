'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  city: z.string().min(2, 'City is required'),
  portfolio: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  about: z.string().min(50, 'Please tell us more about yourself (min 50 characters)'),
  cv: z.any().optional(),
  consent: z.boolean().refine(val => val === true, 'You must agree to continue')
})

type FormData = z.infer<typeof schema>

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div 
    role="status" 
    className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"
  >
    {message}
    <button onClick={onClose} className="ml-4 text-green-200 hover:text-white">×</button>
  </div>
)

export default function KampusApplication() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange'
  })
  
  const consent = watch('consent')
  
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    console.log('Form submission:', data)
    
    // Fake API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setShowToast(true)
    reset()
    
    setTimeout(() => setShowToast(false), 5000)
  }
  
  const inputClass = (error?: any) => `
    w-full px-4 py-3 border rounded-lg transition-colors font-[system-ui]
    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
    ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'}
  `
  
  const labelClass = "block text-sm font-medium text-gray-700 mb-2"
  const errorClass = "text-red-600 text-sm mt-1"
  
  return (
    <>
      {showToast && (
        <Toast 
          message="Application submitted successfully!" 
          onClose={() => setShowToast(false)} 
        />
      )}
      
      <div className="py-16 px-4 font-[system-ui]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Apply to Program
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join our creative community and transform your design career. 
              Tell us about yourself and your aspirations.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fullName" className={labelClass}>
                    Full Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    className={inputClass(errors.fullName)}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                    {...register('fullName')}
                  />
                  {errors.fullName && (
                    <p id="fullName-error" className={errorClass}>
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={inputClass(errors.email)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p id="email-error" className={errorClass}>
                      {errors.email.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className={inputClass(errors.phone)}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p id="phone-error" className={errorClass}>
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="city" className={labelClass}>
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    className={inputClass(errors.city)}
                    aria-invalid={!!errors.city}
                    aria-describedby={errors.city ? 'city-error' : undefined}
                    {...register('city')}
                  />
                  {errors.city && (
                    <p id="city-error" className={errorClass}>
                      {errors.city.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="portfolio" className={labelClass}>
                  Portfolio URL
                </label>
                <input
                  id="portfolio"
                  type="url"
                  placeholder="https://your-portfolio.com"
                  className={inputClass(errors.portfolio)}
                  aria-invalid={!!errors.portfolio}
                  aria-describedby={errors.portfolio ? 'portfolio-error' : undefined}
                  {...register('portfolio')}
                />
                {errors.portfolio && (
                  <p id="portfolio-error" className={errorClass}>
                    {errors.portfolio.message}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="about" className={labelClass}>
                  Tell us about yourself *
                </label>
                <textarea
                  id="about"
                  rows={5}
                  placeholder="What motivates you? What are your design goals? Why do you want to join this program?"
                  className={inputClass(errors.about)}
                  aria-invalid={!!errors.about}
                  aria-describedby={errors.about ? 'about-error' : undefined}
                  {...register('about')}
                />
                {errors.about && (
                  <p id="about-error" className={errorClass}>
                    {errors.about.message}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="cv" className={labelClass}>
                  Upload CV/Resume
                </label>
                <input
                  id="cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  {...register('cv')}
                />
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  id="consent"
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900"
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  {...register('consent')}
                />
                <div>
                  <label htmlFor="consent" className="text-sm text-gray-700">
                    I agree to the processing of my personal data and consent to receive 
                    communications about the program. *
                  </label>
                  {errors.consent && (
                    <p id="consent-error" className={errorClass}>
                      {errors.consent.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={!isValid || !consent || isSubmitting}
                  className="w-full md:w-auto px-8 py-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all md:sticky md:bottom-4"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

// Demo Page Component
export function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-lg mx-auto">
        <KampusApplication />
      </div>
    </div>
  )
}