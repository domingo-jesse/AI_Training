import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import organizationsRouter from "./organizations";
import modulesRouter from "./modules";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(organizationsRouter);
router.use(modulesRouter);

export default router;
