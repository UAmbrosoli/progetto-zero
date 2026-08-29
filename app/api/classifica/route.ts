import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const cookieHeader =
      request.headers.get("cookie") || "";

    const sessionMatch =
      cookieHeader.match(
        /(?:^|;\s*)padel_session=([^;]+)/
      );

    const session = sessionMatch
      ? decodeURIComponent(sessionMatch[1])
      : "";

    if (
      session !== "admin" &&
      session !== "player"
    ) {
      return NextResponse.json(
        {
          error: "Non autenticato.",
        },
        { status: 401 }
      );
    }

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error(
        "Variabili Supabase server mancanti."
      );
    }

    const supabase = createClient(
      url,
      key
    );

    const [
      playersResult,
      matchesResult,
      matchPlayersResult,
      setsResult,
    ] = await Promise.all([
      supabase
        .from("players")
        .select(
          "id, name, first_name, last_name"
        ),

      supabase
        .from("matches")
        .select("id, court"),

      supabase
        .from("match_players")
        .select(
          "match_id, player_id, team"
        ),

      supabase
        .from("match_sets")
        .select(
          "match_id, set_number, team1_score, team2_score"
        ),
    ]);

    if (playersResult.error) {
      throw playersResult.error;
    }

    if (matchesResult.error) {
      throw matchesResult.error;
    }

    if (matchPlayersResult.error) {
      throw matchPlayersResult.error;
    }

    if (setsResult.error) {
      throw setsResult.error;
    }

    return NextResponse.json({
      players:
        playersResult.data ?? [],

      matches:
        matchesResult.data ?? [],

      matchPlayers:
        matchPlayersResult.data ?? [],

      sets:
        setsResult.data ?? [],
    });
  } catch (error) {
    console.error(
      "ERRORE API CLASSIFICA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore nel caricamento della classifica.",
      },
      { status: 500 }
    );
  }
}