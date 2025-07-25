'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [tasks, setTasks] = useState([
    { title: 'CS101 Reading', notes: 'Ch. 3-4', due: '2025-07-25T14:00' },
    { title: 'Math Homework', notes: 'Section 5', due: '2025-07-25T17:00' },
  ])
  const [showModal, setShowModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', notes: '', due: '' })
  const router = useRouter()

  const handleAddTask = () => {
    if (newTask.title && newTask.due) {
      setTasks([...tasks, newTask])
      setNewTask({ title: '', notes: '', due: '' })
      setShowModal(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-500 to-blue-400 text-gray-800">
      {/* Navbar */}
      <nav className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-600">Trackademic</h1>
        <div className="flex gap-6">
          <a href="#" className="text-indigo-600 font-medium hover:underline">Calendar</a>
          <a href="#" className="text-indigo-600 font-medium hover:underline">Assignments</a>
          <a href="#" className="text-red-500 font-medium hover:underline">Logout</a>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* Smart Daily Schedule */}
        <div className="md:col-span-2 bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-indigo-600 mb-4">Friday, July 25</h2>
          <div className="grid grid-rows-8 gap-3">
            {[
              '8:00 AM – Review flashcards',
              '9:00 AM – Algorithms Lecture',
              '10:00 AM – Study Session',
              '12:00 PM – Lunch',
              '1:00 PM – Group Project Work',
              '3:00 PM – Free Slot',
              '4:00 PM – Midterm Review',
              '6:00 PM – Workout'
            ].map((item, idx) => (
              <div key={idx} className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
  {/* Progress Circle */}
  <div className="bg-white rounded-3xl shadow-xl p-2 flex flex-col items-center justify-center text-center">
    <h2 className="text-lg font-semibold text-indigo-600 mb-4">Your Progress This Week</h2>
    <div className="relative w-32 h-32">
      <svg className="w-full h-full">
        <circle cx="50%" cy="50%" r="45%" stroke="#e0e0e0" strokeWidth="10" fill="none" />
        <circle cx="50%" cy="50%" r="45%" stroke="#6366f1" strokeWidth="10" fill="none"
          strokeDasharray="283" strokeDashoffset="70" strokeLinecap="round"
          transform="rotate(-90 64 64)" />
      </svg>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <span className="text-xl font-bold text-indigo-600">75%</span>
      </div>
    </div>
  </div>

  {/* Tasks Due Today */}
  <div className="relative bg-white rounded-3xl shadow-xl p-6 h-fit">
    <h2 className="text-2xl font-bold text-indigo-600 mb-4">Tasks Due Today</h2>
    <div className="space-y-4">
      {tasks.map((task, i) => (
        <div key={i} className="bg-indigo-50 rounded-xl p-4 shadow">
          <h3 className="font-semibold text-lg">{task.title}</h3>
          <p className="text-sm text-gray-600">{task.notes}</p>
          <p className="text-sm text-gray-500">Due: {new Date(task.due).toLocaleString()}</p>
        </div>
      ))}
    </div>

    {/* Add Task Button */}
    <button
      onClick={() => setShowModal(true)}
      className="absolute bottom-4 right-4 bg-indigo-600 text-white w-12 h-12 rounded-full text-2xl shadow-lg hover:bg-indigo-700"
    >
      +
    </button>
  </div>
</div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-indigo-600">Add New Task</h2>
            <input
              type="text"
              placeholder="Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
            <textarea
              placeholder="Notes"
              value={newTask.notes}
              onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
            <input
              type="datetime-local"
              value={newTask.due}
              onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
