"use client";

import React from "react";
import Skeleton from "@/components/ui/Skeleton";

export default function FreelancerLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton height={32} className="w-1/3" />
        <Skeleton height={18} className="w-1/2" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Skeleton height={96} className="w-full rounded-card" />
        <Skeleton height={96} className="w-full rounded-card" />
        <Skeleton height={96} className="w-full rounded-card" />
        <Skeleton height={96} className="w-full rounded-card" />
      </div>

      <div className="space-y-3">
        <Skeleton height={48} className="w-full rounded-btn" />
        <Skeleton height={64} className="w-full rounded-card" />
        <Skeleton height={64} className="w-full rounded-card" />
        <Skeleton height={64} className="w-full rounded-card" />
      </div>
    </div>
  );
}
