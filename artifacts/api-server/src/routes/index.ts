import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workerRouter from "./worker";
import adminRouter from "./admin";
import storageRouter from "./storage";
import dispatcherAuthRouter from "./dispatcher-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workerRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(dispatcherAuthRouter);

export default router;
