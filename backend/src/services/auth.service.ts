import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import type { AdminUser, Prisma } from "@prisma/client";
import { write } from "../config/database.ts";
import { config } from "../config/env.ts";
import { HttpError } from "../utils/http-error.ts";
import { sessionModel } from "../models/session.model.ts";
import { userModel } from "../models/user.model.ts";
import { safeUser } from "./user.service.ts";

const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
const google = () => new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);

async function createSession(user: AdminUser, familyId = randomBytes(24).toString("hex"), client?: Prisma.TransactionClient) {
  const refresh = randomBytes(48).toString("hex");
  const session = await sessionModel.create(
    {
      userId: user.id,
      familyId,
      tokenHash: tokenHash(refresh),
      expiresAt: new Date(Date.now() + 7 * 86400_000),
    },
    client,
  );
  const access = jwt.sign({ sid: session.id }, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: "15m",
    issuer: "catalogue-api",
    audience: "catalogue-admin",
  });
  return { access, refresh, user: safeUser(user) };
}

export async function authenticate(access: string) {
  let payload;
  try {
    payload = jwt.verify(access, config.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "catalogue-api",
      audience: "catalogue-admin",
    });
  } catch {
    throw new HttpError(401, "Please sign in");
  }
  if (typeof payload === "string" || !payload.sub || !payload.sid) throw new HttpError(401, "Please sign in");
  const session = await sessionModel.findById(String(payload.sid));
  if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive || !session.user.approvedAt) throw new HttpError(401, "Please sign in");
  return session.user;
}

export async function login(email: string, password: string) {
  const user = await userModel.findByEmail(email);
  const valid = user?.passwordHash ? await argon2.verify(user.passwordHash, password) : false;
  if (!valid || !user) throw new HttpError(401, "Invalid email or password");
  if (!user.isActive || !user.approvedAt) throw new HttpError(403, "Account is pending approval or disabled");
  return createSession(user);
}

export async function refreshSession(refresh: string) {
  const result = await write(async (client) => {
    const session = await sessionModel.findByHash(tokenHash(refresh), client);
    if (!session || session.expiresAt < new Date()) return null;
    const claimed = await sessionModel.claim(session.id, client);
    if (!claimed.count || !session.user.isActive || !session.user.approvedAt) {
      await sessionModel.revokeFamily(session.familyId, client);
      return null;
    }
    return createSession(session.user, session.familyId, client);
  });
  if (!result) throw new HttpError(401, "Session expired or revoked");
  return result;
}

export async function logout(refresh: string) {
  await sessionModel.revokeToken(tokenHash(refresh));
}

export async function changePassword(user: AdminUser, currentPassword: string, password: string) {
  const passwordHash = await argon2.hash(password);
  await write(async (client) => {
    const current = await userModel.findById(user.id, client);
    if (!current.passwordHash || !(await argon2.verify(current.passwordHash, currentPassword))) throw new HttpError(400, "Current password is incorrect");
    await userModel.update(user.id, { passwordHash }, client);
    await sessionModel.deleteForUser(user.id, client);
  });
}

export async function startGoogle(userId?: string) {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) return null;
  const state = randomBytes(32).toString("hex");
  const nonce = randomBytes(32).toString("hex");
  const verifier = await google().generateCodeVerifierAsync();
  return {
    cookieValue: jwt.sign({ state, nonce, verifier: verifier.codeVerifier, userId }, config.JWT_SECRET, {
      expiresIn: "10m",
      issuer: "catalogue-api",
      audience: "catalogue-oauth",
    }),
    url: google().generateAuthUrl({
      scope: ["openid", "email", "profile"],
      state,
      nonce,
      code_challenge: verifier.codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: "select_account",
    }),
  };
}

export async function finishGoogle(cookieValue: string, state: unknown, code: unknown, access = "") {
  const stored = jwt.verify(cookieValue || "", config.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: "catalogue-api",
    audience: "catalogue-oauth",
  });
  if (typeof stored === "string") throw new HttpError(400, "Invalid OAuth transaction");
  if (!stored.state || state !== stored.state || typeof code !== "string") throw new HttpError(400, "OAuth state mismatch");
  const { tokens } = await google().getToken({
    code,
    codeVerifier: stored.verifier,
  });
  const ticket = await google().verifyIdToken({
    idToken: tokens.id_token!,
    audience: config.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email_verified || !payload.email || (payload as unknown as { nonce: string }).nonce !== stored.nonce) throw new HttpError(400, "Unverified identity");
  if (stored.userId) {
    const current = await authenticate(access);
    if (current.id !== stored.userId) throw new HttpError(403, "Sign in to the original account before linking Google");
    await write(async (client) => {
      const identity = await userModel.findGoogleIdentity(payload.sub, client);
      if (identity && identity.userId !== current.id) throw new HttpError(409, "Google identity is already linked to another account");
      if (!identity) await userModel.linkGoogle(payload.sub, current.id, client);
    });
    return { destination: "/admin/account?linked=1" };
  }
  const identity = await userModel.findGoogleIdentity(payload.sub);
  let user = identity?.user;
  if (!user) {
    const email = payload.email.toLowerCase();
    if (await userModel.findByEmail(email)) return { destination: "/admin/login?error=use-password" };
    user = await userModel.create({
      email,
      name: payload.name || email,
      identities: { create: { subject: payload.sub } },
    });
  }
  if (!user.isActive || !user.approvedAt) return { destination: "/admin/login?pending=1" };
  return { destination: "/admin", session: await createSession(user) };
}
