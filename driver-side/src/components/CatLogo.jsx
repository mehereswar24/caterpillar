import React from 'react';

// The Caterpillar "CAT" logo (white CAT and the yellow triangle on a black square), served from /cat-logo.svg.
export default function CatLogo({ height = 40, className = '' }) {
  return <img src="/cat-logo.svg" alt="CAT" height={height} width={height} draggable={false} className={`select-none rounded-[3px] flex-shrink-0 ${className}`} style={{ height, width: height }} />;
}
