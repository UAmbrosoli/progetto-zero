"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/types/player";
import {
  getPlayers,
  createPlayer,
} from "@/services/players";

type Role = "admin" | "player";
type AvailabilityStatus = "present" | "absent";

type Availability = {
  id: string;
  player_id: string;
  match_date: string;
  status: AvailabilityStatus;
  created_at: string;
  updated_at: string;
};

type MatchDay = {
  date: string;
  label: string;
};

function getNextTuesdays(count: number): MatchDay[] {
  const dates: MatchDay[] = [];
  const today = new Date();

  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const daysUntilTuesday =
    (2 - date.getDay() + 7) % 7;

  date.setDate(
    date.getDate() +
      (daysUntilTuesday === 0
        ? 7
        : daysUntilTuesday)
  );

  for (let i = 0; i < count; i++) {
    const current = new Date(date);

    current.setDate(
      date.getDate() + i * 7
    );

    const year = current.getFullYear();
    const month = String(
      current.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      current.getDate()
    ).padStart(2, "0");

    dates.push({
      date: `${year}-${month}-${day}`,
      label: current.toLocaleDateString(
        "it-IT",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
        }
      ),
    });
  }

  return dates;
}

function getPlayerName(player: Player) {
  return (
    `${player.first_name ?? ""} ${
      player.last_name ?? ""
    }`.trim() || player.name
  );
}

export default function Presenze() {
  const matchDays = useMemo(
    () => getNextTuesdays(4),
    []
  );

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [newFirstName, setNewFirstName] =
    useState("");

  const [newLastName, setNewLastName] =
    useState("");

  const [newEmail, setNewEmail] =
    useState("");

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [role, setRole] =
    useState<Role | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [playerData, availabilityResponse] =
        await Promise.all([
          getPlayers(),
          fetch(
            `/api/presenze?dates=${encodeURIComponent(
              matchDays
                .map((day) => day.date)
                .join(",")
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          ),
        ]);

      const result =
        await availabilityResponse.json();

      if (!availabilityResponse.ok) {
        throw new Error(
          result.error ||
            "Errore nel caricamento delle presenze."
        );
      }

      setPlayers(playerData);
      setRole(result.role);
      setAvailability(
        result.availability ?? []
      );

      const savedPlayerId =
        localStorage.getItem(
          "padel_player_id"
        );

      if (
        savedPlayerId &&
        playerData.some(
          (player) =>
            player.id === savedPlayerId
        )
      ) {
        setSelectedPlayerId(
          savedPlayerId
        );
      }
    } catch (error) {
      console.error(
        "Errore nel caricamento delle presenze:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Errore nel caricamento."
      );
    } finally {
      setLoading(false);
    }
  }

  function selectPlayer(
    playerId: string
  ) {
    setSelectedPlayerId(playerId);

    localStorage.setItem(
      "padel_player_id",
      playerId
    );

    setMessage("");
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
        email
      );

      const data = await getPlayers();
      setPlayers(data);

      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
    } catch (error) {
      console.error(
        "Errore nel salvataggio del giocatore:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Errore nel salvataggio del giocatore."
      );
    }
  }

  function getStatus(
    playerId: string,
    date: string
  ): AvailabilityStatus | null {
    const item =
      availability.find(
        (entry) =>
          entry.player_id === playerId &&
          entry.match_date === date
      );

    return item?.status ?? null;
  }

  async function saveAvailability(
    playerId: string,
    date: string,
    status: AvailabilityStatus
  ) {
    const key = `${playerId}-${date}-${status}`;

    try {
      setSaving(key);
      setMessage("");

      const response = await fetch(
        "/api/presenze",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            player_id: playerId,
            match_date: date,
            status,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Errore nel salvataggio."
        );
      }

      setAvailability((current) => {
        const withoutCurrent =
          current.filter(
            (entry) =>
              !(
                entry.player_id === playerId &&
                entry.match_date === date
              )
          );

        return [
          ...withoutCurrent,
          result,
        ];
      });

      setMessage(
        status === "present"
          ? "Presenza registrata."
          : "Assenza registrata."
      );
    } catch (error) {
      console.error(
        "Errore nel salvataggio della presenza:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Errore nel salvataggio."
      );
    } finally {
      setSaving(null);
    }
  }

  function getCount(
    date: string,
    status: AvailabilityStatus
  ) {
    return availability.filter(
      (entry) =>
        entry.match_date === date &&
        entry.status === status
    ).length;
  }

  function getUnansweredCount(
    date: string
  ) {
    return players.filter(
      (player) =>
        !getStatus(player.id, date)
    ).length;
  }

  const selectedPlayer =
    players.find(
      (player) =>
        player.id === selectedPlayerId
    );

  if (loading) {
    return (
      <main>
        <header className="players-header">
          <div>
            <p className="eyebrow">
              PADEL ON TUESDAY
            </p>

            <h1>Presenze</h1>

            <p className="players-subtitle">
              I prossimi quattro martedì
            </p>
          </div>
        </header>

        <section className="players-card">
          <p>Caricamento...</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="players-header">
        <div>
          <p className="eyebrow">
            PADEL ON TUESDAY
          </p>

          <h1>Presenze</h1>

          <p className="players-subtitle">
            I prossimi quattro martedì
          </p>
        </div>
      </header>

      {role !== "admin" && (
        <section className="players-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                CHI SEI?
              </p>

              <h2>
                Scegli il tuo nome
              </h2>
            </div>
          </div>

          <select
            value={selectedPlayerId}
            onChange={(event) =>
              selectPlayer(event.target.value)
            }
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              fontSize: 16,
              background: "white",
            }}
          >
            <option value="">
              Seleziona il tuo nome
            </option>

            {players.map((player) => (
              <option
                key={player.id}
                value={player.id}
              >
                {getPlayerName(player)}
              </option>
            ))}
          </select>

          {selectedPlayer && (
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                opacity: 0.7,
              }}
            >
              Ciao{" "}
              <strong>
                {selectedPlayer.first_name}
              </strong>
              . Qui puoi indicare e modificare la tua
              disponibilità.
            </p>
          )}
        </section>
      )}

      <>
        <section className="players-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                SITUAZIONE
              </p>

              <h2>
                Le prossime giornate
              </h2>
            </div>

            <span className="players-count">
              {players.length} giocatori
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {matchDays.map((day) => {
              const presentCount =
                getCount(
                  day.date,
                  "present"
                );

              const absentCount =
                getCount(
                  day.date,
                  "absent"
                );

              const unansweredCount =
                getUnansweredCount(
                  day.date
                );

              return (
                <div
                  key={day.date}
                  style={{
                    border:
                      "1px solid #e5e5e5",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <strong
                    style={{
                      textTransform:
                        "capitalize",
                    }}
                  >
                    {day.label}
                  </strong>

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 10,
                      marginBottom: 14,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <span>
                      <strong>
                        {presentCount}
                      </strong>{" "}
                      sì
                    </span>

                    <span>
                      <strong>
                        {absentCount}
                      </strong>{" "}
                      no
                    </span>

                    <span>
                      <strong>
                        {unansweredCount}
                      </strong>{" "}
                      da rispondere
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 8,
                    }}
                  >
                    {players.map(
                      (player) => {
                        const status =
                          getStatus(
                            player.id,
                            day.date
                          );

                        return (
                          <div
                            key={
                              player.id
                            }
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              gap: 10,
                            }}
                          >
                            <span>
                              {getPlayerName(
                                player
                              )}
                            </span>

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  minWidth: 18,
                                  textAlign:
                                    "center",
                                  fontWeight: 700,
                                }}
                              >
                                {status ===
                                "present"
                                  ? "✓"
                                  : status ===
                                    "absent"
                                  ? "✕"
                                  : "—"}
                              </span>

                              {(role === "admin" ||
                                player.id ===
                                  selectedPlayerId) && (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap: 6,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="primary-button"
                                    disabled={
                                      saving !==
                                      null
                                    }
                                    onClick={() =>
                                      saveAvailability(
                                        player.id,
                                        day.date,
                                        "present"
                                      )
                                    }
                                    style={{
                                      opacity:
                                        status ===
                                        "present"
                                          ? 1
                                          : 0.55,
                                      padding:
                                        "6px 10px",
                                      fontSize:
                                        12,
                                    }}
                                  >
                                    ✓
                                  </button>

                                  <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={
                                      saving !==
                                      null
                                    }
                                    onClick={() =>
                                      saveAvailability(
                                        player.id,
                                        day.date,
                                        "absent"
                                      )
                                    }
                                    style={{
                                      opacity:
                                        status ===
                                        "absent"
                                          ? 1
                                          : 0.55,
                                      padding:
                                        "6px 10px",
                                      fontSize:
                                        12,
                                    }}
                                  >
                                    X
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="players-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                NUOVO GIOCATORE
              </p>

              <h2>
                Aggiungi giocatore
              </h2>
            </div>
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
        </section>

        {message && (
          <section className="players-card">
            <p>{message}</p>
          </section>
        )}
      </>
    </main>
  );
}
