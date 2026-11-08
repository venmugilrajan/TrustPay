import React from "react";

export interface ScoreRingProps {
  score: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export default function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  className = "",
  label = "Score",
}: ScoreRingProps) {
  const normalizedScore = Math.max(0, Math.min(1, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - normalizedScore * circumference;

  let strokeColor = "#2E7D4F"; // success
  if (normalizedScore < 0.5) {
    strokeColor = "#B3402E"; // danger
  } else if (normalizedScore < 0.85) {
    strokeColor = "#B7791F"; // warning
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EFE7D6"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-serif text-content-primary">
            {Math.round(normalizedScore * 100)}%
          </span>
        </div>
      </div>
      {label && <span className="mt-1 text-xs text-content-muted font-medium">{label}</span>}
    </div>
  );
}

