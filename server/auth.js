// Admin authentication: Argon2id password hashes and a signed session token (JWT, HS256) in an
// HTTP-only cookie. Every admin page and API route checks the token on the server.
import { hash, verify } from "@node-rs/argon2";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ferrin_admin";
const SESSION_HOURS = 8;
const ARGON = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }; // Argon2id, OWASP baseline

export const hashPassword = password => hash(password, ARGON);
export async function verifyPassword(passwordHash, password) {
  try { return await verify(passwordHash, password); } catch { return false; }
}
// Used when the email doesn't exist, so a failed login takes as long either way.
const DUMMY_HASH = await hash("not-a-real-password-just-for-timing", ARGON);
export const verifyAgainstDummy = password => verifyPassword(DUMMY_HASH, password);

let secretKey;
function key() {
  if (!secretKey) secretKey = new TextEncoder().encode(process.env.AUTH_SECRET);
  return secretKey;
}

export async function createSession(admin) {
  return new SignJWT({ name: admin.name, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function readSession(request) {
  const token = request.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.role === "ADMIN" ? { id: payload.sub, name: payload.name, role: payload.role } : null;
  } catch {
    return null;
  }
}

export function cookieOptions(secure) {
  return { path: "/", httpOnly: true, sameSite: "strict", secure, maxAge: SESSION_HOURS * 3600 };
}

// CSRF defence for state-changing admin requests: SameSite=Strict cookie, JSON-only bodies,
// and the Origin (or Referer) must be this application.
// Accepts the configured address, or the address the request was actually sent to (the Host the browser
// used, as forwarded by the tunnel). A cross-site attacker can't make a victim's browser fake either one.
export function sameOrigin(request, appUrl) {
  let origin = request.headers.origin;
  if (!origin && request.headers.referer) { try { origin = new URL(request.headers.referer).origin; } catch { origin = ""; } }
  if (!origin || origin === "null") return false;
  if (origin === new URL(appUrl).origin) return true;
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(",")[0].trim();
  try { return Boolean(host) && new URL(origin).host === host; } catch { return false; }
}
