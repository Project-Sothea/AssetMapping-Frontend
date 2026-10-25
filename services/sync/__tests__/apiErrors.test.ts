/** @jest-environment node */
import { request } from '~/services/api/client';

jest.mock('~/services/apiUrl', () => ({ getApiUrl: async () => 'https://api.example.test' }));
afterEach(() => jest.restoreAllMocks());

test('non-JSON storage failure retains its HTTP status instead of hiding it as Unknown error', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: async () => {
      throw new Error('Unexpected token <');
    },
  } as unknown as Response);
  expect(await request('/api/storage/upload-url')).toMatchObject({
    success: false,
    error: expect.stringContaining('HTTP 500'),
  });
});

test('JSON error field from the backend is preserved with HTTP status', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    json: async () => ({ success: false, error: 'Photo storage unavailable' }),
  } as unknown as Response);
  expect(await request('/api/storage/upload-url')).toMatchObject({
    success: false,
    error: expect.stringMatching(/HTTP 503.*Photo storage unavailable/),
  });
});
