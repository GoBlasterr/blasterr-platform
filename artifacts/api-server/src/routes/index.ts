import { Router, type IRouter } from "express";
import healthRouter from "./health";
import socialRouter from "./social";
import storageRouter from "./storage";
import clipsRouter from "./clips";
import advertisingRouter from "./advertising";
import adminRouter from "./admin";
import announcementsRouter from "./announcements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(announcementsRouter);
router.use("/admin", adminRouter);
router.use(socialRouter);
router.use(storageRouter);
router.use(clipsRouter);
router.use(advertisingRouter);

export default router;
