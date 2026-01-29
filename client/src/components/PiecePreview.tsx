import React from 'react';
import { Tetromino, COLORS } from '@/lib/tetris-engine';

interface PiecePreviewProps {
  label: string;
  tetromino: Tetromino | null;
}

export function PiecePreview({ label, tetromino }: PiecePreviewProps) {
  // 4x4 grid for preview
  const grid = Array.from({ length: 4 }, () => Array(4).fill(0));

  if (tetromino) {
    tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value && y < 4 && x < 4) {
          // Center the piece roughly
          const offsetX = tetromino.shape.length === 2 ? 1 : 0; 
          const offsetY = tetromino.shape.length === 2 ? 1 : 0;
          if (grid[y+offsetY] && grid[y+offsetY][x+offsetX] !== undefined) {
             grid[y+offsetY][x+offsetX] = 1;
          }
        }
      });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs text-secondary uppercase tracking-widest">{label}</h3>
      <div className="w-24 h-24 bg-black/40 border-2 border-secondary/30 rounded-lg p-2 grid grid-rows-4 grid-cols-4 gap-[2px]">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`w-full h-full rounded-sm ${cell ? '' : 'bg-white/5'}`}
              style={cell && tetromino ? {
                backgroundColor: COLORS[tetromino.color],
                boxShadow: `0 0 10px ${COLORS[tetromino.color]}`
              } : {}}
            />
          ))
        )}
      </div>
    </div>
  );
}
