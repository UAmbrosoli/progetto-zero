"use client";

import {
  FormEvent,
  useState,
} from "react";

export default function AccessiPage() {
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

    try {
      const response =
        await fetch("/api/accessi/invita", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        });

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Non è stato possibile inviare l'invito."
        );
        setLoading(false);
        return;
      }

      setMessage(
        "Invito inviato."
      );

      setEmail("");
    } catch {
      setError(
        "Errore di connessione."
      );
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1.2,
          opacity: 0.6,
        }}
      >
        AMMINISTRAZIONE
      </p>

      <h1
        style={{
          margin: "0 0 8px",
        }}
      >
        Accessi
      </h1>

      <p
        style={{
          margin: "0 0 32px",
          opacity: 0.7,
        }}
      >
        Accredita chi può entrare
        nell'app.
      </p>

      <section
        style={{
          padding: 20,
          borderRadius: 18,
          border: "1px solid #e5e5e5",
        }}
      >
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 20,
          }}
        >
          Accredita un giocatore
        </h2>

        <p
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            opacity: 0.7,
          }}
        >
          Inserisci l'indirizzo email.
          Riceverà un invito per
          creare la propria password.
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
              border:
                "1px solid #ccc",
              fontSize: 16,
              boxSizing:
                "border-box",
            }}
          />

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
              cursor: loading
                ? "default"
                : "pointer",
            }}
          >
            {loading
              ? "Invio..."
              : "Invia invito"}
          </button>
        </form>

        {message && (
          <p
            style={{
              margin:
                "16px 0 0",
              fontSize: 14,
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              margin:
                "16px 0 0",
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