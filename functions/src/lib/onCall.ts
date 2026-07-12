import {
  onCall as rawOnCall,
  type CallableOptions,
  type CallableRequest,
  type HttpsFunction,
} from "firebase-functions/v2/https";

/**
 * The callable-functions wire encoder does NOT call `toJSON()` on returned
 * values the way `JSON.stringify` does — it walks own+inherited enumerable
 * properties instead. A raw Prisma `Decimal` (or a `Date`) returned directly
 * from a handler arrives on the client as a mangled plain object (its entire
 * prototype/static-enum surface flattened in), not the string/ISO value the
 * client types promise. Every function that returns Prisma rows with
 * money or date fields needs this — so it's applied at the `onCall` choke
 * point instead of at each of the ~60 call sites.
 */
function serializeForWire<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map((item) => serializeForWire(item)) as unknown as T;
  if (typeof value === "object") {
    const maybeDecimal = value as unknown as { toFixed?: unknown; d?: unknown };
    if (typeof maybeDecimal.toFixed === "function" && Array.isArray(maybeDecimal.d)) {
      return (value as unknown as { toString(): string }).toString() as unknown as T;
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      out[key] = serializeForWire((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

/**
 * The httpsCallable CLIENT SDK encodes `undefined` object properties as
 * `null` on the wire (JSON has no `undefined`) — so `deliveryAddressId:
 * undefined` sent by the web app arrives here as `deliveryAddressId: null`.
 * Every zod schema using `.optional()` for a field the client conditionally
 * omits (there are ~25) then fails with "Expected string, received null",
 * because `.optional()` accepts a missing key but not an explicit null.
 * Undoing that encoding at the request choke point means schemas can just
 * say what they mean (`.optional()`) instead of every one needing
 * `.nullish()` to work around a client-SDK transport quirk. The two schemas
 * that use a real, meaningful `null` (branchId: null = "org-wide grant") are
 * `.nullish()` so they still accept it after this round-trips through undefined.
 */
function desanitizeRequestData<T>(value: T): T {
  if (value === null) return undefined as unknown as T;
  if (value === undefined || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => desanitizeRequestData(item)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as object)) {
    out[key] = desanitizeRequestData((value as Record<string, unknown>)[key]);
  }
  return out as T;
}

type Handler<Req, Res> = (request: CallableRequest<Req>) => Res | Promise<Res>;

export function onCall<Req = unknown, Res = unknown>(handler: Handler<Req, Res>): HttpsFunction;
export function onCall<Req = unknown, Res = unknown>(
  opts: CallableOptions,
  handler: Handler<Req, Res>
): HttpsFunction;
export function onCall<Req = unknown, Res = unknown>(
  optsOrHandler: CallableOptions | Handler<Req, Res>,
  maybeHandler?: Handler<Req, Res>
): HttpsFunction {
  if (typeof optsOrHandler === "function") {
    return rawOnCall(async (request: CallableRequest<Req>) => {
      request.data = desanitizeRequestData(request.data);
      return serializeForWire(await optsOrHandler(request));
    });
  }
  return rawOnCall(optsOrHandler, async (request: CallableRequest<Req>) => {
    request.data = desanitizeRequestData(request.data);
    return serializeForWire(await maybeHandler!(request));
  });
}
