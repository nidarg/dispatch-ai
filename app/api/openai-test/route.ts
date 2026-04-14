import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function GET() {
  try {
    const result = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: "Reply only with OK",
    });

    return NextResponse.json({
      ok: true,
      output: result.output_text,
    });
  } catch (error) {
    console.error("OpenAI test route failed:", error);

    return NextResponse.json(
      { ok: false, error: "OpenAI request failed" },
      { status: 500 }
    );
  }
}