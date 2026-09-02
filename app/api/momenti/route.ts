import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSession(request: Request) {
  const cookieHeader =
    request.headers.get("cookie") || "";

  const sessionMatch = cookieHeader.match(
    /(?:^|;\s*)padel_session=([^;]+)/
  );

  return sessionMatch
    ? decodeURIComponent(sessionMatch[1])
    : "";
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Variabili Supabase server mancanti."
    );
  }

  return createClient(url, key);
}

export async function GET(request: Request) {
  const session = getSession(request);

  return NextResponse.json({
    admin: session === "admin",
  });
}

export async function PATCH(request: Request) {
  try {
    const session = getSession(request);

    if (session !== "admin") {
      return NextResponse.json(
        {
          error:
            "Solo l'Admin può modificare i momenti memorabili.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const matchId =
      typeof body.match_id === "string"
        ? body.match_id.trim()
        : "";

    const comment =
      typeof body.comment === "string"
        ? body.comment.trim()
        : "";

    if (!matchId) {
      return NextResponse.json(
        {
          error: "Partita non specificata.",
        },
        { status: 400 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        {
          error:
            "Il momento memorabile non può essere vuoto.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const {
      data: existingMoment,
      error: findError,
    } = await supabase
      .from("memorable_moments")
      .select("id")
      .eq("match_id", matchId)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existingMoment) {
      const {
        data,
        error,
      } = await supabase
        .from("memorable_moments")
        .update({
          comment,
        })
        .eq("id", existingMoment.id)
        .select(
          "id, match_id, comment, created_at"
        )
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        action: "updated",
        moment: data,
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("memorable_moments")
      .insert({
        match_id: matchId,
        comment,
      })
      .select(
        "id, match_id, comment, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      action: "created",
      moment: data,
    });
  } catch (error) {
    console.error(
      "ERRORE API MOMENTI:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore nella gestione del momento memorabile.",
      },
      { status: 500 }
    );
  }
}