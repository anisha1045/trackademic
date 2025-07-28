import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(req, { params }) {
  try {
    console.log("SAVING UPDATED ASSIGNMENT");
    const body = await req.json()
    const { id } = params

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)),
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Perform update
    const { data, error } = await supabase
      .from('Tasks')
      .update(body)
      .eq('id', id)

    if (error) return Response.json({ error }, { status: 500 })

    return Response.json({ success: true, data })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}