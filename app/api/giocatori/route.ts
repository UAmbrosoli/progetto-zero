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
// GET — elenco giocatori
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

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("last_name", {
        ascending: true,
      })
      .order("first_name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "ERRORE GET PLAYERS:",
        error
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "ERRORE API GIOCATORI GET:",
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
// POST — aggiungi giocatore
// Solo Admin
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

    const first_name =
      typeof body.first_name === "string"
        ? body.first_name.trim()
        : "";

    const last_name =
      typeof body.last_name === "string"
        ? body.last_name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : "";

    const is_external =
      body.is_external === true;

    if (!first_name || !last_name) {
      return NextResponse.json(
        {
          error:
            "Nome e cognome sono obbligatori.",
        },
        { status: 400 }
      );
    }

    if (!is_external && !email) {
      return NextResponse.json(
        {
          error:
            "Per un giocatore del gruppo è obbligatoria l'email.",
        },
        { status: 400 }
      );
    }

    const fullName =
      `${first_name} ${last_name}`.trim();

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          name: fullName,
          first_name,
          last_name,
          email,
          is_external,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(
        "ERRORE INSERT PLAYER:",
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
      "ERRORE API GIOCATORI POST:",
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
// PUT — modifica giocatore
// Solo Admin
// =====================================================

// =====================================================
// PUT — modifica giocatore
// Solo Admin
// =====================================================

export async function PUT(request: Request) {
  try {
    const role = getRole(request);

    if (!role) {
      return NextResponse.json(
        { error: "Non autenticato." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Non hai i privilegi per modificare i giocatori.",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID del giocatore mancante.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const first_name =
      typeof body.first_name === "string"
        ? body.first_name.trim()
        : "";

    const last_name =
      typeof body.last_name === "string"
        ? body.last_name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : "";

    const is_external =
      body.is_external === true;

    if (
      !first_name ||
      !last_name ||
      !email
    ) {
      return NextResponse.json(
        {
          error:
            "Nome, cognome ed email sono obbligatori.",
        },
        { status: 400 }
      );
    }

    const fullName =
      `${first_name} ${last_name}`.trim();

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("players")
      .update({
        name: fullName,
        first_name,
        last_name,
        email,
        is_external,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(
        "ERRORE UPDATE PLAYER:",
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
      "ERRORE API GIOCATORI PUT:",
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
// DELETE — elimina giocatore
// Solo Admin
// =====================================================

export async function DELETE(request: Request) {
  try {
    const role = getRole(request);

    if (!role) {
      return NextResponse.json(
        { error: "Non autenticato." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Non hai i privilegi per eliminare i giocatori.",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);

    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID del giocatore mancante.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "ERRORE DELETE PLAYER:",
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

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "ERRORE API GIOCATORI DELETE:",
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