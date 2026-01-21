import { Router } from "express";
import {
    createIntegration,
    updateIntegration,
    deleteIntegration,
    getAllIntegrations,
} from "./integration.controller.js";

const router = Router();

router.post("/", createIntegration);
router.patch("/:id", updateIntegration);
router.delete("/:id", deleteIntegration);
router.get("/", getAllIntegrations);

export default router;
