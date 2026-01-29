import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { 
  createGrid, 
  checkCollision, 
  rotateMatrix, 
  randomTetromino, 
  ROWS, 
  COLS,
  type Grid, 
  type Tetromino 
} from '@/lib/tetris-engine';
import { useGameLoop } from '@/hooks/use-game-loop';
import { TetrisBoard } from '@/components/TetrisBoard';
import { PiecePreview } from '@/components/PiecePreview';
import { Leaderboard } from '@/components/Leaderboard';
// import { ScoreSubmission } from '@/components/ScoreSubmission';
import { MobileControls } from '@/components/MobileControls';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RotateCcw, Pause, Play } from 'lucide-react';
import { useScores } from '@/hooks/use-scores';

// --- SOUNDS ---
const sounds = {
  move: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'], volume: 0.3 }),
  rotate: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'], volume: 0.3 }),
  drop: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'], volume: 0.4 }),
  clear: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'], volume: 0.5 }),
  gameover: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3'], volume: 0.5 }),
  music: new Howl({ 
    src: ['https://opengameart.org/sites/default/files/Rolemusic_-_04_-_The_White.mp3'], 
    html5: true, 
    loop: true, 
    volume: 0.2 
  }),
};

// --- GAME CONFIG ---
const BASE_SPEED = 1000; // ms per drop
const SPEED_MULTIPLIER = 0.85; // Speed increases by 15% each level

export default function Game() {
  // Game State
  const [grid, setGrid] = useState<Grid>(createGrid());
  const [activePiece, setActivePiece] = useState<{ pos: { x: number; y: number }; tetromino: Tetromino } | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);
  const [holdPiece, setHoldPiece] = useState<Tetromino | null>(null);
  const [canHold, setCanHold] = useState(true);
  
  // Game Status
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Timing
  const dropCounter = useRef(0);
  const dropInterval = useRef(BASE_SPEED);

  // --- CONTROLS ---

  const spawnPiece = useCallback((type?: Tetromino) => {
    const piece = type || nextPiece || randomTetromino();
    const next = randomTetromino();
    
    // Default spawn position (center top)
    const newPos = { x: Math.floor(COLS / 2) - 1, y: 0 };
    
    // Instant game over check
    if (checkCollision(piece, grid, newPos)) {
      setGameOver(true);
      setGameStarted(false);
      sounds.gameover.play();
      sounds.music.stop();
      return;
    }

    setActivePiece({ pos: newPos, tetromino: piece });
    if (!type) setNextPiece(next); // Only update next if not swapping hold
    setCanHold(true);
  }, [nextPiece, grid]);

  const resetGame = () => {
    setGrid(createGrid());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setHoldPiece(null);
    setNextPiece(randomTetromino());
    dropInterval.current = BASE_SPEED;
    setGameStarted(true);
    setIsPaused(false);
    
    // Need a tiny delay to allow state to settle before spawning
    setTimeout(() => spawnPiece(randomTetromino()), 0);
    
    if (!isMuted && !sounds.music.playing()) {
      sounds.music.play();
    }
  };

  const moveHorizontal = (dir: 1 | -1) => {
    if (!activePiece || gameOver || isPaused) return;
    const newPos = { ...activePiece.pos, x: activePiece.pos.x + dir };
    if (!checkCollision(activePiece.tetromino, grid, newPos)) {
      setActivePiece({ ...activePiece, pos: newPos });
      if (!isMuted) sounds.move.play();
    }
  };

  const rotate = () => {
    if (!activePiece || gameOver || isPaused) return;
    const rotatedShape = rotateMatrix(activePiece.tetromino.shape);
    const rotatedPiece = { ...activePiece.tetromino, shape: rotatedShape };
    
    // Basic wall kick (try center, then left, then right)
    const kicks = [0, -1, 1, -2, 2];
    
    for (const offset of kicks) {
      const newPos = { ...activePiece.pos, x: activePiece.pos.x + offset };
      if (!checkCollision(rotatedPiece, grid, newPos)) {
        setActivePiece({ ...activePiece, tetromino: rotatedPiece, pos: newPos });
        if (!isMuted) sounds.rotate.play();
        return;
      }
    }
  };

  const hardDrop = () => {
    if (!activePiece || gameOver || isPaused) return;
    let newY = activePiece.pos.y;
    while (!checkCollision(activePiece.tetromino, grid, { x: activePiece.pos.x, y: newY + 1 })) {
      newY++;
    }
    setActivePiece({ ...activePiece, pos: { ...activePiece.pos, y: newY } });
    lockPiece({ ...activePiece, pos: { ...activePiece.pos, y: newY } });
    if (!isMuted) sounds.drop.play();
  };

  const hold = () => {
    if (!activePiece || !canHold || gameOver || isPaused) return;
    
    const current = activePiece.tetromino;
    if (holdPiece) {
      setHoldPiece(current);
      spawnPiece(holdPiece);
    } else {
      setHoldPiece(current);
      spawnPiece(); // Spawns next piece
    }
    setCanHold(false);
  };

  const lockPiece = (pieceState: { pos: { x: number; y: number }; tetromino: Tetromino }) => {
    const { pos, tetromino } = pieceState;
    const newGrid = grid.map(row => [...row]); // Deep copy rows
    
    // Burn piece into grid
    tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = y + pos.y;
          const gridX = x + pos.x;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            newGrid[gridY][gridX] = { type: tetromino.type, locked: true };
          }
        }
      });
    });

    // Clear lines
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (newGrid[y].every(cell => cell !== null)) {
        newGrid.splice(y, 1);
        newGrid.unshift(Array(COLS).fill(null));
        linesCleared++;
        y++; // Check same row index again (since rows shifted down)
      }
    }

    if (linesCleared > 0) {
      if (!isMuted) sounds.clear.play();
      const newLines = lines + linesCleared;
      setLines(newLines);
      
      // Classic scoring
      const lineScores = [0, 100, 300, 500, 800];
      setScore(s => s + (lineScores[linesCleared] * level));

      // Level up every 10 lines
      const newLevel = Math.floor(newLines / 10) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        dropInterval.current = Math.max(100, BASE_SPEED * Math.pow(SPEED_MULTIPLIER, newLevel - 1));
      }
    }

    setGrid(newGrid);
    spawnPiece();
  };

  // --- GAME LOOP ---
  useGameLoop((deltaTime) => {
    if (gameOver || isPaused || !gameStarted || !activePiece) return;

    dropCounter.current += deltaTime;
    if (dropCounter.current > dropInterval.current) {
      // Try to move down
      const newPos = { ...activePiece.pos, y: activePiece.pos.y + 1 };
      
      if (checkCollision(activePiece.tetromino, grid, newPos)) {
        lockPiece(activePiece);
      } else {
        setActivePiece({ ...activePiece, pos: newPos });
      }
      
      dropCounter.current = 0;
    }
  }, gameStarted);

  // --- INPUT HANDLERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;

      // Prevent default scrolling for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch(e.code) {
        case 'ArrowLeft': moveHorizontal(-1); break;
        case 'ArrowRight': moveHorizontal(1); break;
        case 'ArrowDown': 
          // Soft drop
          if (!isPaused && activePiece && !checkCollision(activePiece.tetromino, grid, { ...activePiece.pos, y: activePiece.pos.y + 1 })) {
            setActivePiece(p => p && ({ ...p, pos: { ...p.pos, y: p.pos.y + 1 } }));
            setScore(s => s + 1);
          }
          break;
        case 'ArrowUp': rotate(); break;
        case 'Space': 
          // Hard drop needs to be robust
          hardDrop(); 
          break;
        case 'ShiftLeft':
        case 'ShiftRight': hold(); break;
        case 'KeyP': setIsPaused(prev => !prev); break;
        case 'KeyM': setIsMuted(prev => !prev); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePiece, grid, gameOver, isPaused, gameStarted, canHold, holdPiece, isMuted]);

  // Audio Toggle Effect
  useEffect(() => {
    Howler.mute(isMuted);
  }, [isMuted]);

  // Ghost Piece Calculation
  const getGhostPiece = () => {
    if (!activePiece || gameOver || isPaused) return null;
    
    let ghostY = activePiece.pos.y;
    while (!checkCollision(activePiece.tetromino, grid, { x: activePiece.pos.x, y: ghostY + 1 })) {
      ghostY++;
    }
    return { pos: { x: activePiece.pos.x, y: ghostY }, tetromino: activePiece.tetromino };
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row items-center justify-center p-4 gap-8">
      
      {/* LEFT COLUMN: HUD */}
      <div className="hidden md:flex flex-col gap-6 w-48">
        <div className="bg-black/50 border border-primary/30 p-4 rounded-xl backdrop-blur-sm">
          <PiecePreview label="HOLD (Shift)" tetromino={holdPiece} />
        </div>
        
        <div className="bg-black/50 border border-secondary/30 p-4 rounded-xl backdrop-blur-sm space-y-4">
          <div>
            <h3 className="text-xs text-secondary uppercase tracking-widest mb-1">Score</h3>
            <p className="text-2xl font-mono text-white">{score.toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-xs text-secondary uppercase tracking-widest mb-1">Level</h3>
            <p className="text-2xl font-mono text-white">{level}</p>
          </div>
          <div>
            <h3 className="text-xs text-secondary uppercase tracking-widest mb-1">Lines</h3>
            <p className="text-2xl font-mono text-white">{lines}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsMuted(!isMuted)}
            className="border-white/20 hover:bg-white/10"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsPaused(!isPaused)}
            className="border-white/20 hover:bg-white/10"
            disabled={!gameStarted || gameOver}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* CENTER: GAME BOARD */}
      <div className="relative">
        <TetrisBoard 
          grid={grid} 
          currentPiece={activePiece} 
          ghostPiece={getGhostPiece()}
        />

        {/* Start Overlay */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg border-2 border-primary/20">
            <h1 className="text-4xl md:text-6xl text-center mb-8 text-neon-pink font-display animate-pulse">
              NEON<br/>TETRIS
            </h1>
            <Button 
              size="lg" 
              onClick={resetGame}
              className="text-xl font-bold bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all hover:scale-105"
            >
              START GAME
            </Button>
            <p className="mt-6 text-sm text-muted-foreground font-mono">
              ARROWS to move • UP to rotate • SPACE to drop
            </p>
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !gameOver && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
            <h2 className="text-4xl text-white font-display tracking-widest">PAUSED</h2>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-30 backdrop-blur-md p-4 rounded-lg">
            <h2 className="text-4xl text-neon-pink font-display mb-4">GAME OVER</h2>
            <div className="text-center mb-8">
              <p className="text-muted-foreground">Final Score</p>
              <p className="text-3xl text-white font-mono">{score.toLocaleString()}</p>
            </div>
             <Button 
              size="lg" 
              onClick={() => {
                // Save local high score
                const currentHighScores = JSON.parse(localStorage.getItem('tetris-highscores') || '[]');
                const newScore = { score, date: new Date().toISOString() };
                const newScores = [...currentHighScores, newScore]
                  .sort((a: any, b: any) => b.score - a.score)
                  .slice(0, 5);
                localStorage.setItem('tetris-highscores', JSON.stringify(newScores));
                
                setGameOver(false);
                setGameStarted(false);
              }}
              className="text-xl font-bold bg-primary hover:bg-primary/90"
            >
              PLAY AGAIN
            </Button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: PREVIEW & LEADERBOARD */}
      <div className="hidden md:flex flex-col gap-6 w-64 h-[600px]">
        <div className="bg-black/50 border border-primary/30 p-4 rounded-xl backdrop-blur-sm">
          <PiecePreview label="NEXT" tetromino={nextPiece} />
        </div>
        
        <div className="flex-1 min-h-0 bg-black/50 border border-secondary/30 p-4 rounded-xl backdrop-blur-sm">
          <h3 className="text-sm text-secondary uppercase tracking-widest mb-4 border-b border-secondary/20 pb-2">High Scores</h3>
           <div className="space-y-2">
            {(JSON.parse(localStorage.getItem('tetris-highscores') || '[]') as any[]).map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">#{i + 1}</span>
                <span className="font-mono text-white">{s.score.toLocaleString()}</span>
              </div>
            ))}
            {!(localStorage.getItem('tetris-highscores')) && (
              <p className="text-xs text-muted-foreground text-center py-4">No scores yet</p>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT (Only visible on small screens) */}
      <div className="md:hidden w-full flex flex-col gap-4">
        <div className="flex justify-between items-start px-4">
          <div className="bg-black/50 p-2 rounded border border-white/10">
            <div className="text-[10px] text-muted-foreground uppercase">Score</div>
            <div className="text-lg font-bold">{score}</div>
          </div>
          <div className="bg-black/50 p-2 rounded border border-white/10">
            <PiecePreview label="NEXT" tetromino={nextPiece} />
          </div>
        </div>

        {gameStarted && !gameOver && (
          <MobileControls 
            onMoveLeft={() => moveHorizontal(-1)}
            onMoveRight={() => moveHorizontal(1)}
            onRotate={rotate}
            onSoftDrop={() => {
              if (!isPaused && activePiece && !checkCollision(activePiece.tetromino, grid, { ...activePiece.pos, y: activePiece.pos.y + 1 })) {
                setActivePiece(p => p && ({ ...p, pos: { ...p.pos, y: p.pos.y + 1 } }));
                setScore(s => s + 1);
              }
            }}
            onHardDrop={hardDrop}
            onHold={hold}
            onPause={() => setIsPaused(!isPaused)}
            isPaused={isPaused}
          />
        )}
      </div>

    </div>
  );
}
