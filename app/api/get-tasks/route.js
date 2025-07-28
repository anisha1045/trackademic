import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req) {
  try {
    // Create authenticated Supabase client
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
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

    // Fetch tasks for the user
    const { data, error } = await supabase
      .from('Tasks')
      .select('*')
      .eq('user_id', session.user.id)

    if (error) {
      console.error("Supabase fetch error:", error)
      return Response.json({ error }, { status: 500 })
    }
    console.log("Fetched tasks:", data)
    return Response.json({ success: true, data })
  } catch (err) {
    console.error("API error:", err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}