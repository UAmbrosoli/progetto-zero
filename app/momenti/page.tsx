"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

type Player = {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
};

type Match = {
  id: string;
  matchday_id: string;
  court: number;
  score_team_a: number;
  score_team_b: number;
  created_at: string;
};

type MatchPlayer = {
  match_id: string;
  player_id: string;
  team: string;
};

type MatchSet = {
  id: string;
  match_id: string;
  set_number: number;
  team1_score: number;
  team2_score: number;
};

type Matchday = {
  id: string;
  match_date: string;
};

type Moment = {
  id: string;
  match_id: string;
  comment: string;
  created_at: string;
  match: {
    id: string;
    court: number;
    score_team_a: number;
    score_team_b: number;
    created_at: string;
    matchday: {
      match_date: string;
    };
    players: {
      id: string;
      team: string;
      name: string;
      last_name: string;
    }[];
    sets: {
      id: string;
      match_id: string;
      set_number: number;
      team1_score: number;
      team2_score: number;
    }[];
  };
};

type AvailableMatch = {
  match: Match;
  matchday: Matchday;
  playersA: Player[];
  playersB: Player[];
  sets: MatchSet[];
};

function displayName(player: Player) {
  if (player.first_name && player.last_name) {
    return `${player.first_name} ${player.last_name}`;
  }

  return player.first_name || player.name;
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Momenti() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [availableMatches, setAvailableMatches] =
    useState<AvailableMatch[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [admin, setAdmin] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editingMatchId, setEditingMatchId] =
    useState<string | null>(null);

  const [editingText, setEditingText] =
    useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
  async function loadSession() {
    try {
      const response = await fetch(
        "/api/momenti",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setAdmin(data.admin === true);
    } catch {
      setAdmin(false);
    }
  }

  loadSession();
  loadMoments();
}, []);

  async function loadMoments() {
    setLoading(true);
    setMessage("");

    try {
      /*
       * =====================================================
       * MOMENTI
       * =====================================================
       */

      const {
        data: momentsData,
        error: momentsError,
      } = await supabase
        .from("memorable_moments")
        .select(
          "id, match_id, comment, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (momentsError) {
        throw new Error(momentsError.message);
      }

      const momentsList =
        (momentsData || []) as {
          id: string;
          match_id: string;
          comment: string;
          created_at: string;
        }[];

      /*
       * =====================================================
       * TUTTE LE PARTITE
       * =====================================================
       *
       * Le carichiamo tutte, non soltanto quelle che
       * hanno già un momento memorabile.
       *
       * Questo permette all'Admin di aggiungere
       * successivamente un momento a una partita.
       */

      const {
        data: matchesData,
        error: matchesError,
      } = await supabase
        .from("matches")
        .select(
          "id, matchday_id, court, score_team_a, score_team_b, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (matchesError) {
        throw new Error(matchesError.message);
      }

      const allMatches =
        (matchesData || []) as Match[];

      if (allMatches.length === 0) {
        setMoments([]);
        setAvailableMatches([]);
        return;
      }

      const matchIds = allMatches.map(
        (match) => match.id
      );

      const matchdayIds = [
        ...new Set(
          allMatches.map(
            (match) => match.matchday_id
          )
        ),
      ];

      /*
       * =====================================================
       * GIORNATE
       * =====================================================
       */

      const {
        data: matchdaysData,
        error: matchdaysError,
      } = await supabase
        .from("matchdays")
        .select("id, match_date")
        .in("id", matchdayIds);

      if (matchdaysError) {
        throw new Error(
          matchdaysError.message
        );
      }

      const allMatchdays =
        (matchdaysData || []) as Matchday[];

      /*
       * =====================================================
       * GIOCATORI DELLE PARTITE
       * =====================================================
       */

      const {
        data: matchPlayersData,
        error: matchPlayersError,
      } = await supabase
        .from("match_players")
        .select(
          "match_id, player_id, team"
        )
        .in("match_id", matchIds);

      if (matchPlayersError) {
        throw new Error(
          matchPlayersError.message
        );
      }

      const allMatchPlayers =
        (matchPlayersData || []) as MatchPlayer[];

      const playerIds = [
        ...new Set(
          allMatchPlayers.map(
            (item) => item.player_id
          )
        ),
      ];

      /*
       * =====================================================
       * GIOCATORI
       * =====================================================
       */

      let allPlayers: Player[] = [];

      if (playerIds.length > 0) {
        const {
          data: playersData,
          error: playersError,
        } = await supabase
          .from("players")
          .select(
            "id, name, first_name, last_name"
          )
          .in("id", playerIds);

        if (playersError) {
          throw new Error(
            playersError.message
          );
        }

        allPlayers =
          (playersData || []) as Player[];
      }

      /*
       * =====================================================
       * SET
       * =====================================================
       */

      const {
        data: matchSetsData,
        error: matchSetsError,
      } = await supabase
        .from("match_sets")
        .select(
          "id, match_id, set_number, team1_score, team2_score"
        )
        .in("match_id", matchIds)
        .order("set_number", {
          ascending: true,
        });

      if (matchSetsError) {
        throw new Error(
          matchSetsError.message
        );
      }

      const allMatchSets =
        (matchSetsData || []) as MatchSet[];

      /*
       * =====================================================
       * COSTRUZIONE ARCHIVIO MOMENTI
       * =====================================================
       */

      const combinedMoments = momentsList
        .map((moment) => {
          const match = allMatches.find(
            (item) =>
              item.id === moment.match_id
          );

          if (!match) {
            return null;
          }

          const matchday =
            allMatchdays.find(
              (item) =>
                item.id === match.matchday_id
            );

          if (!matchday) {
            return null;
          }

          const playersForMatch =
            allMatchPlayers
              .filter(
                (item) =>
                  item.match_id === match.id
              )
              .map((item) => {
                const player =
                  allPlayers.find(
                    (p) =>
                      p.id === item.player_id
                  );

                return {
                  id: item.player_id,
                  team: item.team,
                  name:
                    player?.first_name ||
                    player?.name ||
                    "Giocatore",
                  last_name:
                    player?.last_name || "",
                };
              });

          const setsForMatch =
            allMatchSets
              .filter(
                (item) =>
                  item.match_id === match.id
              )
              .sort(
                (a, b) =>
                  a.set_number -
                  b.set_number
              );

          return {
            ...moment,
            match: {
              id: match.id,
              court: match.court,
              score_team_a:
                match.score_team_a,
              score_team_b:
                match.score_team_b,
              created_at:
                match.created_at,
              matchday: {
                match_date:
                  matchday.match_date,
              },
              players:
                playersForMatch,
              sets: setsForMatch,
            },
          };
        })
        .filter(Boolean) as Moment[];

      /*
       * =====================================================
       * PARTITE SENZA MOMENTO
       * =====================================================
       */

      const momentMatchIds = new Set(
        momentsList.map(
          (moment) => moment.match_id
        )
      );

      const matchesWithoutMoment =
        allMatches
          .filter(
            (match) =>
              !momentMatchIds.has(match.id)
          )
          .map((match) => {
            const matchday =
              allMatchdays.find(
                (item) =>
                  item.id ===
                  match.matchday_id
              );

            if (!matchday) {
              return null;
            }

            const participants =
              allMatchPlayers.filter(
                (item) =>
                  item.match_id === match.id
              );

            const playersA =
              participants
                .filter(
                  (item) =>
                    item.team === "A"
                )
                .map((item) =>
                  allPlayers.find(
                    (player) =>
                      player.id ===
                      item.player_id
                  )
                )
                .filter(Boolean) as Player[];

            const playersB =
              participants
                .filter(
                  (item) =>
                    item.team === "B"
                )
                .map((item) =>
                  allPlayers.find(
                    (player) =>
                      player.id ===
                      item.player_id
                  )
                )
                .filter(Boolean) as Player[];

            const sets =
              allMatchSets
                .filter(
                  (set) =>
                    set.match_id ===
                    match.id
                )
                .sort(
                  (a, b) =>
                    a.set_number -
                    b.set_number
                );

            return {
              match,
              matchday,
              playersA,
              playersB,
              sets,
            };
          })
          .filter(Boolean) as AvailableMatch[];

      setMoments(combinedMoments);
      setAvailableMatches(
        matchesWithoutMoment
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Impossibile caricare i momenti memorabili."
      );
    } finally {
      setLoading(false);
    }
  }

  function startEdit(moment: Moment) {
    setEditingId(moment.id);
    setEditingMatchId(moment.match_id);
    setEditingText(moment.comment);
    setMessage("");
  }

  function startAdd(matchId: string) {
    setEditingId(null);
    setEditingMatchId(matchId);
    setEditingText("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingMatchId(null);
    setEditingText("");
  }

  async function saveMoment() {
    const comment = editingText.trim();

    if (!editingMatchId) {
      return;
    }

    if (!comment) {
      setMessage(
        "Il momento memorabile non può essere vuoto."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/momenti",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            match_id: editingMatchId,
            comment,
          }),
        }
      );

      const result =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Impossibile salvare il momento memorabile."
        );
      }

      cancelEdit();

      await loadMoments();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Impossibile salvare il momento memorabile."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
  className="dashboard-page"
  style={{
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 28px 40px",
    boxSizing: "border-box",
  }}
>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="dashboard-header">

        <div>

          <p className="eyebrow">
            PADEL ON TUESDAY
          </p>

          <h1>
            Momenti
            <br />
            memorabili
          </h1>

          <p className="dashboard-subtitle">
            Le partite, i colpi e le storie
            che vale la pena ricordare.
          </p>

        </div>

      </header>


      {/* =====================================================
          CARICAMENTO
          ===================================================== */}

      {loading && (

        <section className="players-card">

          <div className="empty-ranking">

            <div className="empty-icon">
              🎾
            </div>

            <h3>
              Recupero la storia della stagione...
            </h3>

          </div>

        </section>

      )}


      {/* =====================================================
          ERRORE
          ===================================================== */}

      {!loading && message && (

        <section className="players-card">

          <div className="empty-ranking">

            <div className="empty-icon">
              ⚠️
            </div>

            <h3>
              Non riesco a caricare i momenti.
            </h3>

            <p>
              {message}
            </p>

          </div>

        </section>

      )}


      {/* =====================================================
          ARCHIVIO DEI MOMENTI
          ===================================================== */}

      {!loading &&
        !message &&
        moments.length > 0 && (

          <section className="moments-list">

            {moments.map(
              (moment, index) => (

                <article
                  key={moment.id}
                  className="moment-item"
                >

                  <div className="moment-item-top">

                    <span className="moment-number">
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </span>

                    <span className="moment-date">
                      {formatDate(
                        moment.match.matchday
                          .match_date
                      )}
                    </span>

                    <span className="moment-court">
                      CAMPO{" "}
                      {moment.match.court}
                    </span>

                  </div>


                  <div className="moment-item-content">

                    <div className="moment-teams">

                      <div className="moment-team">

                        {moment.match.players
                          .filter(
                            (player) =>
                              player.team ===
                              "A"
                          )
                          .map((player) =>
                            `${player.name} ${player.last_name}`.trim()
                          )
                          .join(" · ")}

                      </div>

                      <div className="moment-vs">
                        VS
                      </div>

                      <div className="moment-team">

                        {moment.match.players
                          .filter(
                            (player) =>
                              player.team ===
                              "B"
                          )
                          .map((player) =>
                            `${player.name} ${player.last_name}`.trim()
                          )
                          .join(" · ")}

                      </div>

                    </div>


                    <div className="moment-score">

                      {moment.match.sets
                        .map(
                          (set) =>
                            `${set.team1_score}–${set.team2_score}`
                        )
                        .join(" · ")}

                    </div>


                    {editingMatchId ===
                    moment.match_id ? (

                      <div
                        style={{
                          marginTop: 18,
                        }}
                      >

                        <textarea
                          value={editingText}
                          onChange={(event) =>
                            setEditingText(
                              event.target.value
                            )
                          }
                          rows={7}
                          autoFocus
                          style={{
                            width: "100%",
                            boxSizing:
                              "border-box",
                            padding: 14,
                            borderRadius: 10,
                            border:
                              "1px solid rgba(0,0,0,0.2)",
                            fontSize: 17,
                            lineHeight: 1.4,
                            fontFamily:
                              "inherit",
                            resize:
                              "vertical",
                          }}
                        />

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            marginTop: 10,
                          }}
                        >

                          <button
                            type="button"
                            onClick={
                              saveMoment
                            }
                            disabled={saving}
                            style={{
                              padding:
                                "9px 14px",
                              borderRadius:
                                999,
                              border:
                                "none",
                              background:
                                "#111",
                              color:
                                "#fff",
                              fontSize:
                                13,
                              fontWeight:
                                700,
                              cursor:
                                saving
                                  ? "default"
                                  : "pointer",
                              opacity:
                                saving
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {saving
                              ? "Salvataggio..."
                              : "Salva"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelEdit
                            }
                            disabled={saving}
                            style={{
                              padding:
                                "9px 14px",
                              borderRadius:
                                999,
                              border:
                                "1px solid rgba(0,0,0,0.2)",
                              background:
                                "transparent",
                              color:
                                "#333",
                              fontSize:
                                13,
                              fontWeight:
                                600,
                              cursor:
                                saving
                                  ? "default"
                                  : "pointer",
                            }}
                          >
                            Annulla
                          </button>

                        </div>

                      </div>

                    ) : (

                      <p
                        className="moment-story"
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          lineHeight: 1.35,
                          margin:
                            "18px 0 0",
                          letterSpacing:
                            "-0.01em",
                        }}
                      >
                        “{moment.comment}”
                      </p>

                    )}

                  </div>


                  {admin &&
                    editingMatchId !==
                      moment.match_id && (

                      <button
                        type="button"
                        onClick={() =>
                          startEdit(
                            moment
                          )
                        }
                        style={{
                          marginTop: 14,
                          padding:
                            "7px 11px",
                          borderRadius:
                            999,
                          border:
                            "1px solid rgba(0,0,0,0.18)",
                          background:
                            "transparent",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor:
                            "pointer",
                        }}
                      >
                        Modifica
                      </button>

                    )}


                  {index <
                    moments.length - 1 && (
                    <div
                      style={{
                        height: 1,
                        background:
                          "rgba(60, 60, 60, 0.35)",
                        marginTop: 22,
                        marginBottom: 22,
                      }}
                    />
                  )}

                </article>

              )
            )}

          </section>

        )}


      {/* =====================================================
          NESSUN MOMENTO
          ===================================================== */}

      {!loading &&
        !message &&
        moments.length === 0 && (
          <section className="players-card">

            <div className="empty-ranking">

              <div className="empty-icon">
                ✦
              </div>

              <h3>
                Ancora nessun momento memorabile.
              </h3>

              <p>
                La stagione è appena cominciata.
                Il primo momento da ricordare
                deve ancora essere scritto.
              </p>

            </div>

          </section>
        )}


      {/* =====================================================
          ADMIN — PARTITE SENZA MOMENTO
          ===================================================== */}

      {admin &&
        !loading &&
        !message &&
        availableMatches.length > 0 && (

          <section
            style={{
              marginTop: 42,
              paddingTop: 28,
              borderTop:
                "1px solid rgba(60,60,60,0.25)",
            }}
          >

            <p
              className="eyebrow"
              style={{
                marginBottom: 8,
              }}
            >
              ADMIN
            </p>

            <h2
              style={{
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              Partite senza
              <br />
              momento
            </h2>

            <p
              style={{
                marginTop: 0,
                marginBottom: 24,
                opacity: 0.7,
              }}
            >
              Puoi aggiungere ora il momento
              memorabile di una partita già
              registrata.
            </p>


            <div>

              {availableMatches.map(
                (item) => (

                  <article
                    key={item.match.id}
                    style={{
                      padding:
                        "18px 0",
                      borderBottom:
                        "1px solid rgba(60,60,60,0.2)",
                    }}
                  >

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {formatDate(
                        item.matchday
                          .match_date
                      )}
                      {" · "}
                      CAMPO{" "}
                      {item.match.court}
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.playersA
                        .map(displayName)
                        .join(" · ")}
                      {"  VS  "}
                      {item.playersB
                        .map(displayName)
                        .join(" · ")}
                    </div>

                    {item.sets.length > 0 && (
                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 13,
                          opacity: 0.7,
                        }}
                      >
                        {item.sets
                          .map(
                            (set) =>
                              `${set.team1_score}–${set.team2_score}`
                          )
                          .join(" · ")}
                      </div>
                    )}


                    {editingMatchId ===
                    item.match.id ? (

                      <div
                        style={{
                          marginTop: 14,
                        }}
                      >

                        <textarea
                          value={editingText}
                          onChange={(event) =>
                            setEditingText(
                              event.target.value
                            )
                          }
                          rows={7}
                          autoFocus
                          placeholder="Scrivi il momento memorabile..."
                          style={{
                            width: "100%",
                            boxSizing:
                              "border-box",
                            padding: 14,
                            borderRadius: 10,
                            border:
                              "1px solid rgba(0,0,0,0.2)",
                            fontSize: 17,
                            lineHeight: 1.4,
                            fontFamily:
                              "inherit",
                            resize:
                              "vertical",
                          }}
                        />

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            marginTop: 10,
                          }}
                        >

                          <button
                            type="button"
                            onClick={
                              saveMoment
                            }
                            disabled={saving}
                            style={{
                              padding:
                                "9px 14px",
                              borderRadius:
                                999,
                              border:
                                "none",
                              background:
                                "#111",
                              color:
                                "#fff",
                              fontSize:
                                13,
                              fontWeight:
                                700,
                              cursor:
                                saving
                                  ? "default"
                                  : "pointer",
                              opacity:
                                saving
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {saving
                              ? "Salvataggio..."
                              : "Salva"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelEdit
                            }
                            disabled={saving}
                            style={{
                              padding:
                                "9px 14px",
                              borderRadius:
                                999,
                              border:
                                "1px solid rgba(0,0,0,0.2)",
                              background:
                                "transparent",
                              color:
                                "#333",
                              fontSize:
                                13,
                              fontWeight:
                                600,
                              cursor:
                                saving
                                  ? "default"
                                  : "pointer",
                            }}
                          >
                            Annulla
                          </button>

                        </div>

                      </div>

                    ) : (

                      <button
                        type="button"
                        onClick={() =>
                          startAdd(
                            item.match.id
                          )
                        }
                        style={{
                          marginTop: 12,
                          padding:
                            "8px 13px",
                          borderRadius:
                            999,
                          border:
                            "1px solid rgba(0,0,0,0.18)",
                          background:
                            "transparent",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor:
                            "pointer",
                        }}
                      >
                        + Aggiungi momento
                      </button>

                    )}

                  </article>

                )
              )}

            </div>

          </section>

        )}

    </main>
  );
}