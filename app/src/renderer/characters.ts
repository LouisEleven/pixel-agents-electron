import {
  TILE_SIZE,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  CharacterState,
  Direction,
  type Character,
  type Seat,
  type TileType,
  type OfficeLayout,
  type SpriteData,
} from './types.js';
import {
  FRAME_DURATION_SEC,
  WALK_SPEED_TILES_PER_SEC,
  WANDER_CHANCE_PER_SEC,
  WANDER_LIMIT,
  INACTIVE_SEAT_TIMER_MIN_SEC,
  INACTIVE_SEAT_TIMER_RANGE_SEC,
  MATRIX_EFFECT_DURATION_SEC,
} from './constants.js';

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift: number,
): Character {
  const x = seat ? seat.seatCol * TILE_SIZE + TILE_SIZE / 2 : TILE_SIZE * 2;
  const y = seat ? seat.seatRow * TILE_SIZE + TILE_SIZE / 2 : TILE_SIZE * 2;

  return {
    id,
    state: CharacterState.IDLE,
    dir: seat?.facingDir ?? Direction.DOWN,
    x,
    y,
    tileCol: seat?.seatCol ?? 2,
    tileRow: seat?.seatRow ?? 2,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    wanderTimer: 0,
    wanderCount: 0,
    wanderLimit: WANDER_LIMIT,
    isActive: false,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: 0,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
  };
}

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
): void {
  // Path following
  if (ch.path.length > 0) {
    const target = ch.path[0];
    const targetX = target.col * TILE_SIZE + TILE_SIZE / 2;
    const targetY = target.row * TILE_SIZE + TILE_SIZE / 2;
    const dx = targetX - ch.x;
    const dy = targetY - ch.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      ch.x = targetX;
      ch.y = targetY;
      ch.tileCol = target.col;
      ch.tileRow = target.row;
      ch.path.shift();
      ch.moveProgress = 0;
      ch.frame = 0;
    } else {
      const speed = WALK_SPEED_TILES_PER_SEC * TILE_SIZE * dt;
      ch.x += (dx / dist) * speed;
      ch.y += (dy / dist) * speed;
      ch.moveProgress += speed / TILE_SIZE;

      // Update direction based on movement
      if (Math.abs(dx) > Math.abs(dy)) {
        ch.dir = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        ch.dir = dy > 0 ? Direction.DOWN : Direction.UP;
      }
    }

    // Animation
    ch.frameTimer += dt;
    if (ch.frameTimer >= FRAME_DURATION_SEC) {
      ch.frameTimer = 0;
      ch.frame = (ch.frame + 1) % 4;
    }

    // Arrived at seat
    if (ch.path.length === 0 && ch.seatId) {
      ch.state = CharacterState.TYPE;
      ch.frame = 0;
    }
    return;
  }

  // At seat - typing/reading
  if (ch.seatId) {
    ch.state = ch.isActive ? CharacterState.TYPE : CharacterState.IDLE;
    if (!ch.isActive) {
      ch.seatTimer -= dt;
      if (ch.seatTimer <= 0) {
        ch.seatTimer = INACTIVE_SEAT_TIMER_MIN_SEC + Math.random() * INACTIVE_SEAT_TIMER_RANGE_SEC;
        ch.state = CharacterState.IDLE;
        ch.wanderCount = 0;
        ch.wanderTimer = 1 / WANDER_CHANCE_PER_SEC;
      }
    }
  }

  // Idle wandering
  if (ch.state === CharacterState.IDLE) {
    ch.wanderTimer += dt;
    if (ch.wanderTimer >= 1 / WANDER_CHANCE_PER_SEC && ch.wanderCount < ch.wanderLimit) {
      ch.wanderTimer = 0;
      if (walkableTiles.length > 0) {
        const target = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
        ch.path = [{ col: target.col, row: target.row }];
        ch.state = CharacterState.WALK;
        ch.wanderCount++;
      }
    }

    // Animation - slow idle bob
    ch.frameTimer += dt;
    if (ch.frameTimer >= FRAME_DURATION_SEC * 2) {
      ch.frameTimer = 0;
      ch.frame = (ch.frame + 1) % 2;
    }
  }

  // Return to seat after wandering
  if (ch.wanderCount >= ch.wanderLimit && ch.seatId && ch.path.length === 0) {
    const seat = seats.get(ch.seatId);
    if (seat) {
      ch.path = [{ col: seat.seatCol, row: seat.seatRow }];
      ch.state = CharacterState.WALK;
    }
  }
}
