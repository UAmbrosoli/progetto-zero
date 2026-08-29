import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set("padel_session", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax",
    path: "/",
  });

  return response;
}