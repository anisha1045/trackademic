import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(req, context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    console.log(`Updating class with ID: ${id}`, body);

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Use getSession like the working dashboard
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!id || !body.name || !body.code) {
      return Response.json({ 
        error: 'Class ID, name, and code are required' 
      }, { status: 400 });
    }

    // Update the class (only if it belongs to the current user) 
    const { data, error } = await supabase
      .from('Classes')
      .update({
        name: body.name,
        code: body.code,
        instructor: body.instructor,
        description: body.description,
        semester: body.semester,
        color: body.color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)  // CRITICAL: Filter by user_id for security
      .select();

    if (error) {
      console.error('Database error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ 
        error: 'Class not found or access denied' 
      }, { status: 404 });
    }

    return Response.json({ success: true, data: data[0] });
  } catch (err) {
    console.error('Server error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}