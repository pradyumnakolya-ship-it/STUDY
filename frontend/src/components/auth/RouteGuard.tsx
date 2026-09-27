"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_PATHS = ["/auth/login", "/auth/signup"];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
        router.push("/auth/login");
      } else if (isAuthenticated && PUBLIC_PATHS.includes(pathname)) {
        router.push("/home");
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading || (!isAuthenticated && !PUBLIC_PATHS.includes(pathname))) {
    return <div className="h-screen w-full flex items-center justify-center bg-[var(--background)]"><div className="text-[var(--text-secondary)]">Loading...</div></div>;
  }

  return <>{children}</>;
}

