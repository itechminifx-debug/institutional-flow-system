import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";
import TradeJournalForm from "@/components/TradeJournalForm";
import DeleteTradeButton from "@/components/DeleteTradeButton";

export default async function TradeDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trade, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !trade) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-2xl mx-auto">
          <Link href="/journal" className="text-blue-400 text-sm">
            ← Back to Journal
          </Link>
          <div className="mt-4 p-6 rounded-lg bg-red-900/40 border border-red-700">
            Trade not found.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/journal"
            className="text-blue-400 text-sm hover:underline"
          >
            ← Back to Journal
          </Link>
          <h1 className="text-2xl font-bold mt-2">{trade.pair}</h1>
          <p className="text-gray-400 text-sm">
            Opened {formatDate(trade.opened_at)}
          </p>
        </div>

        <TradeJournalForm trade={trade} />

        <div className="mt-8 pt-6 border-t border-gray-800">
          <DeleteTradeButton tradeId={trade.id} pair={trade.pair} />
        </div>
      </div>
    </main>
  );
}