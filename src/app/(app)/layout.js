import Sidebar from "@/components/Sidebar";
import MindsetGate from "@/components/MindsetGate";

export default function AppLayout({ children }) {
  return (
    <MindsetGate>
      <Sidebar />
      <div className="md:ml-[220px]">{children}</div>
    </MindsetGate>
  );
}