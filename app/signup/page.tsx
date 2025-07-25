'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      router.push('/set-up-profile')
    }, 2000)
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

          <button disabled={loading} type="submit" className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-semibold">
            {loading ? 'Signing Up...' : 'Sign Up'}
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
