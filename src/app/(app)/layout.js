import Navbar from "@/components/Navbar";
import MindsetGate from "@/components/MindsetGate";

export default function AppLayout({ children }) {
  return (
    <MindsetGate>
      <Navbar />
      {children}
    </MindsetGate>
  );
}