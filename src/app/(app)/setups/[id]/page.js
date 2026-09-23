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
        import { cycleInfo, fvgInfo, obInfo } from "@/lib/contextLayers";

// ... later in JSX:
<div className="flex items-center gap-2 mt-2 flex-wrap">
  {setup.institutional_cycle && (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        cycleInfo(setup.institutional_cycle)?.color || ""
      }`}
    >
      {cycleInfo(setup.institutional_cycle)?.emoji}{" "}
      {cycleInfo(setup.institutional_cycle)?.label}
    </span>
  )}
  {setup.fvg_present && (
    <span className={`text-xs ${fvgInfo(true, setup.fvg_direction).color}`}>
      {fvgInfo(true, setup.fvg_direction).label}
    </span>
  )}
  {setup.ob_present && (
    <span className={`text-xs ${obInfo(true, setup.ob_type).color}`}>
      {obInfo(true, setup.ob_type).label}
    </span>
  )}
  {setup.twice_blocked && (
    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300">
      ⚡ Twice-Blocked
    </span>
  )}
</div>

        <EditSetupForm setup={setup} />
      </div>
    </main>
  );
}