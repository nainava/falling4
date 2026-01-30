import React from "react";
import { Grid, COLORS, Tetromino, TETROMINOS } from "@/lib/tetris-engine";
import { motion, AnimatePresence } from "framer-motion";

interface TetrisBoardProps {
  grid: Grid;
  currentPiece: {
    pos: { x: number; y: number };
    tetromino: Tetromino;
  } | null;
  ghostPiece?: {
    pos: { x: number; y: number };
    tetromino: Tetromino;
  } | null;
}

export function TetrisBoard({ grid, currentPiece, ghostPiece }: TetrisBoardProps) {
  // Render the grid cells
  const renderCell = (cell: any, x: number, y: number) => {
    // 1. Check if cell is part of locked grid
    if (cell) {
      return (
        <div
          key={`${x}-${y}`}
          className="w-full h-full border border-white/10 rounded-sm relative"
          style={{ 
            backgroundColor: COLORS[TETROMINOS[cell.type].color],
            boxShadow: `inset 0 0 8px rgba(0,0,0,0.25), 0 0 10px ${COLORS[TETROMINOS[cell.type].color]}`
          }}
        />
      );
    }

    // 2. Check if cell is part of current active piece
    if (currentPiece) {
      const { pos, tetromino } = currentPiece;
      const pieceY = y - pos.y;
      const pieceX = x - pos.x;

      if (
        pieceY >= 0 &&
        pieceY < tetromino.shape.length &&
        pieceX >= 0 &&
        pieceX < tetromino.shape[pieceY].length &&
        tetromino.shape[pieceY][pieceX] !== 0
      ) {
        return (
          <div
            key={`${x}-${y}`}
            className="w-full h-full border border-white/20 rounded-sm"
            style={{ 
              backgroundColor: COLORS[tetromino.color],
              boxShadow: `0 0 15px ${COLORS[tetromino.color]}`
            }}
          />
        );
      }
    }

    // 3. Check if cell is part of ghost piece
    if (ghostPiece) {
      const { pos, tetromino } = ghostPiece;
      const pieceY = y - pos.y;
      const pieceX = x - pos.x;

      if (
        pieceY >= 0 &&
        pieceY < tetromino.shape.length &&
        pieceX >= 0 &&
        pieceX < tetromino.shape[pieceY].length &&
        tetromino.shape[pieceY][pieceX] !== 0
      ) {
        return (
          <div
            key={`${x}-${y}`}
            className="w-full h-full border-2 rounded-sm opacity-30"
            style={{ 
              borderColor: COLORS[tetromino.color],
              backgroundColor: 'transparent'
            }}
          />
        );
      }
    }

    // 4. Empty cell
    return (
      <div
        key={`${x}-${y}`}
        className="w-full h-full border border-white/5 bg-white/[0.02]"
      />
    );
  };

  return (
    <div className="relative p-1 bg-black/40 border-2 md:border-4 border-primary/50 rounded-lg shadow-[0_0_20px_rgba(236,72,153,0.3)] backdrop-blur-sm">
      {/* Grid Container - responsive sizing */}
      <div 
        className="grid grid-rows-[repeat(20,minmax(0,1fr))] grid-cols-[repeat(10,minmax(0,1fr))] aspect-[1/2] gap-[1px] bg-black/80"
        style={{ 
          width: 'clamp(140px, min(40vh, 45vw), 280px)',
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => renderCell(cell, x, y))
        )}
      </div>

      {/* CRT Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%] rounded-lg" />
    </div>
  );
}
