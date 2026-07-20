import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import organizationsRouter from "./organizations";
import modulesRouter from "./modules";
import assignmentsRouter from "./assignments";
import attemptsRouter from "./attempts";
import adminUsersRouter from "./adminUsers";
import groupsRouter from "./groups";
import settingsRouter from "./settings";
import ownerRouter from "./owner";
import deepgramRouter from "./deepgram";
import conversationRouter from "./conversation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(organizationsRouter);
router.use(modulesRouter);
router.use(assignmentsRouter);
router.use(attemptsRouter);
router.use(adminUsersRouter);
router.use(groupsRouter);
router.use(settingsRouter);
router.use(ownerRouter);
router.use(deepgramRouter);
router.use(conversationRouter);

export default router;
