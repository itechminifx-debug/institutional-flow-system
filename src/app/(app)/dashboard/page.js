import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import PriceTicker from "@/components/PriceTicker";
import Mt5Ticker from "@/components/Mt5Ticker";
import LiveSetupCard from "@/components/LiveSetupCard";
import TrendWidget from "@/components/TrendWidget";
import MindsetWidget from "@/components/MindsetWidget";
import GoldenBanner from "@/components/GoldenBanner";
import PinnedNotesWidget from "@/components/PinnedNotesWidget";
import ConfluenceWidget from "@/components/ConfluenceWidget";
import NewsWidget from "@/components/NewsWidget";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
 
  const { data: setups } = await supabase
  .from("setups")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(5);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Welcome, <span className="text-blue-400">{user.email}</span>
        </p>
         
        <GoldenBanner />
        <PinnedNotesWidget />

        {/* Live Prices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
  <Mt5Ticker />
  <PriceTicker
    symbol="R_75"
    label="Vol 75 (Deriv)"
    source="deriv"
  />
  <PriceTicker
    symbol="frxXAUUSD"
    label="XAUUSD (Gold)"
    source="deriv"
  />
</div>

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <TrendWidget />
  <MindsetWidget />
  <ConfluenceWidget />
  <NewsWidget />
</div>

{/* Live Zone Watchdog */}
{setups && setups.length > 0 && (
  <div className="mb-8">
    <h2 className="text-lg font-semibold mb-3 text-gray-300">
      Live Zone Watchdog
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {setups.map((s) => (
        <LiveSetupCard key={s.id} setup={s} />
      ))}
    </div>
  </div>
)}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/setups"
            className="p-6 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500 transition"
          >
            <h2 className="text-xl font-semibold mb-1">Setups</h2>
            <p className="text-gray-400 text-sm">
              Pre-market planner (Steps 1-4)
            </p>
          </a>

          <a
            href="/trade"
            className="p-6 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500 transition"
          >
            <h2 className="text-xl font-semibold mb-1">Live Trade</h2>
            <p className="text-gray-400 text-sm">
              Checklist + entry (Steps 5-11)
            </p>
          </a>

          <a
            href="/journal"
            className="p-6 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500 transition"
          >
            <h2 className="text-xl font-semibold mb-1">Journal</h2>
            <p className="text-gray-400 text-sm">
              Log your trades (Step 15)
            </p>
          </a>

          <a
            href="/stats"
            className="p-6 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500 transition"
          >
            <h2 className="text-xl font-semibold mb-1">Stats</h2>
            <p className="text-gray-400 text-sm">
              Performance & rule adherence
            </p>
          </a>
        </div>

        <form action="/auth/signout" method="post" className="mt-8">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}