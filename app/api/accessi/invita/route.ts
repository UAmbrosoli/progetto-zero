import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type AppRole = "player" | "organizer";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non autenticato." },
        { status: 401 }
      );
    }

    const {
      data: currentRole,
      error: roleError,
    } = await supabase.rpc("get_my_role");

    if (
      roleError ||
      currentRole !== "admin"
    ) {
      return NextResponse.json(
        { error: "Non autorizzato." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const role = body.role;

    if (!email) {
      return NextResponse.json(
        { error: "Email obbligatoria." },
        { status: 400 }
      );
    }

    if (
      role !== "player" &&
      role !== "organizer"
    ) {
      return NextResponse.json(
        { error: "Ruolo non valido." },
        { status: 400 }
      );
    }

    console.log(
      "SECRET:",
      process.env.SUPABASE_SECRET_KEY?.slice(0, 12)
    );

    const adminSupabase =
      createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!
      );

    const {
      data: invitedUser,
      error: inviteError,
    } =
      await adminSupabase.auth.admin.inviteUserByEmail(
        email,
        {
        redirectTo:
  "https://progetto-zero.vercel.app/auth/callback",
        }
      );

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    if (!invitedUser.user) {
      return NextResponse.json(
        {
          error:
            "Utente invitato ma non creato correttamente.",
        },
        { status: 500 }
      );
    }

    const {
      error: insertRoleError,
    } =
      await adminSupabase
        .from("user_roles")
        .insert({
          user_id: invitedUser.user.id,
          role,
        });

    if (insertRoleError) {
      await adminSupabase.auth.admin.deleteUser(
        invitedUser.user.id
      );

      return NextResponse.json(
        {
          error:
            "Impossibile assegnare il ruolo all'utente.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      role,
    });
  } catch (error) {
    console.error(
      "ERRORE INVITO:",
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