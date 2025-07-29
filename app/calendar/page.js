'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

function CalendarContent() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showSyncPopup, setShowSyncPopup] = useState(false)
  const [isGoogleSynced, setIsGoogleSynced] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') 
  const [googleEvents, setGoogleEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadCalendarEvents()
      checkGoogleSyncStatus()
    }
  }, [user?.id])

  const checkGoogleSyncStatus = async () => {
    try {
      const res = await fetch(`/api/get-calendar-events?user_id=${user.id}`)
      const data = await res.json()
      setIsGoogleSynced(!data.needsAuth)
    } catch (err) {
      console.error('Error checking sync status:', err)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/simple-calendar-sync?user_id=' + user.id, {
        method: 'POST'
      })
      const data = await res.json()
      
      if (data.needsAuth) {
        setMessage('Redirecting to Google authentication...')
        const authRes = await fetch(`/api/simple-calendar-auth?user_id=${user.id}`)
        const authData = await authRes.json()
        
        if (authData.success && authData.authUrl) {
          window.location.href = authData.authUrl
        } else {
          setMessage('Error getting authentication URL')
        }
        return
      }
      
      setMessage(data.message || 'Synced!')
      setIsGoogleSynced(true)
      setShowSyncPopup(false)
      // After syncing, reload calendar events to show the new ones
      loadCalendarEvents()
    } catch (err) {
      console.error('Sync error:', err)
      setMessage('Failed to sync tasks.')
    } finally {
      setLoading(false)
    }
  }

  const loadCalendarEvents = async () => {
    setLoadingEvents(true)
    try {
      const res = await fetch(`/api/get-calendar-events?user_id=${user.id}`)
      const data = await res.json()
      
      if (data.needsAuth) {
        setGoogleEvents([])
        return
      }
      
      if (data.success) {
        setGoogleEvents(data.events || [])
      } else {
        console.error('Failed to load calendar events:', data.message)
      }
    } catch (err) {
      console.error('Error loading events:', err)
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    const googleEventsForDay = googleEvents.filter(event => {
      const eventDate = new Date(event.start)
      const eventDateStr = eventDate.toISOString().split('T')[0]
      return eventDateStr === dateStr
    }).map(event => ({
      ...event,
      time: event.isAllDay ? 'All day' : new Date(event.start).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      }),
      color: event.title.startsWith('📚') ? 'bg-green-600' : 'bg-blue-500' 
    }))
    
    return googleEventsForDay
  }

  const formatEventTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-500 to-blue-400">
      {/* Navbar */}
      <nav className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-600">Trackademic</h1>
        <div className="flex gap-6">
          <a href="/dashboard" className="text-indigo-600 font-medium hover:underline">Dashboard</a>
          <a href="/calendar" className="text-indigo-600 font-medium hover:underline border-b-2 border-indigo-600">Calendar</a>
          <a href="/assignment" className="text-indigo-600 font-medium hover:underline">Assignments</a>
          <a href="/classes" className="text-indigo-600 font-medium hover:underline">Classes</a>
          <button onClick={handleLogout} className="text-red-500 font-medium hover:underline">Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-indigo-600 mb-2">Calendar</h1>
              <p className="text-gray-600">Manage your schedule and track deadlines</p>
            </div>
            
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['day', 'week', 'month'].map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                    view === viewType 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {viewType}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold text-gray-800">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Google Calendar Sync - Only shown if not yet synced */}
        {!isGoogleSynced && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-blue-800">Sync with Google Calendar</h3>
                  <p className="text-blue-600 text-sm">Connect your Google Calendar to sync your tasks and events.</p>
                </div>
              </div>
              <button
                onClick={handleSync}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sync Now
              </button>
            </div>
            {message && (
              <p className="mt-2 text-sm text-blue-700 font-medium">
                {message}
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl p-6">

          {/* Sync Popup */}
          {showSyncPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-96 max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-indigo-600">Google Calendar Sync</h3>
                  <button
                    onClick={() => setShowSyncPopup(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Sync your Trackademic tasks with Google Calendar to keep everything in one place.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSync}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {loading ? 'Syncing...' : 'Sync Tasks to Google Calendar'}
                  </button>
                  <button
                    onClick={() => setShowSyncPopup(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
                {message && (
                  <p className="mt-3 text-sm text-gray-700 text-center">
                    {message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-50 rounded-lg">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-100 rounded-lg ${
                  day ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                } ${isToday(day) ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) ? 'text-indigo-600' : 'text-gray-900'
                    }`}>
                      {day}
                    </div>
                    
                    {/* Events for this day */}
                    <div className="space-y-1">
                      {getEventsForDay(day).map((event) => (
                        <div
                          key={event.id}
                          className={`${event.color} text-white text-xs p-1 rounded truncate`}
                          title={`${event.title} at ${event.time}`}
                        >
                          <div className="font-medium">{event.time}</div>
                          <div>{event.title}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-indigo-600">Upcoming Events</h3>
          </div>
          
          <div className="space-y-3">
            {/* Google Calendar Events */}
            {googleEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  event.title.startsWith('📚') ? 'bg-green-600' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{event.title}</div>
                  <div className="text-sm text-gray-600">
                    {formatEventTime(event.start)}
                    {event.location && <span> • {event.location}</span>}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  event.title.startsWith('📚') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {event.isGoogleEvent ? 'Google' : 'Local'}
                </span>
              </div>
            ))}
            
            {googleEvents.length === 0 && !loadingEvents && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">No upcoming events</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
  
}

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarContent />
    </ProtectedRoute>
  )
}
