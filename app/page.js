'use client'

export default function Home() {
  const callApi = async () => {
    console.log("CALLING AP");
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'sample' }),
    });
    const data = await res.text();
    console.log(data);
  };

  return (
    <div>
      <h1>Test</h1>
      <button onClick={callApi}>Call</button>
    </div>
  );
}