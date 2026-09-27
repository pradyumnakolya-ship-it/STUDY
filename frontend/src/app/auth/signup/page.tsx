"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight, Lock, User, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signup, checkUsername } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [usernameStatus, setUsernameStatus] = useState<{ checked: boolean; available: boolean; message: string } | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounced real-time username availability check
  useEffect(() => {
    if (!username || username.trim().length < 3) {
      setUsernameStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const res = await checkUsername(username.trim());
        setUsernameStatus({ checked: true, available: res.available, message: res.message });
      } catch {
        setUsernameStatus(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus && !usernameStatus.available) {
      setError("Please choose an available username.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signup(email, username, password);
      router.push("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#fcfdff] flex flex-col items-center justify-center p-4 relative selection:bg-[#fcfdff] selection:text-[#000000]">
      {/* Resend Atmospheric Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] glow-blue pointer-events-none z-0" />

      {/* Main Signup Card */}
      <div className="w-full max-w-md bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-8 z-10 relative shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#3b9eff] mb-4">
            <Sparkles className="w-6 h-6 text-[#3b9eff]" />
          </div>
          <h1 className="text-3xl font-editorial tracking-tight text-[#fcfdff]">Create account.</h1>
          <p className="text-xs text-[#888e90] mt-1 font-mono">Join the developer community studying with AI</p>
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
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#888e90] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.14)] bg-[#101012] text-[#fcfdff] placeholder:text-[#464a4d] text-xs md:text-sm focus:outline-none focus:border-[rgba(255,255,255,0.3)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#888e90] mb-1.5">
              Unique Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#888e90] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="letters, numbers, underscore"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[rgba(255,255,255,0.14)] bg-[#101012] text-[#fcfdff] placeholder:text-[#464a4d] text-xs md:text-sm focus:outline-none focus:border-[rgba(255,255,255,0.3)] transition-all"
              />
              <div className="absolute right-3.5 top-3">
                {isCheckingUsername && <Loader2 className="w-4 h-4 text-[#888e90] animate-spin" />}
                {!isCheckingUsername && usernameStatus?.checked && usernameStatus.available && (
                  <CheckCircle2 className="w-4 h-4 text-[#11ff99]" />
                )}
                {!isCheckingUsername && usernameStatus?.checked && !usernameStatus.available && (
                  <AlertCircle className="w-4 h-4 text-[#ff2047]" />
                )}
              </div>
            </div>
            {usernameStatus?.checked && (
              <p className={`text-xs mt-1.5 font-mono ${usernameStatus.available ? "text-[#11ff99]" : "text-[#ff2047]"}`}>
                {usernameStatus.message}
              </p>
            )}
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.14)] bg-[#101012] text-[#fcfdff] placeholder:text-[#464a4d] text-xs md:text-sm focus:outline-none focus:border-[rgba(255,255,255,0.3)] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (usernameStatus?.checked && !usernameStatus.available)}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-[#fcfdff] text-[#000000] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#f1f7fe] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? "Creating account..." : "Sign up"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)] text-center text-xs text-[#888e90]">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#3b9eff] font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
