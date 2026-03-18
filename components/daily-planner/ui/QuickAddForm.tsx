"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { addTaskToBacklog } from "@/actions/daily-planner"

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-r-lg font-medium transition-colors disabled:opacity-50"
    >
      {pending ? "Adding..." : "Add to Brain ↵"}
    </button>
  );
}

export default function QuickAddForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        // Call the server action
        await addTaskToBacklog(formData);
        // Reset the form input instantly after saving
        formRef.current?.reset(); 
      }}
      className="flex w-full shadow-xl"
    >
      <input
        type="text"
        name="title"
        placeholder="Quick add a task, idea, or project..."
        required
        autoComplete="off"
        className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-l-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
      />
      <SubmitButton />
    </form>
  );
}