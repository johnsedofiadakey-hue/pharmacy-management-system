const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3010";

const routes = [
  "/",
  "/store",
  "/store/login",
  "/store/signup",
  "/login",
  "/admin/products",
  "/admin/customization",
  "/admin/staff",
  "/admin/inventory",
  "/admin/audit",
];

const failures = [];

for (const route of routes) {
  const url = new URL(route, baseUrl);
  try {
    const response = await fetch(url, { redirect: "manual" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "ok" : "fail"} ${response.status} ${route}`);
    if (!ok) {
      failures.push(`${route} returned ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`fail ${route} ${message}`);
    failures.push(`${route} failed: ${message}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
