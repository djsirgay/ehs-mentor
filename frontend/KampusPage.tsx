'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

const Section = ({ children, id, className = '' }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}

const Accordion = ({ items }) => {
  const [openIndex, setOpenIndex] = useState(null)
  
  return (
    <div className="border-t border-gray-200">
      {items.map((item, index) => (
        <div key={index} className="border-b border-gray-200">
          <button
            className="w-full py-6 text-left flex justify-between items-center text-xl font-semibold text-gray-900 hover:text-gray-600 transition-colors focus-visible:outline-2 focus-visible:outline-gray-900 focus-visible:outline-offset-2"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            aria-expanded={openIndex === index}
          >
            <span>{item.title}</span>
            <motion.span
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-base"
            >
              ↓
            </motion.span>
          </button>
          <motion.div
            initial={false}
            animate={{
              height: openIndex === index ? 'auto' : 0,
              opacity: openIndex === index ? 1 : 0
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-gray-600 leading-relaxed">
              {item.content}
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  )
}

const Navigation = () => {
  const [activeSection, setActiveSection] = useState('overview')
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.5 }
    )
    
    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section)
    })
    
    return () => observer.disconnect()
  }, [])
  
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
  
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'program', label: 'Program' },
            { id: 'apply', label: 'Apply' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-gray-900 focus-visible:outline-offset-2 ${
                activeSection === id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default function KampusPage() {
  const programFeatures = [
    {
      title: 'Design Thinking',
      description: 'Learn human-centered design principles and methodologies for solving complex problems.'
    },
    {
      title: 'Digital Strategy',
      description: 'Develop comprehensive digital transformation strategies for modern businesses.'
    },
    {
      title: 'User Experience',
      description: 'Master the art of creating intuitive and engaging user experiences across platforms.'
    },
    {
      title: 'Brand Identity',
      description: 'Build distinctive brand identities that resonate with target audiences.'
    },
    {
      title: 'Innovation Lab',
      description: 'Experiment with emerging technologies and creative approaches to design challenges.'
    },
    {
      title: 'Portfolio Development',
      description: 'Create a professional portfolio that showcases your unique design perspective.'
    }
  ]
  
  const faqItems = [
    {
      title: 'What are the admission requirements?',
      content: 'We look for creative individuals with a passion for design and innovation. A portfolio demonstrating your creative work is required, along with a personal statement explaining your motivation.'
    },
    {
      title: 'How long is the program?',
      content: 'The intensive program runs for 12 months, combining theoretical learning with hands-on projects. Classes are held three days per week to allow for independent work and internships.'
    },
    {
      title: 'What career opportunities are available?',
      content: 'Graduates work as UX designers, brand strategists, creative directors, and design consultants at leading agencies, startups, and corporations worldwide.'
    },
    {
      title: 'Is financial aid available?',
      content: 'We offer merit-based scholarships and flexible payment plans. Our admissions team can help you explore funding options that fit your situation.'
    }
  ]
  
  return (
    <div className="min-h-screen bg-gray-50 font-[system-ui]">
      <Navigation />
      
      <main>
        <Section id="overview" className="py-16 sm:py-24 lg:py-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h1 
              className="font-bold text-gray-900 leading-tight mb-8"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}
            >
              Design Education
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
              A comprehensive program for creative professionals who want to shape the future of digital design and innovation.
            </p>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Learn from industry experts, work on real projects, and build the skills needed to create meaningful digital experiences.
            </p>
          </div>
        </Section>
        
        <Section id="program" className="py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 mb-6">
              Program Features
            </h2>
            <p className="text-xl text-gray-600 mb-16 max-w-3xl">
              Six core modules designed to develop your creative and strategic thinking abilities.
            </p>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {programFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white p-8 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
        
        <Section id="apply" className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 mb-6">
              Application Process
            </h2>
            <p className="text-xl text-gray-600 mb-16">
              Everything you need to know about joining our program.
            </p>
            
            <Accordion items={faqItems} />
            
            <div className="mt-16 text-center">
              <button className="bg-gray-900 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-gray-900 focus-visible:outline-offset-2">
                Start Application
              </button>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}