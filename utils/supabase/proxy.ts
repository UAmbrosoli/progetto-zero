import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const session =
    request.cookies.get("padel_session")?.value;

  const isLoginPage =
    pathname === "/login";

  const isLoginApi =
    pathname === "/api/login";

  // Login e API di login devono essere accessibili
  // anche quando non esiste ancora una sessione.
  if (
    !session &&
    !isLoginPage &&
    !isLoginApi
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    return NextResponse.redirect(loginUrl);
  }

  // Se già autenticato, non serve tornare al login.
  if (
    session &&
    isLoginPage
  ) {
    const homeUrl =
      request.nextUrl.clone();

    homeUrl.pathname = "/";
    homeUrl.search = "";

    return NextResponse.redirect(homeUrl);
  }

  // Solo l'admin può accedere ad Accessi.
  if (
    pathname.startsWith("/accessi") &&
    session !== "admin"
  ) {
    const homeUrl =
      request.nextUrl.clone();

    homeUrl.pathname = "/";
    homeUrl.search = "";

    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}