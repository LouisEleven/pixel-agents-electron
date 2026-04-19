import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';

const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32;
const CHAR_FRAMES_PER_ROW = 7;
const CHARACTER_DIRECTIONS = ['down', 'up', 'right'] as const;
const FLOOR_TILE_SIZE = 16;
const WALL_BITMASK_COUNT = 16;
const WALL_GRID_COLS = 4;
const WALL_PIECE_WIDTH = 16;
const WALL_PIECE_HEIGHT = 32;

interface CatalogEntry {
  id: string;
  furniturePath: string;
  width: number;
  height: number;
}

interface AssetIndex {
  floors: string[];
  walls: string[];
  characters: string[];
  defaultLayout: string | null;
}

interface DecodedAssets {
  characters: Array<Record<(typeof CHARACTER_DIRECTIONS)[number], string[][][]>>;
  floors: string[][][];
  walls: string[][][][];
  furnitureCatalog: CatalogEntry[];
  furnitureSprites: Record<string, string[][]>;
  layout: unknown;
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a === 0) return '';
  const hex = (value: number) => value.toString(16).padStart(2, '0');
  const rgb = `#${hex(r)}${hex(g)}${hex(b)}`;
  return a === 255 ? rgb : `${rgb}${hex(a)}`;
}

function pngToSpriteData(png: PNG, width: number, height: number, offsetX = 0, offsetY = 0): string[][] {
  const sprite: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const idx = ((offsetY + y) * png.width + offsetX + x) * 4;
      row.push(rgbaToHex(png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]));
    }
    sprite.push(row);
  }
  return sprite;
}

function readPng(filePath: string): PNG {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function decodeCharacter(filePath: string): Record<(typeof CHARACTER_DIRECTIONS)[number], string[][][]> {
  const png = readPng(filePath);
  const character = { down: [], up: [], right: [] } as Record<(typeof CHARACTER_DIRECTIONS)[number], string[][][]>;
  for (let dirIdx = 0; dirIdx < CHARACTER_DIRECTIONS.length; dirIdx++) {
    const dir = CHARACTER_DIRECTIONS[dirIdx];
    const offsetY = dirIdx * CHAR_FRAME_H;
    for (let frame = 0; frame < CHAR_FRAMES_PER_ROW; frame++) {
      character[dir].push(pngToSpriteData(png, CHAR_FRAME_W, CHAR_FRAME_H, frame * CHAR_FRAME_W, offsetY));
    }
  }
  return character;
}

function decodeWall(filePath: string): string[][][] {
  const png = readPng(filePath);
  const sprites: string[][][] = [];
  for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
    const offsetX = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH;
    const offsetY = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT;
    sprites.push(pngToSpriteData(png, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT, offsetX, offsetY));
  }
  return sprites;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

export function loadWebviewAssets(assetsDir: string): DecodedAssets {
  const assetIndex = readJson<AssetIndex>(path.join(assetsDir, 'asset-index.json'));
  const furnitureCatalog = readJson<CatalogEntry[]>(path.join(assetsDir, 'furniture-catalog.json'));

  const characters = assetIndex.characters.map((file) => decodeCharacter(path.join(assetsDir, 'characters', file)));
  const floors = assetIndex.floors.map((file) => pngToSpriteData(readPng(path.join(assetsDir, 'floors', file)), FLOOR_TILE_SIZE, FLOOR_TILE_SIZE));
  const walls = assetIndex.walls.map((file) => decodeWall(path.join(assetsDir, 'walls', file)));

  const furnitureSprites: Record<string, string[][]> = {};
  for (const item of furnitureCatalog) {
    furnitureSprites[item.id] = pngToSpriteData(readPng(path.join(assetsDir, item.furniturePath)), item.width, item.height);
  }

  const layout = assetIndex.defaultLayout ? readJson(path.join(assetsDir, assetIndex.defaultLayout)) : null;

  return { characters, floors, walls, furnitureCatalog, furnitureSprites, layout };
}
