// Public pages, rendered on each request from the database with the site's templates.
import { renderRoute, renderNotFound, renderRoot, renderSitemap } from "../render.js";

export default async function publicPages(app, { site }) {
  const { cfg } = site;
  const html = (reply, body, code = 200) => reply.code(code).type("text/html; charset=utf-8").send(body);

  app.get("/", async (request, reply) => html(reply, await renderRoot(site)));
  app.get("/sitemap.xml", async (request, reply) => reply.type("application/xml").send(await renderSitemap(site)));
  app.get("/robots.txt", async (request, reply) =>
    reply.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${cfg.siteOrigin}/sitemap.xml\n`));

  app.get("/:lang/*", async (request, reply) => {
    const { lang } = request.params;
    if (!cfg.languages.includes(lang)) return html(reply, await renderNotFound(site, cfg.defaultLanguage), 404);
    const [pathname, query] = request.url.split("?");
    if (!pathname.endsWith("/")) return reply.redirect(`${pathname}/${query ? `?${query}` : ""}`, 301);
    const page = await renderRoute(site, lang, request.params["*"]);
    if (!page) return html(reply, await renderNotFound(site, lang), 404);
    reply.header("Cache-Control", "no-cache");
    return html(reply, page);
  });
  app.get("/:lang", async (request, reply) => reply.redirect(`/${request.params.lang}/`, 301));
}
