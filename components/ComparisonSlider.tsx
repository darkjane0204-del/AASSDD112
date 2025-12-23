
import React, { useState } from 'react';

interface Props {
  original: string;
  modified: string;
}

export const ComparisonSlider: React.FC<Props> = ({ original, modified }) => {
  const [position, setPosition] = useState(50);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const newPos = ((x - rect.left) / rect.width) * 100;
    setPosition(Math.min(Math.max(newPos, 0), 100));
  };

  return (
    <div 
      className="relative w-full aspect-video overflow-hidden rounded-xl cursor-col-resize select-none border border-slate-800"
      onMouseMove={(e) => e.buttons === 1 && handleMove(e)}
      onTouchMove={handleMove}
      onMouseDown={handleMove}
    >
      <img 
        src={modified} 
        alt="Modified" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img 
          src={original} 
          alt="Original" 
          className="absolute inset-0 w-auto h-full max-w-none object-cover"
          style={{ width: `${10000 / position}%` }}
        />
      </div>
      <div 
        className="absolute inset-y-0 w-1 bg-white shadow-xl flex items-center justify-center"
        style={{ left: `${position}%` }}
      >
        <div className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center -ml-0.5">
          <i className="fas fa-arrows-left-right text-slate-800 text-xs"></i>
        </div>
      </div>
      
      <div className="absolute top-4 left-4 px-2 py-1 glass rounded text-[10px] uppercase tracking-widest font-bold">Original</div>
      <div className="absolute top-4 right-4 px-2 py-1 glass rounded text-[10px] uppercase tracking-widest font-bold">Modified</div>
    </div>
  );
};
