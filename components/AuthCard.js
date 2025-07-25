'use client'
import Link from 'next/link'
import { FaUser, FaLock } from 'react-icons/fa'

export default function AuthCard({
  title,
  buttonText,
  onSubmit,
  email,
  setEmail,
  password,
  setPassword,
  error,
  footerText,
  footerLink,
  footerLinkText
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-xl overflow-hidden flex flex-col md:flex-row w-full max-w-4xl">
        
        {/* Left Side: Welcome */}
        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-b from-blue-600 to-indigo-700 text-white p-8 w-1/2">
          <h2 className="text-3xl font-bold mb-4">Welcome to Trackademic</h2>
          <p className="text-sm text-center max-w-xs">
            Stay on track, in and out of class. We help students track due dates, tasks, and take control of their semester.
          </p>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 bg-white dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white text-center mb-6">
            {title}
          </h1>

          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          {/* Email input */}
          <div className="relative mb-4">
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FaUser className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Password input */}
          <div className="relative mb-4">
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FaLock className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Submit */}
          <button
            onClick={onSubmit}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {buttonText}
          </button>

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {footerText}{' '}
            <Link href={footerLink} className="text-blue-600 hover:underline dark:text-blue-400">
              {footerLinkText}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
