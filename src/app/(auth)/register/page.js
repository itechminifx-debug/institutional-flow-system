"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(
      "Account created! Check your email to confirm, or login if auto-confirm is on."
    );
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Create Account
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Institutional Flow System
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none"
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}