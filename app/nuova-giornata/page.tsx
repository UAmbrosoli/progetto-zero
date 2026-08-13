"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

type Player = {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type Court = {
  id: string;
  players: [
    string | null,
    string | null,
    string | null,
    string | null
  ];
  sets: {
    team1: string;
    team2: string;
  }[];
  comment: string;
};

const createSets = () => [
  { team1: "", team2: "" },
  { team1: "", team2: "" },
  { team1: "", team2: "" },
];

export default function NuovaGiornata() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentPlayers, setPresentPlayers] = useState<string[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("players")
      .select("id, name, first_name, last_name, email");

    if (error) {
      console.error(error);
      setMessage("Non riesco a caricare i giocatori.");
    } else {
      const sortedPlayers = (data ?? []).sort((a, b) => {
        const lastA = a.last_name || a.name || "";
        const lastB = b.last_name || b.name || "";

        return lastA.localeCompare(lastB, "it");
      });

      setPlayers(sortedPlayers);
    }

    setLoading(false);
  }

  function displayPlayerName(player: Player) {
    if (player.last_name && player.first_name) {
      return `${player.last_name} ${player.first_name}`;
    }

    return player.name;
  }

  const assignedPlayerIds = useMemo(
    () =>
      courts
        .flatMap((court) => court.players)
        .filter((id): id is string => Boolean(id)),
    [courts]
  );

  function togglePresent(playerId: string) {
    setMessage("");

    setPresentPlayers((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      if (current.length >= 8) {
        return current;
      }

      return [...current, playerId];
    });
  }

  function playerName(id: string | null) {
    if (!id) return "";

    const player = players.find(
      (player) => player.id === id
    );

    return player ? displayPlayerName(player) : "";
  }

  function availablePlayers(currentId: string | null) {
  return players.filter(
    (player) =>
      presentPlayers.includes(player.id) &&
      (player.id === currentId ||
        !assignedPlayerIds.includes(player.id))
  );
}

function createCourtsForPresentPlayers() {
  if (presentPlayers.length === 4) {
    setCourts([
      {
        id: `court-${Date.now()}`,
        players: [null, null, null, null],
        sets: createSets(),
        comment: "",
      },
    ]);
  }

  if (presentPlayers.length === 8) {
    setCourts([
      {
        id: `court-${Date.now()}-1`,
        players: [null, null, null, null],
        sets: createSets(),
        comment: "",
      },
      {
        id: `court-${Date.now()}-2`,
        players: [null, null, null, null],
        sets: createSets(),
        comment: "",
      },
    ]);
  }
}

useEffect(() => {
  createCourtsForPresentPlayers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [presentPlayers.length]);

function setCourtPlayer(
  courtId: string,
  slotIndex: number,
  playerId: string
) {
  setCourts((current) =>
      current.map((court) => {
        if (court.id !== courtId) return court;

        const updated = [...court.players] as [
          string | null,
          string | null,
          string | null,
          string | null
        ];

        updated[slotIndex] = playerId || null;

        return {
          ...court,
          players: updated,
        };
      })
    );

    setMessage("");
  }

  function updateSet(
    courtId: string,
    setIndex: number,
    team: "team1" | "team2",
    value: string
  ) {
   setCourts((current) =>
  current.map((court) => {
    if (court.id !== courtId) return court;

    return {
      ...court,
      sets: court.sets.map((set, index) =>
        index === setIndex
          ? { ...set, [team]: value }
          : set
      ),
    };
  })
);
}

function proposePairs() {
  if (
    presentPlayers.length !== 4 &&
    presentPlayers.length !== 8
  ) {
    setMessage(
      "Seleziona esattamente 4 oppure 8 giocatori presenti."
    );
    return;
  }

  const shuffled = [...presentPlayers].sort(
    () => Math.random() - 0.5
  );

  const newCourts: Court[] = [];

  for (
    let i = 0;
    i < shuffled.length;
    i += 4
  ) {
    newCourts.push({
      id: `court-${Date.now()}-${i}`,
      players: [
        shuffled[i],
        shuffled[i + 1],
        shuffled[i + 2],
        shuffled[i + 3],
      ],
      sets: createSets(),
      comment: "",
    });
  }

  setCourts(newCourts);

  setMessage(
    "Ho proposto una nuova composizione delle coppie."
  );
}

async function addPlayer() {
  const firstName = newFirstName.trim();
  const lastName = newLastName.trim();
  const email = newEmail.trim();

  if (!firstName) {
    setMessage("Inserisci il nome del giocatore.");
    return;
  }

  if (!lastName) {
    setMessage("Inserisci il cognome del giocatore.");
    return;
  }

  setAddingPlayer(true);
  setMessage("");

  const fullName = `${firstName} ${lastName}`;

  const { data, error } = await supabase
    .from("players")
    .insert({
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
    })
    .select(
      "id, name, first_name, last_name, email"
    )
    .single();

  if (error) {
    console.error(error);
    setMessage(error.message);
    setAddingPlayer(false);
    return;
  }

  if (data) {
    setPlayers((current) =>
      [...current, data].sort((a, b) => {
        const lastA =
          a.last_name || a.name || "";

        const lastB =
          b.last_name || b.name || "";

        return lastA.localeCompare(lastB, "it");
      })
    );
  }

  setNewFirstName("");
  setNewLastName("");
  setNewEmail("");
  setShowAddPlayer(false);
  setAddingPlayer(false);
  setMessage("Giocatore aggiunto.");
}

function validateBeforeSave() {
  if (
    presentPlayers.length !== 4 &&
    presentPlayers.length !== 8
  ) {
    return "Devi selezionare esattamente 4 oppure 8 giocatori.";
  }

  if (courts.length === 0) {
    return "Non ci sono partite da salvare.";
  }

  for (let i = 0; i < courts.length; i++) {
    const court = courts[i];

    if (court.players.some((player) => !player)) {
      return `Completa tutti i giocatori del Campo ${
        i + 1
      }.`;
    }

    const hasAnySet = court.sets.some(
      (set) =>
        set.team1 !== "" ||
        set.team2 !== ""
    );

    if (!hasAnySet) {
      return `Inserisci almeno un set per il Campo ${
        i + 1
      }.`;
    }

    for (
      let j = 0;
      j < court.sets.length;
      j++
    ) {
      const set = court.sets[j];

      if (
        (set.team1 === "" &&
          set.team2 !== "") ||
        (set.team1 !== "" &&
          set.team2 === "")
      ) {
        return `Il Set ${j + 1} del Campo ${
          i + 1
        } è incompleto.`;
      }
    }
  }

  return null;
}

  async function saveMatchday() {
  const validationError = validateBeforeSave();

  if (validationError) {
    setMessage(validationError);
    return;
  }

  setSaving(true);
  setMessage("");

  try {
    const {
      data: matchday,
      error: matchdayError,
    } = await supabase
      .from("matchdays")
      .insert({
        match_date: new Date().toLocaleDateString(
          "en-CA"
        ),
      })
      .select("id")
      .single();

    if (matchdayError || !matchday) {
      throw new Error(
        matchdayError?.message ||
          "Impossibile creare la giornata."
      );
    }

      for (const [index, court] of courts.entries()) {
        const [
          player1,
          player2,
          player3,
          player4,
        ] = court.players as [
          string,
          string,
          string,
          string
        ];

        const {
          data: savedMatch,
          error: matchError,
        } = await supabase
          .from("matches")
          .insert({
            matchday_id: matchday.id,
            court: index + 1,
          })
          .select("id")
          .single();

        if (matchError || !savedMatch) {
          throw new Error(
            matchError?.message ||
              "Impossibile salvare la partita."
          );
        }

        const { error: playersError } =
          await supabase
            .from("match_players")
            .insert([
              {
                match_id: savedMatch.id,
                player_id: player1,
                team: "A",
              },
              {
                match_id: savedMatch.id,
                player_id: player2,
                team: "A",
              },
              {
                match_id: savedMatch.id,
                player_id: player3,
                team: "B",
              },
              {
                match_id: savedMatch.id,
                player_id: player4,
                team: "B",
              },
            ]);

        if (playersError) {
          throw new Error(playersError.message);
        }

        const setsToSave = court.sets
          .map((set, setIndex) => ({
            match_id: savedMatch.id,
            set_number: setIndex + 1,
            team1_score: Number(set.team1),
            team2_score: Number(set.team2),
          }))
          .filter(
            (set) =>
              !Number.isNaN(set.team1_score) &&
              !Number.isNaN(set.team2_score)
          );

        const { error: setsError } =
          await supabase
            .from("match_sets")
            .insert(setsToSave);

        if (setsError) {
          throw new Error(setsError.message);
        }
      }

      setMessage(
        "Giornata e risultati salvati correttamente."
      );
    } catch (error) {
      console.error(
        "Errore salvataggio:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Si è verificato un errore durante il salvataggio."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <main
        className="matchday-page"
        style={{ paddingBottom: 100 }}
      >
        <header className="matchday-header">
          <div>
            <p className="eyebrow">
              PADEL ON TUESDAY
            </p>

            <h1>Nuova giornata</h1>

            <p className="matchday-subtitle">
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

        <section className="matchday-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                PRESENZE
              </p>

              <h2>Chi gioca oggi?</h2>
            </div>

            <span className="players-count">
              {presentPlayers.length} / 8
            </span>
          </div>

          <p className="matchday-description">
            Seleziona i giocatori presenti. La
            giornata può avere 4 oppure 8 giocatori.
          </p>

          {loading ? (
            <p>
              Caricamento giocatori...
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {players.map((player) => {
                  const selected =
                    presentPlayers.includes(
                      player.id
                    );

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() =>
                        togglePresent(
                          player.id
                        )
                      }
                      style={{
                        padding:
                          "14px 10px",
                        minHeight: 52,
                        borderRadius: 14,
                        border: selected
                          ? "2px solid currentColor"
                          : "1px solid rgba(0,0,0,0.12)",
                        background:
                          selected
                            ? "rgba(0,0,0,0.08)"
                            : "white",
                        fontWeight:
                          selected
                            ? 700
                            : 500,
                        cursor:
                          "pointer",
                        textAlign:
                          "left",
                      }}
                    >
                      {selected
                        ? "✓ "
                        : ""}

                      {displayPlayerName(
                        player
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowAddPlayer(
                    (value) => !value
                  )
                }
                style={{
                  marginTop: 14,
                }}
              >
                ＋ Aggiungi giocatore
              </button>

              {showAddPlayer && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    borderRadius: 16,
                    background:
                      "rgba(0,0,0,0.04)",
                  }}
                >
                  <input
                    value={newFirstName}
                    onChange={(event) =>
                      setNewFirstName(
                        event.target.value
                      )
                    }
                    placeholder="Nome"
                    style={inputStyle}
                  />
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>COGNOME</div>

                  <input
                    value={newLastName}
                    onChange={(event) =>
                      setNewLastName(
                        event.target.value
                      )
                    }
                    placeholder="Cognome"
                    style={inputStyle}
                  />

                  <input
                    value={newEmail}
                    onChange={(event) =>
                      setNewEmail(
                        event.target.value
                      )
                    }
                    placeholder="Email (facoltativa)"
                    type="email"
                    style={inputStyle}
                  />

                  <button
                    type="button"
                    className="primary-button"
                    onClick={addPlayer}
                    disabled={addingPlayer}
                  >
                    {addingPlayer
                      ? "Aggiunta..."
                      : "Aggiungi"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {presentPlayers.length === 4 ||
        presentPlayers.length === 8 ? (
          <>
            <section className="matchday-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    PARTITE
                  </p>

                  <h2>
                    Componi le squadre
                  </h2>
                </div>
              </div>

              <p className="matchday-description">
                Scegli direttamente i
                giocatori. Nessun giocatore
                può essere usato due volte.
              </p>

              {courts.map(
                (
                  court,
                  courtIndex
                ) => (
                  <div
                    key={court.id}
                    style={{
                      marginTop: 24,
                      padding: 18,
                      borderRadius: 20,
                      border:
                        "1px solid rgba(0,0,0,0.10)",
                    }}
                  >
                    <strong>
                      CAMPO{" "}
                      {courtIndex + 1}
                    </strong>

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: 16,
                        marginTop: 18,
                      }}
                    >
                      <div>
                        <p
                          style={
                            smallLabel
                          }
                        >
                          COPPIA A
                        </p>

                        {[0, 1].map(
                          (
                            slotIndex
                          ) => {
                            const current =
                              court
                                .players[
                                slotIndex
                              ];

                            return (
                              <select
                                key={
                                  slotIndex
                                }
                                value={
                                  current ??
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setCourtPlayer(
                                    court.id,
                                    slotIndex,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                style={
                                  selectStyle
                                }
                              >
                                <option value="">
                                  Scegli
                                  giocatore
                                </option>

                                {availablePlayers(
                                  current
                                ).map(
                                  (
                                    player
                                  ) => (
                                    <option
                                      key={
                                        player.id
                                      }
                                      value={
                                        player.id
                                      }
                                    >
                                      {displayPlayerName(
                                        player
                                      )}
                                    </option>
                                  )
                                )}
                              </select>
                            );
                          }
                        )}
                      </div>

                      <div>
                        <p
                          style={
                            smallLabel
                          }
                        >
                          COPPIA B
                        </p>

                        {[2, 3].map(
                          (
                            slotIndex
                          ) => {
                            const current =
                              court
                                .players[
                                slotIndex
                              ];

                            return (
                              <select
                                key={
                                  slotIndex
                                }
                                value={
                                  current ??
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setCourtPlayer(
                                    court.id,
                                    slotIndex,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                style={
                                  selectStyle
                                }
                              >
                                <option value="">
                                  Scegli
                                  giocatore
                                </option>

                                {availablePlayers(
                                  current
                                ).map(
                                  (
                                    player
                                  ) => (
                                    <option
                                      key={
                                        player.id
                                      }
                                      value={
                                        player.id
                                      }
                                    >
                                      {displayPlayerName(
                                        player
                                      )}
                                    </option>
                                  )
                                )}
                              </select>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign:
                          "center",
                        margin:
                          "18px 0",
                        fontWeight: 800,
                        opacity: 0.5,
                      }}
                    >
                      VS
                    </div>

                    <p
                      style={
                        smallLabel
                      }
                    >
                      RISULTATO
                    </p>

                    {court.sets.map(
                      (
                        set,
                        setIndex
                      ) => (
                        <div
                          key={
                            setIndex
                          }
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "70px 1fr 1fr",
                            gap: 8,
                            alignItems:
                              "center",
                            marginBottom:
                              8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight:
                                800,
                            }}
                          >
                            SET{" "}
                            {setIndex +
                              1}
                          </span>

                         <input
  type="number"
  min="0"
  max="7"
  maxLength={1}
  inputMode="numeric"
  placeholder="A"
  value={set.team1}
  onChange={(event) => {
    const value = event.target.value;

    if (value === "" || /^[0-7]$/.test(value)) {
      updateSet(
        court.id,
        setIndex,
        "team1",
        value
      );
    }
  }}
  style={scoreStyle}
/>

     <input
  type="number"
  min="0"
  max="7"
  maxLength={1}
  inputMode="numeric"
  placeholder="B"
  value={set.team2}
  onChange={(event) => {
    const value = event.target.value;

    if (value === "" || /^[0-7]$/.test(value)) {
      updateSet(
        court.id,
        setIndex,
        "team2",
        value
      );
    }
  }}
  style={scoreStyle}
/>                   
                        </div>
                      )
                    )}
                    <div style={{ marginTop: 14 }}>
  <label
    style={{
      display: "block",
      marginBottom: 6,
      fontSize: 13,
      fontWeight: 700,
      opacity: 0.7,
    }}
  >
    💬 Momento memorabile
  </label>

  <textarea
    placeholder="Un colpo incredibile, una rimonta, una battuta..."
    value={court.comment}
    onChange={(event) =>
      setCourts((current) =>
        current.map((item) =>
          item.id === court.id
            ? {
                ...item,
                comment: event.target.value,
              }
            : item
        )
      )
    }
    rows={3}
    style={{
      width: "100%",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.15)",
      padding: 12,
      fontSize: 15,
      resize: "vertical",
    }}
  />
</div>
                  </div>
                )
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={
                  proposePairs
                }
                style={{
                  marginTop: 20,
                }}
              >
                ✨ Proponi abbinamenti
              </button>

              {message && (
                <p
                  className="matchday-message"
                  style={{
                    marginTop: 18,
                  }}
                >
                  {message}
                </p>
              )}
            </section>
          </>
        ) : (
          <section className="matchday-card">
            <div className="empty-ranking">
              <div className="empty-icon">
                🎾
              </div>

              <h3>
                Seleziona 4 oppure 8
                giocatori.
              </h3>

              <p>
                Quando avrai scelto i
                presenti, qui compariranno
                automaticamente i campi.
              </p>
            </div>
          </section>
        )}
      </main>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "10px 16px",
          background:
            "rgba(255,255,255,0.94)",
          backdropFilter:
            "blur(12px)",
          borderTop:
            "1px solid rgba(0,0,0,0.10)",
        }}
      >
        <button
          type="button"
          className="primary-button"
          onClick={
            saveMatchday
          }
          disabled={saving}
          style={{
            width: "100%",
            maxWidth: 600,
            margin: "0 auto",
            justifyContent:
              "center",
            display: "flex",
            boxShadow:
              "0 4px 18px rgba(0,0,0,0.15)",
          }}
        >
          {saving
            ? "Salvataggio..."
            : "SALVA GIORNATA E RISULTATI"}

          <span>→</span>
        </button>
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border:
    "1px solid rgba(0,0,0,0.15)",
  marginBottom: 10,
  fontSize: 16,
};

const selectStyle = {
  width: "100%",
  padding: "13px 12px",
  borderRadius: 12,
  border:
    "1px solid rgba(0,0,0,0.15)",
  marginBottom: 8,
  fontSize: 16,
  background: "white",
};

const scoreStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border:
    "1px solid rgba(0,0,0,0.15)",
  fontSize: 18,
  textAlign:
    "center" as const,
};

const smallLabel = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  marginBottom: 8,
  opacity: 0.6,
};