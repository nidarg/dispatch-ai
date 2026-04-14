import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("emergency_intakes")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase test error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("Supabase test route failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Supabase test failed",
      },
      { status: 500 }
    );
  }
}