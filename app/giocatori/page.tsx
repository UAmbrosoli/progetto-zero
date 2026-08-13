"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Player } from "@/types/player";
import {
  getPlayers,
  createPlayer,
  deletePlayer,
} from "@/services/players";

export default function Giocatori() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error(
        "Errore nel caricamento dei giocatori:",
        error
      );
    }
  }

  async function addPlayer() {
    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    const email = newEmail.trim();

    if (!firstName || !lastName) {
      alert("Inserisci nome e cognome.");
      return;
    }

    if (!email) {
      alert("Inserisci anche l'email.");
      return;
    }

    try {
      await createPlayer(firstName, lastName, email);

      await loadPlayers();

      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
    } catch (error) {
      console.error(
        "Errore nel salvataggio del giocatore:",
        error
      );

      alert("Errore nel salvataggio.");
    }
  }

  async function removePlayer(id: string, name: string) {
    const conferma = confirm(
      `Vuoi eliminare ${name}?`
    );

    if (!conferma) return;

    try {
      await deletePlayer(id);

      await loadPlayers();
    } catch (error) {
      console.error(
        "Errore durante l'eliminazione:",
        error
      );

      alert("Errore durante l'eliminazione.");
    }
  }

  return (
    <main>
      <header className="players-header">
        <div>
          <p className="eyebrow">PADEL ON TUESDAY</p>

          <h1>Giocatori</h1>

          <p className="players-subtitle">
            Stagione 2026–27
          </p>
        </div>

        <Link
          href="/dashboard"
          className="back-link"
        >
          ← Dashboard
        </Link>
      </header>

      <section className="players-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PARTECIPANTI</p>

            <h2>La rosa del campionato</h2>
          </div>

          <span className="players-count">
            {players.length} giocatori
          </span>
        </div>

        <div className="add-player">
          <input
            type="text"
            value={newFirstName}
            onChange={(event) =>
              setNewFirstName(event.target.value)
            }
            placeholder="Nome"
          />

          <input
            type="text"
            value={newLastName}
            onChange={(event) =>
              setNewLastName(event.target.value)
            }
            placeholder="Cognome"
          />

          <input
            type="email"
            value={newEmail}
            onChange={(event) =>
              setNewEmail(event.target.value)
            }
            placeholder="Email"
          />

          <button
            className="primary-button add-button"
            onClick={addPlayer}
          >
            Aggiungi
            <span>+</span>
          </button>
        </div>

        {players.length === 0 ? (
          <div className="empty-players">
            <div className="empty-icon">👥</div>

            <h3>Nessun giocatore ancora.</h3>

            <p>
              Inserisci i partecipanti al campionato
              per iniziare a costruire la stagione.
            </p>
          </div>
        ) : (
          <div className="players-list">
            {players.map((player, index) => {
              const displayName =
                `${player.first_name} ${player.last_name}`.trim();

              return (
                <div
                  className="player-row"
                  key={player.id}
                >
                  <div className="player-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <strong>{displayName}</strong>

                    <br />

                    <small>{player.email}</small>
                  </div>

                  <button
                    className="remove-button"
                    onClick={() =>
                      removePlayer(
                        player.id,
                        displayName
                      )
                    }
                    aria-label={`Rimuovi ${displayName}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}