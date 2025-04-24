import express from "express";
import cors from "cors";
import { PORT } from "../config";
import {
  handleSendChannelMessage,
  handleSendDirectMessage,
  handleVerificationContext,
  handleVerifyWallet,
} from "./routes";

export function setupAPI() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/verification-context", handleVerificationContext);
  app.post("/api/verify-wallet", handleVerifyWallet);
  app.post("/api/send-channel-message", handleSendChannelMessage);
  app.post("/api/send-direct-message", handleSendDirectMessage);

  app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
  });

  return app;
}
