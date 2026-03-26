import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl, Howler } from 'howler';
import {
  createGrid,
  checkCollision,
  rotateMatrix,
  randomTetromino,
  resetBag,
  getKicks,
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
import { Volume2, VolumeX, Pause, Play, Sun, Moon } from 'lucide-react';

const sounds = {
  move: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'], volume: 0.3 }),
  rotate: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'], volume: 0.3 }),
  drop: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'], volume: 0.4 }),
  clear: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'], volume: 0.5 }),
  gameover: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3'], volume: 0.5 }),
  music: new Howl({
    src: ['https://opengameart.org/sites/default/files/Rolemusic_-_04_-_The_White.mp3'],
    html5: true, loop: true, volume: 0.2
  }),
};

const BASE_SPEED = 1000;
const SPEED_MULTIPLIER = 0.85;

type HighScore = { score: number; date: string };

function getHighScores(): HighScore[] {
  try { return JSON.parse(localStorage.getItem('tetris-highscores') || '[]'); }
  catch { return []; }
}

function saveHighScore(newScore: number): HighScore[] {
  const current = getHighScores();
  const entry = { score: newScore, date: new Date().toISOString() };
  const updated = [...current, entry].sort((a, b) => b.score - a.score).slice(0, 5);
  localStorage.setItem('tetris-highscores', JSON.stringify(updated));
  return updated;
}

export default function Game() {
  const [grid, setGrid] = useState<Grid>(createGrid());
  const [activePiece, setActivePiece] = useState<{ pos: { x: number; y: number }; tetromino: Tetromino } | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(50);
  const [highScores, setHighScores] = useState<HighScore[]>(getHighScores());
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [includeFPiece, setIncludeFPiece] = useState(false);
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('tetris-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('tetris-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const dropCounter = useRef(0);
  const dropInterval = useRef(BASE_SPEED);
  const lockDelayCounter = useRef(0);
  const LOCK_DELAY = 500;
  const moveDir = useRef<0 | 1 | -1>(0);
  const lastMoveTime = useRef(0);
  const MOVE_SPEED = 70; // ms between auto-repeat moves
  const DAS_INITIAL = 170; // ms before auto-repeat starts

  useEffect(() => { Howler.volume(volume / 100); }, [volume]);
  useEffect(() => { Howler.mute(isMuted); }, [isMuted]);

  const spawnPiece = useCallback((type?: Tetromino) => {
    const piece = type || nextPiece || randomTetromino(includeFPiece);
    const next = randomTetromino(includeFPiece);
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
    dropCounter.current = 0;
    lockDelayCounter.current = 0;
  }, [nextPiece, grid, score, includeFPiece]);

  const resetGame = () => {
    resetBag();
    setGrid(createGrid());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setClearingRows([]);
    setNextPiece(randomTetromino(includeFPiece));
    dropInterval.current = BASE_SPEED;
    setGameStarted(true);
    setIsPaused(false);
    moveDir.current = 0;
    setTimeout(() => spawnPiece(randomTetromino(includeFPiece)), 0);
    if (!isMuted && !sounds.music.playing()) sounds.music.play();
  };

  const moveHorizontal = useCallback((dir: 1 | -1) => {
    if (!activePiece || gameOver || isPaused) return;
    const newPos = { ...activePiece.pos, x: activePiece.pos.x + dir };
    if (!checkCollision(activePiece.tetromino, grid, newPos)) {
      setActivePiece({ ...activePiece, pos: newPos });
      if (!isMuted) sounds.move.play();
      lockDelayCounter.current = 0;
      return true;
    }
    return false;
  }, [activePiece, gameOver, isPaused, grid, isMuted]);

  const rotate = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    const { tetromino } = activePiece;
    const fromRotation = tetromino.rotation;
    const toRotation = (fromRotation + 1) % 4;
    const rotatedShape = rotateMatrix(tetromino.shape);
    const rotatedPiece = { ...tetromino, shape: rotatedShape, rotation: toRotation };
    const kicks = getKicks(tetromino.type, fromRotation, toRotation);
    for (const [dx, dy] of kicks) {
      const newPos = { x: activePiece.pos.x + dx, y: activePiece.pos.y + dy };
      if (!checkCollision(rotatedPiece, grid, newPos)) {
        setActivePiece({ ...activePiece, tetromino: rotatedPiece, pos: newPos });
        if (!isMuted) sounds.rotate.play();
        lockDelayCounter.current = 0;
        return;
      }
    }
  }, [activePiece, gameOver, isPaused, grid, isMuted]);

  const hardDrop = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    let newY = activePiece.pos.y;
    while (!checkCollision(activePiece.tetromino, grid, { x: activePiece.pos.x, y: newY + 1 })) newY++;
    const finalPos = { ...activePiece.pos, y: newY };
    setActivePiece({ ...activePiece, pos: finalPos });
    lockPiece({ ...activePiece, pos: finalPos });
    if (!isMuted) sounds.drop.play();
  }, [activePiece, gameOver, isPaused, grid, isMuted]);

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

    // Find full rows
    const fullRows: number[] = [];
    for (let y = ROWS - 1; y >= 0; y--) {
      if (newGrid[y].every(cell => cell !== null)) {
        fullRows.push(y);
      }
    }

    if (fullRows.length > 0) {
      if (!isMuted) sounds.clear.play();
      // Flash the rows, then remove after delay
      setGrid(newGrid);
      setActivePiece(null);
      setClearingRows(fullRows);

      setTimeout(() => {
        const clearedGrid = newGrid.map(row => [...row]);
        // Remove rows top-to-bottom (sort ascending so splice indices stay valid)
        const sorted = [...fullRows].sort((a, b) => a - b);
        for (let i = sorted.length - 1; i >= 0; i--) {
          clearedGrid.splice(sorted[i], 1);
        }
        // Add empty rows at top
        for (let i = 0; i < fullRows.length; i++) {
          clearedGrid.unshift(Array(COLS).fill(null));
        }

        const newLines = lines + fullRows.length;
        setLines(newLines);
        const lineScores = [0, 100, 300, 500, 800];
        setScore(s => s + (lineScores[fullRows.length] * level));
        const newLevel = Math.floor(newLines / 10) + 1;
        if (newLevel > level) {
          setLevel(newLevel);
          dropInterval.current = Math.max(100, BASE_SPEED * Math.pow(SPEED_MULTIPLIER, newLevel - 1));
        }

        setClearingRows([]);
        setGrid(clearedGrid);
        spawnPiece();
      }, 100);
    } else {
      setGrid(newGrid);
      spawnPiece();
    }
  };

  useGameLoop((deltaTime) => {
    if (gameOver || isPaused || !gameStarted || !activePiece) return;
    if (moveDir.current !== 0) {
      const now = Date.now();
      if (now - lastMoveTime.current > MOVE_SPEED) {
        moveHorizontal(moveDir.current);
        lastMoveTime.current = now;
      }
    }
    dropCounter.current += deltaTime;
    const nextYPos = { ...activePiece.pos, y: activePiece.pos.y + 1 };
    const isTouchingBottom = checkCollision(activePiece.tetromino, grid, nextYPos);
    if (isTouchingBottom) {
      lockDelayCounter.current += deltaTime;
      if (lockDelayCounter.current >= LOCK_DELAY) {
        lockPiece(activePiece);
        lockDelayCounter.current = 0;
        dropCounter.current = 0;
      }
    } else {
      lockDelayCounter.current = 0;
      if (dropCounter.current > dropInterval.current) {
        setActivePiece({ ...activePiece, pos: nextYPos });
        dropCounter.current = 0;
      }
    }
  }, gameStarted);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;
      if (e.code === 'KeyP' || e.code === 'Escape') { setIsPaused(prev => !prev); return; }
      if (isPaused) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      const isRepeat = e.repeat;
      switch(e.code) {
        case 'ArrowLeft':
          if (!isRepeat) { moveHorizontal(-1); lastMoveTime.current = Date.now() + DAS_INITIAL; }
          moveDir.current = -1; break;
        case 'ArrowRight':
          if (!isRepeat) { moveHorizontal(1); lastMoveTime.current = Date.now() + DAS_INITIAL; }
          moveDir.current = 1; break;
        case 'ArrowDown':
          if (activePiece && !checkCollision(activePiece.tetromino, grid, { ...activePiece.pos, y: activePiece.pos.y + 1 })) {
            setActivePiece(p => p && ({ ...p, pos: { ...p.pos, y: p.pos.y + 1 } }));
            setScore(s => s + 1);
            dropCounter.current = 0;
          } break;
        case 'ArrowUp': rotate(); break;
        case 'Space': hardDrop(); break;
        case 'KeyM': setIsMuted(prev => !prev); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' && moveDir.current === -1) moveDir.current = 0;
      else if (e.code === 'ArrowRight' && moveDir.current === 1) moveDir.current = 0;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [activePiece, grid, gameOver, isPaused, gameStarted, rotate, hardDrop, moveHorizontal]);

  const getGhostPiece = () => {
    if (!activePiece || gameOver || isPaused) return null;
    let ghostY = activePiece.pos.y;
    while (!checkCollision(activePiece.tetromino, grid, { x: activePiece.pos.x, y: ghostY + 1 })) ghostY++;
    return { pos: { x: activePiece.pos.x, y: ghostY }, tetromino: activePiece.tetromino };
  };

  // ARCADE SCOREBOARD
  if (showScoreboard) {
    return (
      <div className="h-dvh w-screen overflow-auto bg-black text-foreground flex items-center justify-center p-4">
        <div className="flex flex-col items-center w-full max-w-sm">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary tracking-widest mb-2"
            style={{ textShadow: '0 0 20px rgba(236,72,153,0.6), 0 0 40px rgba(236,72,153,0.3)' }}>
            HIGH SCORES
          </h1>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent mb-6" />
          <div className="text-center mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Your Score</p>
            <p className="text-4xl sm:text-5xl font-mono font-bold text-white tabular-nums"
              style={{ textShadow: '0 0 15px rgba(255,255,255,0.3)' }}>
              {score.toLocaleString()}
            </p>
            <div className="flex justify-center gap-6 mt-2">
              <span className="text-xs text-muted-foreground">LVL <span className="text-white font-mono">{level}</span></span>
              <span className="text-xs text-muted-foreground">LINES <span className="text-white font-mono">{lines}</span></span>
            </div>
          </div>
          <div className="w-full bg-black/60 border border-primary/20  p-4 sm:p-6 mb-8"
            style={{ boxShadow: '0 0 30px rgba(236,72,153,0.1), inset 0 0 30px rgba(0,0,0,0.5)' }}>
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest mb-3 px-1">
              <span>Rank</span><span>Score</span>
            </div>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => {
                const entry = highScores[i];
                const isCurrentScore = entry && entry.score === score;
                const rank = i + 1;
                return (
                  <div key={i} className={`flex items-center justify-between py-2.5 px-3  ${
                    isCurrentScore ? 'bg-primary/15 border border-primary/30'
                      : entry ? 'bg-white/[0.03] border border-transparent'
                      : 'opacity-30 border border-transparent'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-mono font-bold w-6 ${
                        rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>{rank}</span>
                      {isCurrentScore && <span className="text-[10px] text-primary font-bold uppercase tracking-wider">You</span>}
                    </div>
                    <span className={`text-lg sm:text-xl font-mono tabular-nums ${entry ? 'text-white' : 'text-muted-foreground'}`}>
                      {entry ? entry.score.toLocaleString() : '---'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <Button size="lg" onClick={() => { setShowScoreboard(false); setGameOver(false); setGameStarted(false); }}
            className="font-bold bg-primary hover:bg-primary/90 text-white px-8  shadow-[0_0_20px_rgba(236,72,153,0.4)]"
            data-testid="button-play-again">
            PLAY AGAIN
          </Button>
        </div>
      </div>
    );
  }

  // MAIN GAME VIEW
  return (
    <div className="h-dvh w-screen overflow-hidden bg-background text-foreground flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Mobile top bar */}
      <div className="sm:hidden w-full flex justify-between items-center px-1 py-1 shrink-0">
        <div className="bg-black/50 p-1.5 border border-white/10">
          <div className="text-[8px] text-muted-foreground uppercase">Score</div>
          <div className="text-sm font-bold font-mono tabular-nums">{score.toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-black/50 px-2 py-1 border border-white/10">
            <div className="text-[8px] text-muted-foreground uppercase">LVL</div>
            <div className="text-sm font-bold font-mono tabular-nums text-center">{level}</div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)} className="border-white/20 h-7 w-7">
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="border-white/20 h-7 w-7" disabled={!gameStarted || gameOver}>
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme} className="border-white/20 h-7 w-7">
              {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            </Button>
          </div>
        </div>
        <div className="bg-black/50 p-1 border border-white/10 w-12">
          <PiecePreview label="NEXT" tetromino={nextPiece} />
        </div>
      </div>

      {/* Main game row */}
      <div className="flex flex-row items-center justify-center gap-0 flex-1 w-full min-h-0">
        {/* GAME BOARD + SIDEBAR unit */}
        <div className="relative flex-shrink-0 h-full max-h-full flex flex-row">
          {/* GAME BOARD */}
          <div className="h-full">
            <TetrisBoard grid={grid} currentPiece={activePiece} ghostPiece={getGhostPiece()} clearingRows={clearingRows} docked="right" />
          </div>

          {/* RIGHT SIDEBAR (desktop) */}
          <div
            className="hidden sm:flex flex-col self-stretch backdrop-blur-sm border-2 border-l-0"
            style={{
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--board-border)',
              boxShadow: '0 0 15px var(--board-border)',
              width: 'clamp(80px, 10vw, 140px)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Next piece */}
            <div className="p-2 lg:p-3">
              <PiecePreview label="NEXT" tetromino={nextPiece} />
            </div>

            <div className="h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

            {/* Score */}
            <div className="p-2 lg:p-3">
              <h3 className="text-[9px] lg:text-[10px] text-secondary uppercase tracking-widest mb-0.5">Score</h3>
              <p className="text-sm lg:text-xl font-mono text-white tabular-nums">{score.toLocaleString()}</p>
            </div>

            <div className="h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

            {/* Level */}
            <div className="p-2 lg:p-3">
              <h3 className="text-[9px] lg:text-[10px] text-secondary uppercase tracking-widest mb-0.5">Level</h3>
              <p className="text-sm lg:text-xl font-mono text-white tabular-nums">{level}</p>
            </div>

            <div className="h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

            {/* Lines */}
            <div className="p-2 lg:p-3">
              <h3 className="text-[9px] lg:text-[10px] text-secondary uppercase tracking-widest mb-0.5">Lines</h3>
              <p className="text-sm lg:text-xl font-mono text-white tabular-nums">{lines}</p>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            <div className="h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

            {/* Buttons */}
            <div className="flex gap-2 justify-center p-2 lg:p-3">
              <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)} className="border-white/20 h-7 w-7 lg:h-9 lg:w-9" data-testid="button-mute">
                {isMuted ? <VolumeX className="w-3 h-3 lg:w-4 lg:h-4" /> : <Volume2 className="w-3 h-3 lg:w-4 lg:h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="border-white/20 h-7 w-7 lg:h-9 lg:w-9" disabled={!gameStarted || gameOver} data-testid="button-pause">
                {isPaused ? <Play className="w-3 h-3 lg:w-4 lg:h-4" /> : <Pause className="w-3 h-3 lg:w-4 lg:h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={toggleTheme} className="border-white/20 h-7 w-7 lg:h-9 lg:w-9" data-testid="button-theme">
                {theme === 'dark' ? <Sun className="w-3 h-3 lg:w-4 lg:h-4" /> : <Moon className="w-3 h-3 lg:w-4 lg:h-4" />}
              </Button>
            </div>
          </div>

          {/* Overlays (positioned over the board only) */}
          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur-sm border-2 border-primary/20 p-4" style={{ backgroundColor: 'var(--overlay-bg)' }}>
              {/* <img src="/falling4.svg" alt="Falling 4" className="w-full max-h-[50%] object-contain mb-4 sm:mb-6" /> */}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-center tracking-wider" style={{ fontFamily: "var(--font-display)", background: 'linear-gradient(to bottom, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none', filter: 'drop-shadow(0 0 20px rgba(236,72,153,0.5))' }}>
                FALLING 4
              </h1>
              <Button size="lg" onClick={resetGame}
                className="text-sm sm:text-lg font-bold bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-3 sm:py-4 shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                data-testid="button-start">START GAME</Button>
              <label className="mt-4 flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={includeFPiece} onChange={(e) => setIncludeFPiece(e.target.checked)}
                  className="w-4 h-4 accent-pink-500 rounded" />
                <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">
                  Include <span className="text-pink-400 font-bold">⚡4</span> piece
                </span>
              </label>
              <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground font-mono text-center">
                ARROWS to move &bull; UP to rotate<br />SPACE to drop &bull; P to pause</p>
            </div>
          )}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur-sm p-4 sm:p-6" style={{ backgroundColor: 'var(--overlay-bg)' }}>
              <h2 className="text-2xl sm:text-3xl text-foreground font-bold tracking-widest mb-6 sm:mb-8">PAUSED</h2>
              <div className="w-full max-w-[200px] space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="shrink-0">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <Slider value={[volume]} onValueChange={(v) => setVolume(v[0])} max={100} step={1} className="flex-1" disabled={isMuted} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={includeFPiece} onChange={(e) => setIncludeFPiece(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 rounded" />
                  <span className="text-xs text-muted-foreground font-mono">
                    Include <span className="text-pink-400 font-bold">⚡4</span> piece
                  </span>
                </label>
              </div>
              <Button size="lg" onClick={() => setIsPaused(false)} className="mt-6 sm:mt-8 bg-primary hover:bg-primary/90" data-testid="button-resume">RESUME</Button>
              <p className="mt-3 text-xs text-muted-foreground">Press P or ESC to resume</p>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 backdrop-blur-md p-4" style={{ backgroundColor: 'var(--overlay-bg)' }}>
              <h2 className="text-2xl sm:text-3xl text-primary font-bold mb-3" style={{ textShadow: '0 0 20px rgba(236,72,153,0.5)' }}>GAME OVER</h2>
              <p className="text-3xl sm:text-4xl text-white font-mono font-bold tabular-nums mb-6" style={{ textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
                {score.toLocaleString()}</p>
              <Button size="lg" onClick={() => setShowScoreboard(true)}
                className="font-bold bg-primary hover:bg-primary/90 text-white px-6 shadow-[0_0_20px_rgba(236,72,153,0.4)] animate-pulse">
                VIEW SCOREBOARD</Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile controls (in flow, not fixed) */}
      {gameStarted && !gameOver && (
        <div className="sm:hidden w-full shrink-0 px-1 pb-1">
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
            onPause={() => setIsPaused(!isPaused)}
            isPaused={isPaused}
          />
        </div>
      )}
    </div>
  );
}
