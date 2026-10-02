import { vi } from 'vitest';

type Reply = unknown | Error | { status: number; body: unknown };

const respond = (reply: Reply) => {
  if (reply instanceof Error) return Promise.reject(reply);
  const { status, body } = reply && typeof reply === 'object' && 'status' in reply ? (reply as { status: number; body: unknown }) : { status: 200, body: reply };
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
};

/**
 * Stubs global fetch. `routes` maps a URL path (e.g. "/api.php") to replies handed out in order;
 * the last reply repeats once the list runs out.
 */
export const mockFetch = (routes: Record<string, Reply[]>) => {
  const calls: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const url = new URL(input);
      calls.push(url);
      const replies = routes[url.pathname];
      if (!replies) return Promise.reject(new Error(`unmocked ${url}`));
      return respond(replies.length > 1 ? replies.shift() : replies[0]);
    })
  );
  return { calls, to: (path: string) => calls.filter(c => c.pathname === path) };
};
