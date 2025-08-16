'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  city: z.string().min(2, 'City is required'),
  portfolio: z.string().url('Invalid URL').optional().or(z.literal('')),
  about: z.string().min(10, 'Tell us more about yourself (min 10 characters)'),
  file: z.any().optional(),
  consent: z.boolean().refine(val => val === true, 'You must agree to continue')
})

type FormData = z.infer<typeof schema>

export default function KampusApplication() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm<FormData>({
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
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-black text-black mb-4 tracking-tight">
            APPLICATION
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl">
            Join our creative program. Fill out the form below and we'll get back to you soon.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900 mb-2">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  {...register('fullName')}
                  aria-invalid={errors.fullName ? 'true' : 'false'}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {errors.fullName && (
                  <p id="fullName-error" role="status" className="mt-1 text-sm text-red-600">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {errors.email && (
                  <p id="email-error" role="status" className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                  Phone *
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  aria-invalid={errors.phone ? 'true' : 'false'}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {errors.phone && (
                  <p id="phone-error" role="status" className="mt-1 text-sm text-red-600">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-gray-900 mb-2">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  {...register('city')}
                  aria-invalid={errors.city ? 'true' : 'false'}
                  aria-describedby={errors.city ? 'city-error' : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {errors.city && (
                  <p id="city-error" role="status" className="mt-1 text-sm text-red-600">
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="portfolio" className="block text-sm font-semibold text-gray-900 mb-2">
                  Portfolio URL
                </label>
                <input
                  id="portfolio"
                  type="url"
                  {...register('portfolio')}
                  aria-invalid={errors.portfolio ? 'true' : 'false'}
                  aria-describedby={errors.portfolio ? 'portfolio-error' : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {errors.portfolio && (
                  <p id="portfolio-error" role="status" className="mt-1 text-sm text-red-600">
                    {errors.portfolio.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="about" className="block text-sm font-semibold text-gray-900 mb-2">
                  About You *
                </label>
                <textarea
                  id="about"
                  rows={4}
                  {...register('about')}
                  aria-invalid={errors.about ? 'true' : 'false'}
                  aria-describedby={errors.about ? 'about-error' : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                />
                {errors.about && (
                  <p id="about-error" role="status" className="mt-1 text-sm text-red-600">
                    {errors.about.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="file" className="block text-sm font-semibold text-gray-900 mb-2">
                  CV / Resume
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  {...register('file')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-start space-x-3">
                  <input
                    id="consent"
                    type="checkbox"
                    {...register('consent')}
                    aria-invalid={errors.consent ? 'true' : 'false'}
                    aria-describedby={errors.consent ? 'consent-error' : undefined}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700">
                    I agree to the processing of my personal data and consent to be contacted regarding this application. *
                  </label>
                </div>
                {errors.consent && (
                  <p id="consent-error" role="status" className="mt-1 text-sm text-red-600">
                    {errors.consent.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={!isValid || !consent || isSubmitting}
                className="w-full md:w-auto px-8 py-4 bg-black text-white font-bold text-lg rounded-lg hover:bg-gray-800 active:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 md:sticky md:bottom-6"
              >
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showToast && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50" role="status">
          Application submitted successfully!
        </div>
      )}
    </div>
  )
}

export function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-lg mx-auto">
        <KampusApplication />
      </div>
    </div>
  )
}