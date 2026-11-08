"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function JobDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/client/jobs/${id}`);
    } else {
      router.replace("/client");
    }
  }, [id, router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-xs text-content-muted">
      Redirecting to Contract Details...
    </div>
  );
}
