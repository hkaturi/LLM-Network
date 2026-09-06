import type { RequestHandler } from "express";
import { isDispatcherSession } from "../lib/dispatcher-session";

export const requireDispatcher: RequestHandler = async (req, res, next) => {
  if (!isDispatcherSession(req)) {
    res.status(401).json({ error: "Dispatcher authentication required" });
    return;
  }

  next();
};