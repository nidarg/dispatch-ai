import OpenAI from "openai";

const key = process.env.OPENAI_API_KEY;

// console.log("OPENAI key exists:", !!key);
// console.log("OPENAI key prefix:", key ? key.slice(0, 12) : "missing");
// console.log("OPENAI key length:", key?.length ?? 0);

export const openai = new OpenAI({
  apiKey: key,
});