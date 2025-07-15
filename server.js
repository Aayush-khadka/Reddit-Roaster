import express from "express";
import dotenv from "dotenv";
// import { generateRoast } from "./src/Controllers/roast.controller.js";
import roastRoutes from "./src/routes/roast.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT;

app.use("/", roastRoutes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
