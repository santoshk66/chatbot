import express from "express";
import cors from "cors";
import "dotenv/config";
import { OpenAI } from "openai";
import rateLimit from "express-rate-limit";

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? "https://www.maizic.com" : "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Validate environment variables
const requiredEnvVars = ["OPENAI_API_KEY"];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`ERROR: Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Test OpenAI API key validity
async function testOpenAIKey() {
  try {
    console.log("Testing OpenAI API key");
    await openai.models.list(); // Simple API call to verify key
    console.log("OpenAI API key is valid");
    return true;
  } catch (err) {
    console.error("OpenAI API key validation failed:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data || "No additional data"
    });
    return false;
  }
}

// Debug endpoint
app.get("/debug", async (req, res) => {
  console.log("Debug endpoint accessed", { clientIp: req.ip, headers: req.headers });
  const isOpenAIKeyValid = await testOpenAIKey();
  res.json({
    status: "running",
    timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    environment: {
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: process.env.PORT || 3000,
      OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY
    },
    openai: {
      apiKeyConfigured: !!openai.apiKey,
      apiKeyValid: isOpenAIKeyValid,
      model: "gpt-3.5-turbo"
    }
  });
});

app.get("/", (req, res) => {
  console.log("Health check accessed", { clientIp: req.ip });
  res.send("Maizic Chatbot API is running.");
});

app.post("/chat", async (req, res) => {
  const userInput = req.body.message;
  console.log("Received chat request:", {
    message: userInput,
    clientIp: req.ip,
    headers: req.headers,
    body: req.body
  });

  // Validate input
  if (!userInput || typeof userInput !== "string" || userInput.trim() === "") {
    console.error("Invalid input:", userInput);
    return res.status(400).json({ reply: "Please provide a valid message." });
  }

  // Check OpenAI API key
  const isOpenAIKeyValid = await testOpenAIKey();
  if (!isOpenAIKeyValid) {
    console.error("Invalid OpenAI API key");
    return res.status(500).json({
      reply: "Server configuration error: Invalid OpenAI API key.",
      errorDetails: { message: "Invalid OpenAI API key" }
    });
  }

  try {
    console.log("Sending request to OpenAI API", { model: "gpt-3.5-turbo", message: userInput });
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful customer care agent for Maizic Smarthome, providing concise and friendly responses about smart home products, warranties, and support." },
        { role: "user", content: userInput.trim() }
      ],
      max_tokens: 150,
      temperature: 0.7
    }).catch(async (err) => {
      // Fallback to gpt-4o-mini if gpt-3.5-turbo fails
      if (err.message.includes("model")) {
        console.log("Falling back to gpt-4o-mini");
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful customer care agent for Maizic Smarthome, providing concise and friendly responses about smart home products, warranties, and support." },
            { role: "user", content: userInput.trim() }
          ],
          max_tokens: 150,
          temperature: 0.7
        });
      }
      throw err;
    });

    const reply = completion.choices[0].message.content.trim();
    console.log("OpenAI response:", { reply, usage: completion.usage });
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data || "No additional data",
      stack: err.stack
    });
    let errorMessage = "Sorry, something went wrong on our server.";
    if (err.response?.status === 401) {
      errorMessage = "Authentication error: Invalid OpenAI API key.";
    } else if (err.response?.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (err.response?.status === 400) {
      errorMessage = "Invalid request to OpenAI. Please try a different message.";
    } else if (err.message.includes("network")) {
      errorMessage = "Network issue contacting OpenAI.";
    } else if (err.message.includes("model")) {
      errorMessage = "Requested AI model is unavailable.";
    }
    res.status(500).json({
      reply: errorMessage,
      errorDetails: {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data || "No additional data"
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Environment check:", {
    NODE_ENV: process.env.NODE_ENV || "development",
    OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
    PORT
  });
  // Test OpenAI key on startup
  testOpenAIKey();
});
