'use client'

import { useState } from 'react'

// This is just a sample to make sure that saving to Supabase works; feel free to delete
export default function Home() {
  const [msg, setMsg] = useState('')

  const handleClick = async () => {
    const res = await fetch('/api/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@gmail.com',
        google_id: '12345678',
      }),
    })

    const data = await res.json()
    if (data.success) {
      setMsg('User saved!')
    } else {
      setMsg('Error: ' + data.error.message)
    }
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Test Supabase Save</h1>
      <button onClick={handleClick}>Save User</button>
      <p>{msg}</p>
    </main>
  )
}