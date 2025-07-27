import { supabase } from '@/utils/supabase'

export async function GET() {
  try {
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