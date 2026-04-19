import {
  TILE_SIZE,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  TileType,
  type TileType as TileTypeVal,
  type OfficeLayout,
  type PlacedFurniture,
} from './types.js';

export function createDefaultLayout(): OfficeLayout {
  const cols = DEFAULT_COLS;
  const rows = DEFAULT_ROWS;
  const tiles: TileTypeVal[] = [];

  // Create floor tiles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push(TileType.FLOOR_1);
    }
  }

  // Add a simple desk setup
  const furniture: PlacedFurniture[] = [
    { uid: 'desk-1', type: 'DESK', col: 5, row: 5 },
    { uid: 'chair-1', type: 'CHAIR', col: 5, row: 6 },
    { uid: 'desk-2', type: 'DESK', col: 10, row: 5 },
    { uid: 'chair-2', type: 'CHAIR', col: 10, row: 6 },
  ];

  return {
    version: 1,
    cols,
    rows,
    tiles,
    furniture,
  };
}

export function layoutToTileMap(layout: OfficeLayout): TileTypeVal[][] {
  const tileMap: TileTypeVal[][] = [];
  for (let r = 0; r < layout.rows; r++) {
    const row: TileTypeVal[] = [];
    for (let c = 0; c < layout.cols; c++) {
      const idx = r * layout.cols + c;
      row.push(layout.tiles[idx] ?? TileType.FLOOR_1);
    }
    tileMap.push(row);
  }
  return tileMap;
}
