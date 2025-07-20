// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import roastRoutes from "./src/routes/roast.routes.js";

// dotenv.config();
// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(express.json());

// app.use(
//   cors({
//     origin: ["https://grillmyreddit.vercel.app", "http://localhost:3000"],
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type"],
//     credentials: false,
//   })
// );

// app.use("/api/v1", roastRoutes);

// app.get("/", (req, res) => {
//   res.send("Reddit Roaster backend is live 🔥");
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import roastRoutes from "../src/routes/roast.routes.js";
import { createServer } from "@vercel/node";

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

export default app;
