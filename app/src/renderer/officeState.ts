import {
  TILE_SIZE,
  CharacterState,
  Direction,
  type Character,
  type Seat,
  type OfficeLayout,
  type SpriteData,
} from './types.js';
import {
  AUTO_ON_FACING_DEPTH,
  AUTO_ON_SIDE_DEPTH,
  FRAME_DURATION_SEC,
  WALK_SPEED_TILES_PER_SEC,
  WANDER_CHANCE_PER_SEC,
  WANDER_LIMIT,
  INACTIVE_SEAT_TIMER_MIN_SEC,
  INACTIVE_SEAT_TIMER_RANGE_SEC,
  MATRIX_EFFECT_DURATION_SEC,
  WAITING_BUBBLE_DURATION_SEC,
  DISMISS_BUBBLE_FAST_FADE_SEC,
} from './constants.js';
import { createDefaultLayout, layoutToTileMap } from './layoutSerializer.js';

export class OfficeState {
  layout: OfficeLayout;
  tileMap: ReturnType<typeof layoutToTileMap>;
  seats: Map<string, Seat>;
  blockedTiles: Set<string>;
  furniture: Array<{ sprite: SpriteData; x: number; y: number; zY: number }>;
  walkableTiles: Array<{ col: number; row: number }>;
  characters: Map<number, Character> = new Map();
  furnitureAnimTimer = 0;
  selectedAgentId: number | null = null;
  cameraFollowId: number | null = null;
  hoveredAgentId: number | null = null;
  hoveredTile: { col: number; row: number } | null = null;
  private nextSubagentId = -1;

  constructor(layout?: OfficeLayout) {
    this.layout = layout || createDefaultLayout();
    this.tileMap = layoutToTileMap(this.layout);
    this.seats = new Map();
    this.blockedTiles = new Set();
    this.furniture = [];
    this.walkableTiles = [];
    this.initFromLayout();
  }

  private initFromLayout(): void {
    // Simple seats from furniture
    for (const item of this.layout.furniture) {
      if (item.type.includes('CHAIR')) {
        const uid = item.uid;
        this.seats.set(uid, {
          uid,
          seatCol: item.col,
          seatRow: item.row,
          facingDir: Direction.DOWN,
          assigned: false,
        });
      }
    }

    // Simple blocked tiles
    for (const item of this.layout.furniture) {
      for (let dr = 0; dr < 1; dr++) {
        for (let dc = 0; dc < 1; dc++) {
          this.blockedTiles.add(`${item.col + dc},${item.row + dr}`);
        }
      }
    }

    // Walkable tiles
    for (let r = 0; r < this.layout.rows; r++) {
      for (let c = 0; c < this.layout.cols; c++) {
        if (!this.blockedTiles.has(`${c},${r}`)) {
          this.walkableTiles.push({ col: c, row: r });
        }
      }
    }

    // Placeholder furniture rendering
    this.furniture = this.layout.furniture.map((item) => ({
      sprite: createPlaceholderSprite(),
      x: item.col * TILE_SIZE,
      y: item.row * TILE_SIZE,
      zY: (item.row + 1) * TILE_SIZE,
    }));
  }

  addAgent(id: number, palette?: number, hueShift?: number, seatId?: string): void {
    if (this.characters.has(id)) return;

    const p = palette ?? 0;
    const h = hueShift ?? 0;

    let seat: Seat | null = null;
    let assignedSeatId: string | null = seatId ?? null;

    if (assignedSeatId && this.seats.has(assignedSeatId)) {
      seat = this.seats.get(assignedSeatId)!;
      if (seat.assigned) {
        assignedSeatId = null;
        seat = null;
      }
    }

    if (!assignedSeatId) {
      // Find first free seat
      for (const [uid, s] of this.seats) {
        if (!s.assigned) {
          assignedSeatId = uid;
          seat = s;
          break;
        }
      }
    }

    if (seat) {
      seat.assigned = true;
    }

    const ch: Character = {
      id,
      state: CharacterState.IDLE,
      dir: seat?.facingDir ?? Direction.DOWN,
      x: seat ? seat.seatCol * TILE_SIZE + TILE_SIZE / 2 : TILE_SIZE * 2,
      y: seat ? seat.seatRow * TILE_SIZE + TILE_SIZE / 2 : TILE_SIZE * 2,
      tileCol: seat?.seatCol ?? 2,
      tileRow: seat?.seatRow ?? 2,
      path: [],
      moveProgress: 0,
      currentTool: null,
      palette: p,
      hueShift: h,
      frame: 0,
      frameTimer: 0,
      wanderTimer: 0,
      wanderCount: 0,
      wanderLimit: WANDER_LIMIT,
      isActive: false,
      seatId: assignedSeatId,
      bubbleType: null,
      bubbleTimer: 0,
      seatTimer: INACTIVE_SEAT_TIMER_MIN_SEC,
      isSubagent: false,
      parentAgentId: null,
      matrixEffect: 'spawn',
      matrixEffectTimer: 0,
      matrixEffectSeeds: matrixEffectSeeds(),
    };

    this.characters.set(id, ch);
  }

  removeAgent(id: number): void {
    const ch = this.characters.get(id);
    if (!ch) return;

    if (ch.seatId) {
      const seat = this.seats.get(ch.seatId);
      if (seat) seat.assigned = false;
    }

    if (this.selectedAgentId === id) this.selectedAgentId = null;
    if (this.cameraFollowId === id) this.cameraFollowId = null;

    ch.matrixEffect = 'despawn';
    ch.matrixEffectTimer = 0;
    ch.matrixEffectSeeds = matrixEffectSeeds();
    ch.bubbleType = null;
  }

  setAgentActive(id: number, active: boolean): void {
    const ch = this.characters.get(id);
    if (ch) {
      ch.isActive = active;
      if (!active) {
        ch.seatTimer = INACTIVE_SEAT_TIMER_MIN_SEC;
        ch.path = [];
        ch.moveProgress = 0;
      }
    }
  }

  setAgentTool(id: number, tool: string | null): void {
    const ch = this.characters.get(id);
    if (ch) {
      ch.currentTool = tool;
    }
  }

  showWaitingBubble(id: number): void {
    const ch = this.characters.get(id);
    if (ch) {
      ch.bubbleType = 'waiting';
      ch.bubbleTimer = WAITING_BUBBLE_DURATION_SEC;
    }
  }

  dismissBubble(id: number): void {
    const ch = this.characters.get(id);
    if (!ch || !ch.bubbleType) return;
    if (ch.bubbleType === 'waiting') {
      ch.bubbleTimer = Math.min(ch.bubbleTimer, DISMISS_BUBBLE_FAST_FADE_SEC);
    } else {
      ch.bubbleType = null;
      ch.bubbleTimer = 0;
    }
  }

  update(dt: number): void {
    const toDelete: number[] = [];

    for (const ch of this.characters.values()) {
      // Matrix effect
      if (ch.matrixEffect) {
        ch.matrixEffectTimer += dt;
        if (ch.matrixEffectTimer >= MATRIX_EFFECT_DURATION_SEC) {
          if (ch.matrixEffect === 'spawn') {
            ch.matrixEffect = null;
            ch.matrixEffectTimer = 0;
          } else {
            toDelete.push(ch.id);
          }
        }
        continue;
      }

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

          if (Math.abs(dx) > Math.abs(dy)) {
            ch.dir = dx > 0 ? Direction.RIGHT : Direction.LEFT;
          } else {
            ch.dir = dy > 0 ? Direction.DOWN : Direction.UP;
          }
        }

        ch.state = CharacterState.IDLE;
        ch.frameTimer += dt;
        if (ch.frameTimer >= FRAME_DURATION_SEC) {
          ch.frameTimer = 0;
          ch.frame = (ch.frame + 1) % 4;
        }

        if (ch.path.length === 0 && ch.seatId) {
          ch.state = CharacterState.TYPE;
          ch.frame = 0;
        }
        continue;
      }

      // At seat
      if (ch.seatId) {
        ch.state = ch.isActive ? CharacterState.TYPE : CharacterState.IDLE;
        if (!ch.isActive) {
          ch.seatTimer -= dt;
          if (ch.seatTimer <= 0) {
            ch.seatTimer =
              INACTIVE_SEAT_TIMER_MIN_SEC + Math.random() * INACTIVE_SEAT_TIMER_RANGE_SEC;
            ch.wanderCount = 0;
          }
        }
      }

      // Idle wandering
      if (ch.state === CharacterState.IDLE) {
        ch.wanderTimer += dt;
        if (ch.wanderTimer >= 1 / WANDER_CHANCE_PER_SEC && ch.wanderCount < ch.wanderLimit) {
          ch.wanderTimer = 0;
          if (this.walkableTiles.length > 0) {
            const target =
              this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)];
            ch.path = [{ col: target.col, row: target.row }];
            ch.wanderCount++;
          }
        }
      }

      // Return to seat
      if (ch.wanderCount >= ch.wanderLimit && ch.seatId && ch.path.length === 0) {
        const seat = this.seats.get(ch.seatId);
        if (seat) {
          ch.path = [{ col: seat.seatCol, row: seat.seatRow }];
        }
      }

      // Bubble timer
      if (ch.bubbleType === 'waiting') {
        ch.bubbleTimer -= dt;
        if (ch.bubbleTimer <= 0) {
          ch.bubbleType = null;
        }
      }
    }

    for (const id of toDelete) {
      this.characters.delete(id);
    }
  }

  getCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  getCharacterAt(worldX: number, worldY: number): number | null {
    const chars = this.getCharacters().sort((a, b) => b.y - a.y);
    for (const ch of chars) {
      if (ch.matrixEffect === 'despawn') continue;
      const left = ch.x - 8;
      const right = ch.x + 8;
      const top = ch.y - 24;
      const bottom = ch.y;
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return ch.id;
      }
    }
    return null;
  }
}

function matrixEffectSeeds(): number[] {
  return Array.from({ length: 16 }, () => Math.random());
}

function createPlaceholderSprite(): SpriteData {
  const sprite: SpriteData = [];
  for (let r = 0; r < 24; r++) {
    const row: string[] = [];
    for (let c = 0; c < 16; c++) {
      row.push('');
    }
    sprite.push(row);
  }
  return sprite;
}
