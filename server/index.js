// Ferrin Instruments server: public shop (rendered from the database), public API, admin panel and admin API.
//   npm run dev     (development, reloads on changes)
//   npm start       (production)
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import { env, isProduction } from "./env.js";
import { prisma } from "./db.js";
import { loadSite, ROOT, DIST } from "./catalog.js";
import publicPages from "./routes/public.js";
import publicApi from "./routes/api.js";
import adminApi from "./routes/admin-api.js";
import adminPages from "./routes/admin-pages.js";
import { renderNotFound } from "./render.js";

export async function buildApp({ logger = true } = {}) {
  const site = await loadSite();
  const app = Fastify({ logger: logger && { level: isProduction ? "info" : "warn" }, disableRequestLogging: true, trustProxy: isProduction, bodyLimit: 100 * 1024 });

  await app.register(fastifyCookie);
  await app.register(fastifyRateLimit, { global: false });
  await app.register(fastifyStatic, { root: path.join(DIST, "assets"), prefix: "/assets/", maxAge: "1h", decorateReply: false });
  await app.register(fastifyStatic, { root: path.join(ROOT, "src/admin"), prefix: "/admin-assets/", maxAge: "1h", decorateReply: false });

  // Basic security headers everywhere; a strict content policy on the admin pages.
  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("X-Frame-Options", "DENY");
    if (request.url.startsWith("/admin")) {
      reply.header("Content-Security-Policy", "default-src 'self'; img-src 'self' https: data:; style-src 'self'; style-src-attr 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    }
    return payload;
  });

  // Never send internal details to the browser. Validation and client errors keep their message.
  app.setErrorHandler((err, request, reply) => {
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) request.log.error(err); else request.log.warn({ err: err.message }, "client error");
    const message = status === 429 ? (err.message || "Too many requests. Try again later.")
      : status === 400 ? "The request couldn't be read."
      : status < 500 ? (err.message || "Request refused.")
      : "Something went wrong. Please try again.";
    reply.code(status).send({ error: message });
  });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) return reply.code(404).send({ error: "Not found." });
    return reply.code(404).type("text/html; charset=utf-8").send(await renderNotFound(site, site.cfg.defaultLanguage));
  });

  // For Docker and uptime checks: is the app up and can it reach the database?
  app.get("/healthz", async (request, reply) => {
    try { await prisma.$queryRaw`SELECT 1`; return { ok: true }; }
    catch { return reply.code(503).send({ ok: false }); }
  });

  await app.register(publicApi, { site });
  await app.register(adminApi, { site });
  await app.register(adminPages, { site });
  await app.register(publicPages, { site });
  return app;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "")) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connected.");
  } catch (err) {
    console.error("Can't reach the database. Is PostgreSQL running (npm run db:up) and DATABASE_URL correct?");
    process.exit(1);
  }
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Ferrin Instruments running at ${env.APPLICATION_URL} (admin: ${env.APPLICATION_URL}/admin)`);
  const stop = async () => { await app.close(); await prisma.$disconnect(); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
