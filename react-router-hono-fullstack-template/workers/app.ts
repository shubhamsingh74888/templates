import { Hono } from "hono";
import { createRequestHandler } from "react-router";

type Bindings = {
	DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// API routes (must stay above the catch-all below)
app.get("/api/notes", async (c) => {
	const { results } = await c.env.DB.prepare(
		"SELECT * FROM notes ORDER BY id DESC",
	).all();
	return c.json(results);
});

app.post("/api/notes", async (c) => {
	let body: { text?: unknown };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON" }, 400);
	}

	const text = typeof body.text === "string" ? body.text.trim() : "";
	if (!text || text.length > 500) {
		return c.json({ error: "text is required (max 500 characters)" }, 400);
	}

	await c.env.DB.prepare("INSERT INTO notes (text) VALUES (?)")
		.bind(text)
		.run();
	return c.json({ ok: true }, 201);
});

// React Router handles everything else
app.get("*", (c) => {
	const requestHandler = createRequestHandler(
		() => import("virtual:react-router/server-build"),
		import.meta.env.MODE,
	);

	return requestHandler(c.req.raw, {
		cloudflare: { env: c.env, ctx: c.executionCtx },
	});
});

export default app;
