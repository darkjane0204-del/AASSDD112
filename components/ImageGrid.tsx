
import React from 'react';
import { ModificationResult, GenerationMode } from '../types';

interface Props {
  results: ModificationResult[];
  isLoading: boolean;
  onSelect: (result: ModificationResult) => void;
}

const MODE_LABELS: Record<GenerationMode, string> = {
  [GenerationMode.LOCAL_EDIT]: 'Precise Edit',
  [GenerationMode.PERSPECTIVE]: 'Perspective Shift',
  [GenerationMode.SCENE_SWAP]: 'Scene Swap',
  [GenerationMode.COMPREHENSIVE]: 'Full Re-imagining'
};

const MODE_DESCRIPTIONS: Record<GenerationMode, string> = {
  [GenerationMode.LOCAL_EDIT]: 'Pixel-perfect local modifications',
  [GenerationMode.PERSPECTIVE]: 'Modified with camera angle adjustment',
  [GenerationMode.SCENE_SWAP]: 'Modified within a new environment',
  [GenerationMode.COMPREHENSIVE]: 'Complete scene and angle overhaul'
};

export const ImageGrid: React.FC<Props> = ({ results, isLoading, onSelect }) => {
  if (isLoading && results.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="aspect-video bg-slate-800 animate-pulse rounded-xl flex items-center justify-center">
             <i className="fas fa-magic text-slate-700 text-4xl"></i>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {results.map((res) => (
        <div 
          key={res.id} 
          className="group relative aspect-video glass rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
          onClick={() => onSelect(res)}
        >
          <img src={res.url} alt={res.mode} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-left">
            <span className="text-blue-400 font-bold text-sm uppercase tracking-wide">{MODE_LABELS[res.mode]}</span>
            <p className="text-xs text-slate-300 line-clamp-1">{MODE_DESCRIPTIONS[res.mode]}</p>
          </div>
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur rounded text-[10px] font-bold text-white uppercase tracking-tighter">
            Path {Object.values(GenerationMode).indexOf(res.mode) + 1}
          </div>
        </div>
      ))}
    </div>
  );
};
