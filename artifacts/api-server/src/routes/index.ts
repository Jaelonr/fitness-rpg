import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playerRouter from "./player";
import nutritionRouter from "./nutrition";
import equipmentRouter from "./equipment";
import trainingRouter from "./training";
import skillsRouter from "./skills";
import questsRouter from "./quests";
import inventoryRouter from "./inventory";
import analyticsRouter from "./analytics";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playerRouter);
router.use(nutritionRouter);
router.use(equipmentRouter);
router.use(trainingRouter);
router.use(skillsRouter);
router.use(questsRouter);
router.use(inventoryRouter);
router.use(analyticsRouter);
router.use(dashboardRouter);

export default router;
