import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("GROQ_API_KEY is not configured.");
}

export const groq = new Groq({
  apiKey,
});

export const groqModel =
  process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";