export type CellState = 'empty' | 'absent' | 'present' | 'correct';

export interface GameCell {
  letter: string;
  state: CellState;
}

export interface GameState {
  rows: GameCell[][];
  currentRow: number;
  isComplete: boolean;
  screenshotUrl?: string;
}

// 字母识别相关类型定义
export interface LetterRecognitionResult {
  letter: string;
  confidence: number;
}

export interface ColorStats {
  avgBrightness: number;
  stdDev: number;
  hasBimodal: boolean;
  brightPixelRatio: number;
  darkPixelRatio: number;
}

export interface LetterBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ProcessedLetterImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  bounds: LetterBounds | null;
}