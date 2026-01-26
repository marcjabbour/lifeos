/**
 * Items Service Module
 *
 * Exports item-related services and utilities.
 */

export {
  ItemService,
  createItemService,
  type ListItemsOptions,
} from "./item-service";
export {
  extractTitleFromUrl,
  extractTitleFromText,
  generateTitle,
  createInitialMetadata,
  isValidUUID,
  validateUUID,
} from "./item-helpers";
