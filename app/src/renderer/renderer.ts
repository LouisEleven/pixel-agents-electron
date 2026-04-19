import {
  TILE_SIZE,
  TileType,
  type TileType as TileTypeVal,
  type Character,
  type SpriteData,
} from './types.js';
import { GRID_LINE_COLOR, VOID_TILE_OUTLINE_COLOR, VOID_TILE_DASH_PATTERN } from './constants.js';

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  tileMap: TileTypeVal[][],
  furniture: Array<{ sprite: SpriteData; x: number; y: number; zY: number }>,
  characters: Character[],
  zoom: number,
  panX: number,
  panY: number,
): { offsetX: number; offsetY: number } {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const cols = tileMap.length > 0 ? tileMap[0].length : 0;
  const rows = tileMap.length;
  const mapW = cols * TILE_SIZE * zoom;
  const mapH = rows * TILE_SIZE * zoom;
  const offsetX = Math.floor((canvasWidth - mapW) / 2) + Math.round(panX);
  const offsetY = Math.floor((canvasHeight - mapH) / 2) + Math.round(panY);

  // Draw tiles
  renderTileGrid(ctx, tileMap, offsetX, offsetY, zoom, cols, rows);

  // Draw furniture (placeholder)
  for (const f of furniture) {
    ctx.fillStyle = '#666699';
    ctx.fillRect(offsetX + f.x * zoom, offsetY + f.y * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);
  }

  // Draw characters
  renderCharacters(ctx, characters, offsetX, offsetY, zoom);

  // Draw grid overlay
  renderGridOverlay(ctx, offsetX, offsetY, zoom, cols, rows, tileMap);

  return { offsetX, offsetY };
}

function renderTileGrid(
  ctx: CanvasRenderingContext2D,
  tileMap: TileTypeVal[][],
  offsetX: number,
  offsetY: number,
  zoom: number,
  cols: number,
  rows: number,
): void {
  const s = TILE_SIZE * zoom;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = tileMap[r]?.[c];
      if (tile === TileType.VOID) continue;

      const x = offsetX + c * s;
      const y = offsetY + r * s;

      if (tile === TileType.WALL) {
        ctx.fillStyle = '#5c5c8a';
      } else {
        ctx.fillStyle = '#3d3d5c';
      }
      ctx.fillRect(x, y, s, s);
    }
  }
}

function renderCharacters(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  // Sort by Y for z-ordering
  const sorted = [...characters].sort((a, b) => a.y - b.y);

  for (const ch of sorted) {
    if (ch.matrixEffect === 'despawn') continue;

    const x = Math.round(offsetX + ch.x * zoom - 8 * zoom);
    const y = Math.round(offsetY + ch.y * zoom - 16 * zoom);

    // Simple colored rectangle as placeholder character
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
    ctx.fillStyle = colors[ch.palette % colors.length];

    const w = 16 * zoom;
    const h = 24 * zoom;
    ctx.fillRect(x, y, w, h);

    // Draw bubble if present
    if (ch.bubbleType) {
      ctx.fillStyle = ch.bubbleType === 'permission' ? '#ffa500' : '#00ff00';
      ctx.beginPath();
      ctx.arc(x + w / 2, y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderGridOverlay(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  zoom: number,
  cols: number,
  rows: number,
  tileMap: TileTypeVal[][],
): void {
  const s = TILE_SIZE * zoom;

  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = 1;

  // Vertical lines
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + c * s + 0.5, offsetY);
    ctx.lineTo(offsetX + c * s + 0.5, offsetY + rows * s);
    ctx.stroke();
  }

  // Horizontal lines
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + r * s + 0.5);
    ctx.lineTo(offsetX + cols * s, offsetY + r * s + 0.5);
    ctx.stroke();
  }

  // VOID tile outlines
  ctx.save();
  ctx.strokeStyle = VOID_TILE_OUTLINE_COLOR;
  ctx.setLineDash(VOID_TILE_DASH_PATTERN);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tileMap[r]?.[c] === TileType.VOID) {
        ctx.strokeRect(offsetX + c * s + 0.5, offsetY + r * s + 0.5, s - 1, s - 1);
      }
    }
  }
  ctx.restore();
}
