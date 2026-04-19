// Grid & rendering constants
export const TILE_SIZE = 16;
export const DEFAULT_COLS = 20;
export const DEFAULT_ROWS = 11;
export const MAX_COLS = 64;
export const MAX_ROWS = 64;

// Character animation
export const FRAME_DURATION_SEC = 0.15;
export const WALK_SPEED_TILES_PER_SEC = 3;
export const WANDER_CHANCE_PER_SEC = 0.1;
export const WANDER_LIMIT = 3;

// Camera
export const DEFAULT_ZOOM = 2;

// Matrix effect
export const MATRIX_EFFECT_DURATION_SEC = 0.3;

// Bubble
export const WAITING_BUBBLE_DURATION_SEC = 2;
export const BUBBLE_SITTING_OFFSET_PX = 6;
export const BUBBLE_VERTICAL_OFFSET_PX = 24;
export const BUBBLE_FADE_DURATION_SEC = 0.5;

// Seat
export const STARTUP_WANDER_DELAY_SEC = 5;
export const INACTIVE_SEAT_TIMER_MIN_SEC = 3;
export const INACTIVE_SEAT_TIMER_RANGE_SEC = 2;

// Palette
export const HUE_SHIFT_MIN_DEG = 45;
export const HUE_SHIFT_RANGE_DEG = 270;

// Auto-state
export const AUTO_ON_FACING_DEPTH = 3;
export const AUTO_ON_SIDE_DEPTH = 1;

// Hit detection
export const CHARACTER_HIT_HALF_WIDTH = 8;
export const CHARACTER_HIT_HEIGHT = 24;
export const CHARACTER_SITTING_OFFSET_PX = 6;
export const CHARACTER_Z_SORT_OFFSET = 0.5;

// Timer
export const MAX_DELTA_TIME_SEC = 0.1;
export const DISMISS_BUBBLE_FAST_FADE_SEC = 0.3;

// Rendering colors
export const FALLBACK_FLOOR_COLOR = '#3d3d5c';
export const WALL_COLOR = '#5c5c8a';
export const GRID_LINE_COLOR = 'rgba(255,255,255,0.1)';
export const VOID_TILE_OUTLINE_COLOR = 'rgba(255,255,255,0.2)';
export const SELECTION_HIGHLIGHT_COLOR = 'rgba(255,255,255,0.5)';
export const DELETE_BUTTON_BG = '#ff5555';
export const ROTATE_BUTTON_BG = '#5555ff';
export const BUTTON_ICON_COLOR = '#ffffff';
export const SEAT_AVAILABLE_COLOR = 'rgba(80,200,80,0.5)';
export const SEAT_BUSY_COLOR = 'rgba(200,80,80,0.5)';
export const SEAT_OWN_COLOR = 'rgba(80,80,200,0.5)';
export const SELECTED_OUTLINE_ALPHA = 1;
export const HOVERED_OUTLINE_ALPHA = 0.5;
export const OUTLINE_Z_SORT_OFFSET = 0.1;
export const GHOST_BORDER_STROKE = 'rgba(255,255,255,0.3)';
export const GHOST_BORDER_HOVER_FILL = 'rgba(255,255,255,0.2)';
export const GHOST_BORDER_HOVER_STROKE = 'rgba(255,255,255,0.6)';
export const GHOST_VALID_TINT = 'rgba(80,200,80,0.3)';
export const GHOST_INVALID_TINT = 'rgba(200,80,80,0.3)';
export const GHOST_PREVIEW_SPRITE_ALPHA = 0.7;
export const GHOST_PREVIEW_TINT_ALPHA = 0.5;
export const VOID_TILE_DASH_PATTERN = [4, 4];
export const SELECTION_DASH_PATTERN = [4, 4];

// UI
export const BUTTON_MIN_RADIUS = 10;
export const BUTTON_RADIUS_ZOOM_FACTOR = 2;
export const BUTTON_LINE_WIDTH_ZOOM_FACTOR = 0.5;
export const BUTTON_LINE_WIDTH_MIN = 2;
export const BUTTON_ICON_SIZE_FACTOR = 0.6;

// Furniture animation
export const FURNITURE_ANIM_INTERVAL_SEC = 0.5;

// Display truncation
export const BASH_COMMAND_DISPLAY_MAX_LENGTH = 30;
export const TASK_DESCRIPTION_DISPLAY_MAX_LENGTH = 40;
