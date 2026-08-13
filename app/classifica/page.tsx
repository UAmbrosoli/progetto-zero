"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

type Player = {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
};

type MatchPlayer = {
  match_id: string;
  player_id: string;
  team: string;
};

type Match = {
  id: string;
  court: number;
};

type MatchSet = {
  match_id: string;
  set_number: number;
  team1_score: number;
  team2_score: number;
};

type RankingPlayer = {
  id: string;
  name: string;
  lastName: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
};

function displayName(player: Player) {
  if (player.last_name && player.first_name) {
    return `${player.last_name} ${player.first_name}`;
  }

  return player.name;
}

export default function Classifica() {
  const [ranking, setRanking] = useState<RankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRanking();
  }, []);

  async function loadRanking() {
    setLoading(true);
    setMessage("");

    try {
      const [
        playersResult,
        matchesResult,
        matchPlayersResult,
        setsResult,
      ] = await Promise.all([
        supabase
          .from("players")
          .select("id, name, first_name, last_name"),

        supabase
          .from("matches")
          .select("id, court"),

        supabase
          .from("match_players")
          .select("match_id, player_id, team"),

        supabase
          .from("match_sets")
          .select(
            "match_id, set_number, team1_score, team2_score"
          ),
      ]);

      if (playersResult.error) {
        throw playersResult.error;
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

      const players = playersResult.data ?? [];
      const matches = matchesResult.data ?? [];
      const matchPlayers =
        matchPlayersResult.data ?? [];
      const sets = setsResult.data ?? [];

      const stats = new Map<
        string,
        RankingPlayer
      >();

      for (const player of players) {
        stats.set(player.id, {
          id: player.id,
          name: displayName(player),
          lastName:
            player.last_name ||
            player.name ||
            "",
          points: 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
        });
      }

      for (const match of matches) {
        const playersInMatch =
          matchPlayers.filter(
            (player) =>
              player.match_id === match.id
          );

        if (playersInMatch.length !== 4) {
          continue;
        }

        const teamA = playersInMatch
          .filter((player) => player.team === "A")
          .map((player) => player.player_id);

        const teamB = playersInMatch
          .filter((player) => player.team === "B")
          .map((player) => player.player_id);

        if (
          teamA.length !== 2 ||
          teamB.length !== 2
        ) {
          continue;
        }

        const matchSets = sets.filter(
          (set) => set.match_id === match.id
        );

        if (matchSets.length === 0) {
          continue;
        }

        let teamAGames = 0;
        let teamBGames = 0;
        let teamASets = 0;
        let teamBSets = 0;

        for (const set of matchSets) {
          const scoreA = Number(set.team1_score);
          const scoreB = Number(set.team2_score);

          if (
            Number.isNaN(scoreA) ||
            Number.isNaN(scoreB)
          ) {
            continue;
          }

          teamAGames += scoreA;
          teamBGames += scoreB;

          if (scoreA > scoreB) {
            teamASets++;
          } else if (scoreB > scoreA) {
            teamBSets++;
          }
        }

        if (teamASets === 0 && teamBSets === 0) {
          continue;
        }

        let resultA: "win" | "draw" | "loss";

        if (teamASets > teamBSets) {
          resultA = "win";
        } else if (teamASets < teamBSets) {
          resultA = "loss";
        } else {
          resultA = "draw";
        }

        for (const playerId of [
          ...teamA,
          ...teamB,
        ]) {
          const player = stats.get(playerId);

          if (!player) {
            continue;
          }

          player.played++;

          const isTeamA = teamA.includes(playerId);

          if (isTeamA) {
            player.gamesWon += teamAGames;
            player.gamesLost += teamBGames;
            player.setsWon += teamASets;
            player.setsLost += teamBSets;
          } else {
            player.gamesWon += teamBGames;
            player.gamesLost += teamAGames;
            player.setsWon += teamBSets;
            player.setsLost += teamASets;
          }

          if (resultA === "draw") {
            player.draws++;
            player.points += 1;
          } else {
            const won =
              (isTeamA && resultA === "win") ||
              (!isTeamA && resultA === "loss");

            if (won) {
              player.wins++;
              player.points += 2;
            } else {
              player.losses++;
            }
          }
        }
      }

      const sortedRanking = Array.from(
        stats.values()
      ).sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }

        const setDiffA =
          a.setsWon - a.setsLost;

        const setDiffB =
          b.setsWon - b.setsLost;

        if (setDiffB !== setDiffA) {
          return setDiffB - setDiffA;
        }

        const gameDiffA =
          a.gamesWon - a.gamesLost;

        const gameDiffB =
          b.gamesWon - b.gamesLost;

        if (gameDiffB !== gameDiffA) {
          return gameDiffB - gameDiffA;
        }

        return a.lastName.localeCompare(
          b.lastName,
          "it"
        );
      });

      setRanking(sortedRanking);
    } catch (error) {
      console.error(
        "Errore caricamento classifica:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a caricare la classifica."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
  <main className="dashboard-page">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">
          PADEL ON TUESDAY
        </p>

        <h1>Classifica</h1>

        <p className="dashboard-subtitle">
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
          <p className="eyebrow">
            CAMPIONATO
          </p>

          <h2>La corsa al titolo</h2>
        </div>

        <span className="players-count">
          {ranking.length} giocatori
        </span>
      </div>

      {loading ? (
        <div className="empty-ranking">
          <div className="empty-icon">
            🎾
          </div>

          <h3>
            Caricamento classifica...
          </h3>
        </div>
      ) : message ? (
        <div className="empty-ranking">
          <div className="empty-icon">
            ⚠️
          </div>

          <h3>Errore</h3>

          <p>{message}</p>
        </div>
      ) : ranking.length === 0 ? (
        <div className="empty-ranking">
          <div className="empty-icon">
            🏆
          </div>

          <h3>
            La classifica è pronta a partire.
          </h3>

          <p>
            Registra la prima giornata per
            vedere i giocatori comparire qui.
          </p>
        </div>
      ) : (
        <div className="players-list">
          {ranking.map(
            (player, index) => (
              <div
                className="player-row"
                key={player.id}
              >
                <div className="player-number">
                  {String(index + 1).padStart(
                    2,
                    "0"
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <strong>
                    {player.name}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      opacity: 0.65,
                    }}
                  >
                    {player.played}{" "}
                    partite ·{" "}
                    {player.wins} V ·{" "}
                    {player.draws} P ·{" "}
                    {player.losses} S
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    minWidth: 70,
                  }}
                >
                  <strong
                    style={{
                      fontSize: 24,
                    }}
                  >
                    {player.points}
                  </strong>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      opacity: 0.55,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    PUNTI
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>

    <section
      className="dashboard-grid"
      style={{ marginTop: 24 }}
    >
      <Link
        href="/storico"
        className="menu-card"
      >
        <div className="menu-icon">
          📊
        </div>

        <div>
          <h3>Storico</h3>

          <p>
            Rivedi tutte le giornate e le
            partite della stagione.
          </p>
        </div>

        <span className="card-arrow">
          →
        </span>
      </Link>

      <Link
        href="/trofei"
        className="menu-card"
      >
        <div className="menu-icon">
          🏅
        </div>

        <div>
          <h3>Trofei</h3>

          <p>
            Scopri record, serie e
            riconoscimenti della stagione.
          </p>
        </div>

        <span className="card-arrow">
          →
        </span>
      </Link>
    </section>
  </main>
);
}