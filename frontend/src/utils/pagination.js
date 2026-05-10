/**
 * Pagination utilities for infinite scroll and load more
 */

/**
 * Intersection Observer for infinite scroll
 * @param {Function} callback - Function to call when element is visible
 * @param {Object} options - Observer options
 * @returns {IntersectionObserver}
 */
export function createInfiniteScrollObserver(callback, options = {}) {
  const defaultOptions = {
    root: null,
    rootMargin: '100px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback();
      }
    });
  }, defaultOptions);
}

/**
 * Virtual scroll helper for large lists
 * @param {Array} items - All items
 * @param {number} containerHeight - Container height in pixels
 * @param {number} itemHeight - Single item height in pixels
 * @param {number} scrollTop - Current scroll position
 * @returns {Object} Visible items and offsets
 */
export function getVisibleItems(items, containerHeight, itemHeight, scrollTop) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  const visibleItems = items.slice(
    Math.max(0, startIndex - 5), // Buffer above
    Math.min(items.length, endIndex + 5) // Buffer below
  );

  const offsetY = Math.max(0, startIndex - 5) * itemHeight;
  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    offsetY,
    totalHeight,
    startIndex: Math.max(0, startIndex - 5),
  };
}

/**
 * Load more pattern helper
 * @param {Array} currentItems - Current loaded items
 * @param {Function} fetchMore - Function to fetch more items
 * @param {Object} state - Loading state
 */
export async function loadMoreItems(currentItems, fetchMore, state) {
  if (state.loading || !state.hasMore) return currentItems;

  try {
    state.loading = true;
    const newItems = await fetchMore(currentItems.length);
    state.hasMore = newItems.length > 0;
    return [...currentItems, ...newItems];
  } catch (error) {
    console.error('Load more failed:', error);
    return currentItems;
  } finally {
    state.loading = false;
  }
}
