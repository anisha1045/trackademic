import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req) {
  try {
    const body = await req.json()
    console.log("POSTING TO SUPABASE with body:", body);
    
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
    
    // Verify the user_id matches the authenticated user
    if (body.user_id !== session.user.id) {
      console.error("User ID mismatch:", { bodyUserId: body.user_id, sessionUserId: session.user.id })
      return Response.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 })
    }
    
    // Insert with authenticated context
    const { data, error } = await supabase
      .from('Tasks')
      .insert([{ 
        ...body, 
        class_id: body.class_id === '' ? null : parseInt(body.class_id) || null 
      }])

    if (error) {
      console.error("Supabase insert error:", error)
      return Response.json({ error }, { status: 500 })
    }
    
    return Response.json({ success: true, data })
  } catch (err) {
    console.error("API error:", err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}