/** Реэкспорт бесконечного мира — старые импорты продолжают работать */
export {
  TILE_SIZE,
  WORLD_W,
  WORLD_H,
  generateMap,
  isTileBlocking,
  getTileSpeed,
  getTileFromGrid,
  isWalkable,
  findLandPosition,
  InfiniteWorld,
  isWalkableWorld,
  type TileGrid,
  type MapData,
} from "./infiniteWorld";
