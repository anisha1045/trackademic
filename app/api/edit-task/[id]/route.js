import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(req, { params }) {
  try {
    console.log("SAVING UPDATED ASSIGNMENT");
    const body = await req.json()
    const { id } = await params

    const cookieStore = await cookies()
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

    // Validate required fields
    if (!id || !body.title) {
      return Response.json({ 
        error: 'Assignment ID and title are required' 
      }, { status: 400 });
    }

    // Handle class_id conversion for debugging
    const processedClassId = body.class_id === '' ? null : parseInt(body.class_id) || null;
    console.log('Class ID conversion:', {
      original: body.class_id,
      type: typeof body.class_id,
      processed: processedClassId,
      processedType: typeof processedClassId
    });

    // Update the assignment (only if it belongs to the current user) - SECURITY FIX
    const { data, error } = await supabase
      .from('Tasks')
      .update({
        title: body.title,
        description: body.description,
        due_date: body.due_date,
        class_id: processedClassId,
        priority: body.priority,
        estimated_time: body.estimated_hours,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', session.user.id)  // CRITICAL: Filter by user_id for security
      .select()

    if (error) {
      console.error('Database error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ 
        error: 'Assignment not found or access denied' 
      }, { status: 404 });
    }

    return Response.json({ success: true, data: data[0] })
  } catch (err) {
    console.error('Server error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}