import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter } from "express";
import { DISPATCHER_EMAIL } from "@workspace/dispatcher-config";
import {
  clearDispatcherSession,
  isDispatcherSession,
  isDispatcherSessionConfigured,
  setDispatcherSession,
} from "../lib/dispatcher-session";

const router: IRouter = Router();

function securePasswordMatches(password: string) {
  const configured = process.env.DISPATCHER_PASSWORD ?? "";
  const providedBuffer = Buffer.from(password);
  const configuredBuffer = Buffer.from(configured);
  return (
    configuredBuffer.length > 0 &&
    providedBuffer.length === configuredBuffer.length &&
    timingSafeEqual(providedBuffer, configuredBuffer)
  );
}

router.post("/auth/dispatcher/login", (req, res): void => {
  if (!isDispatcherSessionConfigured()) {
    res.status(503).json({ error: "Dispatcher credentials are not configured" });
    return;
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (email !== DISPATCHER_EMAIL || !securePasswordMatches(password)) {
    res.status(401).json({ error: "Invalid dispatcher credentials" });
    return;
  }

  setDispatcherSession(res);
  res.json({ authenticated: true, email: DISPATCHER_EMAIL });
});

router.get("/auth/dispatcher/session", (req, res): void => {
  res.json({
    authenticated: isDispatcherSession(req),
    email: isDispatcherSession(req) ? DISPATCHER_EMAIL : null,
  });
});

router.post("/auth/dispatcher/logout", (req, res): void => {
  clearDispatcherSession(res);
  res.json({ authenticated: false });
});

export default router;