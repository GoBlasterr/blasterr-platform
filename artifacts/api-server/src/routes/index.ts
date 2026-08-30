import { Router, type IRouter } from "express";
import healthRouter from "./health";
import socialRouter from "./social";
import storageRouter from "./storage";
import clipsRouter from "./clips";
import advertisingRouter from "./advertising";

const router: IRouter = Router();

router.use(healthRouter);
router.use(socialRouter);
router.use(storageRouter);
router.use(clipsRouter);
router.use(advertisingRouter);

export default router;
