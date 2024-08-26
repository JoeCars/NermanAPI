import { Router } from "express";
import * as indexControllers from "../controllers/index";

export const router = Router();

router.get("/", indexControllers.getNouncillors);
router.get("/:discordId", indexControllers.getNouncillorByDiscordId);
