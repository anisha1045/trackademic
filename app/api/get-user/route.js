import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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

    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error("Authentication error:", sessionError)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tasks for the current user
    const { data: tasks, error } = await supabase
      .from('User Info')
      .select('*')
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    console.log("Fetched tasks:", tasks)
    return Response.json({ 
      success: true, 
      data: tasks || []
    })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}