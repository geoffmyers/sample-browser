/**
 * Same-origin proxy to the backend API.
 *
 * The client calls `/api/...` on the page's own origin unless
 * NEXT_PUBLIC_API_URL was set at build time. Where a reverse proxy already
 * routes `/api` to the backend, requests never reach this handler. Everywhere
 * else (the example compose file, `next start` beside a local API) it forwards
 * them to API_INTERNAL_URL, read when the server runs, so one published image
 * works on any host.
 */

export const dynamic = "force-dynamic";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://localhost:8000";

// Hop-by-hop headers, and ones fetch() recomputes for the body it returns.
const DROP_REQUEST = ["host", "connection", "content-length"];
const DROP_RESPONSE = ["connection", "content-encoding", "content-length", "transfer-encoding"];

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context): Promise<Response> {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = new URL(
    `/api/${path.map(encodeURIComponent).join("/")}${incoming.search}`,
    API_INTERNAL_URL,
  );

  const headers = new Headers(request.headers);
  DROP_REQUEST.forEach((name) => headers.delete(name));
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half"; // required by Node's fetch to stream a request body
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return Response.json(
      { detail: `The API at ${API_INTERNAL_URL} is not reachable (set API_INTERNAL_URL).` },
      { status: 502 },
    );
  }
  const responseHeaders = new Headers(upstream.headers);
  DROP_RESPONSE.forEach((name) => responseHeaders.delete(name));
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export {
  proxy as GET,
  proxy as HEAD,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
