'use client'
import { useEffect } from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth'

function DashboardContent() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [tasksDueToday, setTasksDueToday] = useState([]);
  // REMOVE THIS LATER
  const [completedTasks, setCompletedTasks] = useState([]);

  const scheduleItems = [
    '8:00 AM – Review flashcards',
    '9:00 AM – Algorithms Lecture',
    '10:00 AM – Study Session',
    '12:00 PM – Lunch',
    '1:00 PM – Group Project Work',
    '3:00 PM – Free Slot',
    '4:00 PM – Midterm Review',
    '6:00 PM – Workout'
  ]

  const [completedSchedule, setCompletedSchedule] = useState([])
  const [tasks, setTasks] = useState([
    { id: 1, title: 'CS101 Reading', notes: 'Ch. 3-4', due: '2025-07-25T14:00', completed: false },
    { id: 2, title: 'Math Homework', notes: 'Section 5', due: '2025-07-25T17:00', completed: false },
  ])

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  const handleTaskDone = (task) => {
    setCompletedTasks((prev) =>
      prev.includes(task.id)
        ? prev.filter((id) => id !== task.id) // unmark
        : [...prev, task.id] // mark as done
    )
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const totalItems = tasksDueToday.length
const totalCompleted = completedTasks.length
const dailyProgress = totalItems === 0 ? 0 : Math.round((totalCompleted / totalItems) * 100)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - dailyProgress / 100)

  const loadAssignments = async () => {
    const response = await fetch('/api/get-tasks');
    const result = await response.json();
  
    if (!result.success) return;
  
    const allTasks = result.data.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      class_name: task.class_name || '',
      priority: task.priority
    }));
    
    console.log("ALL TASKS:", allTasks);
  
    // Filter tasks due today
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const dueToday = allTasks.filter(task => 
      task.due_date?.startsWith(today)
    );
  
    setTasksDueToday(dueToday);
  };

  useEffect(() => {
    loadAssignments()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-500 to-blue-400 text-gray-800">
      <nav className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-600">Trackademic</h1>
        <div className="flex gap-6">
          <a href="/dashboard" className="text-indigo-600 font-medium hover:underline border-b-2 border-indigo-600">Dashboard</a>
          <a href="/calendar" className="text-indigo-600 font-medium hover:underline">Calendar</a>
          <a href="/assignment" className="text-indigo-600 font-medium hover:underline">Assignments</a>
          <a href="/classes" className="text-indigo-600 font-medium hover:underline">Classes</a>
          <button onClick={handleLogout} className="text-red-500 font-medium hover:underline">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div className="md:col-span-2 bg-white rounded-3xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-indigo-600 mb-4">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </h2>
          <div className="grid grid-rows-8 gap-3">
            {scheduleItems.map((item, idx) => {
              const isDone = completedSchedule.includes(item)
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex justify-between items-center transition-colors duration-300 ${
                    isDone ? 'bg-green-100 border-green-200' : 'bg-indigo-50 border-indigo-100'
                  }`}
                >
                  <span>{item}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Progress Circle */}
          <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold text-indigo-600 mb-4">Your Progress Today</h2>
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#e0e0e0"
                  strokeWidth="10"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#228B22"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">{dailyProgress}%</span>
              </div>
            </div>
          </div>

{/* Tasks Due Today */}
<div className="bg-white rounded-3xl shadow-xl p-6 h-fit">
  <h2 className="text-2xl font-bold text-indigo-600 mb-4">Tasks Due Today</h2>
  <div className="space-y-4">
    {tasksDueToday.length === 0 ? (
      <p className="text-gray-500">No tasks due today.</p>
    ) : (tasksDueToday.map((task) => {
      const isDone = completedTasks.includes(task.id)
      return (
        <div key={task.id} className={`rounded-lg p-4 mb-3 transition-colors duration-300 ${isDone ? 'bg-green-100' : 'bg-indigo-50'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-gray-800">{task.title}</h4>
              <p className="text-sm text-gray-600">{task.description}</p>
              <p className="text-xs text-gray-500">Due: {formatTime(task.due_date)}</p>
            </div>
            <button
  onClick={() => handleTaskDone(task)}
  className={`text-sm px-3 py-1 rounded-lg ${
    isDone
      ? 'bg-gray-300 hover:bg-gray-400 text-gray-800'
      : 'bg-green-700 hover:bg-green-800 text-white'
  }`}
>
  {isDone ? 'Undo' : 'Done'}
</button>
          </div>
        </div>
      )
    }))}
  </div>
</div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}