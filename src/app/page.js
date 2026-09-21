import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">Institutional Flow System</h1>
      <p className="text-lg text-gray-400 mb-8">
        Read the footprints. Follow the flow.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
        >
          Register
        </Link>
      </div>
    </main>
  );
}