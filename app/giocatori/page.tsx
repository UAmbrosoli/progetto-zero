"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Player } from "@/types/player";
import {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from "@/services/players";

export default function Giocatori() {
  const [players, setPlayers] = useState<Player[]>([]);

  const [newFirstName, setNewFirstName] =
    useState("");
  const [newLastName, setNewLastName] =
    useState("");
  const [newEmail, setNewEmail] =
    useState("");

  const [editingPlayer, setEditingPlayer] =
    useState<Player | null>(null);

  const [editFirstName, setEditFirstName] =
    useState("");
  const [editLastName, setEditLastName] =
    useState("");
  const [editEmail, setEditEmail] =
    useState("");

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
    const firstName =
      newFirstName.trim();
    const lastName =
      newLastName.trim();
    const email =
      newEmail.trim();

    if (!firstName || !lastName) {
      alert("Inserisci nome e cognome.");
      return;
    }

    if (!email) {
      alert("Inserisci anche l'email.");
      return;
    }

    try {
      await createPlayer(
  firstName,
  lastName,
  email,
  true
);

      await loadPlayers();

      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
    } catch (error) {
      console.error(
        "Errore nel salvataggio del giocatore:",
        error
      );

      const message =
        error &&
        typeof error === "object" &&
        "message" in error
          ? String(error.message)
          : String(error);

      const details =
        error &&
        typeof error === "object" &&
        "details" in error
          ? String(error.details)
          : "";

      const code =
        error &&
        typeof error === "object" &&
        "code" in error
          ? String(error.code)
          : "";

      alert(
        `Errore nel salvataggio.\n\n` +
          `Messaggio: ${message}\n` +
          `Codice: ${code}\n` +
          `Dettagli: ${details}`
      );
    }
  }

  function startEditing(player: Player) {
    setEditingPlayer(player);

    setEditFirstName(
      player.first_name ?? ""
    );

    setEditLastName(
      player.last_name ?? ""
    );

    setEditEmail(
      player.email ?? ""
    );
  }

  function cancelEditing() {
    setEditingPlayer(null);
    setEditFirstName("");
    setEditLastName("");
    setEditEmail("");
  }

  async function saveEditedPlayer() {
    if (!editingPlayer) {
      return;
    }

    const firstName =
      editFirstName.trim();
    const lastName =
      editLastName.trim();
    const email =
      editEmail.trim();

    if (!firstName || !lastName) {
      alert("Inserisci nome e cognome.");
      return;
    }

    if (!email) {
      alert("Inserisci anche l'email.");
      return;
    }

    try {
      await updatePlayer(
        editingPlayer.id,
        firstName,
        lastName,
        email
      );

      await loadPlayers();

      cancelEditing();
    } catch (error) {
      console.error(
        "Errore nella modifica del giocatore:",
        error
      );

      const message =
        error &&
        typeof error === "object" &&
        "message" in error
          ? String(error.message)
          : String(error);

      alert(
        `Errore nella modifica.\n\n${message}`
      );
    }
  }

  async function toggleExternal(player: Player) {
    try {
      await updatePlayer(
        player.id,
        player.first_name,
        player.last_name,
        player.email,
        !player.is_external
      );

      await loadPlayers();
    } catch (error) {
      console.error(
        "Errore nella modifica dello stato del giocatore:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Errore nella modifica dello stato del giocatore."
      );
    }
  }

  async function removePlayer(
    id: string,
    name: string
  ) {
    const conferma = confirm(
      `Vuoi eliminare ${name}?`
    );

    if (!conferma) {
      return;
    }

    try {
      await deletePlayer(id);

      await loadPlayers();
    } catch (error) {
      console.error(
        "Errore durante l'eliminazione:",
        error
      );

      const message =
        error &&
        typeof error === "object" &&
        "message" in error
          ? String(error.message)
          : String(error);

      alert(
        `Errore durante l'eliminazione.\n\n${message}`
      );
    }
  }

  return (
    <main>
      <header className="players-header">
        <div>
          <p className="eyebrow">
            PADEL ON TUESDAY
          </p>

          <h1>Giocatori</h1>

          <p className="players-subtitle">
            Stagione 2026–27
          </p>
        </div>
      </header>

      <section className="players-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              PARTECIPANTI
            </p>

            <h2>
              La rosa del campionato
            </h2>
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
              setNewFirstName(
                event.target.value
              )
            }
            placeholder="Nome"
          />

          <input
            type="text"
            value={newLastName}
            onChange={(event) =>
              setNewLastName(
                event.target.value
              )
            }
            placeholder="Cognome"
          />

          <input
            type="email"
            value={newEmail}
            onChange={(event) =>
              setNewEmail(
                event.target.value
              )
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
            <div className="empty-icon">
              👥
            </div>

            <h3>
              Nessun giocatore ancora.
            </h3>

            <p>
              Inserisci i partecipanti al
              campionato per iniziare a
              costruire la stagione.
            </p>
          </div>
        ) : (
          <div className="players-list">
            {players.map(
              (player, index) => {
                const displayName =
                  `${player.first_name ?? ""} ${
                    player.last_name ?? ""
                  }`.trim();

                const isEditing =
                  editingPlayer?.id ===
                  player.id;

                return (
                  <div
                    className="player-row"
                    key={player.id}
                  >
                    <div className="player-number">
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </div>

                    {isEditing ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          gap: 8,
                          flex: 1,
                        }}
                      >
                        <input
                          type="text"
                          value={
                            editFirstName
                          }
                          onChange={(
                            event
                          ) =>
                            setEditFirstName(
                              event.target
                                .value
                            )
                          }
                          placeholder="Nome"
                        />

                        <input
                          type="text"
                          value={
                            editLastName
                          }
                          onChange={(
                            event
                          ) =>
                            setEditLastName(
                              event.target
                                .value
                            )
                          }
                          placeholder="Cognome"
                        />

                        <input
                          type="email"
                          value={
                            editEmail
                          }
                          onChange={(
                            event
                          ) =>
                            setEditEmail(
                              event.target
                                .value
                            )
                          }
                          placeholder="Email"
                        />

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          <button
                            className="primary-button"
                            onClick={
                              saveEditedPlayer
                            }
                          >
                            Salva
                          </button>

                          <button
                            className="remove-button"
                            onClick={
                              cancelEditing
                            }
                            type="button"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            flex: 1,
                          }}
                        >
                          <strong>
                            {displayName}
                          </strong>

                          <br />

                          <small>
                            {player.is_external
                              ? "Ospite"
                              : "Giocatore"}
                          </small>

                          <br />

                          <small>
                            {
                              player.email
                            }
                          </small>
                        </div>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            startEditing(
                              player
                            )
                          }
                          aria-label={`Modifica ${displayName}`}
                        >
                          Modifica
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            toggleExternal(player)
                          }
                        >
                          {player.is_external
                            ? "Rendi giocatore"
                            : "Rendi ospite"}
                        </button>

                        <button
                          type="button"
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
                      </>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}