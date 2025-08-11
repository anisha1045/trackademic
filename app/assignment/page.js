'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth'
import { Edit, Trash2, Undo2, Check } from 'lucide-react'

function AssignmentContent() {
  const { user, signOut } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [aiResults, setAiResults] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [selectedClassForAll, setSelectedClassForAll] = useState('')
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    due_date: '',
    class_id: '',
    priority: 'medium',
    estimated_hours: 1
  })
  const router = useRouter()

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  const handleMarkDone = async (taskId, currentDoneStatus) => {
    try {
      const response = await fetch('/api/update-task', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          done: !currentDoneStatus
        }),
      })

      if (response.ok) {
        // Reload assignments to reflect the updated done status
        loadAssignments()
      } else {
        console.error('Failed to update assignment done status')
      }
    } catch (error) {
      console.error('Error updating assignment done status:', error)
    }
  }

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/get-classes')
      const data = await response.json()
      
      if (response.ok && data.success) {
        setClasses(data.data || [])
      } else {
        setClasses([
          { id: 1, name: 'Computer Science 101', code: 'CS101' },
          { id: 2, name: 'Mathematics', code: 'MATH101' },
          { id: 3, name: 'Physics', code: 'PHYS101' }
        ])
      }
    } catch (err) {
      console.error('Failed to load classes:', err)
      setClasses([
        { id: 1, name: 'Computer Science 101', code: 'CS101' },
        { id: 2, name: 'Mathematics', code: 'MATH101' },
        { id: 3, name: 'Physics', code: 'PHYS101' }
      ])
    }
  }

  const loadAssignments = useCallback(async () => {
    try {
      const response = await fetch(`/api/get-tasks${user ? `?user_id=${user.id}` : ''}`)
      const result = await response.json()
      console.log('Load assignments result:', result.data)
      
      if (response.ok && result.success) {
        const tasks = result.data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          due_date: task.due_date,
          class_id: task.class_id,
          class_name: task.class_name || '',
          priority: task.priority || 'medium',
          estimated_hours: task.estimated_time || 1,
          done: task.done || false
        }))
        setAssignments(tasks)
      } else {
        console.log('No tasks found or error fetching tasks')
        setAssignments([])
      }
    } catch (err) {
      console.error('Failed to load assignments:', err)
      setAssignments([])
    }
  }, [user, setAssignments])

    // Load existing assignments and classes on component mount
    useEffect(() => {
      loadClasses()
      loadAssignments()
  
      // Prevent default drag behaviors on the whole document
      const handleGlobalDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
      }
  
      const handleGlobalDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
      }
  
      // Add global event listeners
      document.addEventListener('dragenter', handleGlobalDrag)
      document.addEventListener('dragover', handleGlobalDrag) 
      document.addEventListener('dragleave', handleGlobalDrag)
      document.addEventListener('drop', handleGlobalDrop)
  
      // Cleanup
      return () => {
        document.removeEventListener('dragenter', handleGlobalDrag)
        document.removeEventListener('dragover', handleGlobalDrag)
        document.removeEventListener('dragleave', handleGlobalDrag)
        document.removeEventListener('drop', handleGlobalDrop)
      }
    }, [loadAssignments])

  // Function to sync assignments with Google Calendar
  const syncWithGoogleCalendar = async () => {
    try {
      setSyncStatus({
        status: 'loading',
        message: 'Syncing with Google Calendar...'
      })
      
      const response = await fetch('/api/simple-calendar-sync?user_id=' + user.id, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.status === 401 && data.needsAuth) {
        // Redirect to Google authentication
        setSyncStatus({
          status: 'auth_needed',
          message: 'Redirecting to Google authentication...'
        })
        
        const authRes = await fetch(`/api/simple-calendar-auth?user_id=${user.id}`)
        const authData = await authRes.json()
        
        if (authData.success && authData.authUrl) {
          window.location.href = authData.authUrl
        } else {
          setSyncStatus({
            status: 'error',
            message: 'Error getting authentication URL'
          })
        }
      } else if (response.ok) {
        setSyncStatus({
          status: 'success',
          message: `Successfully synced assignments to Google Calendar`
        })
        
        setTimeout(() => {
          setSyncStatus(null)
        }, 5000)
      } else {
        setSyncStatus({
          status: 'error',
          message: data.message || 'Failed to sync with Google Calendar'
        })
      }
    } catch (err) {
      console.error('Calendar sync error:', err)
      setSyncStatus({
        status: 'error',
        message: 'Failed to connect to sync service.'
      })
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file')
      return
    }

    setUploadLoading(true)
    setUploadError('')
    setUploadProgress('Preparing file for upload...')

    try {
      // Small delay to show initial step
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Show progress update
      setUploadProgress('Uploading syllabus to server...')
      
      // Another delay to show upload step
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Update to analyzing step before making the call
      setUploadProgress('Analyzing syllabus with AI...')

      const response = await fetch('/api/parse-syllabus', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadProgress('Processing complete!')
        setTimeout(() => {
          setAiResults(data)
          setUploadError('')
        }, 700) // Slightly longer delay to show completion
      } else {
        setUploadError(data.error || 'Failed to parse file')
      }
    } catch (err) {
      setUploadError('Network error. Please try again.')
    } finally {
      setUploadLoading(false)
      setUploadProgress('')
    }
  }

  const handleAddAiAssignment = async (aiAssignment, classId) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: aiAssignment.title,
          description: aiAssignment.description,
          due_date: aiAssignment.due_date ? `${aiAssignment.due_date}T23:59` : null,
          class_id: classId,
          priority: aiAssignment.priority,
          estimated_time: aiAssignment.estimated_hours,
          type: aiAssignment.type || 'assignment',
          status: 'pending',
          user_id: user?.id,
          assignment: true,
        }),
      })

      if (response.ok) {
        loadAssignments() // Refresh the list
        return true
      } else {
        console.error('Failed to add assignment')
        return false
      }
    } catch (err) {
      console.error('Error adding assignment:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleAddAllAiAssignments = async (classId) => {
    if (!aiResults?.assignments || !classId) return

    let successCount = 0
    for (const assignment of aiResults.assignments) {
      const success = await handleAddAiAssignment(assignment, classId)
      if (success) successCount++
    }

    alert(`Added ${successCount} of ${aiResults.assignments.length} assignments`)
    
    // Reset state and close modal
    setAiResults(null)
    setSelectedFile(null)
    setSelectedClassForAll('')
    setShowUploadModal(false)
  }

  const handleAddAllToSelectedClass = async () => {
    if (!aiResults?.assignments) return

    if (selectedClassForAll) {
      // Add to selected class
      await handleAddAllAiAssignments(selectedClassForAll)
    } else {
      // No class selected - add as general assignments (not tied to any class)
      let successCount = 0
      for (const assignment of aiResults.assignments) {
        const success = await handleAddAiAssignment(assignment, null) // null = general assignment
        if (success) successCount++
      }

      alert(`Added ${successCount} of ${aiResults.assignments.length} assignments as general assignments`)
      
      // Reset state and close modal
      setAiResults(null)
      setSelectedFile(null)
      setSelectedClassForAll('')
      setShowUploadModal(false)
    }
  }

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      const allowedExtensions = /\.(txt|pdf|doc|docx|jpg|jpeg|png|gif|bmp|webp)$/i
      
      if (allowedTypes.includes(file.type) || allowedExtensions.test(file.name) || file.type.startsWith('image/')) {
        setSelectedFile(file)
        setUploadError('')
      } else {
        setUploadError('Unsupported file type. Please use TXT, PDF, DOC, DOCX, or image files.')
      }
    }
  }

  const handleAddAssignment = async () => {
    if (!newAssignment.title || !newAssignment.due_date) {
      setError('Please fill in title and due date')
      return
    }
  
    setLoading(true)
    setError('')
  
    try {
      const endpoint = isEditing ? `/api/edit-task/${editingAssignment.id}` : '/api/add-task'
      const method = isEditing ? 'PATCH' : 'POST'

      const requestData = {
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: newAssignment.due_date,
        class_id: newAssignment.class_id,
        priority: newAssignment.priority,
        estimated_time: newAssignment.estimated_hours,
        type: 'assignment',
        status: 'pending',
        user_id: user?.id,
      }

      console.log('Assignment update request:', {
        endpoint,
        method,
        isEditing,
        editingAssignment,
        requestData
      })
  
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
  
      const data = await response.json()
      console.log('Response data:', data)
  
      if (response.ok) {
        setNewAssignment({
          title: '',
          description: '',
          due_date: '',
          class_id: '',
          priority: 'medium',
          estimated_hours: 1,
        })
        setShowModal(false)
        setIsEditing(false)
        setEditingAssignment(null)
        loadAssignments() // Refresh the list
        // Sync with Google Calendar after adding/editing
        await syncWithGoogleCalendar()
      } else {
        setError(data.error?.message || 'Failed to save assignment')
      }
    } catch (err) {
      console.error('Network error details:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-500 to-blue-400">
      {/* Navbar */}
      <nav className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-600">Trackademic</h1>
        <div className="flex gap-6">
          <a href="/dashboard" className="text-indigo-600 font-medium hover:underline">Dashboard</a>
          <a href="/calendar" className="text-indigo-600 font-medium hover:underline">Calendar</a>
          <a href="/assignment" className="text-indigo-600 font-medium hover:underline border-b-2 border-indigo-600">Assignments</a>
          <a href="/classes" className="text-indigo-600 font-medium hover:underline">Classes</a>
          <button onClick={handleLogout} className="text-red-500 font-medium hover:underline">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-indigo-600 mb-2">Assignments</h1>
              <p className="text-gray-600">Manage your assignments and track deadlines</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Syllabus
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                Add Manually
              </button>
            </div>
          </div>
        </div>
        
        {/* Google Calendar Sync Button */}
        <div className="bg-white rounded-3xl shadow-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <p className="font-medium text-gray-700">Sync assignments to Google Calendar</p>
            <button
              onClick={syncWithGoogleCalendar}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sync Now
            </button>
          </div>
          
          {syncStatus && (
            <div className="mt-3 text-sm">
              <p className={`
                ${syncStatus.status === 'loading' ? 'text-blue-600' : ''}
                ${syncStatus.status === 'success' ? 'text-green-600' : ''}
                ${syncStatus.status === 'error' ? 'text-red-600' : ''}
                font-medium
              `}>
                {syncStatus.message}
              </p>
            </div>
          )}
        </div>

        {/* Assignments Grid */}
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className={`rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-shadow ${
              assignment.done ? 'bg-green-100 border border-green-200' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-xl font-semibold text-gray-800 ${assignment.done ? 'line-through text-gray-500' : ''}`}>{assignment.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{assignment.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                      {assignment.class_name}
                    </span>
                    <span>Due: {formatDate(assignment.due_date)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleMarkDone(assignment.id, assignment.done)}
                    className={`p-1 rounded-md transition-colors ${
                      assignment.done 
                        ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-50' 
                        : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                    }`}
                    title={assignment.done ? 'Mark as undone' : 'Mark as done'}
                  >
                    {assignment.done ? (
                      <Undo2 className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50"
                    title="Edit assignment"
                    onClick={() => {
                      console.log('Edit assignment data:', assignment)
                      setEditingAssignment(assignment)
                      setNewAssignment({
                        title: assignment.title || '',
                        description: assignment.description || '',
                        due_date: assignment.due_date?.slice(0, 16) || '', // trims to "YYYY-MM-DDTHH:MM"
                        class_id: assignment.class_id ? String(assignment.class_id) : '',
                        priority: assignment.priority || 'medium',
                        estimated_hours: assignment.estimated_hours || 1
                      })
                      console.log('Setting newAssignment with class_id:', assignment.class_id ? String(assignment.class_id) : '')
                      setIsEditing(true)
                      setShowModal(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50"
                    title="Delete assignment"
                    onClick={async () => {
                      console.log("About to delete assignment:", assignment.id)
                      try {
                        const response = await fetch(`/api/delete-task/${assignment.id}`, { method: 'DELETE' })
                        if (!response.ok) throw new Error('Delete failed')
                    
                        setAssignments((prev) => prev.filter((task) => task.id !== assignment.id))
                        console.log('Deleted task:', assignment.id)
                      } catch (err) {
                        console.error('Delete error:', err)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {assignments.length === 0 && (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No assignments yet</h3>
              <p className="text-gray-500">Click &quot;Add Assignment&quot; to create your first assignment</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">
              {isEditing ? 'Edit Assignment' : 'Add New Assignment'}
            </h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Math Homework Chapter 5"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Assignment details, requirements, notes..."
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <select
                  value={newAssignment.class_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="">No class (general assignment)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code ? `${cls.code} - ${cls.name}` : cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newAssignment.due_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newAssignment.priority}
                  onChange={(e) => setNewAssignment({ ...newAssignment, priority: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={newAssignment.estimated_hours}
                  onChange={(e) => setNewAssignment({ ...newAssignment, estimated_hours: parseFloat(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setIsEditing(false)
                  setEditingAssignment(null)
                  setError('')
                  setNewAssignment({
                    title: '',
                    description: '',
                    due_date: '',
                    class_id: '',
                    priority: 'medium',
                    estimated_hours: 1
                  })
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddAssignment}
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? (isEditing ? 'Saving...' : 'Adding...') : isEditing ? 'Save Changes' : 'Add Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Syllabus Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto relative">
            {/* Loading Overlay */}
            {uploadLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-95 rounded-xl flex items-center justify-center z-10">
                <div className="text-center">
                  {/* Animated Spinner */}
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600 mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Progress Text */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-indigo-600">Processing Syllabus</h3>
                    <p className="text-gray-600 font-medium">{uploadProgress}</p>
                    
                    {/* Progress Steps */}
                    <div className="flex justify-center space-x-2 mt-4">
                      <div className={`w-2 h-2 rounded-full ${uploadProgress.includes('Preparing') ? 'bg-indigo-600 animate-bounce' : 'bg-indigo-200'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${uploadProgress.includes('Uploading') ? 'bg-indigo-600 animate-bounce' : 'bg-indigo-200'}`} style={{ animationDelay: '0.1s' }}></div>
                      <div className={`w-2 h-2 rounded-full ${uploadProgress.includes('Analyzing') ? 'bg-indigo-600 animate-bounce' : 'bg-indigo-200'}`} style={{ animationDelay: '0.2s' }}></div>
                      <div className={`w-2 h-2 rounded-full ${uploadProgress.includes('complete') ? 'bg-green-600 animate-bounce' : 'bg-indigo-200'}`} style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Upload Syllabus</h2>
            
            <div className="space-y-4">
              {uploadError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {uploadError}
                </div>
              )}
              
              <div className="border-2 border-dashed rounded-lg p-8 text-center border-gray-300">
                {selectedFile ? (
                  <div>
                    <p className="text-gray-800 font-medium">{selectedFile.name}</p>
                    <p className="text-gray-500 text-sm mt-1">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    <button
                      className="mt-4 text-red-600 hover:text-red-800 text-sm font-medium"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 mb-2">Drop syllabus file here or click to browse</p>
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.txt,image/*"
                    />
                    <label
                      htmlFor="file-upload"
                      className="mt-4 cursor-pointer inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                    >
                      Browse Files
                    </label>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFile(null)
                    setUploadError('')
                    setUploadProgress('')
                  }}
                  disabled={uploadLoading}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadLoading}
                  className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploadLoading && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {uploadLoading ? 'Processing...' : 'Upload & Analyze'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Results Modal */}
      {aiResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Syllabus Analysis Results</h2>
            
            {aiResults.assignments && aiResults.assignments.length > 0 && (
              <div className="space-y-4">
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-blue-900">
                      Quick Add All Assignments
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      {aiResults.assignments.length} found
                    </span>
                  </div>
                  
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Class (optional)
                      </label>
                      <select
                        value={selectedClassForAll}
                        onChange={(e) => setSelectedClassForAll(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      >
                        <option value="">Leave blank for general assignments, or choose a specific class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.code ? `${cls.code} - ${cls.name}` : cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={handleAddAllToSelectedClass}
                      disabled={loading}
                      className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {loading ? 'Adding...' : selectedClassForAll ? 'Add All to Class' : 'Add as General Assignments'}
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-2">
                    {selectedClassForAll 
                      ? `Will add all assignments to the selected class` 
                      : `Will add all assignments as general assignments (not tied to any specific class)`
                    }
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Or add assignments individually:
                  </h4>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {aiResults.assignments.map((assignment, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                          {assignment.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{assignment.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Due: {assignment.due_date}</span>
                        <span>{assignment.estimated_hours}h estimated</span>
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {classes.map((cls) => (
                          <button
                            key={cls.id}
                            onClick={() => handleAddAiAssignment(assignment, cls.id)}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors border border-gray-300"
                          >
                            + {cls.code || cls.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setAiResults(null)
                  setSelectedFile(null)
                  setSelectedClassForAll('')
                  setShowUploadModal(false)
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AssignmentPage() {
  return (
    <ProtectedRoute>
      <AssignmentContent />
    </ProtectedRoute>
  )
}
