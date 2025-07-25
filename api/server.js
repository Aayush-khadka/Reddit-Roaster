import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Fix the import path - remove 'routes/' from the path
import roastRoutes from "./src/roast.routes.js";

import serverless from "serverless-http";

dotenv.config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ["https://grillmyreddit.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

// Mount roast routes
app.use("/api/v1", roastRoutes);

// Health check or test route
app.get("/", (req, res) => {
  res.send("Reddit Roaster backend is live 🔥");
});

export default serverless(app);
