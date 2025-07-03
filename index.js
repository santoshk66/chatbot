import express from "express";
import cors from "cors";
import "dotenv/config";
import { OpenAI } from "openai";

const app = express();

// CORS configuration (allow all origins for debugging, restrict in production)
app.use(cors({
  origin: "*", // Change to "https://www.maizic.com" in production
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
  console.log("Health check accessed");
  res.send("Maizic Chatbot API is running.");
});

app.post("/chat", async (req, res) => {
  const userInput = req.body.message;
  console.log("Received chat request:", { message: userInput });

  if (!userInput || typeof userInput !== "string") {
    console.error("Invalid input:", userInput);
    return res.status(400).json({ reply: "Invalid or missing message" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use gpt-3.5-turbo for better availability
      messages: [
        { role: "system", content: "You are a helpful customer care agent for Maizic Smarthome, providing concise and friendly responses about smart home products, warranties, and support." },
        { role: "user", content: userInput }
      ],
      max_tokens: 150 // Limit response length
    });

    const reply = completion.choices[0].message.content;
    console.log("OpenAI response:", reply);
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", err.message, err.response?.data);
    let errorMessage = "Sorry, something went wrong.";
    if (err.response?.status === 401) {
      errorMessage = "Authentication error with OpenAI API.";
    } else if (err.response?.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (err.response?.status === 400) {
      errorMessage = "Invalid request to OpenAI API.";
    }
    res.status(500).json({ reply: errorMessage });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
