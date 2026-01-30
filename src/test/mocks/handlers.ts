import { http, HttpResponse } from "msw";

/**
 * MSW request handlers for mocking API endpoints in tests
 * Add handlers for your API routes here
 *
 * @example
 * // Mock a GET endpoint
 * http.get('/api/users', () => {
 *   return HttpResponse.json([{ id: 1, name: 'John' }])
 * })
 *
 * @example
 * // Mock a POST endpoint with request body
 * http.post('/api/users', async ({ request }) => {
 *   const body = await request.json()
 *   return HttpResponse.json({ id: 2, ...body }, { status: 201 })
 * })
 */
export const handlers = [
  // Health check endpoint example
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Add more handlers as needed for your tests
];
