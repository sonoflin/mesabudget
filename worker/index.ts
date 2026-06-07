import { nanoid } from "nanoid";

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
  ADMIN_TOKEN?: string;
}

interface BudgetRow {
  slug: string;
  title: string;
  author_name: string | null;
  category_amounts: string;
  revenue_amounts: string;
  multi_fund: string | null;
  agree_count: number;
  created_at: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const PROFANITY = /\b(shit|fuck|damn|asshole|bitch)\b/i;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/budgets" && request.method === "POST") {
      return handleCreate(request, env);
    }

    if (url.pathname === "/api/gallery" && request.method === "GET") {
      return handleGallery(env);
    }

    if (url.pathname === "/api/aggregate" && request.method === "GET") {
      return handleAggregate(env);
    }

    const match = url.pathname.match(/^\/api\/budgets\/([a-zA-Z0-9_-]+)$/);
    if (match && request.method === "GET") {
      return handleGet(match[1], env);
    }

    const agreeMatch = url.pathname.match(/^\/api\/budgets\/([a-zA-Z0-9_-]+)\/agree$/);
    if (agreeMatch && request.method === "POST") {
      return handleAgree(agreeMatch[1], env);
    }

    const deleteMatch = url.pathname.match(/^\/api\/budgets\/([a-zA-Z0-9_-]+)$/);
    if (deleteMatch && request.method === "DELETE") {
      return handleDelete(deleteMatch[1], request, env);
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
};

function sanitize(text: string, maxLen: number): string {
  return text.replace(PROFANITY, "***").trim().slice(0, maxLen);
}

async function checkRateLimit(request: Request, env: Env): Promise<boolean> {
  const ip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For") ?? "unknown";
  const now = new Date().toISOString();
  const row = await env.DB.prepare("SELECT count, window_start FROM rate_limits WHERE ip = ?").bind(ip).first<{ count: number; window_start: string }>();
  if (!row) {
    await env.DB.prepare("INSERT INTO rate_limits (ip, count, window_start) VALUES (?, 1, ?)").bind(ip, now).run();
    return true;
  }
  const windowStart = new Date(row.window_start).getTime();
  if (Date.now() - windowStart > RATE_WINDOW_MS) {
    await env.DB.prepare("UPDATE rate_limits SET count = 1, window_start = ? WHERE ip = ?").bind(now, ip).run();
    return true;
  }
  if (row.count >= RATE_LIMIT) return false;
  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE ip = ?").bind(ip).run();
  return true;
}

async function handleCreate(request: Request, env: Env): Promise<Response> {
  if (!(await checkRateLimit(request, env))) {
    return json({ error: "Rate limit exceeded" }, 429);
  }

  let body: {
    title?: string;
    authorName?: string;
    categoryAmounts?: Record<string, number>;
    revenueAmounts?: Record<string, number>;
    multiFund?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.title?.trim()) return json({ error: "Title required" }, 400);
  if (!body.categoryAmounts || !body.revenueAmounts) return json({ error: "Missing budget data" }, 400);

  const slug = nanoid(8);
  const now = new Date().toISOString();
  const title = sanitize(body.title, 120);
  const authorName = body.authorName ? sanitize(body.authorName, 80) : null;

  await env.DB.prepare(
    `INSERT INTO shared_budgets (slug, title, author_name, category_amounts, revenue_amounts, multi_fund, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      slug,
      title,
      authorName,
      JSON.stringify(body.categoryAmounts),
      JSON.stringify(body.revenueAmounts),
      body.multiFund ? JSON.stringify(body.multiFund) : null,
      now,
    )
    .run();

  const siteOrigin = "http://localhost:4321";
  return json({ slug, url: `${siteOrigin}/b?slug=${slug}`, createdAt: now });
}

async function handleGet(slug: string, env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT slug, title, author_name, category_amounts, revenue_amounts, multi_fund, agree_count, created_at
     FROM shared_budgets WHERE slug = ?`,
  )
    .bind(slug)
    .first<BudgetRow>();

  if (!row) return json({ error: "Not found" }, 404);

  return json({
    slug: row.slug,
    title: row.title,
    authorName: row.author_name,
    categoryAmounts: JSON.parse(row.category_amounts),
    revenueAmounts: JSON.parse(row.revenue_amounts),
    multiFund: row.multi_fund ? JSON.parse(row.multi_fund) : null,
    agreeCount: row.agree_count,
    createdAt: row.created_at,
  });
}

async function handleGallery(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT slug, title, author_name, agree_count, created_at FROM shared_budgets ORDER BY created_at DESC LIMIT 50`,
  ).all<{ slug: string; title: string; author_name: string | null; agree_count: number; created_at: string }>();

  return json({ budgets: rows.results ?? [] });
}

async function handleAggregate(env: Env): Promise<Response> {
  const cacheKey = "aggregate-v1";
  const rows = await env.DB.prepare(
    `SELECT category_amounts FROM shared_budgets ORDER BY created_at DESC LIMIT 200`,
  ).all<{ category_amounts: string }>();

  const allAmounts: Record<string, number[]> = {};
  for (const row of rows.results ?? []) {
    const amounts = JSON.parse(row.category_amounts) as Record<string, number>;
    for (const [id, amt] of Object.entries(amounts)) {
      if (!allAmounts[id]) allAmounts[id] = [];
      allAmounts[id].push(amt);
    }
  }

  const aggregate: Record<string, { mean: number; count: number }> = {};
  for (const [id, values] of Object.entries(allAmounts)) {
    aggregate[id] = {
      mean: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
      count: values.length,
    };
  }

  return json({ aggregate, sampleSize: rows.results?.length ?? 0, cacheKey });
}

async function handleAgree(slug: string, env: Env): Promise<Response> {
  await env.DB.prepare("UPDATE shared_budgets SET agree_count = agree_count + 1 WHERE slug = ?").bind(slug).run();
  return json({ ok: true });
}

async function handleDelete(slug: string, request: Request, env: Env): Promise<Response> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }
  await env.DB.prepare("DELETE FROM shared_budgets WHERE slug = ?").bind(slug).run();
  return json({ ok: true });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
