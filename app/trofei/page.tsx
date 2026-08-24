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
  matchId: string;
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
    const scoreA = Number(set.team1_score);
    const scoreB = Number(set.team2_score);

    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) {
      continue;
    }

    if (scoreA > scoreB) {
      teamAWins++;
    } else if (scoreB > scoreA) {
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

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("it-IT", {
    day: "numeric",
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
          .select("id, name, first_name, last_name"),

        supabase
          .from("matchdays")
          .select("id, match_date")
          .order("match_date", {
            ascending: true,
          }),

        supabase
          .from("matches")
          .select("id, matchday_id, court")
          .order("court"),

        supabase
          .from("match_players")
          .select("match_id, player_id, team"),

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
      setMatchPlayers(matchPlayersResult.data ?? []);
      setSets(setsResult.data ?? []);
    } catch (error) {
      console.error("Errore caricamento trofei:", error);

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
      map.set(player.id, displayPlayerName(player));
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
        map.set(match.id, matchday.match_date);
      }
    }

    return map;
  }, [matches, matchdays]);

  /*
   * ============================================================
   * RISULTATO DI OGNI GIOCATORE IN OGNI PARTITA
   * ============================================================
   */

  const playerResults = useMemo(() => {
    const results: PlayerResult[] = [];

    for (const match of matches) {
      const playersForMatch = matchPlayers.filter(
        (item) => item.match_id === match.id
      );

      if (playersForMatch.length !== 4) {
        continue;
      }

      const teamA = playersForMatch.filter(
        (item) => item.team === "A"
      );

      const teamB = playersForMatch.filter(
        (item) => item.team === "B"
      );

      if (teamA.length !== 2 || teamB.length !== 2) {
        continue;
      }

      const matchSets = sets
        .filter((set) => set.match_id === match.id)
        .sort((a, b) => a.set_number - b.set_number);

      if (matchSets.length === 0) {
        continue;
      }

      const winner = matchWinner(matchSets);
      const matchDate = matchDateMap.get(match.id);

      if (!matchDate) {
        continue;
      }

      for (const player of playersForMatch) {
        let setsWon = 0;
        let setsLost = 0;
        let gamesWon = 0;
        let gamesLost = 0;

        for (const set of matchSets) {
          const playerScore =
            player.team === "A"
              ? Number(set.team1_score)
              : Number(set.team2_score);

          const opponentScore =
            player.team === "A"
              ? Number(set.team2_score)
              : Number(set.team1_score);

          if (
            Number.isNaN(playerScore) ||
            Number.isNaN(opponentScore)
          ) {
            continue;
          }

          gamesWon += playerScore;
          gamesLost += opponentScore;

          if (playerScore > opponentScore) {
            setsWon++;
          } else if (opponentScore > playerScore) {
            setsLost++;
          }
        }

        let result: "win" | "loss" | "draw";

        if (!winner) {
          result = "draw";
        } else if (winner === player.team) {
          result = "win";
        } else {
          result = "loss";
        }

        results.push({
          playerId: player.player_id,
          matchId: match.id,
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
  }, [matches, matchPlayers, sets, matchDateMap]);

  const trophies = useMemo(() => {
    const result: Trophy[] = [];

    if (playerResults.length === 0) {
      return result;
    }

    function names(ids: string[]) {
      return ids
        .map((id) => playerMap.get(id) || "Giocatore")
        .join(" · ");
    }

    /*
     * ============================================================
     * 🎰 IL COLPO GROSSO
     *
     * La vittoria con il maggiore margine complessivo di game.
     * In caso di pari merito, il trofeo viene condiviso.
     * ============================================================
     */

    let bestGameMargin = -1;
    let colpoGrossoPlayers: string[] = [];
    let colpoGrossoDate = "";

    for (const match of matches) {
      const matchResults = playerResults.filter(
        (item) => item.matchId === match.id
      );

      if (matchResults.length !== 4) {
        continue;
      }

      const winnerResult = matchResults.find(
        (item) => item.result === "win"
      );

      if (!winnerResult) {
        continue;
      }

      const margin =
        winnerResult.gamesWon - winnerResult.gamesLost;

      if (margin > bestGameMargin) {
        bestGameMargin = margin;

        colpoGrossoPlayers = matchResults
          .filter((item) => item.result === "win")
          .map((item) => item.playerId);

        colpoGrossoDate = winnerResult.matchDate;
      } else if (margin === bestGameMargin) {
        colpoGrossoPlayers = Array.from(
          new Set([
            ...colpoGrossoPlayers,
            ...matchResults
              .filter((item) => item.result === "win")
              .map((item) => item.playerId),
          ])
        );
      }
    }

    if (
      bestGameMargin >= 0 &&
      colpoGrossoPlayers.length > 0
    ) {
      result.push({
        icon: "🎰",
        title: "Il Colpo Grosso",
        description:
          "La vittoria con il margine più largo",
        playerName: names(colpoGrossoPlayers),
        value: `+${bestGameMargin} game`,
        detail: colpoGrossoDate
          ? formatDate(colpoGrossoDate)
          : undefined,
      });
    }

    /*
     * ============================================================
     * 🧱 IL MURO
     *
     * Più vittorie ottenute al tie-break.
     *
     * Un set 7-6 è considerato concluso al tie-break.
     * ============================================================
     */

    const tieBreakWins = new Map<string, number>();

    for (const player of players) {
      tieBreakWins.set(player.id, 0);
    }

    for (const match of matches) {
      const matchResults = playerResults.filter(
        (item) => item.matchId === match.id
      );

      const winningPlayers = matchResults
        .filter((item) => item.result === "win")
        .map((item) => item.playerId);

      if (winningPlayers.length !== 2) {
        continue;
      }

      const matchSets = sets.filter(
        (set) => set.match_id === match.id
      );

      const hadTieBreak = matchSets.some((set) => {
        const scoreA = Number(set.team1_score);
        const scoreB = Number(set.team2_score);

        return (
          (scoreA === 7 && scoreB === 6) ||
          (scoreA === 6 && scoreB === 7)
        );
      });

      if (hadTieBreak) {
        for (const playerId of winningPlayers) {
          tieBreakWins.set(
            playerId,
            (tieBreakWins.get(playerId) || 0) + 1
          );
        }
      }
    }

    const maxTieBreakWins = Math.max(
      0,
      ...Array.from(tieBreakWins.values())
    );

    if (maxTieBreakWins > 0) {
      const winners = Array.from(tieBreakWins.entries())
        .filter(([, value]) => value === maxTieBreakWins)
        .map(([id]) => id);

      result.push({
        icon: "🧱",
        title: "Il Muro",
        description:
          "Più vittorie ottenute al tie-break",
        playerName: names(winners),
        value: `${maxTieBreakWins} ${
          maxTieBreakWins === 1
            ? "vittoria"
            : "vittorie"
        }`,
      });
    }

    /*
     * ============================================================
     * 🔥 LA STRISCIA
     *
     * Più vittorie consecutive.
     * Minimo: 2.
     * ============================================================
     */

    let bestStreak = 0;
    const streakWinners: string[] = [];

    for (const player of players) {
      const playerResultsSorted = playerResults
        .filter((item) => item.playerId === player.id)
        .sort((a, b) =>
          a.matchDate.localeCompare(b.matchDate)
        );

      let currentStreak = 0;
      let playerBestStreak = 0;

      for (const item of playerResultsSorted) {
        if (item.result === "win") {
          currentStreak++;
          playerBestStreak = Math.max(
            playerBestStreak,
            currentStreak
          );
        } else {
          currentStreak = 0;
        }
      }

      if (playerBestStreak > bestStreak) {
        bestStreak = playerBestStreak;
        streakWinners.length = 0;
        streakWinners.push(player.id);
      } else if (
        playerBestStreak === bestStreak &&
        playerBestStreak >= 2
      ) {
        streakWinners.push(player.id);
      }
    }

    if (
      bestStreak >= 2 &&
      streakWinners.length > 0
    ) {
      result.push({
        icon: "🔥",
        title: "La Striscia",
        description:
          "La più lunga sequenza di vittorie consecutive",
        playerName: names(
          Array.from(new Set(streakWinners))
        ),
        value: `${bestStreak} vittorie`,
      });
    }

    /*
     * ============================================================
     * ⭐ GIOCATORE DEL MESE
     * ============================================================
     */

    const months = Array.from(
      new Set(
        playerResults.map((item) =>
          item.matchDate.slice(0, 7)
        )
      )
    ).sort();

    const latestMonth = months.at(-1);

    if (latestMonth) {
      const monthlyWins = new Map<string, number>();

      for (const player of players) {
        monthlyWins.set(player.id, 0);
      }

      for (const item of playerResults) {
        if (
          item.matchDate.slice(0, 7) === latestMonth &&
          item.result === "win"
        ) {
          monthlyWins.set(
            item.playerId,
            (monthlyWins.get(item.playerId) || 0) + 1
          );
        }
      }

      const maxMonthlyWins = Math.max(
        0,
        ...Array.from(monthlyWins.values())
      );

      if (maxMonthlyWins > 0) {
        const winners = Array.from(
          monthlyWins.entries()
        )
          .filter(
            ([, value]) => value === maxMonthlyWins
          )
          .map(([id]) => id);

        const latestDate = playerResults
          .filter(
            (item) =>
              item.matchDate.slice(0, 7) ===
              latestMonth
          )
          .map((item) => item.matchDate)
          .sort()
          .at(-1);

        result.push({
          icon: "⭐",
          title: "Giocatore del Mese",
          description: latestDate
            ? `Più vittorie · ${formatMonth(
                latestDate
              )}`
            : "Più vittorie nel mese",
          playerName: names(winners),
          value: `${maxMonthlyWins} ${
            maxMonthlyWins === 1
              ? "vittoria"
              : "vittorie"
          }`,
        });
      }
    }

    /*
     * ============================================================
     * 🎢 MONTAGNE RUSSE
     * ============================================================
     */

    if (latestMonth) {
      type DayPerformance = {
        date: string;
        resultRank: number;
        setRank: number;
        gameDiff: number;
      };

      const monthlyDayPerformance = new Map<
        string,
        DayPerformance[]
      >();

      for (const player of players) {
        monthlyDayPerformance.set(player.id, []);
      }

      for (const player of players) {
        const playerMonthResults = playerResults.filter(
          (item) =>
            item.playerId === player.id &&
            item.matchDate.slice(0, 7) === latestMonth
        );

        const dates = Array.from(
          new Set(
            playerMonthResults.map(
              (item) => item.matchDate
            )
          )
        );

        for (const date of dates) {
          const dayResults = playerMonthResults.filter(
            (item) => item.matchDate === date
          );

          if (dayResults.length === 0) {
            continue;
          }

          const item = dayResults[0];

          let resultRank = 0;

          if (item.result === "win") {
            resultRank = 2;
          } else if (item.result === "draw") {
            resultRank = 1;
          }

          let setRank = 0;

          if (item.result === "win") {
            if (
              item.setsWon === 2 &&
              item.setsLost === 0
            ) {
              setRank = 2;
            } else if (
              item.setsWon > item.setsLost
            ) {
              setRank = 1;
            }
          } else if (item.result === "loss") {
            if (
              item.setsWon === 1 &&
              item.setsLost === 2
            ) {
              setRank = 1;
            }
          }

          const gameDiff =
            item.gamesWon - item.gamesLost;

          monthlyDayPerformance
            .get(player.id)
            ?.push({
              date,
              resultRank,
              setRank,
              gameDiff,
            });
        }
      }

      function comparePerformance(
        a: DayPerformance,
        b: DayPerformance
      ) {
        if (a.resultRank !== b.resultRank) {
          return a.resultRank - b.resultRank;
        }

        if (a.setRank !== b.setRank) {
          return a.setRank - b.setRank;
        }

        return a.gameDiff - b.gameDiff;
      }

      let largestRange = -1;
      const rollerCoasterWinners: string[] = [];

      for (const player of players) {
        const performances =
          monthlyDayPerformance.get(player.id) || [];

        if (performances.length < 2) {
          continue;
        }

        let best = performances[0];
        let worst = performances[0];

        for (const performance of performances) {
          if (
            comparePerformance(
              performance,
              best
            ) > 0
          ) {
            best = performance;
          }

          if (
            comparePerformance(
              performance,
              worst
            ) < 0
          ) {
            worst = performance;
          }
        }

        const performanceValue = (
          performance: DayPerformance
        ) =>
          performance.resultRank * 10000 +
          performance.setRank * 1000 +
          performance.gameDiff;

        const range =
          performanceValue(best) -
          performanceValue(worst);

        if (range > largestRange) {
          largestRange = range;
          rollerCoasterWinners.length = 0;
          rollerCoasterWinners.push(player.id);
        } else if (range === largestRange) {
          rollerCoasterWinners.push(player.id);
        }
      }

      if (
        largestRange > 0 &&
        rollerCoasterWinners.length > 0
      ) {
        result.push({
          icon: "🎢",
          title: "Montagne Russe",
          description:
            `Maggiore oscillazione di rendimento · ${formatMonth(
              `${latestMonth}-01`
            )}`,
          playerName: names(
            Array.from(
              new Set(rollerCoasterWinners)
            )
          ),
          value: "↑↓",
        });
      }
    }

    /*
     * ============================================================
     * 🐢 LA RESURREZIONE
     * ============================================================
     */

    let longestNegativeStreak = 0;
    const resurrectionWinners: string[] = [];

    for (const player of players) {
      const playerResultsSorted = playerResults
        .filter((item) => item.playerId === player.id)
        .sort((a, b) =>
          a.matchDate.localeCompare(b.matchDate)
        );

      let currentLossStreak = 0;
      let playerLongestLossStreak = 0;

      for (const item of playerResultsSorted) {
        if (item.result === "loss") {
          currentLossStreak++;
        } else if (item.result === "win") {
          if (currentLossStreak > 2) {
            playerLongestLossStreak = Math.max(
              playerLongestLossStreak,
              currentLossStreak
            );
          }

          currentLossStreak = 0;
        } else {
          currentLossStreak = 0;
        }
      }

      if (
        playerLongestLossStreak >
        longestNegativeStreak
      ) {
        longestNegativeStreak =
          playerLongestLossStreak;

        resurrectionWinners.length = 0;
        resurrectionWinners.push(player.id);
      } else if (
        playerLongestLossStreak ===
          longestNegativeStreak &&
        playerLongestLossStreak > 2
      ) {
        resurrectionWinners.push(player.id);
      }
    }

    if (
      longestNegativeStreak > 2 &&
      resurrectionWinners.length > 0
    ) {
      result.push({
        icon: "🐢",
        title: "La Resurrezione",
        description:
          "Tornato alla vittoria dopo la striscia negativa più lunga",
        playerName: names(
          Array.from(
            new Set(resurrectionWinners)
          )
        ),
        value: `${longestNegativeStreak} sconfitte`,
      });
    }

    /*
     * ============================================================
     * ⚡ COPPIA D'ASSI
     * ============================================================
     */

    type PairStats = {
      playerIds: [string, string];
      wins: number;
      played: number;
    };

    const pairStats = new Map<string, PairStats>();

    for (const match of matches) {
      const playersForMatch = matchPlayers.filter(
        (item) => item.match_id === match.id
      );

      if (playersForMatch.length !== 4) {
        continue;
      }

      const teamA = playersForMatch
        .filter((item) => item.team === "A")
        .map((item) => item.player_id)
        .sort();

      const teamB = playersForMatch
        .filter((item) => item.team === "B")
        .map((item) => item.player_id)
        .sort();

      const matchResult = playerResults.filter(
        (item) => item.matchId === match.id
      );

      const teams = [
        {
          ids: teamA as [string, string],
          players: matchResult.filter(
            (item) => teamA.includes(item.playerId)
          ),
        },
        {
          ids: teamB as [string, string],
          players: matchResult.filter(
            (item) => teamB.includes(item.playerId)
          ),
        },
      ];

      for (const team of teams) {
        const key = team.ids.join("|");

        if (!pairStats.has(key)) {
          pairStats.set(key, {
            playerIds: team.ids,
            wins: 0,
            played: 0,
          });
        }

        const stats = pairStats.get(key)!;
        stats.played++;

        if (
          team.players.length > 0 &&
          team.players.every(
            (item) => item.result === "win"
          )
        ) {
          stats.wins++;
        }
      }
    }

    let maxPairWins = 0;

    for (const stats of pairStats.values()) {
      maxPairWins = Math.max(
        maxPairWins,
        stats.wins
      );
    }

    if (maxPairWins > 0) {
      const winningPairs = Array.from(
        pairStats.values()
      ).filter(
        (stats) => stats.wins === maxPairWins
      );

      const pairNames = winningPairs
        .map(
          (pair) =>
            `${playerMap.get(
              pair.playerIds[0]
            ) || "Giocatore"} & ${
              playerMap.get(
                pair.playerIds[1]
              ) || "Giocatore"
            }`
        )
        .join(" · ");

      result.push({
        icon: "⚡",
        title: "Coppia d'Assi",
        description:
          "La coppia con più vittorie insieme",
        playerName: pairNames,
        value: `${maxPairWins} ${
          maxPairWins === 1
            ? "vittoria"
            : "vittorie"
        }`,
      });
    }

    /*
     * ============================================================
     * 🗓️ PRESENZA D'ONORE
     * ============================================================
     */

    const playedMap = new Map<string, number>();

    for (const player of players) {
      playedMap.set(player.id, 0);
    }

    for (const item of playerResults) {
      playedMap.set(
        item.playerId,
        (playedMap.get(item.playerId) || 0) + 1
      );
    }

    const maxPlayed = Math.max(
      0,
      ...Array.from(playedMap.values())
    );

    if (maxPlayed > 0) {
      const winners = Array.from(
        playedMap.entries()
      )
        .filter(([, value]) => value === maxPlayed)
        .map(([id]) => id);

      result.push({
        icon: "🗓️",
        title: "Presenza d'Onore",
        description:
          "Più partite disputate nella stagione",
        playerName: names(winners),
        value: `${maxPlayed} ${
          maxPlayed === 1
            ? "partita"
            : "partite"
        }`,
      });
    }

    return result;
  }, [
    players,
    playerResults,
    playerMap,
    matches,
    sets,
    matchdays,
  ]);

  return (
    <main className="dashboard-page">

      <header className="dashboard-header">

        <div>
          <p className="eyebrow">
            PADEL ON TUESDAY
          </p>

          <h1>
            Trofei
          </h1>

          <p className="dashboard-subtitle">
            Perché non si vince solo a fine stagione.
          </p>
        </div>

        

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

            <h3>
              Errore
            </h3>

            <p>
              {message}
            </p>

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
              iniziare a costruire i momenti
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
                I momenti della stagione
              </h2>

            </div>

            <span className="players-count">
              {trophies.length}{" "}
              {trophies.length === 1
                ? "trofeo"
                : "trofei"}
            </span>

          </div>


          <div className="trophies-list">

            {trophies.map((trophy, index) => (
  <div key={trophy.title}>

    <article className="trophy-item">

  <div className="trophy-item-top">

    <span className="trophy-number">
      {String(index + 1).padStart(2, "0")}
    </span>

    <span className="trophy-icon">
      {trophy.icon}
    </span>

  </div>

  <div
    className="trophy-item-content"
    style={{
      marginTop: 6,
    }}
  >

    <p
      className="trophy-item-kicker"
      style={{
        marginBottom: 3,
      }}
    >
      {trophy.title.toUpperCase()}
    </p>

    <h3
      style={{
        margin: "0 0 3px",
      }}
    >
      {trophy.playerName}
    </h3>

    <p
      className="trophy-description"
      style={{
        margin: 0,
      }}
    >
      {trophy.description}
    </p>

  </div>

  <div
    className="trophy-item-result"
    style={{
      marginTop: 8,
    }}
  >

    <strong>
      {trophy.value}
    </strong>

    {trophy.detail && (
      <span>
        {trophy.detail}
      </span>
    )}

  </div>

</article>

{index < trophies.length - 1 && (
  <div
    style={{
      width: "100%",
      height: "1px",
      backgroundColor: "#4a4a4a",
      opacity: 0.55,
      margin: "4px 0 22px",
    }}
  />
)}

  </div>
))}

          </div>


          <div className="trophies-note">
            I trofei si aggiornano
            automaticamente ogni volta che
            vengono registrati nuovi risultati.
          </div>

        </section>

      )}

    </main>
  );
}