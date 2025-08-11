'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarContent />
    </ProtectedRoute>
  )
}

function CalendarContent() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isGoogleSynced, setIsGoogleSynced] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [googleEvents, setGoogleEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedDateEvents, setSelectedDateEvents] = useState([])
  const [events, setEvents] = useState([])
  const [monthlyTasks, setMonthlyTasks] = useState([])
  
  // Mock calendar events - fallback when Google Calendar is not synced
  const mockEvents = [
    {
      id: 1,
      title: 'CS101 Lecture',
      time: '9:00 AM',
      date: '2025-01-15',
      type: 'class',
      color: 'bg-blue-500'
    },
    {
      id: 2,
      title: 'Math Assignment Due',
      time: '11:59 PM',
      date: '2025-01-16',
      type: 'assignment',
      color: 'bg-red-500'
    },
    {
      id: 3,
      title: 'Study Group',
      time: '2:00 PM',
      date: '2025-01-17',
      type: 'study',
      color: 'bg-green-500'
    }
  ]

  const formatDateToAPI = useCallback((date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])
  
  const fetchEventsForSelectedDate = useCallback(async () => {
    try {
      const formattedDate = formatDateToAPI(selectedDate)
      const response = await fetch(`/api/get-tasks/${formattedDate}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      console.log("DATA: ", data)
      
      // Transform the data to include proper display properties
      const transformedEvents = Array.isArray(data.data) ? data.data.map(item => ({
        ...item,
        time: item.due_date ? new Date(item.due_date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        }) : 'All day',
        type: item.class_id ? 'assignment' : 'task', // Assignments have class_id, tasks might not
        color: item.done ? 'bg-green-500' : (item.class_id ? 'bg-red-500' : 'bg-blue-500'), // Green for done, red for assignments, blue for tasks
        date: item.due_date ? new Date(item.due_date).toLocaleDateString('en-CA') : null // Extract YYYY-MM-DD in local timezone
      })) : []
      
      setSelectedDateEvents(transformedEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
      setSelectedDateEvents([]) // Explicitly set empty array on error
    }
  }, [selectedDate, setSelectedDateEvents, formatDateToAPI])

  const loadCalendarEvents = useCallback(async () => {
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
  }, [user?.id, setGoogleEvents, setLoadingEvents])

  useEffect(() => {

    const checkGoogleSyncStatus = async () => {
      try {
        const res = await fetch(`/api/get-calendar-events?user_id=${user.id}`)
        const data = await res.json()
        setIsGoogleSynced(!data.needsAuth)
      } catch (err) {
        console.error('Error checking sync status:', err)
      }
    }

    if (user?.id) {
      loadCalendarEvents()
      checkGoogleSyncStatus()
      loadMonthlyTasks()
    }
    // Initialize with mock events for fallback
    const mockEvents = [
      {
        id: 1,
        title: 'CS101 Lecture',
        time: '9:00 AM',
        date: '2025-01-15',
        type: 'class',
        color: 'bg-blue-500'
      },
      {
        id: 2,
        title: 'Math Assignment Due',
        time: '11:59 PM',
        date: '2025-01-16',
        type: 'assignment',
        color: 'bg-red-500'
      },
      {
        id: 3,
        title: 'Study Group',
        time: '2:00 PM',
        date: '2025-01-17',
        type: 'study',
        color: 'bg-green-500'
      }
    ]
    setEvents(mockEvents)
    fetchEventsForSelectedDate()
  }, [user?.id, fetchEventsForSelectedDate, loadCalendarEvents])

  useEffect(() => {
    fetchEventsForSelectedDate()
  }, [selectedDate, fetchEventsForSelectedDate])

  const loadMonthlyTasks = async () => {
    try {
      const response = await fetch('/api/get-tasks')
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      
      // Transform all tasks to include display properties
      const transformedTasks = Array.isArray(data.data) ? data.data.map(item => ({
        ...item,
        time: item.due_date ? new Date(item.due_date).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        }) : 'All day',
        type: item.class_id ? 'assignment' : 'task',
        color: item.done ? 'bg-green-500' : (item.class_id ? 'bg-red-500' : 'bg-blue-500'),
        date: item.due_date ? new Date(item.due_date).toLocaleDateString('en-CA') : null // Extract YYYY-MM-DD in local timezone
      })) : []
      
      setMonthlyTasks(transformedTasks)
    } catch (error) {
      console.error('Error loading monthly tasks:', error)
      setMonthlyTasks([])
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadMonthlyTasks()
    }
  }, [currentDate, user?.id])

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
      loadCalendarEvents()
    } catch (err) {
      console.error('Sync error:', err)
      setMessage('Failed to sync tasks.')
    } finally {
      setLoading(false)
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

  const handleDayClick = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(newDate)
    
    // If in month view and we switch to week view, show the week containing the clicked date
    if (view === 'month') {
      const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const startOfWeek = new Date(clickedDate)
      startOfWeek.setDate(clickedDate.getDate() - clickedDate.getDay())
      setCurrentDate(startOfWeek)
    }
  }

  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
    // Refresh tasks when navigating to different months
    if (user?.id) {
      loadMonthlyTasks()
    }
  }

  const isSelected = (day) => {
    return day === selectedDate.getDate() && 
           currentDate.getMonth() === selectedDate.getMonth() && 
           currentDate.getFullYear() === selectedDate.getFullYear()
  }

  const isSelectedDate = (day) => {
    return day === selectedDate.getDate() && 
           currentDate.getMonth() === selectedDate.getMonth() && 
           currentDate.getFullYear() === selectedDate.getFullYear()
  }

  const getEventsForDay = (day, month = currentDate.getMonth(), year = currentDate.getFullYear()) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Get tasks/assignments for this day
    const tasksForDay = monthlyTasks.filter(task => task.date === dateStr)
    
    // If Google Calendar is synced, show Google events + tasks
    if (isGoogleSynced && googleEvents.length > 0) {
      const googleEventsForDay = googleEvents.filter(event => {
        const eventDate = new Date(event.start)
         const eventDateStr = eventDate.toLocaleDateString('en-CA')
        return eventDateStr === dateStr
      }).map(event => ({
        ...event,
        time: event.isAllDay ? 'All day' : new Date(event.start).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        }),
        color: event.title.startsWith('📚') ? 'bg-green-600' : 'bg-blue-500' 
      }))
      
      // Combine Google events and tasks
      return [...googleEventsForDay, ...tasksForDay]
    }
    
    // Show tasks + mock events if no Google sync
    const mockEventsForDay = events.filter(event => event.date === dateStr)
    return [...tasksForDay, ...mockEventsForDay]
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

        {/* Google Calendar Sync */}
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
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Syncing...' : 'Sync Now'}
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
          {/* Days of week header */}
          {view !== 'day' && (
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-50 rounded-lg">
                  {day}
                </div>
              ))}
            </div>
          )}
          
          {/* Calendar View */}
          {view === 'month' && (
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays().map((day, index) => (
                <div
                  key={index}
                  onClick={() => day && handleDayClick(day)}
                  className={`min-h-[120px] p-2 border border-gray-100 rounded-lg cursor-pointer ${
                    day ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                  } ${
                    isSelected(day) ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
                  } ${
                    isSelectedDate(day) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isSelected(day) ? 'text-indigo-600' : 
                        isSelectedDate(day) ? 'text-blue-600' : 
                        'text-gray-900'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {getEventsForDay(day, currentDate.getMonth(), currentDate.getFullYear()).map((event) => (
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
          )}

          {view === 'week' && (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(7)].map((_, i) => {
                const date = new Date(currentDate)
                const startOfWeek = date.getDate() - date.getDay()
                const dayDate = new Date(date.setDate(startOfWeek + i))
                const day = dayDate.getDate()
                const isTodayDay = isSelected(day)
                const isSelectedDay = isSelectedDate(day)

                return (
                  <div
                    key={i}
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[120px] p-2 border border-gray-100 rounded-lg cursor-pointer bg-white hover:bg-gray-50 ${
                      isTodayDay ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
                    } ${
                      isSelectedDay ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isTodayDay ? 'text-indigo-600' : 
                      isSelectedDay ? 'text-blue-600' : 
                      'text-gray-900'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {getEventsForDay(day, currentDate.getMonth(), currentDate.getFullYear()).map(event => (
                        <div
                          key={event.id}
                          className={`${event.color} text-white text-xs p-1 rounded truncate`}
                        >
                          <div className="font-medium">{event.time}</div>
                          <div>{event.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'day' && (
            <div className="w-full">
              <div
                onClick={() => handleDayClick(selectedDate.getDate())}
                className={`w-full min-h-[300px] p-4 border border-gray-100 rounded-lg cursor-pointer bg-white hover:bg-gray-50 ${
                  isSelected(selectedDate.getDate()) ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
                }`}
              >
                <div className={`text-lg font-bold mb-2 ${
                  isSelected(selectedDate.getDate()) ? 'text-indigo-600' : 'text-gray-900'
                }`}>
                  {formatDate(selectedDate)}
                </div>
                {getEventsForDay(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear()).length === 0 ? (
                  <p className="text-gray-500 text-sm">No events for this day.</p>
                ) : (
                  <div className="space-y-2">
                    {getEventsForDay(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear()).map(event => (
                      <div
                        key={event.id}
                        className={`${event.color} text-white text-xs p-2 rounded`}
                      >
                        <div className="font-medium">{event.time}</div>
                        <div>{event.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Events Sidebar */}
        <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-indigo-600">
              {isGoogleSynced && googleEvents.length > 0 ? 'Events & Tasks' : `Tasks & Assignments for ${formatDate(selectedDate)}`}
            </h3>
            {loadingEvents && (
              <div className="text-sm text-gray-500">Loading...</div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex gap-4 mb-4 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Assignments</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Completed</span>
            </div>
            {isGoogleSynced && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span className="text-gray-600">Calendar Events</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {selectedDateEvents.length === 0 && (!isGoogleSynced || googleEvents.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">No events for the selected date</p>
              </div>
            ) : (
              <>
                {/* Show Google Calendar Events */}
                {isGoogleSynced && googleEvents.length > 0 && googleEvents
                  .filter(event => {
                    const eventDate = new Date(event.start).toLocaleDateString('en-CA')
                    const selectedDateStr = formatDateToAPI(selectedDate)
                    return eventDate === selectedDateStr
                  })
                  .map((event) => (
                    <div key={`google-${event.id}`} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-3 h-3 rounded-full bg-green-600"></div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-600">
                          {formatEventTime(event.start)}
                          {event.location && <span> • {event.location}</span>}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Calendar
                      </span>
                    </div>
                  ))
                }
                
                {/* Show Tasks and Assignments */}
                {selectedDateEvents.map((event) => (
                  <div key={`task-${event.id}`} className={`flex items-center gap-3 p-3 rounded-lg ${
                    event.done ? 'bg-green-50' : (event.type === 'assignment' ? 'bg-red-50' : 'bg-blue-50')
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      event.done ? 'bg-green-500' : (event.type === 'assignment' ? 'bg-red-500' : 'bg-blue-500')
                    }`}></div>
                    <div className="flex-1">
                      <div className={`font-medium text-gray-900 ${event.done ? 'line-through text-gray-500' : ''}`}>
                        {event.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {event.time}
                        {event.description && <span> • {event.description}</span>}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.done ? 'bg-green-100 text-green-800' : 
                      (event.type === 'assignment' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')
                    }`}>
                      {event.done ? 'Complete' : (event.type === 'assignment' ? 'Assignment' : 'Task')}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarPage