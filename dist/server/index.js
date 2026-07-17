export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || (request.method !== "GET" && request.method !== "HEAD")) {
      return response;
    }

    const url = new URL(request.url);
    const lastSegment = url.pathname.split("/").pop();
    if (lastSegment && lastSegment.includes(".")) return response;

    if (!url.pathname.endsWith("/")) url.pathname += "/";
    url.pathname += "index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
