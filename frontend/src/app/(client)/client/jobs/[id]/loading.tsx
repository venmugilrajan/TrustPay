"use client";

import React from "react";
import Skeleton from "@/components/ui/Skeleton";

export default function JobDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton height={36} className="w-1/2" />
        <Skeleton height={20} className="w-3/4" />
      </div>

      <Skeleton height={110} className="w-full rounded-card" />

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-3">
          <Skeleton height={80} className="w-full rounded-card" />
          <Skeleton height={80} className="w-full rounded-card" />
        </div>
        <div className="lg:col-span-8 space-y-4">
          <Skeleton height={280} className="w-full rounded-card" />
          <Skeleton height={200} className="w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
