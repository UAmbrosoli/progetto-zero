import { NextResponse } from "next/server";

type Role = "admin" | "player";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const passphrase =
      typeof body.passphrase === "string"
        ? body.passphrase
        : "";

    let role: Role | null = null;

    if (
      passphrase ===
      process.env.ADMIN_PASSPHRASE
    ) {
      role = "admin";
    } else if (
      passphrase ===
      process.env.PLAYER_PASSPHRASE
    ) {
      role = "player";
    }

    if (!role) {
      return NextResponse.json(
        {
          error:
            "Parola d'ordine non valida.",
        },
        { status: 401 }
      );
    }

    const response =
      NextResponse.json({
        success: true,
        role,
      });

    response.cookies.set(
      "padel_session",
      role,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "ERRORE LOGIN:",
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