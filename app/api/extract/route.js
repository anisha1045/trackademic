export async function POST(request) {
    const body = await request.json()
    console.log('EXTRACTED');
    return Response.json({ message: 'Extracted!', received: body })
  }