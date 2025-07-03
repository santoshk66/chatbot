import express from "express";
import cors from "cors";
import "dotenv/config";
import { OpenAI } from "openai";

const app = express();

// CORS configuration (allow all origins for debugging)
app.use(cors({
  origin: "*", // Change to "https://www.maizic.com" in production
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
  console.log("Health check accessed");
  res.send("Maizic Chatbot API is running.");
});

app.post("/chat", async (req, res) => {
  const userInput = req.body.message;
  console.log("Received chat request:", { message: userInput });

  // Validate input
  if (!userInput || typeof userInput !== "string" || userInput.trim() === "") {
    console.error("Invalid input:", userInput);
    return res.status(400).json({ reply: "Please provide a valid message." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Fallback to gpt-3.5-turbo for reliability
      messages: [
        { role: "system", content: "You are a helpful customer care agent for Maizic Smarthome, providing concise and friendly responses about smart home products, warranties, and support." },
        { role: "user", content: userInput.trim() }
      ],
      max_tokens: 150,
      temperature: 0.7 // Ensure consistent responses
    });

    const reply = completion.choices[0].message.content.trim();
    console.log("OpenAI response:", { reply });
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });
    let errorMessage = "Sorry, something went wrong on our server.";
    if (err.response?.status === 401) {
      errorMessage = "Authentication error with OpenAI API. Please contact support.";
    } else if (err.response?.status === 429) {
      errorMessage = "We're experiencing high demand. Please try again later.";
    } else if (err.response?.status === 400) {
      errorMessage = "Invalid request to the AI service.";
    } else if (err.message.includes("network")) {
      errorMessage = "Network issue contacting the AI service.";
    }
    res.status(500).json({ reply: errorMessage });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Environment check:", { OPENAI_API_KEY: !!process.env.OPENAI_API_KEY });
});
