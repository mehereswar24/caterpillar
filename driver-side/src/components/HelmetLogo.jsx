import React from 'react';

// Minimal line-drawn hard hat: dome, centre ridge, brim.
export default function HelmetLogo({ size = 24, className = '', strokeWidth = 1.7, chip = true }) {
  const icon = chip ? Math.round(size * 0.62) : size;
  const svg = (
    <svg
      width={icon}
      height={icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={chip ? undefined : className}
      aria-label="Helmet"
    >
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <path d="M4 15v-3a6 6 0 0 1 6-6h0" />
      <path d="M14 6h0a6 6 0 0 1 6 6v3" />
    </svg>
  );
  return chip ? (
    <span className={`inline-flex items-center justify-center rounded-xl bg-neutral-900 flex-shrink-0 ${className}`} style={{ width: size, height: size, color: '#FFCD11' }}>
      {svg}
    </span>
  ) : svg;
}
