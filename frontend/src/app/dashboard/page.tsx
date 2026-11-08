"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/client");
  }, [router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-xs text-content-muted">
      Redirecting to Client Dashboard...
    </div>
  );
}
