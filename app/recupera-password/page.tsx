"use client";

import {
  FormEvent,
  useState,
} from "react";

import { supabase } from "@/utils/supabase/client";

export default function RecuperaPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${window.location.origin}/auth/callback`,
        }
      );

    if (resetError) {
      setError(
        resetError.message
      );
      setLoading(false);
      return;
    }

    setMessage(
      "Se l'indirizzo è registrato, riceverai una email per reimpostare la password."
    );

    setLoading(false);
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
          Recupera la tua password
        </p>

        <form
          onSubmit={handleSubmit}
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
              boxSizing: "border-box",
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

          {message && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
              }}
            >
              {message}
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
              ? "Invio..."
              : "Invia email"}
          </button>
        </form>
      </div>
    </main>
  );
}
