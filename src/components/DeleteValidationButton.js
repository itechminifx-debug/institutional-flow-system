"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function DeleteValidationButton({ id }) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this validation?")) return;

    setDeleting(true);
    const { error } = await supabase
      .from("rb_validations")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs px-2 py-0.5 rounded bg-gray-800 hover:bg-red-900 text-red-400 disabled:opacity-50"
      title="Delete validation"
    >
      {deleting ? "..." : "×"}
    </button>
  );
}