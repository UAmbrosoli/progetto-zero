"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

type Player = {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
};

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

type PlayerResult = {
  playerId: string;
  matchDate: string;
  result: "win" | "loss" | "draw";
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
};

type Trophy = {
  icon: string;
  title: string;
  description: string;
  playerName: string;
  value: string;
  detail?: string;
};

function displayPlayerName(player: Player) {
  if (player.last_name && player.first_name) {
    return `${player.last_name} ${player.first_name}`;
  }

  return player.name;
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

function formatMonth(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}

export default function Trofei() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [sets, setSets] = useState<MatchSet[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const [
        playersResult,
        matchdaysResult,
        matchesResult,
        matchPlayersResult,
        setsResult,
      ] = await Promise.all([
        supabase
          .from("players")
          .select(
            "id, name, first_name, last_name"
          ),

        supabase
          .from("matchdays")
          .select("id, match_date")
          .order("match_date", {
            ascending: true,
          }),

        supabase
          .from("matches")
          .select(
            "id, matchday_id, court"
          )
          .order("court"),

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

      if (playersResult.error) {
        throw playersResult.error;
      }

      if (matchdaysResult.error) {
        throw matchdaysResult.error;
      }

      if (matchesResult.error) {
        throw matchesResult.error;
      }

      if (matchPlayersResult.error) {
        throw matchPlayersResult.error;
      }

      if (setsResult.error) {
        throw setsResult.error;
      }

      setPlayers(playersResult.data ?? []);
      setMatchdays(matchdaysResult.data ?? []);
      setMatches(matchesResult.data ?? []);
      setMatchPlayers(
        matchPlayersResult.data ?? []
      );
      setSets(setsResult.data ?? []);
    } catch (error) {
      console.error(
        "Errore caricamento trofei:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a caricare i trofei."
      );
    } finally {
      setLoading(false);
    }
  }

  const playerMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const player of players) {
      map.set(
        player.id,
        displayPlayerName(player)
      );
    }

    return map;
  }, [players]);

  const matchDateMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const match of matches) {
      const matchday = matchdays.find(
        (day) => day.id === match.matchday_id
      );

      if (matchday) {
        map.set(
          match.id,
          matchday.match_date
        );
      }
    }

    return map;
  }, [matches, matchdays]);

  const playerResults = useMemo(() => {
    const results: PlayerResult[] = [];

    for (const match of matches) {
      const matchPlayersForMatch =
        matchPlayers.filter(
          (item) =>
            item.match_id === match.id
        );

      const matchSets = sets
        .filter(
          (set) =>
            set.match_id === match.id
        )
        .sort(
          (a, b) =>
            a.set_number - b.set_number
        );

      const winner =
        matchWinner(matchSets);

      const matchDate =
        matchDateMap.get(match.id);

      if (!matchDate) {
        continue;
      }

      for (const player of matchPlayersForMatch) {
        let setsWon = 0;
        let setsLost = 0;
        let gamesWon = 0;
        let gamesLost = 0;

        for (const set of matchSets) {
          const playerScore =
            player.team === "A"
              ? set.team1_score
              : set.team2_score;

          const opponentScore =
            player.team === "A"
              ? set.team2_score
              : set.team1_score;

          gamesWon += playerScore;
          gamesLost += opponentScore;

          if (
            playerScore > opponentScore
          ) {
            setsWon++;
          } else if (
            opponentScore > playerScore
          ) {
            setsLost++;
          }
        }

        let result: "win" | "loss" | "draw";

        if (!winner) {
          result = "draw";
        } else if (
          winner === player.team
        ) {
          result = "win";
        } else {
          result = "loss";
        }

        results.push({
          playerId: player.player_id,
          matchDate,
          result,
          setsWon,
          setsLost,
          gamesWon,
          gamesLost,
        });
      }
    }

    return results;
  }, [
    matches,
    matchPlayers,
    sets,
    matchDateMap,
  ]);

  const trophies = useMemo(() => {
    const result: Trophy[] = [];

    if (playerResults.length === 0) {
      return result;
    }

    /*
     * 🔥 LA STRISCIA
     *
     * Cerchiamo la miglior sequenza consecutiva
     * di vittorie per ciascun giocatore.
     */

    let streakWinnerId = "";
    let bestStreak = 0;

    for (const player of players) {
      const resultsForPlayer =
        playerResults
          .filter(
            (item) =>
              item.playerId === player.id
          )
          .sort((a, b) =>
            a.matchDate.localeCompare(
              b.matchDate
            )
          );

      let currentStreak = 0;

      for (const item of resultsForPlayer) {
        if (item.result === "win") {
          currentStreak++;

          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
            streakWinnerId = player.id;
          }
        } else {
          currentStreak = 0;
        }
      }
    }

    if (bestStreak > 0) {
      result.push({
        icon: "🔥",
        title: "La Striscia",
        description:
          "Maggior numero di vittorie consecutive",
        playerName:
          playerMap.get(streakWinnerId) ||
          "Giocatore",
        value: `${bestStreak} vittorie`,
      });
    }

    /*
     * 👑 IL DOMINATORE
     *
     * Maggior numero di vittorie complessive.
     */

    let dominantPlayerId = "";
    let dominantWins = 0;

    for (const player of players) {
      const wins =
        playerResults.filter(
          (item) =>
            item.playerId === player.id &&
            item.result === "win"
        ).length;

      if (wins > dominantWins) {
        dominantWins = wins;
        dominantPlayerId = player.id;
      }
    }

    if (dominantWins > 0) {
      result.push({
        icon: "👑",
        title: "Il Dominatore",
        description:
          "Maggior numero di vittorie complessive",
        playerName:
          playerMap.get(
            dominantPlayerId
          ) || "Giocatore",
        value: `${dominantWins} vittorie`,
      });
    }

    /*
     * 🎯 IL PIÙ PRESENTE
     *
     * Maggior numero di partite giocate.
     */

    let presentPlayerId = "";
    let mostPlayed = 0;

    for (const player of players) {
      const played =
        playerResults.filter(
          (item) =>
            item.playerId === player.id
        ).length;

      if (played > mostPlayed) {
        mostPlayed = played;
        presentPlayerId = player.id;
      }
    }

    if (mostPlayed > 0) {
      result.push({
        icon: "🎯",
        title: "Il più presente",
        description:
          "Maggior numero di partite giocate",
        playerName:
          playerMap.get(
            presentPlayerId
          ) || "Giocatore",
        value: `${mostPlayed} partite`,
      });
    }

    /*
     * ⭐ GIOCATORE DEL MESE
     *
     * Consideriamo il mese dell'ultima giornata
     * disputata.
     *
     * Criteri:
     * 1. differenza vittorie - sconfitte
     * 2. differenza set
     * 3. differenza game
     */

    if (matchdays.length > 0) {
      const latestDate =
        matchdays
          .map((day) => day.match_date)
          .sort()
          .at(-1);

      if (latestDate) {
        const latestMonth =
          latestDate.slice(0, 7);

        const monthlyResults =
          playerResults.filter(
            (item) =>
              item.matchDate.slice(
                0,
                7
              ) === latestMonth
          );

        type MonthlyStats = {
          playerId: string;
          wins: number;
          losses: number;
          setsWon: number;
          setsLost: number;
          gamesWon: number;
          gamesLost: number;
        };

        const monthlyStats: MonthlyStats[] =
          players.map((player) => {
            const playerMonthly =
              monthlyResults.filter(
                (item) =>
                  item.playerId ===
                  player.id
              );

            return {
              playerId: player.id,
              wins: playerMonthly.filter(
                (item) =>
                  item.result ===
                  "win"
              ).length,
              losses:
                playerMonthly.filter(
                  (item) =>
                    item.result ===
                    "loss"
                ).length,
              setsWon:
                playerMonthly.reduce(
                  (total, item) =>
                    total + item.setsWon,
                  0
                ),
              setsLost:
                playerMonthly.reduce(
                  (total, item) =>
                    total + item.setsLost,
                  0
                ),
              gamesWon:
                playerMonthly.reduce(
                  (total, item) =>
                    total + item.gamesWon,
                  0
                ),
              gamesLost:
                playerMonthly.reduce(
                  (total, item) =>
                    total + item.gamesLost,
                  0
                ),
            };
          });

        monthlyStats.sort((a, b) => {
          const winDifferenceA =
            a.wins - a.losses;
          const winDifferenceB =
            b.wins - b.losses;

          if (
            winDifferenceA !==
            winDifferenceB
          ) {
            return (
              winDifferenceB -
              winDifferenceA
            );
          }

          const setDifferenceA =
            a.setsWon - a.setsLost;
          const setDifferenceB =
            b.setsWon - b.setsLost;

          if (
            setDifferenceA !==
            setDifferenceB
          ) {
            return (
              setDifferenceB -
              setDifferenceA
            );
          }

          const gameDifferenceA =
            a.gamesWon - a.gamesLost;
          const gameDifferenceB =
            b.gamesWon - b.gamesLost;

          return (
            gameDifferenceB -
            gameDifferenceA
          );
        });

        const monthlyWinner =
          monthlyStats.find(
            (item) =>
              item.wins > 0 ||
              item.losses > 0
          );

        if (monthlyWinner) {
          const winDifference =
            monthlyWinner.wins -
            monthlyWinner.losses;

          const setDifference =
            monthlyWinner.setsWon -
            monthlyWinner.setsLost;

          const gameDifference =
            monthlyWinner.gamesWon -
            monthlyWinner.gamesLost;

          result.push({
            icon: "⭐",
            title:
              "Giocatore del mese",
            description:
              `Miglior rendimento · ${formatMonth(
                latestDate
              )}`,
            playerName:
              playerMap.get(
                monthlyWinner.playerId
              ) || "Giocatore",
            value:
              winDifference >= 0
                ? `+${winDifference} vittorie`
                : `${winDifference} vittorie`,
            detail:
              `Set ${setDifference >= 0 ? "+" : ""}${setDifference} · Game ${gameDifference >= 0 ? "+" : ""}${gameDifference}`,
          });
        }
      }
    }

    return result;
  }, [
    players,
    playerResults,
    playerMap,
    matchdays,
  ]);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            PADEL ON TUESDAY
          </p>

          <h1>Trofei</h1>

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
              🏆
            </div>

            <h3>
              Calcolo dei trofei...
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
      ) : trophies.length === 0 ? (
        <section className="players-card">
          <div className="empty-ranking">
            <div className="empty-icon">
              🏆
            </div>

            <h3>
              I trofei devono ancora
              essere assegnati.
            </h3>

            <p>
              Registra qualche partita per
              iniziare a costruire i record
              della stagione.
            </p>
          </div>
        </section>
      ) : (
        <section className="players-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                RICONOSCIMENTI
              </p>

              <h2>
                I record della stagione
              </h2>
            </div>

            <span className="players-count">
              {trophies.length} trofei
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {trophies.map((trophy) => (
              <div
                key={trophy.title}
                style={{
                  border:
                    "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 18,
                  padding: 18,
                  background:
                    "rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize: 28,
                      background:
                        "rgba(0,0,0,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    {trophy.icon}
                  </div>

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing:
                          "0.08em",
                        opacity: 0.55,
                      }}
                    >
                      {trophy.title.toUpperCase()}
                    </p>

                    <h3
                      style={{
                        margin:
                          "4px 0 2px",
                        fontSize: 20,
                      }}
                    >
                      {trophy.playerName}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        opacity: 0.65,
                      }}
                    >
                      {trophy.description}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 18,
                      }}
                    >
                      {trophy.value}
                    </strong>

                    {trophy.detail && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          opacity: 0.55,
                        }}
                      >
                        {trophy.detail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop:
                "1px solid rgba(0,0,0,0.08)",
              fontSize: 13,
              opacity: 0.6,
              lineHeight: 1.5,
            }}
          >
            I trofei si aggiornano
            automaticamente ogni volta che
            vengono registrati nuovi risultati.
          </div>
        </section>
      )}
    </main>
  );
}