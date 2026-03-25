// Game Constants
export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30; // pixels, for rendering calculations if needed

// Tetromino Definitions
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 'F';

export interface Tetromino {
  shape: number[][];
  color: string;
  type: TetrominoType;
  rotation: number; // 0=spawn, 1=CW, 2=180, 3=CCW
}

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'cyan', type: 'I', rotation: 0 },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'blue', type: 'J', rotation: 0 },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'orange', type: 'L', rotation: 0 },
  O: { shape: [[1, 1], [1, 1]], color: 'yellow', type: 'O', rotation: 0 },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'green', type: 'S', rotation: 0 },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'purple', type: 'T', rotation: 0 },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'red', type: 'Z', rotation: 0 },
  F: { shape: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], color: 'pink', type: 'F', rotation: 0 },
};

// SRS wall kick offset tables
// Each entry is [dx, dy] where positive y = downward
// Key: "fromRotation>toRotation"
const JLSTZ_KICKS: Record<string, [number, number][]> = {
  '0>1': [[ 0, 0], [-1, 0], [-1,-1], [ 0, 2], [-1, 2]],
  '1>0': [[ 0, 0], [ 1, 0], [ 1, 1], [ 0,-2], [ 1,-2]],
  '1>2': [[ 0, 0], [ 1, 0], [ 1, 1], [ 0,-2], [ 1,-2]],
  '2>1': [[ 0, 0], [-1, 0], [-1,-1], [ 0, 2], [-1, 2]],
  '2>3': [[ 0, 0], [ 1, 0], [ 1,-1], [ 0, 2], [ 1, 2]],
  '3>2': [[ 0, 0], [-1, 0], [-1, 1], [ 0,-2], [-1,-2]],
  '3>0': [[ 0, 0], [-1, 0], [-1, 1], [ 0,-2], [-1,-2]],
  '0>3': [[ 0, 0], [ 1, 0], [ 1,-1], [ 0, 2], [ 1, 2]],
};

const I_KICKS: Record<string, [number, number][]> = {
  '0>1': [[ 0, 0], [-2, 0], [ 1, 0], [-2, 1], [ 1,-2]],
  '1>0': [[ 0, 0], [ 2, 0], [-1, 0], [ 2,-1], [-1, 2]],
  '1>2': [[ 0, 0], [-1, 0], [ 2, 0], [-1,-2], [ 2, 1]],
  '2>1': [[ 0, 0], [ 1, 0], [-2, 0], [ 1, 2], [-2,-1]],
  '2>3': [[ 0, 0], [ 2, 0], [-1, 0], [ 2,-1], [-1, 2]],
  '3>2': [[ 0, 0], [-2, 0], [ 1, 0], [-2, 1], [ 1,-2]],
  '3>0': [[ 0, 0], [ 1, 0], [-2, 0], [ 1, 2], [-2,-1]],
  '0>3': [[ 0, 0], [-1, 0], [ 2, 0], [-1,-2], [ 2, 1]],
};

export function getKicks(type: TetrominoType, fromRotation: number, toRotation: number): [number, number][] {
  const key = `${fromRotation}>${toRotation}`;
  if (type === 'O') return [[0, 0]]; // O never kicks
  if (type === 'I') return I_KICKS[key] || [[0, 0]];
  return JLSTZ_KICKS[key] || [[0, 0]];
}

export const COLORS: Record<string, string> = {
  cyan: 'rgb(34, 211, 238)',    // cyan-400
  blue: 'rgb(59, 130, 246)',    // blue-500
  orange: 'rgb(249, 115, 22)',  // orange-500
  yellow: 'rgb(234, 179, 8)',   // yellow-500
  green: 'rgb(34, 197, 94)',    // green-500
  purple: 'rgb(168, 85, 247)',  // purple-500
  red: 'rgb(239, 68, 68)',      // red-500
  pink: 'rgb(236, 72, 153)',    // pink-500
};

// Types
export type GridCell = { type: TetrominoType; locked: boolean } | null;
export type Grid = GridCell[][];

// Helper Functions
export const createGrid = (): Grid => 
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// 7-bag randomizer: shuffles all pieces, deals them out, then reshuffles
let bag: TetrominoType[] = [];
let bagIncludesF = false;

function fillBag(includeF: boolean) {
  const types: TetrominoType[] = includeF
    ? ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'F']
    : ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  // Fisher-Yates shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  bag = types;
  bagIncludesF = includeF;
}

export const randomTetromino = (includeF = false): Tetromino => {
  if (bag.length === 0 || bagIncludesF !== includeF) {
    fillBag(includeF);
  }
  const type = bag.pop()!;
  return { ...TETROMINOS[type] };
};

export const resetBag = () => { bag = []; };

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
