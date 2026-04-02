import { redirects } from "./redirects";

const PERMANENT_REDIRECT = 301;
const TEMPORARY_REDIRECT = 302;
const NOT_FOUND = 404;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const slug = url.pathname.slice(1);

    if (slug === "" || slug === "/") {
      return Response.redirect("https://sablier.com", TEMPORARY_REDIRECT);
    }

    const destination = redirects[slug];
    if (destination) {
      return Response.redirect(destination, PERMANENT_REDIRECT);
    }

    return new Response("Not found", {
      headers: { "Content-Type": "text/plain" },
      status: NOT_FOUND,
    });
  },
} satisfies ExportedHandler;
