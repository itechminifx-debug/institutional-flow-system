import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";
import { cycleInfo, fvgInfo, obInfo } from "@/lib/contextLayers";
import EditSetupForm from "@/components/EditSetupForm";
import ScenarioBadge from "@/components/ScenarioBadge";

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

  const cycle = cycleInfo(setup.institutional_cycle);
  const fvg = fvgInfo(setup.fvg_present, setup.fvg_direction);
  const ob = obInfo(setup.ob_present, setup.ob_type);

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

          {/* Context Layer Badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {cycle && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${cycle.color}`}
              >
                {cycle.emoji} {cycle.label}
              </span>
            )}
            {setup.fvg_present && (
              <span className={`text-xs ${fvg.color}`}>📊 {fvg.label}</span>
            )}
            {setup.ob_present && (
              <span className={`text-xs ${ob.color}`}>📦 {ob.label}</span>
            )}
            {setup.twice_blocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300">
                ⚡ Twice-Blocked
              </span>
            )}
            {setup.use_ce_entry && setup.ce_price && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                CE {setup.ce_price.toFixed(2)}
              </span>
            )}
            <ScenarioBadge setup={setup} size="lg" />
          </div>
        </div>

        <EditSetupForm setup={setup} />
      </div>
    </main>
  );
}