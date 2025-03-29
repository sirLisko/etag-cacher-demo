import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { EtagCacher } from '../api/eTagCacher';

const mockApi = {
  util: {
    invalidateTags: vi.fn(),
  },
};

const mockDispatch = vi.fn() as unknown as ThunkDispatch<unknown, unknown, UnknownAction>;

interface TestItem {
  id: string;
  status: 'pending' | 'completed';
}

describe('EtagCacher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should create an instance with default options', () => {
    const cacher = new EtagCacher('TestTag', mockApi);
    expect(cacher).toBeDefined();
    expect(cacher.cache).toEqual({});
  });

  it('should create an instance with custom options', () => {
    const options = {
      maxRetries: 3,
      retryDelay: 2000,
      isStatusPending: (item: TestItem) => item.status === 'pending',
    };

    const cacher = new EtagCacher<typeof mockApi, TestItem, string>('TestTag', mockApi, options);
    expect(cacher).toBeDefined();
  });

  describe('setPoll', () => {
    it('should set polling for a key', () => {
      const cacher = new EtagCacher('TestTag', mockApi);
      cacher.setPoll('test-key');

      expect(cacher.cache['TestTag.test-key']).toEqual({
        poll: true,
        retry: 0,
      });
    });

    it('should reset retry count when setting poll', () => {
      const cacher = new EtagCacher('TestTag', mockApi);

        cacher.cache['TestTag.test-key'] = {
        etag: 'old-etag',
        poll: false,
        retry: 3,
      };

      cacher.setPoll('test-key');

      expect(cacher.cache['TestTag.test-key']).toEqual({
        etag: 'old-etag',
        poll: true,
        retry: 0,
      });
    });
  });

  describe('stopPolling', () => {
    it('should stop polling for a key', () => {
      const cacher = new EtagCacher('TestTag', mockApi);

        cacher.cache['TestTag.test-key'] = {
        etag: 'test-etag',
        poll: true,
        retry: 2,
      };

      cacher.stopPolling('test-key');

      expect(cacher.cache['TestTag.test-key'].poll).toBe(false);
      expect(cacher.cache['TestTag.test-key'].retry).toBe(2); // Retry count remains unchanged
    });

    it('should do nothing if key does not exist', () => {
      const cacher = new EtagCacher('TestTag', mockApi);

      cacher.stopPolling('nonexistent-key');

      expect(cacher.cache['TestTag.nonexistent-key']).toBeUndefined();
    });
  });

  describe('getPollStatus', () => {
    it('should return the polling status for a key', () => {
      const cacher = new EtagCacher('TestTag', mockApi);

      cacher.cache['TestTag.test-key'] = {
        etag: 'test-etag',
        poll: true,
        retry: 3,
      };

      const status = cacher.getPollStatus('test-key');

      expect(status).toEqual({
        polling: true,
        retries: 3,
      });
    });

    it('should return null if key does not exist', () => {
      const cacher = new EtagCacher('TestTag', mockApi);

      const status = cacher.getPollStatus('nonexistent-key');

      expect(status).toBeNull();
    });
  });

  describe('checkEtag', () => {
    it('should not poll if no existing cache entry', () => {
      const cacher = new EtagCacher('TestTag', mockApi);

      cacher.checkEtag(mockDispatch, 'test-key', 'new-etag');

      expect(cacher.cache['TestTag.test-key']).toEqual({
        etag: 'new-etag',
        poll: false,
        retry: 0,
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockApi.util.invalidateTags).not.toHaveBeenCalled();
    });

    it('should continue polling if etags match and under retry limit', () => {
      const cacher = new EtagCacher('TestTag', mockApi, { maxRetries: 5 });

        cacher.cache['TestTag.test-key'] = {
        etag: 'same-etag',
        poll: true,
        retry: 2, // Below max retries
      };

      cacher.checkEtag(mockDispatch, 'test-key', 'same-etag');

      expect(cacher.cache['TestTag.test-key'].retry).toBe(3);

      vi.runAllTimers();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockApi.util.invalidateTags).toHaveBeenCalledWith(['TestTag']);
    });

    it('should stop polling if retry limit is reached', () => {
      const cacher = new EtagCacher('TestTag', mockApi, { maxRetries: 3 });

        cacher.cache['TestTag.test-key'] = {
        etag: 'test-etag',
        poll: true,
        retry: 3, // At max retries
      };

      cacher.checkEtag(mockDispatch, 'test-key', 'test-etag');

          expect(cacher.cache['TestTag.test-key']).toEqual({
        etag: 'test-etag',
        poll: false,
        retry: 0,
      });

          vi.runAllTimers();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should stop polling if etags are different', () => {
      const cacher = new EtagCacher('TestTag', mockApi);

        cacher.cache['TestTag.test-key'] = {
        etag: 'old-etag',
        poll: true,
        retry: 1,
      };

      cacher.checkEtag(mockDispatch, 'test-key', 'new-etag');

        expect(cacher.cache['TestTag.test-key']).toEqual({
        etag: 'new-etag',
        poll: false,
        retry: 0,
      });

        vi.runAllTimers();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should continue polling if data items are in pending status', () => {
      const isStatusPending = (item: TestItem) => item.status === 'pending';
      const cacher = new EtagCacher<typeof mockApi, TestItem, string>(
        'TestTag',
        mockApi,
        { isStatusPending }
      );

        cacher.cache['TestTag.test-key'] = {
        etag: 'old-etag',
        poll: true,
        retry: 1,
      };

      const testData: TestItem[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'pending' },
      ];

      cacher.checkEtag(mockDispatch, 'test-key', 'new-etag', testData);

      expect(cacher.cache['TestTag.test-key'].retry).toBe(2);

      vi.runAllTimers();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('should stop polling if no data items are in pending status', () => {
      const isStatusPending = (item: TestItem) => item.status === 'pending';
      const cacher = new EtagCacher<typeof mockApi, TestItem, string>(
        'TestTag',
        mockApi,
        { isStatusPending }
      );

        cacher.cache['TestTag.test-key'] = {
        etag: 'old-etag',
        poll: true,
        retry: 1,
      };

      const testData: TestItem[] = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
      ];

          cacher.checkEtag(mockDispatch, 'test-key', 'new-etag', testData);

          expect(cacher.cache['TestTag.test-key']).toEqual({
        etag: 'new-etag',
        poll: false,
        retry: 0,
      });

          vi.runAllTimers();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should use custom retry delay if provided', () => {
      const cacher = new EtagCacher('TestTag', mockApi, { retryDelay: 2000 });

        cacher.cache['TestTag.test-key'] = {
        etag: 'test-etag',
        poll: true,
        retry: 0,
      };

      cacher.checkEtag(mockDispatch, 'test-key', 'test-etag');

          vi.advanceTimersByTime(1000);
      expect(mockDispatch).not.toHaveBeenCalled();

          vi.advanceTimersByTime(1000);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });
});