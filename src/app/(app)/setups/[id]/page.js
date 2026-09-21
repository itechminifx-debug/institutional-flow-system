import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";
import EditSetupForm from "@/components/EditSetupForm";

export default async function SetupDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: setup, error } = await supabase
    .from("setups")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !setup) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-2xl mx-auto">
          <Link href="/setups" className="text-blue-400 text-sm">
            ← Back to Setups
          </Link>
          <div className="mt-4 p-6 rounded-lg bg-red-900/40 border border-red-700">
            Setup not found.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/setups" className="text-blue-400 text-sm hover:underline">
            ← Back to Setups
          </Link>
          <h1 className="text-2xl font-bold mt-2">{setup.pair}</h1>
          <p className="text-gray-400 text-sm">
            Created {formatDate(setup.created_at)}
          </p>
        </div>

        <EditSetupForm setup={setup} />
      </div>
    </main>
  );
}