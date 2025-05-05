require('dotenv').config();
const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const detectIntent = require('./intents');
const responses = require('./responses.json');

const app = express();
app.use(express.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

app.post('/chat', async (req, res) => {
  const userInput = req.body.message;
  const intent = detectIntent(userInput);

  if (intent && responses[intent]) {
    return res.json({ reply: responses[intent] });
  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful customer care agent for Maizic Smarthome. Provide polite, accurate, and helpful responses." },
        { role: "user", content: userInput }
      ]
    });

    const reply = completion.data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error("Error from OpenAI:", error);
    res.json({ reply: responses["notfound"] });
  }
});

app.listen(3000, () => console.log('Maizic chatbot running on http://localhost:3000'));