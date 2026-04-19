// Grid constants
export const TILE_SIZE = 16;
export const DEFAULT_COLS = 20;
export const DEFAULT_ROWS = 11;
export const MAX_COLS = 64;
export const MAX_ROWS = 64;

export const TileType = {
  WALL: 0,
  FLOOR_1: 1,
  FLOOR_2: 2,
  FLOOR_3: 3,
  FLOOR_4: 4,
  FLOOR_5: 5,
  FLOOR_6: 6,
  FLOOR_7: 7,
  FLOOR_8: 8,
  FLOOR_9: 9,
  VOID: 255,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

export const CharacterState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
} as const;
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState];

export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

export type SpriteData = string[][];

export interface Seat {
  uid: string;
  seatCol: number;
  seatRow: number;
  facingDir: Direction;
  assigned: boolean;
}

export interface FurnitureInstance {
  sprite: SpriteData;
  x: number;
  y: number;
  zY: number;
  mirrored?: boolean;
}

export interface Character {
  id: number;
  state: CharacterState;
  dir: Direction;
  x: number;
  y: number;
  tileCol: number;
  tileRow: number;
  path: Array<{ col: number; row: number }>;
  moveProgress: number;
  currentTool: string | null;
  palette: number;
  hueShift: number;
  frame: number;
  frameTimer: number;
  wanderTimer: number;
  wanderCount: number;
  wanderLimit: number;
  isActive: boolean;
  seatId: string | null;
  bubbleType: 'permission' | 'waiting' | null;
  bubbleTimer: number;
  seatTimer: number;
  isSubagent: boolean;
  parentAgentId: number | null;
  matrixEffect: 'spawn' | 'despawn' | null;
  matrixEffectTimer: number;
  matrixEffectSeeds: number[];
  folderName?: string;
}

export interface OfficeLayout {
  version: 1;
  cols: number;
  rows: number;
  tiles: TileType[];
  furniture: PlacedFurniture[];
  tileColors?: Array<ColorValue | null>;
}

export interface PlacedFurniture {
  uid: string;
  type: string;
  col: number;
  row: number;
  color?: ColorValue;
}

export interface ColorValue {
  h: number;
  s: number;
  b: number;
  c: number;
}
