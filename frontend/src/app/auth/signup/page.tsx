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

  // Debounced real-time username availability check (per documentation spec)
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
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[var(--border)] rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FAECE7] text-[var(--cta-primary)] mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create your account</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Join the community of students learning with AI</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FAEAF0] border border-[#F4C0D1] text-[#72243E] text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Unique Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="letters, numbers, underscore"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
              />
              <div className="absolute right-3.5 top-3.5">
                {isCheckingUsername && <Loader2 className="w-4 h-4 text-[var(--text-tertiary)] animate-spin" />}
                {!isCheckingUsername && usernameStatus?.checked && usernameStatus.available && (
                  <CheckCircle2 className="w-4 h-4 text-[#085041]" />
                )}
                {!isCheckingUsername && usernameStatus?.checked && !usernameStatus.available && (
                  <AlertCircle className="w-4 h-4 text-[#72243E]" />
                )}
              </div>
            </div>
            {usernameStatus?.checked && (
              <p className={`text-xs mt-1.5 ${usernameStatus.available ? "text-[#085041]" : "text-[#72243E]"}`}>
                {usernameStatus.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (usernameStatus?.checked && !usernameStatus.available)}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[var(--cta-primary)] text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-[var(--cta-primary-hover)] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? "Creating account..." : "Sign up"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[var(--cta-primary)] font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
