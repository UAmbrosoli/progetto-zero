"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const {
  error: loginError,
} =
  await supabase.auth.signInWithPassword(
    {
      email,
      password,
    }
  );

if (loginError) {
  setError(
    loginError.message
  );
  setLoading(false);
  return;
}

const {
  data: role,
  error: roleError,
} =
  await supabase.rpc(
    "get_my_role"
  );

if (roleError) {
  setError(
    roleError.message
  );
  setLoading(false);
  return;
}

console.log(
  "RUOLO UTENTE:",
  role
);

router.replace("/");
router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Padel On Tuesday
        </h1>

        <p
          style={{
            textAlign: "center",
            marginBottom: 32,
            opacity: 0.7,
          }}
        >
          Accedi al campionato
        </p>

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            autoComplete="email"
            required
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #ccc",
              fontSize: 16,
              boxSizing:
                "border-box",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #ccc",
              fontSize: 16,
              boxSizing:
                "border-box",
            }}
          />

          {error && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {loading
              ? "Accesso..."
              : "Entra"}
          </button>
        </form>
      </div>
    </main>
  );
}