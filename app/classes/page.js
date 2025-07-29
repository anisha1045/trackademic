'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth'

function ClassesContent() {
  const { user, signOut } = useAuth()
  const [classes, setClasses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingClass, setEditingClass] = useState(null)
  const [newClass, setNewClass] = useState({
    name: '',
    code: '',
    instructor: '',
    description: '',
    semester: '',
    color: '#6366f1'
  })
  const router = useRouter()

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/get-classes')
      const data = await response.json()
      
      if (response.ok && data.success) {
        setClasses(data.data || [])
      } else {
        console.error('Failed to load classes:', data.error)
      }
    } catch (err) {
      console.error('Error loading classes:', err)
    }
  }

  const handleSubmit = async () => {
    if (!newClass.name || !newClass.code) {
      setError('Please fill in class name and code')
      return
    }

    // Ensure user is authenticated
    if (!user?.id) {
      setError('User not authenticated')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const url = editingClass ? `/api/edit-class/${editingClass.id}` : '/api/add-class'
      const method = editingClass ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
                 body: JSON.stringify({
           ...newClass,
           user_id: user?.id
         }),
      })

      const data = await response.json()

      if (response.ok) {
        resetForm()
        setShowModal(false)
        loadClasses()
      } else {
        setError(data.error?.message || `Failed to ${editingClass ? 'update' : 'add'} class`)
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (classItem) => {
    setEditingClass(classItem)
    setNewClass({
      name: classItem.name || '',
      code: classItem.code || '',
      instructor: classItem.instructor || '',
      description: classItem.description || '',
      semester: classItem.semester || '',
      color: classItem.color || '#6366f1'
    })
    setShowModal(true)
  }



  const handleDelete = async (classId) => {
    if (!confirm('Are you sure you want to delete this class? This will also remove all associated assignments.')) {
      return
    }

    try {
      const response = await fetch(`/api/delete-class/${classId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadClasses()
      } else {
        alert('Failed to delete class')
      }
    } catch (err) {
      alert('Error deleting class')
    }
  }

  const resetForm = () => {
    setNewClass({
      name: '',
      code: '',
      instructor: '',
      description: '',
      semester: '',
      color: '#6366f1'
    })
    setEditingClass(null)
    setError('')
  }

  const colorOptions = [
    '#6366f1', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-500 to-blue-400">
      {/* Navbar */}
      <nav className="flex justify-between items-center bg-white shadow px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-600">Trackademic</h1>
        <div className="flex gap-6">
          <a href="/dashboard" className="text-indigo-600 font-medium hover:underline">Dashboard</a>
          <a href="/calendar" className="text-indigo-600 font-medium hover:underline">Calendar</a>
          <a href="/assignment" className="text-indigo-600 font-medium hover:underline">Assignments</a>
          <a href="/classes" className="text-indigo-600 font-medium hover:underline border-b-2 border-indigo-600">Classes</a>
          <button onClick={handleLogout} className="text-red-500 font-medium hover:underline">Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-indigo-600 mb-2">Classes</h1>
              <p className="text-gray-600">Manage your courses and class information</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Add Class
            </button>
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <div key={classItem.id} className="bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: classItem.color || '#6366f1' }}
                ></div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(classItem)}
                    className="text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(classItem.id)}
                    className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{classItem.name}</h3>
              
              {classItem.code && (
                <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium mb-3 inline-block">
                  {classItem.code}
                </div>
              )}
              
              {classItem.instructor && (
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Instructor:</span> {classItem.instructor}
                </p>
              )}
              
              {classItem.semester && (
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Semester:</span> {classItem.semester}
                </p>
              )}
              
              {classItem.description && (
                <p className="text-gray-600 text-sm mt-3">{classItem.description}</p>
              )}
            </div>
          ))}

          {classes.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No classes yet</h3>
              <p className="text-gray-500">Click "Add Class" to create your first class</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Class Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Introduction to Computer Science"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Class Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., CS101"
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Jane Smith"
                  value={newClass.instructor}
                  onChange={(e) => setNewClass({ ...newClass, instructor: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester
                </label>
                <input
                  type="text"
                  placeholder="e.g., Spring 2025"
                  value={newClass.semester}
                  onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewClass({ ...newClass, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newClass.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Optional description or notes about this class"
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? (editingClass ? 'Updating...' : 'Adding...') : (editingClass ? 'Update Class' : 'Add Class')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClassesPage() {
  return (
    <ProtectedRoute>
      <ClassesContent />
    </ProtectedRoute>
  )
} 