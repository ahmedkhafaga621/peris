import assert from "node:assert/strict";
import test from "node:test";

const base = (process.env.PERIS_API_URL ?? "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);

class Jar {
  private cookies = new Map<string, string>();

  absorb(response: Response) {
    const lines =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    for (const line of lines) {
      const pair = line.split(";", 1)[0] ?? "";
      const cut = pair.indexOf("=");
      if (cut <= 0) continue;
      this.cookies.set(pair.slice(0, cut), pair.slice(cut + 1));
    }
  }

  header() {
    if (this.cookies.size === 0) return undefined;
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

type Json = Record<string, unknown>;

async function api(
  jar: Jar | null,
  method: string,
  path: string,
  body?: unknown,
  token?: string,
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const cookie = jar?.header();
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  jar?.absorb(response);
  const text = await response.text();
  let json: Json = {};
  if (text) {
    try {
      json = JSON.parse(text) as Json;
    } catch {
      json = { raw: text };
    }
  }
  return { status: response.status, json };
}

async function requireApi() {
  try {
    const health = await api(null, "GET", "/api/v1/health");
    assert.equal(health.status, 200);
  } catch (error) {
    assert.fail(
      `Stage 7 journeys need the API on ${base} (${error instanceof Error ? error.message : "unreachable"}).`,
    );
  }
}

async function stockedLine() {
  const catalog = await api(null, "GET", "/api/v1/products");
  assert.equal(catalog.status, 200);
  const products = catalog.json.products as Array<{
    id: string;
    colors: { name: string }[];
    sizes: string[];
    lengths: number[];
    stock: { color: string; size: string; available: number }[];
  }>;
  for (const product of products) {
    const stock = product.stock.find((row) => row.available > 0);
    if (!stock || !product.lengths.length) continue;
    return {
      productId: product.id,
      color: stock.color,
      size: stock.size,
      lengthInches: product.lengths[0]!,
      quantity: 1,
    };
  }
  assert.fail("seed catalog must include a stocked variant");
}

async function staffToken() {
  const login = await api(null, "POST", "/api/v1/admin/auth/login", {
    email: process.env.ADMIN_EMAIL ?? "admin@peris.ae",
    password: process.env.ADMIN_PASSWORD ?? "change-this-password",
  });
  assert.equal(login.status, 200);
  const token = login.json.accessToken;
  assert.equal(typeof token, "string");
  return token as string;
}

test("Stage 7: browse → cart → guest COD checkout → track", async () => {
  await requireApi();
  const jar = new Jar();
  const line = await stockedLine();

  const bag = await api(jar, "PUT", "/api/v1/cart", { lines: [line] });
  assert.equal(bag.status, 200);
  const lines = bag.json.lines as unknown[];
  assert.ok(lines.length >= 1);

  const quote = await api(jar, "POST", "/api/v1/checkout/quote", {
    city: "Dubai",
  });
  assert.equal(quote.status, 200);
  assert.ok(typeof quote.json.totalFils === "number");

  const stamp = Date.now();
  const email = `journey.guest.${stamp}@example.com`;
  const placed = await api(jar, "POST", "/api/v1/checkout", {
    idempotencyKey: `journey-guest-${stamp}`,
    email,
    phone: "+971501234567",
    customerName: "Journey Guest",
    addressLine: "Boutique M01, Dubai",
    city: "Dubai",
    paymentMethod: "cod",
  });
  assert.equal(placed.status, 201);
  const order = placed.json.order as { number: string; status: string };
  assert.ok(order.number.startsWith("PR-"));
  assert.equal(order.status, "CONFIRMED");

  const tracked = await api(
    null,
    "GET",
    `/api/v1/orders/track?number=${encodeURIComponent(order.number)}&email=${encodeURIComponent(email)}`,
  );
  assert.equal(tracked.status, 200);
  assert.equal((tracked.json.order as { number: string }).number, order.number);
});

test("Stage 7: bad coupon is rejected", async () => {
  await requireApi();
  const jar = new Jar();
  const line = await stockedLine();
  const bag = await api(jar, "PUT", "/api/v1/cart", { lines: [line] });
  assert.equal(bag.status, 200);

  const bad = await api(jar, "POST", "/api/v1/cart/coupon", {
    code: "NOT-A-REAL-CODE",
  });
  assert.equal(bad.status, 400);
  assert.match(String(bad.json.error ?? ""), /not valid/i);

  const good = await api(jar, "POST", "/api/v1/cart/coupon", {
    code: "PERIS10",
  });
  assert.equal(good.status, 200);
  assert.equal((good.json.coupon as { code: string }).code, "PERIS10");
});

test("Stage 7: guest bag merges into customer cart on login", async () => {
  await requireApi();
  const jar = new Jar();
  const line = await stockedLine();
  const bag = await api(jar, "PUT", "/api/v1/cart", { lines: [line] });
  assert.equal(bag.status, 200);

  const stamp = Date.now();
  const email = `journey.merge.${stamp}@example.com`;
  const password = "journey-pass-1";
  const registered = await api(jar, "POST", "/api/v1/auth/register", {
    firstName: "Journey",
    lastName: "Merge",
    email,
    password,
  });
  assert.equal(registered.status, 201);
  const token = registered.json.accessToken as string;
  assert.ok(token);

  const merged = await api(
    jar,
    "POST",
    "/api/v1/cart/merge",
    { lines: [line] },
    token,
  );
  assert.equal(merged.status, 200);
  const mergedLines = merged.json.lines as Array<{ productId: string }>;
  assert.ok(mergedLines.some((row) => row.productId === line.productId));

  const customerBag = await api(null, "GET", "/api/v1/cart", undefined, token);
  assert.equal(customerBag.status, 200);
  const customerLines = customerBag.json.lines as Array<{ productId: string }>;
  assert.ok(customerLines.some((row) => row.productId === line.productId));
});

test("Stage 7: staff ships and customer can track", async () => {
  await requireApi();
  const jar = new Jar();
  const line = await stockedLine();
  await api(jar, "PUT", "/api/v1/cart", { lines: [line] });

  const stamp = Date.now();
  const email = `journey.ship.${stamp}@example.com`;
  const placed = await api(jar, "POST", "/api/v1/checkout", {
    idempotencyKey: `journey-ship-${stamp}`,
    email,
    phone: "+971501234568",
    customerName: "Journey Ship",
    addressLine: "Boutique M01, Dubai",
    city: "Dubai",
    paymentMethod: "cod",
  });
  assert.equal(placed.status, 201);
  const number = (placed.json.order as { number: string }).number;
  const staff = await staffToken();

  for (const status of [
    "PROCESSING",
    "READY_FOR_SHIPMENT",
    "SHIPPED",
  ] as const) {
    const body =
      status === "SHIPPED"
        ? {
            status,
            trackingNumber: `TRK-J-${stamp}`,
            trackingUrl: `https://example.com/track/TRK-J-${stamp}`,
          }
        : { status };
    const advanced = await api(
      null,
      "POST",
      `/api/v1/admin/orders/${encodeURIComponent(number)}/status`,
      body,
      staff,
    );
    assert.equal(advanced.status, 200, JSON.stringify(advanced.json));
  }

  const tracked = await api(
    null,
    "GET",
    `/api/v1/orders/track?number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}`,
  );
  assert.equal(tracked.status, 200);
  const order = tracked.json.order as {
    status: string;
    trackingNumber: string | null;
  };
  assert.equal(order.status, "SHIPPED");
  assert.equal(order.trackingNumber, `TRK-J-${stamp}`);
});

test("Stage 7: bespoke quote → accept → convert", async () => {
  await requireApi();
  const stamp = Date.now();
  const email = `journey.bespoke.${stamp}@example.com`;
  const password = "journey-pass-1";
  const registered = await api(null, "POST", "/api/v1/auth/register", {
    firstName: "Journey",
    lastName: "Bespoke",
    email,
    password,
  });
  assert.equal(registered.status, 201);
  const token = registered.json.accessToken as string;

  const address = await api(
    null,
    "POST",
    "/api/v1/account/addresses",
    {
      fullName: "Journey Bespoke",
      phone: "+971501234569",
      street: "Boutique M01",
      building: "Abu Hail Center",
    },
    token,
  );
  assert.equal(address.status, 201);

  const options = await api(null, "GET", "/api/v1/bespoke/options");
  assert.equal(options.status, 200);
  const designs = options.json.designs as string[];
  const fabrics = options.json.fabrics as string[];
  const colors = options.json.colors as string[];
  const lengths = options.json.lengths as number[];
  assert.ok(designs.length && fabrics.length && colors.length && lengths.length);

  const created = await api(
    null,
    "POST",
    "/api/v1/bespoke",
    {
      name: "Journey Bespoke",
      email,
      phone: "+971501234569",
      design: designs[0],
      fabric: fabrics[0],
      color: colors[0],
      heightCm: 165,
      shoulderCm: 40,
      sleeveCm: 58,
      chestCm: 90,
      waistCm: 70,
      abayaLengthIn: lengths[0],
      notes: "Stage 7 journey note.",
    },
    token,
  );
  assert.ok([200, 201].includes(created.status), JSON.stringify(created.json));
  const requestNumber = (created.json.request as { number: string }).number;
  assert.ok(requestNumber.startsWith("BR-"));

  const staff = await staffToken();
  const quoted = await api(
    null,
    "POST",
    `/api/v1/admin/bespoke/${encodeURIComponent(requestNumber)}/quote`,
    {
      amountFils: 210000,
      message: "Journey quote from the atelier.",
    },
    staff,
  );
  assert.equal(quoted.status, 200, JSON.stringify(quoted.json));

  const accepted = await api(
    null,
    "POST",
    `/api/v1/account/bespoke/${encodeURIComponent(requestNumber)}/accept`,
    {},
    token,
  );
  assert.equal(accepted.status, 200, JSON.stringify(accepted.json));

  const converted = await api(
    null,
    "POST",
    `/api/v1/account/bespoke/${encodeURIComponent(requestNumber)}/order`,
    {},
    token,
  );
  assert.ok(
    [200, 201].includes(converted.status),
    JSON.stringify(converted.json),
  );
  const orderNumber = converted.json.orderNumber as string;
  assert.ok(orderNumber.startsWith("PR-"));
  assert.ok(typeof converted.json.totalFils === "number");
});
