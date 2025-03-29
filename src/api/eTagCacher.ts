import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { TagDescription } from "@reduxjs/toolkit/query";

const DEFAULT_OPTIONS = {
  maxRetries: 5,
  retryDelay: 1000,
};

// Define interface matching RTK Query's API structure
interface ApiWithInvalidateTags<TagType extends string = string> {
  util: {
    invalidateTags: (tags: Array<TagType | TagDescription<TagType> | null | undefined>) => UnknownAction;
  };
}

/**
 * EtagCacher - A utility for implementing efficient polling with ETag-based caching
 *
 * This class provides a mechanism to intelligently poll an API based on ETag changes
 * and custom conditions. It helps reduce unnecessary network requests by monitoring
 * server responses for changes indicated by ETags.
 *
 * Features:
 * - ETag-based change detection
 * - Configurable polling with retry limits
 * - Support for custom "pending" state detection
 * - Seamless integration with RTK Query
 *
 * @template T - The API type with invalidateTags method (typically an RTK Query API)
 * @template K - The type of data elements being polled (used for status checking)
 * @template TagType - The type of cache tags used by the API
 */
export class EtagCacher<T extends ApiWithInvalidateTags<TagType>, K = undefined, TagType extends string = string> {
  cache: Record<string, { etag: string; poll: boolean; retry: number }>;

  /**
   * Creates a new EtagCacher instance
   *
   * @param tag - The cache tag to use for invalidation
   * @param api - The API instance with invalidateTags method
   * @param options - Configuration options for the cacher
   * @param options.maxRetries - Maximum number of retry attempts (default: 5)
   * @param options.retryDelay - Delay between retries in ms (default: 1000)
   * @param options.isStatusPending - Function to determine if an item is in pending status
   */
  constructor(
    private tag: TagType,
    private api: T,
    private options: {
      maxRetries?: number;
      retryDelay?: number;
      isStatusPending?: (element: K) => boolean;
    } = {},
  ) {
    this.cache = {};
    this.api = api;
    this.tag = tag;
    this.options = options;
  }

  /**
   * Checks the ETag against the cached value and determines if polling should continue
   *
   * This method is called when a response is received from the API. It compares the
   * received ETag with the cached one and checks if any data items are in pending state.
   * Based on these conditions, it either continues polling or stops.
   *
   * @param dispatch - The Redux dispatch function
   * @param key - The cache key to use (typically a resource identifier)
   * @param etag - The ETag received from the server
   * @param data - Optional array of data items to check for pending status
   */
  checkEtag(
    dispatch: ThunkDispatch<unknown, unknown, UnknownAction>,
    key: string,
    etag: string,
    data?: K[],
  ) {
    if (
      this.cache[`${this.tag}.${key}`] &&
      this.cache[`${this.tag}.${key}`].poll &&
      (etag === this.cache[`${this.tag}.${key}`].etag ||
        (data &&
          this.options.isStatusPending &&
          data.some(this.options.isStatusPending))) &&
      this.cache[`${this.tag}.${key}`].retry <
        (this.options.maxRetries ?? DEFAULT_OPTIONS.maxRetries)
    ) {
      setTimeout(
        () => dispatch(this.api.util.invalidateTags([this.tag])),
        this.options.retryDelay ?? DEFAULT_OPTIONS.retryDelay,
      );
      this.cache[`${this.tag}.${key}`].retry += 1;
    } else {
      this.cache[`${this.tag}.${key}`] = { etag, poll: false, retry: 0 };
    }
  }

  /**
   * Initiates polling for a specific cache key
   *
   * Call this method to start the polling process, typically after
   * a mutation that requires waiting for backend processing.
   *
   * @param key - The cache key to poll
   */
  setPoll(key: string) {
    this.cache[`${this.tag}.${key}`] = {
      ...this.cache[`${this.tag}.${key}`],
      poll: true,
      retry: 0,
    };
  }

  /**
   * Explicitly stops polling for a specific cache key
   *
   * @param key - The cache key to stop polling
   */
  stopPolling(key: string): void {
    const cacheKey = `${this.tag}.${key}`;
    if (this.cache[cacheKey]) {
      this.cache[cacheKey].poll = false;
    }
  }

  /**
   * Gets the current polling status for a specific cache key
   *
   * @param key - The cache key to check
   * @returns Object containing polling status and retry count, or null if no entry exists
   */
  getPollStatus(key: string): { polling: boolean; retries: number } | null {
    const cacheKey = `${this.tag}.${key}`;
    const entry = this.cache[cacheKey];

    if (!entry) return null;

    return {
      polling: entry.poll,
      retries: entry.retry
    };
  }
}
