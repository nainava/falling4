import { useState, useEffect, useCallback, useRef } from 'react';
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
import { MobileControls } from '@/components/MobileControls';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';

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
const BASE_SPEED = 1000;
const SPEED_MULTIPLIER = 0.85;
const DAS_DELAY = 120; // Slight delay before repeating
const DAS_RATE = 40;   // Fast repeat rate for fluid movement

type HighScore = { score: number; date: string };

function getHighScores(): HighScore[] {
  try {
    return JSON.parse(localStorage.getItem('tetris-highscores') || '[]');
  } catch {
    return [];
  }
}

function saveHighScore(newScore: number): HighScore[] {
  const current = getHighScores();
  const entry = { score: newScore, date: new Date().toISOString() };
  const updated = [...current, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  localStorage.setItem('tetris-highscores', JSON.stringify(updated));
  return updated;
}

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
  const [volume, setVolume] = useState(50);
  const [highScores, setHighScores] = useState<HighScore[]>(getHighScores());

  // Timing
  const dropCounter = useRef(0);
  const dropInterval = useRef(BASE_SPEED);
  
  // Volume effect
  useEffect(() => {
    Howler.volume(volume / 100);
  }, [volume]);

  // Mute effect
  useEffect(() => {
    Howler.mute(isMuted);
  }, [isMuted]);

  const spawnPiece = useCallback((type?: Tetromino) => {
    const piece = type || nextPiece || randomTetromino();
    const next = randomTetromino();
    const newPos = { x: Math.floor(COLS / 2) - 1, y: 0 };
    
    if (checkCollision(piece, grid, newPos)) {
      setGameOver(true);
      setGameStarted(false);
      sounds.gameover.play();
      sounds.music.stop();
      const updated = saveHighScore(score);
      setHighScores(updated);
      return;
    }

    setActivePiece({ pos: newPos, tetromino: piece });
    if (!type) setNextPiece(next);
    setCanHold(true);
  }, [nextPiece, grid, score]);

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
    
    setTimeout(() => spawnPiece(randomTetromino()), 0);
    
    if (!isMuted && !sounds.music.playing()) {
      sounds.music.play();
    }
  };

  const moveHorizontal = useCallback((dir: 1 | -1) => {
    if (!activePiece || gameOver || isPaused) return;
    const newPos = { ...activePiece.pos, x: activePiece.pos.x + dir };
    if (!checkCollision(activePiece.tetromino, grid, newPos)) {
      setActivePiece({ ...activePiece, pos: newPos });
      if (!isMuted) sounds.move.play();
    }
  }, [activePiece, gameOver, isPaused, grid, isMuted]);

  const rotate = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    const rotatedShape = rotateMatrix(activePiece.tetromino.shape);
    const rotatedPiece = { ...activePiece.tetromino, shape: rotatedShape };
    const kicks = [0, -1, 1, -2, 2];
    
    for (const offset of kicks) {
      const newPos = { ...activePiece.pos, x: activePiece.pos.x + offset };
      if (!checkCollision(rotatedPiece, grid, newPos)) {
        setActivePiece({ ...activePiece, tetromino: rotatedPiece, pos: newPos });
        if (!isMuted) sounds.rotate.play();
        return;
      }
    }
  }, [activePiece, gameOver, isPaused, grid, isMuted]);

  const hardDrop = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    let newY = activePiece.pos.y;
    while (!checkCollision(activePiece.tetromino, grid, { x: activePiece.pos.x, y: newY + 1 })) {
      newY++;
    }
    const finalPos = { ...activePiece.pos, y: newY };
    setActivePiece({ ...activePiece, pos: finalPos });
    lockPiece({ ...activePiece, pos: finalPos });
    if (!isMuted) sounds.drop.play();
  }, [activePiece, gameOver, isPaused, grid, isMuted]);

  const hold = useCallback(() => {
    if (!activePiece || !canHold || gameOver || isPaused) return;
    
    const current = activePiece.tetromino;
    if (holdPiece) {
      setHoldPiece(current);
      spawnPiece(holdPiece);
    } else {
      setHoldPiece(current);
      spawnPiece();
    }
    setCanHold(false);
  }, [activePiece, canHold, gameOver, isPaused, holdPiece, spawnPiece]);

  const lockPiece = (pieceState: { pos: { x: number; y: number }; tetromino: Tetromino }) => {
    const { pos, tetromino } = pieceState;
    const newGrid = grid.map(row => [...row]);
    
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

    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (newGrid[y].every(cell => cell !== null)) {
        newGrid.splice(y, 1);
        newGrid.unshift(Array(COLS).fill(null));
        linesCleared++;
        y++;
      }
    }

    if (linesCleared > 0) {
      if (!isMuted) sounds.clear.play();
      const newLines = lines + linesCleared;
      setLines(newLines);
      
      const lineScores = [0, 100, 300, 500, 800];
      setScore(s => s + (lineScores[linesCleared] * level));

      const newLevel = Math.floor(newLines / 10) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        dropInterval.current = Math.max(100, BASE_SPEED * Math.pow(SPEED_MULTIPLIER, newLevel - 1));
      }
    }

    setGrid(newGrid);
    spawnPiece();
  };

  // Game Loop
  useGameLoop((deltaTime) => {
    if (gameOver || isPaused || !gameStarted || !activePiece) return;

    dropCounter.current += deltaTime;
    if (dropCounter.current > dropInterval.current) {
      const newPos = { ...activePiece.pos, y: activePiece.pos.y + 1 };
      
      if (checkCollision(activePiece.tetromino, grid, newPos)) {
        lockPiece(activePiece);
      } else {
        setActivePiece({ ...activePiece, pos: newPos });
      }
      
      dropCounter.current = 0;
    }
  }, gameStarted);

  // Input Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted && !gameOver) return;
      
      // Allow pause toggle even when paused
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameStarted && !gameOver) {
          setIsPaused(prev => !prev);
        }
        return;
      }
      
      if (gameOver) return;
      if (isPaused) return;

      // Prevent default scrolling for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch(e.code) {
        case 'ArrowLeft': 
          moveHorizontal(-1);
          break;
        case 'ArrowRight': 
          moveHorizontal(1);
          break;
        case 'ArrowDown': 
          if (activePiece && !checkCollision(activePiece.tetromino, grid, { ...activePiece.pos, y: activePiece.pos.y + 1 })) {
            setActivePiece(p => p && ({ ...p, pos: { ...p.pos, y: p.pos.y + 1 } }));
            setScore(s => s + 1);
          }
          break;
        case 'ArrowUp': 
          rotate(); 
          break;
        case 'Space': 
          hardDrop(); 
          break;
        case 'ShiftLeft':
        case 'ShiftRight': 
          hold(); 
          break;
        case 'KeyM': 
          setIsMuted(prev => !prev); 
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePiece, grid, gameOver, isPaused, gameStarted, rotate, hardDrop, hold, moveHorizontal]);

  const getGhostPiece = () => {
    if (!activePiece || gameOver || isPaused) return null;
    
    let ghostY = activePiece.pos.y;
    while (!checkCollision(activePiece.tetromino, grid, { x: activePiece.pos.x, y: ghostY + 1 })) {
      ghostY++;
    }
    return { pos: { x: activePiece.pos.x, y: ghostY }, tetromino: activePiece.tetromino };
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col md:flex-row items-center justify-center p-2 md:p-4 gap-2 md:gap-4">
      
      {/* LEFT COLUMN: HUD */}
      <div className="hidden md:flex flex-col gap-3 w-40 shrink-0">
        <div className="bg-black/50 border border-primary/30 p-3 rounded-lg backdrop-blur-sm">
          <PiecePreview label="HOLD" tetromino={holdPiece} />
        </div>
        
        <div className="bg-black/50 border border-secondary/30 p-3 rounded-lg backdrop-blur-sm space-y-3">
          <div>
            <h3 className="text-[10px] text-secondary uppercase tracking-widest mb-1">Score</h3>
            <p className="text-xl font-mono text-white tabular-nums w-24">{score.toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-[10px] text-secondary uppercase tracking-widest mb-1">Level</h3>
            <p className="text-xl font-mono text-white tabular-nums">{level}</p>
          </div>
          <div>
            <h3 className="text-[10px] text-secondary uppercase tracking-widest mb-1">Lines</h3>
            <p className="text-xl font-mono text-white tabular-nums">{lines}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsMuted(!isMuted)}
            className="border-white/20"
            data-testid="button-mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsPaused(!isPaused)}
            className="border-white/20"
            disabled={!gameStarted || gameOver}
            data-testid="button-pause"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* CENTER: GAME BOARD */}
      <div className="relative flex-shrink-0">
        <TetrisBoard 
          grid={grid} 
          currentPiece={activePiece} 
          ghostPiece={getGhostPiece()}
        />

        {/* Start Overlay */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg border-2 border-primary/20 p-4">
            <h1 className="text-3xl md:text-5xl text-center mb-6 text-primary font-bold animate-pulse">
              NEON<br/>TETRIS
            </h1>
            <Button 
              size="lg" 
              onClick={resetGame}
              className="text-lg font-bold bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)]"
              data-testid="button-start"
            >
              START GAME
            </Button>
            <p className="mt-4 text-xs text-muted-foreground font-mono text-center">
              ARROWS to move • UP to rotate<br/>SPACE to drop • P to pause
            </p>
          </div>
        )}

        {/* Pause Overlay with Volume Control */}
        {isPaused && !gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-3xl text-white font-bold tracking-widest mb-8">PAUSED</h2>
            
            <div className="w-full max-w-[200px] space-y-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="shrink-0"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                <Slider
                  value={[volume]}
                  onValueChange={(v) => setVolume(v[0])}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={isMuted}
                />
              </div>
            </div>

            <Button 
              size="lg"
              onClick={() => setIsPaused(false)}
              className="mt-8 bg-primary hover:bg-primary/90"
              data-testid="button-resume"
            >
              RESUME
            </Button>
            
            <p className="mt-4 text-xs text-muted-foreground">Press P or ESC to resume</p>
          </div>
        )}

        {/* Game Over Overlay with High Scores */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-30 backdrop-blur-md p-4 rounded-lg overflow-y-auto">
            <h2 className="text-3xl text-primary font-bold mb-2">GAME OVER</h2>
            <div className="text-center mb-4">
              <p className="text-muted-foreground text-sm">Final Score</p>
              <p className="text-2xl text-white font-mono tabular-nums">{score.toLocaleString()}</p>
            </div>
            
            {/* High Scores */}
            <div className="w-full max-w-[180px] mb-4">
              <h3 className="text-xs text-secondary uppercase tracking-widest mb-2 text-center">Top 5 High Scores</h3>
              <div className="space-y-1 bg-black/50 p-3 rounded-lg border border-secondary/20">
                {highScores.length > 0 ? (
                  highScores.map((s, i) => (
                    <div key={i} className={`flex justify-between text-sm ${s.score === score ? 'text-primary font-bold' : ''}`}>
                      <span className="text-muted-foreground">#{i + 1}</span>
                      <span className="font-mono tabular-nums">{s.score.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center">No scores yet</p>
                )}
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={() => {
                setGameOver(false);
                setGameStarted(false);
              }}
              className="font-bold bg-primary hover:bg-primary/90"
              data-testid="button-play-again"
            >
              PLAY AGAIN
            </Button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: PREVIEW & HIGH SCORES */}
      <div className="hidden md:flex flex-col gap-3 w-40 shrink-0">
        <div className="bg-black/50 border border-primary/30 p-3 rounded-lg backdrop-blur-sm">
          <PiecePreview label="NEXT" tetromino={nextPiece} />
        </div>
        
        <div className="bg-black/50 border border-secondary/30 p-3 rounded-lg backdrop-blur-sm">
          <h3 className="text-[10px] text-secondary uppercase tracking-widest mb-2 border-b border-secondary/20 pb-1">High Scores</h3>
          <div className="space-y-1">
            {highScores.length > 0 ? (
              highScores.map((s, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">#{i + 1}</span>
                  <span className="font-mono text-white tabular-nums">{s.score.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground text-center py-2">No scores yet</p>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="md:hidden w-full flex flex-col gap-2 px-2">
        <div className="flex justify-between items-center">
          <div className="bg-black/50 p-2 rounded border border-white/10">
            <div className="text-[8px] text-muted-foreground uppercase">Score</div>
            <div className="text-base font-bold font-mono tabular-nums w-16">{score.toLocaleString()}</div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsMuted(!isMuted)}
              className="border-white/20 h-8 w-8"
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsPaused(!isPaused)}
              className="border-white/20 h-8 w-8"
              disabled={!gameStarted || gameOver}
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </Button>
          </div>
          <div className="bg-black/50 p-1 rounded border border-white/10">
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
