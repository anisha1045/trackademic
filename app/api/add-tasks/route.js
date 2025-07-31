import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GmailNotificationService } from '../../../lib/gmailService'

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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Authentication error:", sessionError)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify the user_id matches the authenticated user
    if (body.user_id !== user.id) {
      console.error("User ID mismatch:", { bodyUserId: body.user_id, sessionUserId: user.id })
      return Response.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 })
    }
    
    // Insert with authenticated context
    const { data, error } = await supabase
      .from('Tasks')
      .insert([{ ...body }])

    if (error) {
      console.error("Supabase insert error:", error)
      return Response.json({ error }, { status: 500 })
    }
    
    // Send Gmail notification if task was created successfully
    try {
      const gmailService = new GmailNotificationService();
      const taskForEmail = {
        ...body,
        id: data?.[0]?.id || 'new',
        class_name: 'Assignment'
      };
      
      console.log('Sending Gmail notification for new task:', taskForEmail.title);
      await gmailService.sendScheduleNotification('stclairevin@gmail.com', [taskForEmail]);
      console.log('Gmail notification sent successfully');
    } catch (gmailError) {
      console.error('Failed to send Gmail notification:', gmailError);
    }
    
    return Response.json({ success: true, data })
  } catch (err) {
    console.error("API error:", err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
