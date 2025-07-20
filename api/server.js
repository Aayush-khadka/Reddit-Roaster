import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import roastRoutes from "../src/routes/roast.routes.js";
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

app.use("/api/v1", roastRoutes);

app.get("/", (req, res) => {
  res.send("Reddit Roaster backend is live 🔥");
});

// ✅ THIS is what Vercel requires:
export default serverless(app);
