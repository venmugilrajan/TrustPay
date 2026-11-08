"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JobsNewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/client/jobs/new");
  }, [router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-xs text-content-muted">
      Redirecting to Post a Job Wizard...
    </div>
  );
}
