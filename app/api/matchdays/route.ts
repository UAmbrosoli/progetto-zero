import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(
    /(?:^|;\s*)padel_session=([^;]+)/
  );

  return sessionMatch
    ? decodeURIComponent(sessionMatch[1])
    : "";
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Variabili Supabase server mancanti.");
  }

  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const session = getSession(request);

    if (session !== "admin") {
      return NextResponse.json(
        { error: "Solo l'Admin può registrare una giornata passata." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const matchDate = String(body.match_date || "").trim();

    if (!matchDate) {
      return NextResponse.json(
        { error: "Data della giornata mancante." },
        { status: 400 }
      );
    }

    const date = new Date(`${matchDate}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Data non valida." },
        { status: 400 }
      );
    }

    const today = new Date();
    const todayString = today.toLocaleDateString("en-CA");

    if (matchDate >= todayString) {
      return NextResponse.json(
        { error: "Puoi registrare solo una giornata passata." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: existingMatchday, error: existingError } =
      await supabase
        .from("matchdays")
        .select("id, match_date")
        .eq("match_date", matchDate)
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingMatchday) {
      return NextResponse.json(
        {
          error:
            "Esiste già una giornata registrata per questa data.",
          id: existingMatchday.id,
        },
        { status: 409 }
      );
    }

    const { data: newMatchday, error: insertError } =
      await supabase
        .from("matchdays")
        .insert({ match_date: matchDate })
        .select("id, match_date")
        .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      id: newMatchday.id,
      match_date: newMatchday.match_date,
    });
  } catch (error) {
    console.error(
      "Errore creazione giornata passata:",
      error
    );

    return NextResponse.json(
      { error: "Impossibile creare la giornata." },
      { status: 500 }
    );
  }
}
