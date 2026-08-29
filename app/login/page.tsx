"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passphrase }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Parola d'ordine non valida.");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Errore di connessione.");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            opacity: 0.6,
          }}
        >
          PADEL ON TUESDAY
        </p>

        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 34,
          }}
        >
          Bentornato.
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            opacity: 0.7,
          }}
        >
          Inserisci la parola d'ordine.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <input
            type="password"
            value={passphrase}
            onChange={(event) =>
              setPassphrase(event.target.value)
            }
            placeholder="Parola d'ordine"
            autoComplete="current-password"
            autoFocus
            required
            style={{
              width: "100%",
              padding: "15px 16px",
              borderRadius: 14,
              border: "1px solid #ccc",
              fontSize: 17,
              boxSizing: "border-box",
              textAlign: "center",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px 16px",
              borderRadius: 14,
              border: "none",
              fontSize: 17,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Accesso..." : "Entra"}
          </button>
        </form>

        {error && (
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 14,
            }}
          >
            {error}
          </p>
        )}
      </section>
    </main>
  );
}