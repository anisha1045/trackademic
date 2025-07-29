'use client'

import { useState, useEffect } from 'react'
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
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') // day, week, month
  const [events, setEvents] = useState([])
  const [selectedDateEvents, setSelectedDateEvents] = useState([])
  
  // Mock calendar events - will be replaced with Google Calendar data
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

  useEffect(() => {
    // Initialize with mock events for now
    setEvents(mockEvents)
    fetchEventsForSelectedDate()
  }, [])

  useEffect(() => {
    fetchEventsForSelectedDate()
  }, [selectedDate])

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateToAPI = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const fetchEventsForSelectedDate = async () => {
    try {
      const formattedDate = formatDateToAPI(selectedDate);
      const response = await fetch(`/api/get-tasks/${formattedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      console.log("DATA: ", data);
      // Ensure we always set an array, even if the response is null/undefined
      setSelectedDateEvents(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setSelectedDateEvents([]); // Explicitly set empty array on error
    }
  };

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
    return events.filter(event => event.date === dateStr)
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
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

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          {/* Google Calendar Integration Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-800">Google Calendar Integration Coming Soon</h3>
                <p className="text-blue-600 text-sm">Evin is working on syncing your Google Calendar events with Trackademic.</p>
              </div>
            </div>
          </div>

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
                        {getEventsForDay(
    day,
    currentDate.getMonth(),
    currentDate.getFullYear()
  ).map((event) => (
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
                      {getEventsForDay(
    day,
    currentDate.getMonth(),
    currentDate.getFullYear()
  ).map(event => (
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
      {getEventsForDay(
            selectedDate.getDate(),
            selectedDate.getMonth(),
            selectedDate.getFullYear()
          ).length === 0 ? (
        <p className="text-gray-500 text-sm">No events for this day.</p>
      ) : (
        <div className="space-y-2">
          {getEventsForDay(
            selectedDate.getDate(),
            selectedDate.getMonth(),
            selectedDate.getFullYear()
          ).map(event => (
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

        {/* Upcoming Events Sidebar - Now shows events for selected date */}
        <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
  <h3 className="text-xl font-bold text-indigo-600 mb-4">
    Tasks for {formatDate(selectedDate)}
  </h3>
  {selectedDateEvents.length === 0 ? (
    <p className="text-gray-500">No tasks for the selected date.</p>
  ) : (
    <div className="space-y-3">
      {selectedDateEvents.map((event) => (
        <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${event.color || 'bg-blue-500'}`}></div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{event.title}</div>
            <div className="text-sm text-gray-600">
              {event.date} at {event.time || 'All day'}
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            event.type === 'class' ? 'bg-blue-100 text-blue-800' :
            event.type === 'assignment' ? 'bg-red-100 text-red-800' :
            'bg-green-100 text-green-800'
          }`}>
            {event.type}
          </span>
        </div>
      ))}
    </div>
  )}
</div>
      </div>
    </div>
  )
}

export default CalendarPage