import React from "react";
import { Grid, COLORS, Tetromino, TETROMINOS } from "@/lib/tetris-engine";

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
  clearingRows?: number[];
  docked?: 'right';
}

export function TetrisBoard({ grid, currentPiece, ghostPiece, clearingRows = [], docked }: TetrisBoardProps) {
  const renderCell = (cell: import("@/lib/tetris-engine").GridCell, x: number, y: number) => {
    const isClearing = clearingRows.includes(y);

    // 1. Locked grid cell
    if (cell) {
      if (isClearing) {
        return (
          <div
            key={`${x}-${y}`}
            className="w-full h-full  animate-pulse"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
              transition: 'all 0.15s ease-out',
            }}
          />
        );
      }
      return (
        <div
          key={`${x}-${y}`}
          className="w-full h-full border border-white/10  relative"
          style={{
            backgroundColor: COLORS[TETROMINOS[cell.type].color],
            boxShadow: `inset 0 0 8px rgba(0,0,0,0.25), 0 0 10px ${COLORS[TETROMINOS[cell.type].color]}`
          }}
        />
      );
    }

    // 2. Active piece
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
            className="w-full h-full border border-white/20 "
            style={{
              backgroundColor: COLORS[tetromino.color],
              boxShadow: `0 0 15px ${COLORS[tetromino.color]}`
            }}
          />
        );
      }
    }

    // 3. Ghost piece
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
            className="w-full h-full border-2  opacity-30"
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
        className="w-full h-full border "
        style={{
          borderColor: 'var(--cell-empty-border)',
          backgroundColor: 'var(--cell-empty-bg)',
        }}
      />
    );
  };

  return (
    <div className={`relative p-0.5 sm:p-1 border-2 backdrop-blur-sm h-full ${docked === 'right' ? 'border-r-0' : ''}`} style={{ backgroundColor: 'var(--board-outer)', borderColor: 'var(--board-border)', boxShadow: docked === 'right' ? undefined : '0 0 20px var(--board-border)' }}>
      <div
        className="grid grid-rows-[repeat(20,minmax(0,1fr))] grid-cols-[repeat(10,minmax(0,1fr))] gap-[0.5px] sm:gap-[1px] h-full aspect-[1/2] "
        style={{ backgroundColor: 'var(--board-bg)' }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => renderCell(cell, x, y))
        )}
      </div>

      {/* CRT Scanline Effect Overlay */}
      <div className="crt-scanlines absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%] " />
    </div>
  );
}
