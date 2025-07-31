import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PUT(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, description, due_date, done } = body

    // Validate required fields
    if (!id) {
      return Response.json({ 
        error: 'Task ID is required' 
      }, { status: 400 })
    }
    
    // If updating general task info, title is required. For done-only updates, title not required
    if (!title && typeof done !== 'boolean') {
      return Response.json({ 
        error: 'Task title is required when updating task details' 
      }, { status: 400 })
    }

    // Update the task (only if it belongs to the current user)
    const updateData = {
      updated_at: new Date().toISOString()
    }
    
    // Add task details only if provided
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (due_date) updateData.due_date = due_date
    
    // Add done field only if it's provided (allows updating just done status)
    if (typeof done === 'boolean') {
      updateData.done = done
    }
    
    const { data, error } = await supabase
      .from('Tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return Response.json({ 
        error: 'Task not found or access denied' 
      }, { status: 404 })
    }

    return Response.json({ 
      success: true, 
      data: data[0]
    })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
} 