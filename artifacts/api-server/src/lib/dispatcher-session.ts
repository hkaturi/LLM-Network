import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { DISPATCHER_EMAIL } from "@workspace/dispatcher-config";

export const DISPATCHER_SESSION_COOKIE = "llm_dispatcher_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.SESSION_SECRET ?? "";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function sessionValue(email: string, issuedAt: number) {
  return `${email}|${issuedAt}`;
}

function validSignature(value: string, signature: string) {
  const expected = sign(value);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function isDispatcherSessionConfigured() {
  return Boolean(sessionSecret() && process.env.DISPATCHER_PASSWORD);
}

export function isDispatcherSession(req: Request) {
  if (!sessionSecret()) return false;
  const raw = req.cookies?.[DISPATCHER_SESSION_COOKIE];
  if (typeof raw !== "string") return false;

  const [encodedValue, signature] = raw.split(".");
  if (!encodedValue || !signature) return false;

  let value = "";
  try {
    value = Buffer.from(encodedValue, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const [email, issuedAtText] = value.split("|");
  const issuedAt = Number(issuedAtText);
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  return (
    email === DISPATCHER_EMAIL &&
    Number.isInteger(issuedAt) &&
    age >= 0 &&
    age <= SESSION_MAX_AGE_SECONDS &&
    validSignature(value, signature)
  );
}

export function setDispatcherSession(res: Response) {
  const value = sessionValue(DISPATCHER_EMAIL, Math.floor(Date.now() / 1000));
  const encodedValue = Buffer.from(value, "utf8").toString("base64url");
  res.cookie(
    DISPATCHER_SESSION_COOKIE,
    `${encodedValue}.${sign(value)}`,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS * 1000,
      path: "/",
    },
  );
}

export function clearDispatcherSession(res: Response) {
  res.clearCookie(DISPATCHER_SESSION_COOKIE, { path: "/" });
}