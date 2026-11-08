import React from "react";

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  className = "",
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-cream-200 rounded-btn ${className}`}
      style={{
        width: width,
        height: height,
      }}
    />
  );
}

