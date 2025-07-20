import express, { Router } from "express";
import { generateRoast } from "../Controllers/roast.controller.js";

const router = express.Router();

router.post("/roast/:username", generateRoast);

export default router;
