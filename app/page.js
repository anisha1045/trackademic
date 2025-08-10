'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useEffect } from 'react'
import Image from 'next/image'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-blue-400">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const features = [
    {
      title: 'Syllabus Upload & Deadline Extraction',
      description:
        'Upload your syllabus and let Trackademic auto-extract deadlines using OpenAI/Gemini.',
    },
    {
      title: 'Smart Daily Workload View',
      description:
        'AI-generated daily task suggestions tailored to your focus level and time availability.',
    },
    {
      title: 'PDF Uploads & Processing',
      description:
        'Simple drag-and-drop PDF interface that feeds data directly into your smart schedule.',
    },
    {
      title: 'Calendar Sync + Reminders',
      description:
        'Connect Google Calendar for smart push/email reminders and seamless event syncing.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-500 to-blue-400 p-4">
      {/* Navbar */}
      <nav className="flex justify-between items-center py-4 px-6 text-white">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-wide">Trackademic</h1>
        </div>

        {/* Right: Login */}
        <button
          onClick={() => router.push('/login')}
          className="text-sm border border-white px-4 py-2 rounded-lg hover:bg-white hover:text-indigo-600 transition"
        >
          Login
        </button>
      </nav>

      {/* Hero */}
      <header className="text-center text-white py-12 px-6">
        <h2 className="text-4xl font-bold mb-4">
          Smarter Scheduling for Students
        </h2>
        <p className="text-lg max-w-2xl mx-auto">
          Upload syllabi, generate AI-powered study plans, and never miss a
          deadline again.
        </p>
        <button
          onClick={() => router.push('/signup')}
          className="mt-8 bg-white text-indigo-600 font-semibold px-6 py-3 rounded-lg shadow hover:bg-gray-100 transition"
        >
          Get Started
        </button>
      </header>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition"
          >
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-700">{feature.description}</p>
          </div>
        ))}
      </section>

      {/* Tagline */}
      <div className="flex flex-col items-center mt-12 text-white">
        <p className="mt-4 text-lg font-semibold">
          Built to help you stay ahead, effortlessly.
        </p>
      </div>
    </div>
  )
}