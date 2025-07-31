import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(req, { params }) {
  try {
    const { id } = params

    // Create Supabase client with auth context
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

    // Get current user (secure method)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Authentication error:", userError)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log("Authenticated user:", user)
    console.log("Attempting to delete task with ID:", id)

    // Delete the task (only if owned by user for security)
    const { data, error } = await supabase
      .from('Tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error("Supabase delete error:", error)
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    console.error("API error:", err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}