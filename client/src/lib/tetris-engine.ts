// Game Constants
export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30; // pixels, for rendering calculations if needed

// Tetromino Definitions
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Tetromino {
  shape: number[][];
  color: string;
  type: TetrominoType;
}

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: { shape: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]], color: 'cyan', type: 'I' },
  J: { shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]], color: 'blue', type: 'J' },
  L: { shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]], color: 'orange', type: 'L' },
  O: { shape: [[1, 1], [1, 1]], color: 'yellow', type: 'O' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'green', type: 'S' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'purple', type: 'T' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'red', type: 'Z' },
};

export const COLORS: Record<string, string> = {
  cyan: 'rgb(34, 211, 238)',    // cyan-400
  blue: 'rgb(59, 130, 246)',    // blue-500
  orange: 'rgb(249, 115, 22)',  // orange-500
  yellow: 'rgb(234, 179, 8)',   // yellow-500
  green: 'rgb(34, 197, 94)',    // green-500
  purple: 'rgb(168, 85, 247)',  // purple-500
  red: 'rgb(239, 68, 68)',      // red-500
};

// Types
export type GridCell = { type: TetrominoType; locked: boolean } | null;
export type Grid = GridCell[][];

// Helper Functions
export const createGrid = (): Grid => 
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

export const randomTetromino = (): Tetromino => {
  const types = 'IJLOSTZ' as const;
  const rand = types[Math.floor(Math.random() * types.length)];
  return TETROMINOS[rand];
};

export const rotateMatrix = (matrix: number[][]): number[][] => {
  return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
};

export const checkCollision = (
  piece: Tetromino,
  grid: Grid,
  position: { x: number; y: number }
): boolean => {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x] !== 0) {
        const newX = x + position.x;
        const newY = y + position.y;

        // Check walls and floor
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        
        // Check locked pieces (ignore if above grid aka newY < 0)
        if (newY >= 0 && grid[newY][newX]) return true;
      }
    }
  }
  return false;
};
