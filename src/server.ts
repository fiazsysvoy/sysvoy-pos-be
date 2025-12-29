import express from "express";
import "dotenv/config";
import routes from "./routes.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use("/api", routes);

// sample get route
app.get("/", (req, res) => {
  console.log("Root route accessed");
  res.send("Welcome to the POS Backend API");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
