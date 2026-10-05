export const LIST_USERS_PAGE_SIZE = 25;
export const LIST_USERS_MAX_NUM_ITEMS = 100;
export const CHANGES_PAGE_SIZE = 20;

/** Silent cap for `users.list` page size. Does not throw. */
export function clampPaginationNumItems(numItems: number): number {
  if (numItems > LIST_USERS_MAX_NUM_ITEMS) {
    return LIST_USERS_MAX_NUM_ITEMS;
  }
  return numItems;
}
