import { httpRouter } from "convex/server";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: async (ctx, request) => {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});

export default http;
