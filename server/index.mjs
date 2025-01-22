import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.mjs';  // Użyj .mjs, jeśli Twoje pliki są w tym formacie
import messageRoutes from './routes/messages.mjs'; // To samo tutaj
import serverless from 'serverless-http'; // Dodane dla AWS Lambda
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Połączenie z MongoDB
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB Connection Successful"))
  .catch((err) => console.log(err.message));

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Eksport dla AWS Lambda
export const handler = serverless(app); // Zmiana z module.exports na export
