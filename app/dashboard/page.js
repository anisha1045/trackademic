'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth'
import { Edit, Trash2 } from 'lucide-react'

function DashboardContent() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  // Fallback schedule items if no tasks for today
  const defaultScheduleItems = [
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
  const [tasks, setTasks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [newTask, setNewTask] = useState({
    title: '',
    notes: '',
    due: '',
    estimatedHours: '',
    estimatedMinutes: '',
    priority: '',
  })

  // Load tasks from database
  useEffect(() => {
    if (user) {
      loadTasks()
      // fetchChatCompletion('read chapters 1-3', 3)
    }
  }, [user])

  const fetchChatCompletion = async (task, parts) => {
    const response = await fetch('/api/split-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, parts }),
    })
  
    const data = await response.json()
  
    if (response.ok) {
      const completion = data.choices[0].message.content
      setTasks([completion]) // or your handler
    } else {
      console.error('Failed to fetch:', data)
    }
  }

  const loadTasks = async () => {
    try {
      setLoadingTasks(true)
      const response = await fetch('/api/get-tasks')
      const data = await response.json()
      
      if (response.ok) {
        console.log("TASK DATA: ", data.data)
        const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

      const todayTasks = data.data
        .filter(task => task.due_date?.split('T')[0] === today)
        .map(({ title, description, estimated_time, priority }) => ({
          title,
          description,
          estimated_time,
          priority,
        }))

        console.log("todays tasks: ", todayTasks)

        setTasks(data.data || [])

        const schedule = "all day free";

        const response = await fetch('/api/schedule-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasks: todayTasks, schedule
          }),
        })
  
        // const data = await response.json()
        // console.log(data);

        // GET CHAT TO SCHEDULE TASKS HERE
      } else {
        console.error('Failed to load tasks:', data.error)
      }


    } catch (err) {
      console.error('Error loading tasks:', err)
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  const handleMarkDone = (item) => {
    setCompletedSchedule((prev) => [...prev, item])
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const getCurrentDate = () => {
    const now = new Date()
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Get tasks for today's schedule using useMemo
  const tasksForToday = useMemo(() => {
    const today = new Date()
    const todayStr = today.toDateString()
    
    return tasks.filter(task => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date)
      return taskDate.toDateString() === todayStr
    })
  }, [tasks])

  // Use today's tasks or default schedule
  const scheduleItems = useMemo(() => {
    return tasksForToday.length > 0 
      ? tasksForToday.map(task => ({
          id: task.id,
          text: `${new Date(task.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – ${task.title}`,
          isTask: true
        }))
      : defaultScheduleItems.map((item, idx) => ({
          id: `default-${idx}`,
          text: item,
          isTask: false
        }))
  }, [tasksForToday, defaultScheduleItems])

  const dailyProgress = Math.round((completedSchedule.length / scheduleItems.length) * 100)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - dailyProgress / 100)

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.due) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.notes,
          due_date: newTask.due,
          type: 'task',
          status: 'pending',
          priority: newTask.priority,
          estimated_time: newTask.estimatedHours * 60 + newTask.estimatedMinutes,
          user_id: user?.id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await loadTasks() // Reload tasks from database
        setNewTask({ title: '', notes: '', due: '' })
        setShowModal(false)
        setError('')
      } else {
        setError(data.error?.message || 'Failed to add task')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async () => {
    if (!newTask.title || !newTask.due) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/update-task', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTask.id,
          title: newTask.title,
          description: newTask.notes,
          due_date: newTask.due,
          user_id: user?.id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await loadTasks() // Reload tasks from database
        setNewTask({ title: '', notes: '', due: '' })
        setEditingTask(null)
        setShowModal(false)
        setError('')
      } else {
        setError(data.error?.message || 'Failed to update task')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch('/api/delete-task', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          user_id: user?.id
        }),
      })

      if (response.ok) {
        await loadTasks() // Reload tasks from database
      } else {
        const data = await response.json()
        setError(data.error?.message || 'Failed to delete task')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      notes: task.description || '',
      due: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTask(null)
    setError('')
    setNewTask({ title: '', notes: '', due: '' })
  }

  const handleSubmitTask = () => {
    const estimatedTotalMinutes =
      Number(newTask.estimatedHours || 0) * 60 + Number(newTask.estimatedMinutes || 0)
  
    if (estimatedTotalMinutes >= 180) {
      handleLongTask(newTask)
    } else {
      editingTask ? handleUpdateTask() : handleAddTask()
    }
  }

  const handleLongTask = async (task) => {
    const confirmSplit = window.confirm(
      `This task is ${task.estimatedHours} hr ${task.estimatedMinutes} min long. Would you like to split it into smaller subtasks?`
    );
  
    if (!confirmSplit) {
      // If user says no, just submit as usual
      editingTask ? handleUpdateTask() : handleAddTask();
      return;
    }
  
    // Ask focus time
    const focusMinutes = parseInt(
      prompt('How long can you focus at a time? (in minutes, e.g., 45)'),
      10
    );
  
    if (!focusMinutes || focusMinutes <= 0) {
      alert('Invalid focus time.');
      return;
    }
  
    const totalMinutes =
      Number(task.estimatedHours || 0) * 60 + Number(task.estimatedMinutes || 0);
  
    const parts = Math.ceil(totalMinutes / focusMinutes);
  
    splitTaskIntoSubtasks(task.title, parts, task, focusMinutes);
  };

  const splitTaskIntoSubtasks = async (taskTitle, parts, originalTask, focusMinutes) => {
   console.log(taskTitle);
   console.log(parts);
   console.log(originalTask);
   console.log(focusMinutes);
   
    const response = await fetch('/api/split-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: taskTitle, parts }),
    })
  
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
  
    if (!content) {
      alert('Failed to split task.')
      return
    }
  
    const titles = content
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)

  for (const title of titles) {
    await fetch('/api/add-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: originalTask.notes,
        due_date: originalTask.due,
        type: 'task',
        status: 'pending',
        priority: originalTask.priority,
        estimated_time: focusMinutes,
        user_id: user?.id,
      }),
    })
  }

  await loadTasks()
  setShowModal(false)
  setNewTask({ title: '', notes: '', due: '', estimatedHours: '', estimatedMinutes: '', priority: '' })
  }

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
          <h2 className="text-2xl font-bold text-indigo-600 mb-4">{getCurrentDate()}</h2>
          <div className="space-y-3">
            {scheduleItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tasks scheduled for today</p>
            ) : (
              scheduleItems.map((item, idx) => {
                const isDone = completedSchedule.includes(item.text)
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border flex justify-between items-center transition-colors duration-300 ${
                      isDone ? 'bg-green-100 border-green-200' : 'bg-indigo-50 border-indigo-100'
                    }`}
                  >
                    <span>{item.text}</span>
                    {!isDone && (
                      <button
                        onClick={() => handleMarkDone(item.text)}
                        className="bg-green-700 hover:bg-green-800 text-white text-sm px-3 py-1 rounded-lg"
                      >
                        ✔ Done
                      </button>
                    )}
                  </div>
                )
              })
            )}
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
          <div className="relative bg-white rounded-3xl shadow-xl p-6 h-fit">
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Your Tasks</h2>
            {loadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No tasks yet. Click + to add your first task!</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="bg-indigo-50 rounded-xl p-4 shadow relative group">
                      <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Due: {task.due_date ? new Date(task.due_date).toLocaleString() : 'No due date'}
                      </p>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50"
                          title="Edit task"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50"
                          title="Delete task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {task.status && (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Add Task Button */}
            <button
              onClick={() => setShowModal(true)}
              className="absolute bottom-4 right-4 bg-indigo-600 text-white w-12 h-12 rounded-full text-2xl shadow-lg hover:bg-indigo-700"
              title="Add new task"
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
            <h2 className="text-xl font-bold text-indigo-600">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <input
              type="text"
              placeholder="Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
            />
            <textarea
              placeholder="Notes"
              value={newTask.notes}
              onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
              rows="3"
            />
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={newTask.due}
              onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>
            <select
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
          >
            <option value="">Select Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time</label>
  <div className="flex gap-2">
    <select
      value={newTask.estimatedHours || ''}
      onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
      className="w-1/2 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
    >
      <option value="">Hours</option>
      {[...Array(13)].map((_, i) => (
        <option key={i} value={i}>{i} hr</option>
      ))}
    </select>

    <select
      value={newTask.estimatedMinutes || ''}
      onChange={(e) => setNewTask({ ...newTask, estimatedMinutes: e.target.value })}
      className="w-1/2 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
    >
      <option value="">Minutes</option>
      {[0, 15, 30, 45].map((min) => (
        <option key={min} value={min}>{min} min</option>
      ))}
    </select>
  </div>
</div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTask}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? (editingTask ? 'Updating...' : 'Adding...') : (editingTask ? 'Update' : 'Submit')}
              </button>
            </div>
          </div>
        </div>
      )}
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