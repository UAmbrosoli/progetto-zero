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
        {
          error: error.message,
        },
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
          "Errore interno del server.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const role = getRole(request);

    if (role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Solo l'Admin può aggiungere giocatori.",
        },
        { status: 403 }
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
      .insert([
        {
          name: fullName,
          first_name,
          last_name,
          email,
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
          "Errore interno del server.",
      },
      { status: 500 }
    );
  }
}