import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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
    
    // Get the current user (secure method)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Authentication error:", userError)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get classes for the authenticated user (RLS will automatically filter)
    const { data, error } = await supabase
      .from('Classes')
      .select('*')
      .order('name')

    if (error) {
      console.error("Supabase select error:", error)
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    console.error("API error:", err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
} 