import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PATCH(req, context) {
  const { id } = await context.params;
  const body = await req.json(); // class fields to update
  console.log(`Updating class with ID: ${id}`, body);

  try {
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

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('Classes')
      .update(body)         // fields to update
      .eq('id', id)         // where id = ?
      .select();            // return updated row(s)

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}