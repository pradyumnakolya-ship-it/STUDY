"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight, Lock, User, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      router.push("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#fcfdff] flex flex-col items-center justify-center p-4 relative selection:bg-[#fcfdff] selection:text-[#000000]">
      {/* Resend Atmospheric Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] glow-orange pointer-events-none z-0" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-8 z-10 relative shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#ff801f] mb-4">
            <Sparkles className="w-6 h-6 text-[#ff801f]" />
          </div>
          <h1 className="text-3xl font-editorial tracking-tight text-[#fcfdff]">Welcome back.</h1>
          <p className="text-xs text-[#888e90] mt-1 font-mono">Sign in to your StudyGPT workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-[rgba(255,32,71,0.1)] border border-[rgba(255,32,71,0.3)] text-[#ff2047] text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#888e90] mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#888e90] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="harsha or harsha@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.14)] bg-[#101012] text-[#fcfdff] placeholder:text-[#464a4d] text-xs md:text-sm focus:outline-none focus:border-[rgba(255,255,255,0.3)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#888e90] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#888e90] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.14)] bg-[#101012] text-[#fcfdff] placeholder:text-[#464a4d] text-xs md:text-sm focus:outline-none focus:border-[rgba(255,255,255,0.3)] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-[#fcfdff] text-[#000000] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#f1f7fe] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? "Signing in..." : "Continue"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)] text-center text-xs text-[#888e90]">
          Don&apos;t have an account yet?{" "}
          <Link href="/auth/signup" className="text-[#3b9eff] font-medium hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
