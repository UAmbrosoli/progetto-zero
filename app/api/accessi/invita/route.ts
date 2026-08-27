import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    const { data: role, error: roleError } =
      await supabase.rpc("get_my_role");

    if (roleError || role !== "admin") {
      return NextResponse.json(
        { error: "Non autorizzato." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email obbligatoria." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo:
            `${request.headers.get("origin")}/auth/callback`,
        }
      );

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Errore interno del server." },
      { status: 500 }
    );
  }
}