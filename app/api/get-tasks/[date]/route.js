import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request, { params }) {
  try {
    const { date } = await params
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
              // Ignored for Server Component calls
            }
          },
        },
      }
    )

    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error("Authentication error:", sessionError)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Filter tasks by due_date = date parameter
    const { data: tasks, error } = await supabase
      .from('Tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('due_date', `${date}T00:00:00`)
      .lt('due_date', `${date}T23:59:59`)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }
    console.log('Tasks retrieved successfully:', tasks);
    return Response.json({ 
      success: true, 
      data: tasks || []
    })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}