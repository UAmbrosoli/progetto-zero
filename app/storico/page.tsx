"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

type Matchday = {
  id: string;
  match_date: string;
};

type Match = {
  id: string;
  matchday_id: string;
  court: number;
};

type MatchPlayer = {
  match_id: string;
  player_id: string;
  team: "A" | "B";
};

type MatchSet = {
  match_id: string;
  set_number: number;
  team1_score: number;
  team2_score: number;
};

type Player = {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
};

type MatchView = {
  court: number;
  teamA: string[];
  teamB: string[];
  sets: MatchSet[];
};

type MatchdayView = {
  id: string;
  match_date: string;
  matches: MatchView[];
};

type PlayerStats = {
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
};

function displayPlayerName(player: Player) {
  if (player.last_name && player.first_name) {
    return `${player.last_name} ${player.first_name}`;
  }

  return player.name;
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function matchWinner(sets: MatchSet[]) {
  let teamAWins = 0;
  let teamBWins = 0;

  for (const set of sets) {
    if (set.team1_score > set.team2_score) {
      teamAWins++;
    } else if (set.team2_score > set.team1_score) {
      teamBWins++;
    }
  }

  if (teamAWins > teamBWins) {
    return "A";
  }

  if (teamBWins > teamAWins) {
    return "B";
  }

  return null;
}

function emptyStats(): PlayerStats {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
  };
}

export default function Storico() {
  const [matchdays, setMatchdays] = useState<MatchdayView[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [sets, setSets] = useState<MatchSet[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedPlayerId, setSelectedPlayerId] =
    useState("");

  const [comparisonPlayerId, setComparisonPlayerId] =
    useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setMessage("");

    try {
      const [
        matchdaysResult,
        matchesResult,
        playersResult,
        matchPlayersResult,
        setsResult,
      ] = await Promise.all([
        supabase
          .from("matchdays")
          .select("id, match_date")
          .order("match_date", {
            ascending: false,
          }),

        supabase
          .from("matches")
          .select("id, matchday_id, court")
          .order("court"),

        supabase
          .from("players")
          .select(
            "id, name, first_name, last_name"
          ),

        supabase
          .from("match_players")
          .select(
            "match_id, player_id, team"
          ),

        supabase
          .from("match_sets")
          .select(
            "match_id, set_number, team1_score, team2_score"
          )
          .order("set_number"),
      ]);

      if (matchdaysResult.error) {
        throw matchdaysResult.error;
      }

      if (matchesResult.error) {
        throw matchesResult.error;
      }

      if (playersResult.error) {
        throw playersResult.error;
      }

      if (matchPlayersResult.error) {
        throw matchPlayersResult.error;
      }

      if (setsResult.error) {
        throw setsResult.error;
      }

      const matchdaysData =
        matchdaysResult.data ?? [];

      const matchesData =
        matchesResult.data ?? [];

      const playersData =
        playersResult.data ?? [];

      const matchPlayersData =
        matchPlayersResult.data ?? [];

      const setsData =
        setsResult.data ?? [];

      const playerMap = new Map<
        string,
        string
      >();

      for (const player of playersData) {
        playerMap.set(
          player.id,
          displayPlayerName(player)
        );
      }

      const history: MatchdayView[] =
        matchdaysData.map((matchday) => {
          const dayMatches = matchesData
            .filter(
              (match) =>
                match.matchday_id ===
                matchday.id
            )
            .sort(
              (a, b) => a.court - b.court
            );

          return {
            id: matchday.id,
            match_date: matchday.match_date,
            matches: dayMatches.map(
              (match) => {
                const playersInMatch =
                  matchPlayersData.filter(
                    (player) =>
                      player.match_id ===
                      match.id
                  );

                const teamA =
                  playersInMatch
                    .filter(
                      (player) =>
                        player.team === "A"
                    )
                    .map(
                      (player) =>
                        playerMap.get(
                          player.player_id
                        ) ||
                        "Giocatore"
                    );

                const teamB =
                  playersInMatch
                    .filter(
                      (player) =>
                        player.team === "B"
                    )
                    .map(
                      (player) =>
                        playerMap.get(
                          player.player_id
                        ) ||
                        "Giocatore"
                    );

                const matchSets =
                  setsData
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
                  court: match.court,
                  teamA,
                  teamB,
                  sets: matchSets,
                };
              }
            ),
          };
        });

      setMatchdays(history);
      setPlayers(playersData);
      setMatches(matchesData);
      setMatchPlayers(matchPlayersData);
      setSets(setsData);

      if (
        playersData.length > 0 &&
        !selectedPlayerId
      ) {
        setSelectedPlayerId(
          playersData[0].id
        );
      }

      if (
        playersData.length > 1 &&
        !comparisonPlayerId
      ) {
        setComparisonPlayerId(
          playersData[1].id
        );
      }
    } catch (error) {
      console.error(
        "Errore caricamento storico:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a caricare lo storico."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedPlayerStats = useMemo(() => {
    const stats = emptyStats();

    if (!selectedPlayerId) {
      return stats;
    }

    const playerMatches =
      matchPlayers.filter(
        (item) =>
          item.player_id ===
          selectedPlayerId
      );

    for (const playerMatch of playerMatches) {
      const match = matches.find(
        (item) =>
          item.id ===
          playerMatch.match_id
      );

      if (!match) {
        continue;
      }

      const matchSets = sets.filter(
        (set) =>
          set.match_id === match.id
      );

      const winner =
        matchWinner(matchSets);

      stats.played++;

      if (
        winner === playerMatch.team
      ) {
        stats.wins++;
      } else if (winner) {
        stats.losses++;
      }

      for (const set of matchSets) {
        const playerScore =
          playerMatch.team === "A"
            ? set.team1_score
            : set.team2_score;

        const opponentScore =
          playerMatch.team === "A"
            ? set.team2_score
            : set.team1_score;

        if (playerScore > opponentScore) {
          stats.setsWon++;
        } else if (
          opponentScore > playerScore
        ) {
          stats.setsLost++;
        }

        stats.gamesWon += playerScore;
        stats.gamesLost += opponentScore;
      }
    }

    return stats;
  }, [
    selectedPlayerId,
    matchPlayers,
    matches,
    sets,
  ]);

  const comparisonStats = useMemo(() => {
    let playerAWins = 0;
    let playerBWins = 0;
    let matchesPlayed = 0;

    if (
      !selectedPlayerId ||
      !comparisonPlayerId ||
      selectedPlayerId ===
        comparisonPlayerId
    ) {
      return {
        matchesPlayed,
        playerAWins,
        playerBWins,
      };
    }

    const playerAMatches =
      matchPlayers.filter(
        (item) =>
          item.player_id ===
          selectedPlayerId
      );

    const playerBMatches =
      matchPlayers.filter(
        (item) =>
          item.player_id ===
          comparisonPlayerId
      );

    for (const playerA of playerAMatches) {
      const playerB =
        playerBMatches.find(
          (item) =>
            item.match_id ===
            playerA.match_id
        );

      if (!playerB) {
        continue;
      }

      if (
        playerA.team === playerB.team
      ) {
        continue;
      }

      const matchSets = sets.filter(
        (set) =>
          set.match_id ===
          playerA.match_id
      );

      const winner =
        matchWinner(matchSets);

      if (!winner) {
        continue;
      }

      matchesPlayed++;

      if (winner === playerA.team) {
        playerAWins++;
      } else {
        playerBWins++;
      }
    }

    return {
      matchesPlayed,
      playerAWins,
      playerBWins,
    };
  }, [
    selectedPlayerId,
    comparisonPlayerId,
    matchPlayers,
    sets,
  ]);

  const partnershipStats = useMemo(() => {
    let matchesPlayed = 0;
    let wins = 0;

    if (
      !selectedPlayerId ||
      !comparisonPlayerId ||
      selectedPlayerId ===
        comparisonPlayerId
    ) {
      return {
        matchesPlayed,
        wins,
      };
    }

    const playerAMatches =
      matchPlayers.filter(
        (item) =>
          item.player_id ===
          selectedPlayerId
      );

    const playerBMatches =
      matchPlayers.filter(
        (item) =>
          item.player_id ===
          comparisonPlayerId
      );

    for (const playerA of playerAMatches) {
      const playerB =
        playerBMatches.find(
          (item) =>
            item.match_id ===
            playerA.match_id
        );

      if (!playerB) {
        continue;
      }

      if (
        playerA.team !== playerB.team
      ) {
        continue;
      }

      const matchSets = sets.filter(
        (set) =>
          set.match_id ===
          playerA.match_id
      );

      const winner =
        matchWinner(matchSets);

      if (!winner) {
        continue;
      }

      matchesPlayed++;

      if (winner === playerA.team) {
        wins++;
      }
    }

    return {
      matchesPlayed,
      wins,
    };
  }, [
    selectedPlayerId,
    comparisonPlayerId,
    matchPlayers,
    sets,
  ]);

  const selectedPlayerName =
    players.find(
      (player) =>
        player.id === selectedPlayerId
    );

  const comparisonPlayerName =
    players.find(
      (player) =>
        player.id ===
        comparisonPlayerId
    );

  const selectedName =
    selectedPlayerName
      ? displayPlayerName(
          selectedPlayerName
        )
      : "Giocatore";

  const comparisonName =
    comparisonPlayerName
      ? displayPlayerName(
          comparisonPlayerName
        )
      : "Giocatore";

  const winPercentage =
    selectedPlayerStats.played > 0
      ? Math.round(
          (selectedPlayerStats.wins /
            selectedPlayerStats.played) *
            100
        )
      : 0;

  const partnershipPercentage =
    partnershipStats.matchesPlayed > 0
      ? Math.round(
          (partnershipStats.wins /
            partnershipStats.matchesPlayed) *
            100
        )
      : 0;

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            PADEL ON TUESDAY
          </p>

          <h1>
  Classifica e statistiche
</h1>

          <p className="dashboard-subtitle">
            Stagione 2026–27
          </p>
        </div>

        <Link
          href="/classifica"
          className="back-link"
        >
          ← Classifica
        </Link>
      </header>

      {loading ? (
        <section className="players-card">
          <div className="empty-ranking">
            <div className="empty-icon">
              🎾
            </div>

            <h3>
              Caricamento storico...
            </h3>
          </div>
        </section>
      ) : message ? (
        <section className="players-card">
          <div className="empty-ranking">
            <div className="empty-icon">
              ⚠️
            </div>

            <h3>Errore</h3>

            <p>{message}</p>
          </div>
        </section>
      ) : (
        <>
          <section className="players-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  STORICO
                </p>

                <h2>
                  Giornate della stagione
                </h2>
              </div>

              <span className="players-count">
                {matchdays.length}{" "}
                {matchdays.length === 1
                  ? "giornata"
                  : "giornate"}
              </span>
            </div>

            {matchdays.length === 0 ? (
              <div className="empty-ranking">
                <div className="empty-icon">
                  📊
                </div>

                <h3>
                  Nessuna giornata
                  registrata.
                </h3>

                <p>
                  Quando salverai la prima
                  giornata, la troverai qui.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 20,
                }}
              >
                {matchdays.map(
                  (
                    matchday,
                    dayIndex
                  ) => (
                    <section
                      key={matchday.id}
                      style={{
                        borderTop:
                          dayIndex === 0
                            ? "none"
                            : "1px solid rgba(0,0,0,0.08)",
                        paddingTop:
                          dayIndex === 0
                            ? 0
                            : 20,
                      }}
                    >
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">
                            GIORNATA{" "}
                            {matchdays.length -
                              dayIndex}
                          </p>

                          <h2>
                            {formatDate(
                              matchday.match_date
                            )}
                          </h2>
                        </div>

                        <span className="players-count">
                          {
                            matchday.matches
                              .length
                          }{" "}
                          {matchday.matches
                            .length === 1
                            ? "campo"
                            : "campi"}
                        </span>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          gap: 14,
                        }}
                      >
                        {matchday.matches.map(
                          (match) => {
                            const winner =
                              matchWinner(
                                match.sets
                              );

                            return (
                              <div
                                key={
                                  match.court
                                }
                                style={{
                                  border:
                                    "1px solid rgba(0,0,0,0.10)",
                                  borderRadius:
                                    16,
                                  padding: 16,
                                  background:
                                    "rgba(0,0,0,0.02)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize:
                                      12,
                                    fontWeight:
                                      800,
                                    letterSpacing:
                                      "0.08em",
                                    opacity:
                                      0.6,
                                    marginBottom:
                                      12,
                                  }}
                                >
                                  CAMPO{" "}
                                  {
                                    match.court
                                  }
                                </div>

                                <div
                                  style={{
                                    display:
                                      "grid",
                                    gridTemplateColumns:
                                      "1fr auto 1fr",
                                    gap: 12,
                                    alignItems:
                                      "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight:
                                        winner ===
                                        "A"
                                          ? 800
                                          : 500,
                                    }}
                                  >
                                    {match.teamA.map(
                                      (
                                        name
                                      ) => (
                                        <div
                                          key={
                                            name
                                          }
                                        >
                                          {
                                            name
                                          }
                                        </div>
                                      )
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      flexDirection:
                                        "column",
                                      gap: 4,
                                      alignItems:
                                        "center",
                                    }}
                                  >
                                    {match.sets.map(
                                      (
                                        set
                                      ) => (
                                        <span
                                          key={
                                            set.set_number
                                          }
                                          style={{
                                            fontWeight:
                                              700,
                                            minWidth:
                                              50,
                                            textAlign:
                                              "center",
                                          }}
                                        >
                                          {
                                            set.team1_score
                                          }
                                          {" - "}
                                          {
                                            set.team2_score
                                          }
                                        </span>
                                      )
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      textAlign:
                                        "right",
                                      fontWeight:
                                        winner ===
                                        "B"
                                          ? 800
                                          : 500,
                                    }}
                                  >
                                    {match.teamB.map(
                                      (
                                        name
                                      ) => (
                                        <div
                                          key={
                                            name
                                          }
                                        >
                                          {
                                            name
                                          }
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </section>
                  )
                )}
              </div>
            )}
          </section>

          <section
            className="players-card"
            style={{ marginTop: 20 }}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  STATISTICHE
                </p>

                <h2>
                  Statistiche individuali
                </h2>
              </div>
            </div>

            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing:
                  "0.08em",
                opacity: 0.6,
                marginBottom: 8,
              }}
            >
              GIOCATORE
            </label>

            <select
              value={selectedPlayerId}
              onChange={(event) =>
                setSelectedPlayerId(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                padding: "13px 12px",
                borderRadius: 12,
                border:
                  "1px solid rgba(0,0,0,0.15)",
                marginBottom: 18,
                fontSize: 16,
                background:
                  "white",
              }}
            >
              {players.map(
                (player) => (
                  <option
                    key={player.id}
                    value={player.id}
                  >
                    {displayPlayerName(
                      player
                    )}
                  </option>
                )
              )}
            </select>

            <div
              className="dashboard-grid"
              style={{
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div className="menu-card">
                <div>
                  <h3>
                    {selectedPlayerStats.played}
                  </h3>
                  <p>Partite</p>
                </div>
              </div>

              <div className="menu-card">
                <div>
                  <h3>
                    {selectedPlayerStats.wins} V
                  </h3>
                  <p>
                    {selectedPlayerStats.losses} S
                  </p>
                </div>
              </div>

              <div className="menu-card">
                <div>
                  <h3>
                    {winPercentage}%
                  </h3>
                  <p>
                    Vittorie
                  </p>
                </div>
              </div>

              <div className="menu-card">
                <div>
                  <h3>
                    {selectedPlayerStats.setsWon}–
                    {selectedPlayerStats.setsLost}
                  </h3>
                  <p>
                    Set vinti/persi
                  </p>
                </div>
              </div>

              <div className="menu-card">
                <div>
                  <h3>
                    {selectedPlayerStats.gamesWon}–
                    {selectedPlayerStats.gamesLost}
                  </h3>
                  <p>
                    Game vinti/persi
                  </p>
                </div>
              </div>

              <div className="menu-card">
                <div>
                  <h3>
                    {selectedPlayerStats.setsWon -
                      selectedPlayerStats.setsLost >=
                    0
                      ? "+"
                      : ""}
                    {selectedPlayerStats.setsWon -
                      selectedPlayerStats.setsLost}
                  </h3>
                  <p>
                    Differenza set
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
  className="players-card"
  style={{ marginTop: 20 }}
>
  <div className="section-heading">
    <div>
      <p className="eyebrow">
        ⚔️ CONFRONTO DIRETTO
      </p>

      <h2>
        Testa a testa
      </h2>
    </div>
  </div>

  <div className="head-to-head-selectors">

    <select
      value={selectedPlayerId}
      onChange={(event) =>
        setSelectedPlayerId(
          event.target.value
        )
      }
    >
      {players.map((player) => (
        <option
          key={player.id}
          value={player.id}
        >
          {displayPlayerName(player)}
        </option>
      ))}
    </select>

    <div className="head-to-head-vs">
      VS
    </div>

    <select
      value={comparisonPlayerId}
      onChange={(event) =>
        setComparisonPlayerId(
          event.target.value
        )
      }
    >
      {players.map((player) => (
        <option
          key={player.id}
          value={player.id}
        >
          {displayPlayerName(player)}
        </option>
      ))}
    </select>

  </div>

  {selectedPlayerId === comparisonPlayerId ? (
    <p className="head-to-head-empty">
      Seleziona due giocatori diversi.
    </p>
  ) : (
    <div className="head-to-head-result">

      <p className="head-to-head-label">
        {comparisonStats.matchesPlayed} CONFRONTI
      </p>

      <div className="head-to-head-score">

        <div>
          <strong>
            {comparisonStats.playerAWins}
          </strong>

          <span>
            {selectedName}
          </span>
        </div>

        <div className="head-to-head-dash">
          —
        </div>

        <div>
          <strong>
            {comparisonStats.playerBWins}
          </strong>

          <span>
            {comparisonName}
          </span>
        </div>

      </div>

    </div>
  )}
</section>

<section
  className="players-card"
  style={{ marginTop: 20 }}
>
  <div className="section-heading">
    <div>
      <p className="eyebrow">
        🤝 INSIEME
      </p>

      <h2>
        Quando giocano in coppia
                </h2>
              </div>
            </div>

            {selectedPlayerId ===
            comparisonPlayerId ? (
              <p
                style={{
                  opacity: 0.65,
                }}
              >
                Seleziona due giocatori
                diversi.
              </p>
            ) : (
              <div
                style={{
                  textAlign: "center",
                }}
              >
                <h3>
                  {selectedName} +{" "}
                  {comparisonName}
                </h3>

                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  {partnershipStats.matchesPlayed}{" "}
                  partite ·{" "}
                  {partnershipStats.wins}{" "}
                  vittorie
                </p>

                <p
                  style={{
                    marginTop: 6,
                    opacity: 0.65,
                  }}
                >
                  {partnershipPercentage}%
                  {" di vittorie"}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}