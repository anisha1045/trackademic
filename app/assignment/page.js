'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AssignmentPage() {
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [aiResults, setAiResults] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    due_date: '',
    class_id: '',
    priority: 'medium',
    estimated_hours: 1
  })
  const router = useRouter()

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
  }, [])

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/get-classes')
      const data = await response.json()
      
      if (response.ok && data.success) {
        setClasses(data.data || [])
      } else {
        // Fallback to mock classes if API fails
        setClasses([
          { id: 1, name: 'Computer Science 101', code: 'CS101' },
          { id: 2, name: 'Mathematics', code: 'MATH101' },
          { id: 3, name: 'Physics', code: 'PHYS101' }
        ])
      }
    } catch (err) {
      console.error('Failed to load classes:', err)
      // Fallback to mock classes
      setClasses([
        { id: 1, name: 'Computer Science 101', code: 'CS101' },
        { id: 2, name: 'Mathematics', code: 'MATH101' },
        { id: 3, name: 'Physics', code: 'PHYS101' }
      ])
    }
  }

  const loadAssignments = async () => {
    // Mock assignments - replace with actual API call
    setAssignments([
      {
        id: 1,
        title: 'Data Structures Homework',
        description: 'Complete binary tree implementation',
        due_date: '2025-01-20T23:59',
        class_name: 'CS101',
        priority: 'high'
      }
    ])
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file')
      return
    }

    setUploadLoading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/parse-syllabus', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setAiResults(data)
        setUploadError('')
        // Keep modal open to show results
      } else {
        setUploadError(data.error || 'Failed to parse file')
      }
    } catch (err) {
      setUploadError('Network error. Please try again.')
    } finally {
      setUploadLoading(false)
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
          status: 'pending'
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
    setShowUploadModal(false)
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
    if (!newAssignment.title || !newAssignment.due_date || !newAssignment.class_id) {
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
          title: newAssignment.title,
          description: newAssignment.description,
          due_date: newAssignment.due_date,
          class_id: newAssignment.class_id,
          priority: newAssignment.priority,
          estimated_time: newAssignment.estimated_hours,
          type: 'assignment',
          status: 'pending'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset form and close modal
        setNewAssignment({
          title: '',
          description: '',
          due_date: '',
          class_id: '',
          priority: 'medium',
          estimated_hours: 1
        })
        setShowModal(false)
        loadAssignments() // Refresh the list
      } else {
        setError(data.error?.message || 'Failed to add assignment')
      }
    } catch (err) {
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
          <a href="#" className="text-red-500 font-medium hover:underline">Logout</a>
        </div>
      </nav>

      {/* Main Content */}
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

        {/* Assignments Grid */}
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">{assignment.title}</h3>
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
                <div className="flex gap-2">
                  <button className="text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded-lg hover:bg-indigo-50">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50">
                    Delete
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
              <p className="text-gray-500">Click "Add Assignment" to create your first assignment</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Add New Assignment</h2>
            
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class *
                </label>
                <select
                  value={newAssignment.class_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a class</option>
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
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
                {loading ? 'Adding...' : 'Add Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Syllabus Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-green-600 mb-6">Upload Syllabus</h2>
            
            {uploadError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                {uploadError}
              </div>
            )}

            {!aiResults ? (
              <div className="space-y-4">
                {/* File Upload Area */}
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".txt,.doc,.docx,.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        setSelectedFile(file)
                        setUploadError('')
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      {selectedFile ? selectedFile.name : (dragActive ? 'Drop file here' : 'Click to upload or drag and drop')}
                    </p>
                                         <p className="text-sm text-gray-500">
                       Supports: TXT, DOC, DOCX, PDF, and Image files
                     </p>
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">AI-Powered Assignment Extraction</h3>
                  <p className="text-blue-600 text-sm mb-2">
                    Upload your syllabus and our AI will automatically extract all assignments, due dates, and requirements!
                  </p>
                                     <div className="text-xs text-blue-500 mb-2">
                     Supported: Text files (.txt) • PDF files • Images (JPG, PNG, etc.) • Word docs (.doc, .docx)
                   </div>
                   <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded p-2">
                     PDF support enabled! Upload your PDF syllabus directly
                   </div>
                </div>

                {/* Upload Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowUploadModal(false)
                      setSelectedFile(null)
                      setUploadError('')
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                    disabled={uploadLoading}
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
                    {uploadLoading ? 'Processing...' : 'Parse with AI'}
                  </button>
                </div>
              </div>
            ) : (
              /* AI Results Display */
              <div className="space-y-4">
                                 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                   <h3 className="font-semibold text-green-800 mb-2">File Processed Successfully!</h3>
                  <p className="text-green-600 text-sm">
                    Found {aiResults.assignments_found} assignments in "{aiResults.file_name}"
                  </p>
                </div>

                {/* Class Selection for All Assignments */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class for All Assignments
                  </label>
                  <select
                    id="bulk-class-select"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Choose a class...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.code ? `${cls.code} - ${cls.name}` : cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignment List */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {aiResults.assignments.map((assignment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{assignment.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>Due: {assignment.due_date || 'Not specified'}</span>
                            <span>Priority: {assignment.priority}</span>
                            <span>Est. Hours: {assignment.estimated_hours}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const classSelect = document.getElementById('bulk-class-select')
                            const classId = classSelect.value
                            if (classId) {
                              handleAddAiAssignment(assignment, classId)
                            } else {
                              alert('Please select a class first')
                            }
                          }}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bulk Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setAiResults(null)
                      setSelectedFile(null)
                      setShowUploadModal(false)
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const classSelect = document.getElementById('bulk-class-select')
                      const classId = classSelect.value
                      if (classId) {
                        handleAddAllAiAssignments(classId)
                      } else {
                        alert('Please select a class first')
                      }
                    }}
                    className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Add All Assignments
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
