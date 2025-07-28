'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'

export default function SignUpPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const { data, error: signUpError } = await signUp(form.email, form.password, {
      name: form.name,
      phone: form.phone,
      college: form.college
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setLoading(false)
        router.push('/dashboard')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-blue-400 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 grid md:grid-cols-2 gap-8 w-full max-w-5xl transition">
        
        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 justify-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome to <span className="text-indigo-600">Trackademic</span>
          </h1>
          <p className="text-sm text-gray-500 mb-2">Stay on track, in and out of class</p>

          <input type="text" name="name" placeholder="Full Name" onChange={handleChange} required
            className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"/>

          <input type="email" name="email" placeholder="Email" onChange={handleChange} required
            className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"/>

          <input type="tel" name="phone" placeholder="Phone Number" onChange={handleChange} required
            className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"/>

          <input type="text" name="college" placeholder="College or University" onChange={handleChange} required
            className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"/>

          <input type="password" name="password" placeholder="Password" onChange={handleChange} required
            className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"/>

          {error && (
            <p className="text-sm text-red-600 bg-red-100 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-100 px-4 py-2 rounded-lg">
              Account created successfully! Redirecting...
            </p>
          )}

          <button disabled={loading} type="submit" className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center">
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            ) : (
              'Sign Up'
            )}
          </button>

          <p className="text-sm text-gray-500 text-center">
            Already have an account? <a href="/login" className="text-indigo-600 hover:underline">Log In</a>
          </p>
        </form>

        {/* Right: Owl & Tagline */}
        <div className="hidden md:flex flex-col items-center justify-center text-center px-4">
          <Image
            src="/owl.png"
            alt="Trackademic Owl"
            width={200}
            height={200}
            className="transition-transform duration-300 ease-in-out hover:-translate-y-1"
          />
          <h2 className="mt-6 text-xl font-semibold text-gray-700">
            Smarter schedules start here.
          </h2>
        </div>
      </div>
    </div>
  )
}
