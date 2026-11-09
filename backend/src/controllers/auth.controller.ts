import type { RequestHandler, Response } from "express";
import { randomBytes } from "node:crypto";
import { config, secureCookies } from "../config/env.ts";
import * as authService from "../services/auth.service.ts";
import { safeUser } from "../services/user.service.ts";
import { credentials, passwordInput } from "../validators/auth.validator.ts";

const cookie = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: "lax" as const,
  path: "/",
};

function setSession(res: Response, session: { access: string; refresh: string }) {
  res.cookie("access", session.access, { ...cookie, maxAge: 15 * 60_000 });
  res.cookie("refresh", session.refresh, { ...cookie, maxAge: 1 * 86400_000 });
}

export const issueCsrf: RequestHandler = (_req, res) => {
  const token = randomBytes(32).toString("hex");
  res.cookie("csrf", token, { ...cookie, maxAge: 86400_000 });
  res.json({ token });
};
export const login: RequestHandler = async (req, res) => {
  const input = credentials.parse(req.body);
  const session = await authService.login(input.email, input.password);
  setSession(res, session);
  res.json({ user: session.user });
};
export const refresh: RequestHandler = async (req, res) => {
  const session = await authService.refreshSession(req.cookies.refresh ?? "");
  setSession(res, session);
  res.json({ user: session.user });
};
export const logout: RequestHandler = async (req, res) => {
  await authService.logout(req.cookies.refresh ?? "");
  res.clearCookie("access", cookie).clearCookie("refresh", cookie).json({ ok: true });
};
export const me: RequestHandler = (req, res) => {
  res.json({ user: safeUser(req.admin!) });
};
export const changePassword: RequestHandler = async (req, res) => {
  const input = passwordInput.parse(req.body);
  await authService.changePassword(req.admin!, input.currentPassword, input.password);
  res.clearCookie("access", cookie).clearCookie("refresh", cookie).json({ ok: true });
};
export const startGoogle: RequestHandler = async (req, res) => {
  const result = await authService.startGoogle(req.admin?.id);
  if (!result) return res.redirect(`${config.PUBLIC_ORIGIN}/admin/login?error=google-unavailable`);
  res.cookie("oauth", result.cookieValue, { ...cookie, maxAge: 600_000 });
  res.redirect(result.url);
};
export const finishGoogle: RequestHandler = async (req, res) => {
  res.clearCookie("oauth", cookie);
  try {
    const result = await authService.finishGoogle(req.cookies.oauth, req.query.state, req.query.code, req.cookies.access);
    if (result.session) setSession(res, result.session);
    res.redirect(`${config.PUBLIC_ORIGIN}${result.destination}`);
  } catch {
    res.redirect(`${config.PUBLIC_ORIGIN}/admin/login?error=google-failed`);
  }
};
