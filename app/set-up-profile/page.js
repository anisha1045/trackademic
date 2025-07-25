"use client";

import { useRouter } from 'next/navigation';
import { useState } from "react";

export default function StudyPreferencesForm() {
  const [form, setForm] = useState({
    name: "",
    studyTime: "",
    errandTime: "",
    focusLevel: "",
    breakType: "",
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const router = useRouter();
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted:", form);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 p-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">Your Preferences</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Preferred Study Times</label>
            <input
              name="studyTime"
              value={form.studyTime}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="e.g. 8am–12pm, evenings"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Best Time for Errands</label>
            <input
              name="errandTime"
              value={form.errandTime}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="e.g. afternoons, weekends"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Focus Level</label>
            <select
              name="focusLevel"
              value={form.focusLevel}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
<option value="">Choose focus level</option>
<option value="high">High (I can stay focused for long periods without distraction)</option>
<option value="moderate">Moderate (I can focus fairly well but need breaks)</option>
<option value="low">Low (I get distracted easily or tire quickly)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Other Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Optional notes or preferences"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
