// Public API: the catalogue the browser uses, and order submission.
import { catalogJson } from "../render.js";
import { createOrder, orderSchema, OrderError } from "../orders.js";

export default async function publicApi(app, { site }) {
  const schema = orderSchema(site.cfg);

  app.get("/api/products", async (request, reply) => {
    const lang = site.cfg.languages.includes(request.query.lang) ? request.query.lang : site.cfg.defaultLanguage;
    reply.header("Cache-Control", "no-store");
    return catalogJson(site, lang);
  });

  app.post("/api/orders", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute", errorResponseBuilder: () => ({ statusCode: 429, message: "Too many orders from this connection. Wait a minute and try again." }) } }
  }, async (request, reply) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      const fields = {};
      for (const issue of parsed.error.issues) {
        const [scope, name] = issue.path;
        if (scope === "customer" && name) fields[name] = "invalid";
      }
      return reply.code(422).send({ error: "Check the highlighted fields.", code: "invalid", fields });
    }
    if (parsed.data.botcheck) return reply.code(422).send({ error: "The order couldn't be sent.", code: "invalid" });
    try {
      const order = await createOrder(parsed.data, site.cfg);
      request.log.info({ orderNumber: order.orderNumber, total: order.total }, "order created");
      return reply.code(201).send(order);
    } catch (err) {
      if (err instanceof OrderError) return reply.code(err.status).send({ error: err.message, code: err.code, ...err.details });
      throw err;
    }
  });
}
