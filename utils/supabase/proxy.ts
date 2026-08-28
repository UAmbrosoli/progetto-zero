
import {
  createServerClient,
} from "@supabase/ssr";

import { NextResponse } from "next/server";

import type {
  NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  const publicPaths = [
    "/login",
    "/auth/callback",
    "/auth/confirm",
    "/imposta-password",
    "/recupera-password",
  ];

  const isPublicPath =
    publicPaths.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(
          `${path}/`
        )
    );

  if (!user && !isPublicPath) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    return NextResponse.redirect(
      loginUrl
    );
  }

  if (
    user &&
    pathname.startsWith("/accessi")
  ) {
    const {
      data: role,
    } = await supabase.rpc(
      "get_my_role"
    );

    if (role !== "admin") {
      const homeUrl =
        request.nextUrl.clone();

      homeUrl.pathname = "/";
      homeUrl.search = "";

      return NextResponse.redirect(
        homeUrl
      );
    }
  }

  return response;
}