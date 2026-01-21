import { Router } from "express";
import {
    enableIntegration,
    disableIntegration,
    getActiveIntegrations,
} from "./team-integration.controller.js";

const router = Router();

router.post("/", enableIntegration);
router.delete("/:integrationId", disableIntegration);
router.get("/", getActiveIntegrations);

export default router;
