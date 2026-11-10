"use client";

import React from "react";
import Skeleton from "@/components/ui/Skeleton";

export default function PostJobLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton height={32} className="w-1/3" />
        <Skeleton height={18} className="w-1/2" />
      </div>

      <div className="bg-surface rounded-card p-6 border border-border-subtle space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <Skeleton height={24} className="w-48" />
          <Skeleton height={24} className="w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton height={42} className="w-full rounded-btn" />
          <Skeleton height={96} className="w-full rounded-card" />
          <Skeleton height={42} className="w-full rounded-btn" />
        </div>
      </div>
    </div>
  );
}

