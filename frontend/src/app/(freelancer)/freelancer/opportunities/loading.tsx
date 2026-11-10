"use client";

import React from "react";
import Skeleton from "@/components/ui/Skeleton";

export default function OpportunitiesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton height={32} className="w-1/3" />
        <Skeleton height={18} className="w-1/2" />
      </div>

      <div className="space-y-4">
        <Skeleton height={140} className="w-full rounded-card" />
        <Skeleton height={140} className="w-full rounded-card" />
        <Skeleton height={140} className="w-full rounded-card" />
      </div>
    </div>
  );
}

