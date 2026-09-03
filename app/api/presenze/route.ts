import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role = "admin" | "player";

function getRole(request: Request): Role | null {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(
    /(?:^|;\s*)padel_session=([^;]+)/
  );

  if (!match) {
    return null;
  }

  const role = decodeURIComponent(match[1]);

  if (role === "admin" || role === "player") {
    return role;
  }

  return null;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Variabili Supabase server mancanti."
    );
  }

  return createClient(url, key);
}

// =====================================================
// GET — legge le presenze
// =====================================================

export async function GET(request: Request) {
  try {
    const role = getRole(request);

    if (!role) {
      return NextResponse.json(
        { error: "Non autenticato." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const dates = url.searchParams.get("dates");

    if (!dates) {
      return NextResponse.json(
        {
          error: "Nessuna data specificata.",
        },
        { status: 400 }
      );
    }

    const matchDates = dates
      .split(",")
      .map((date) => date.trim())
      .filter(Boolean);

    if (matchDates.length === 0) {
      return NextResponse.json(
        {
          error: "Nessuna data valida.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("player_availability")
      .select(
        "id, player_id, match_date, status, created_at, updated_at"
      )
      .in("match_date", matchDates)
      .order("match_date", {
        ascending: true,
      });

    if (error) {
  console.error("ERRORE GET PRESENZE:", error.message);
  console.error("DETTAGLI:", error.details);
  console.error("HINT:", error.hint);
  console.error("CODICE:", error.code);

  return NextResponse.json(
    {
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      role,
      availability: data ?? [],
    });
  } catch (error) {
    console.error(
      "ERRORE API PRESENZE GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore interno del server.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST — salva / aggiorna una presenza
// =====================================================

export async function POST(request: Request) {
  try {
    const role = getRole(request);

    if (!role) {
      return NextResponse.json(
        { error: "Non autenticato." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const player_id =
      typeof body.player_id === "string"
        ? body.player_id.trim()
        : "";

    const match_date =
      typeof body.match_date === "string"
        ? body.match_date.trim()
        : "";

    const status =
      typeof body.status === "string"
        ? body.status.trim()
        : "";

    if (!player_id || !match_date || !status) {
      return NextResponse.json(
        {
          error:
            "Giocatore, data e stato sono obbligatori.",
        },
        { status: 400 }
      );
    }

    if (
      status !== "present" &&
      status !== "absent"
    ) {
      return NextResponse.json(
        {
          error: "Stato non valido.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("player_availability")
      .upsert(
        {
          player_id,
          match_date,
          status,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "player_id,match_date",
        }
      )
      .select()
      .single();

    if (error) {
      console.error(
        "ERRORE UPSERT PRESENZA:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "ERRORE API PRESENZE POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore interno del server.",
      },
      { status: 500 }
    );
  }
}