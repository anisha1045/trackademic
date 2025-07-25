import { supabase } from '@/utils/supabase'  // adjust path if needed

export async function POST(req) {
  const body = await req.json()
  console.log("POSTING TO SUPABASE");
  const { data, error } = await supabase
    .from('Class')
    .insert([{ ...body }])

    if (error) {
      console.error("Supabase insert error:", error)
      return Response.json({ error }, { status: 500 })
    }
  return Response.json({ success: true, data })
}