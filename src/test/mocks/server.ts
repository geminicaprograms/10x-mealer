import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * MSW server instance for Node.js environment (Vitest)
 * Use this server in your tests to mock API requests
 *
 * @example
 * // In your test file
 * import { server } from '@/test/mocks/server'
 * import { http, HttpResponse } from 'msw'
 *
 * beforeAll(() => server.listen())
 * afterEach(() => server.resetHandlers())
 * afterAll(() => server.close())
 *
 * // Override handlers for specific tests
 * test('handles error', async () => {
 *   server.use(
 *     http.get('/api/users', () => {
 *       return HttpResponse.json({ error: 'Not found' }, { status: 404 })
 *     })
 *   )
 * })
 */
export const server = setupServer(...handlers);
