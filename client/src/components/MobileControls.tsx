import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onHold: () => void;
  onPause: () => void;
  isPaused: boolean;
}

export function MobileControls({
  onMoveLeft,
  onMoveRight,
  onRotate,
  onSoftDrop,
  onHardDrop,
  onHold,
  onPause,
  isPaused
}: MobileControlsProps) {
  // Prevent double-tap zoom and context menu
  const preventDefault = (e: React.TouchEvent | React.MouseEvent) => {
    // e.preventDefault(); // Sometimes interferes with clicking, careful
  };

  const btnClass = "w-14 h-14 rounded-full bg-white/10 border border-white/20 active:bg-primary/40 active:border-primary active:scale-95 transition-all flex items-center justify-center backdrop-blur-sm shadow-lg touch-none select-none";
  const iconClass = "w-6 h-6 text-white";

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto mt-4 px-4 pb-4 select-none touch-manipulation">
      {/* Top Row: Hold, Pause, Hard Drop */}
      <div className="flex justify-between items-center px-2">
        <button onClick={onHold} className={`${btnClass} !w-12 !h-12 !rounded-lg bg-yellow-500/20 border-yellow-500/50`}>
          <span className="text-xs font-bold text-yellow-500">HOLD</span>
        </button>
        
        <button onClick={onPause} className={`${btnClass} !w-12 !h-12 !rounded-lg bg-blue-500/20 border-blue-500/50`}>
          {isPaused ? <Play className={iconClass} /> : <Pause className={iconClass} />}
        </button>

        <button onClick={onHardDrop} className={`${btnClass} !w-16 !h-16 border-primary/50 bg-primary/20`}>
          <ArrowUp className={`${iconClass} text-primary`} />
        </button>
      </div>

      {/* Bottom Row: D-Pad and Rotate */}
      <div className="flex justify-between items-end gap-4">
        {/* D-Pad */}
        <div className="grid grid-cols-3 gap-1">
          <div /> {/* Empty top-left */}
          <button 
            onTouchStart={onRotate} 
            onClick={onRotate}
            className={`${btnClass} !rounded-t-lg !rounded-b-none`}
          >
            <RotateCw className={iconClass} />
          </button>
          <div /> {/* Empty top-right */}
          
          <button 
            onTouchStart={onMoveLeft}
            onClick={onMoveLeft}
            className={`${btnClass} !rounded-l-lg !rounded-r-none`}
          >
            <ArrowLeft className={iconClass} />
          </button>
          <button 
            onTouchStart={onSoftDrop}
            onClick={onSoftDrop}
            className={`${btnClass} !rounded-none`}
          >
            <ArrowDown className={iconClass} />
          </button>
          <button 
            onTouchStart={onMoveRight}
            onClick={onMoveRight}
            className={`${btnClass} !rounded-r-lg !rounded-l-none`}
          >
            <ArrowRight className={iconClass} />
          </button>
        </div>

        {/* Big Rotate Button (Alternative for thumb) */}
        <button 
          onTouchStart={onRotate} 
          onClick={onRotate}
          className={`${btnClass} !w-20 !h-20 bg-secondary/20 border-secondary/50 !rounded-full active:bg-secondary/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]`}
        >
          <RotateCw className="w-8 h-8 text-secondary" />
        </button>
      </div>
    </div>
  );
}
