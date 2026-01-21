import express from "express";
import "dotenv/config";
import routes from "./routes.js";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

export const AdminToken = process.env.ADMIN_TOKEN || "ndamndmansmn"; // TODO: Will be moved to environment variables

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use("/api", routes);
app.use(errorHandler);

// sample get route
app.get("/", (req, res) => {
  console.log("Root route accessed");
  res.send("Welcome to the POS Backend API");
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
