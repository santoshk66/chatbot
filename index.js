import express from "express";
import "dotenv/config";
import { OpenAI } from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.send("Maizic Chatbot API is running.");
});

app.post("/chat", async (req, res) => {
  const userInput = req.body.message;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful customer care agent for Maizic Smarthome." },
        { role: "user", content: userInput }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).json({ reply: "Sorry, something went wrong." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
