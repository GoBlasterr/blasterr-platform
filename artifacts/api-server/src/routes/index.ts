import { Router, type IRouter } from "express";
import healthRouter from "./health";
import socialRouter from "./social";
import adminAuthRouter from "./admin-auth";
import storageRouter from "./storage";
import clipsRouter from "./clips";
import advertisingRouter from "./advertising";
import adminRouter from "./admin";
import announcementsRouter from "./announcements";
import cmsRouter from "./cms";
import appealsRouter from "./appeals";
import localizationRouter from "./localization";

const router: IRouter = Router();
router.use("/admin-auth", adminAuthRouter);

router.use(healthRouter);
router.use(localizationRouter);
router.use(announcementsRouter);
router.use("/admin", adminRouter);
router.use(appealsRouter);
router.use(socialRouter);
router.use(storageRouter);
router.use(clipsRouter);
router.use(advertisingRouter);
router.use("/cms", cmsRouter);

export default router;
