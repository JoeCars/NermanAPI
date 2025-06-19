import { Router, Request, Response } from "express";
import * as pollController from "../controllers/poll";

export const router = Router();

router.get("/:proposalId", pollController.getPollWithProposalId);
