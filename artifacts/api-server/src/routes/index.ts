import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import organizationsRouter from "./organizations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(organizationsRouter);

export default router;
