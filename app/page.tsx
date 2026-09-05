"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

type Player = {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
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

type Moment = {
  id: string;
  match_id: string;
  comment: string;
  created_at: string;
};

type Availability = {
  player_id: string;
  match_date: string;
  status: "present" | "absent";
};

type RankingPlayer = {
  player: Player;
  points: number;
  wins: number;
  draws: number;
  losses: number;
};

type HomeData = {
  leader: RankingPlayer | null;
  presentCount: number;
  absentCount: number;
  unansweredCount: number;
  leaders: RankingPlayer[];
  ranking: RankingPlayer[];
  matchdaysPlayed: number;
  totalMatches: number;
  lastMoment: {
    moment: Moment;
    match: Match;
    matchday: Matchday;
    playersA: Player[];
    playersB: Player[];
    sets: MatchSet[];
  } | null;
};

function getCalendarDays() {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();
  const currentDay = today.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const start = Math.max(1, currentDay - 5);
  const end = Math.min(daysInMonth, currentDay + 5);

  const daysUntilTuesday = (2 - today.getDay() + 7) % 7;
const nextTuesdayDay = currentDay + daysUntilTuesday;

  const days = [];

  for (let day = start; day <= end; day++) {
    const date = new Date(year, month, day);

    days.push({
      day,
      weekday: new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
      })
        .format(date)
        .replace(".", ""),
      isToday: day === currentDay,
isNextTuesday: day === nextTuesdayDay,
    });
  }

  return {
    month: new Intl.DateTimeFormat("it-IT", {
      month: "short",
    }).format(today),

    year,

    days,
  };
}

function getPlayerName(player: Player) {
  return player.first_name || player.name;
}

function getMatchResult(sets: MatchSet[]) {
  let teamAWins = 0;
  let teamBWins = 0;

  sets.forEach((set) => {
    if (set.team1_score > set.team2_score) {
      teamAWins++;
    } else if (set.team2_score > set.team1_score) {
      teamBWins++;
    }
  });

  if (teamAWins > teamBWins) {
    return "A";
  }

  if (teamBWins > teamAWins) {
    return "B";
  }

  return "D";
}
function getNextTuesday() {
  const today = new Date();
  const day = today.getDay();

  const daysUntilTuesday =
    day === 2 ? 7 : (2 - day + 7) % 7;

  const nextTuesday = new Date(today);
  nextTuesday.setDate(
    today.getDate() + daysUntilTuesday
  );

  return nextTuesday.toISOString().slice(0, 10);
}
async function loadHomeData(): Promise<HomeData> {
  const nextTuesday = getNextTuesday();

  const [
    matchdaysResult,
    momentsResult,
    classificaResponse,
    availabilityResponse,
  ] = await Promise.all([
    supabase
      .from("matchdays")
      .select("id, match_date")
      .order("match_date", {
        ascending: false,
      }),

    supabase
      .from("memorable_moments")
      .select("id, match_id, comment, created_at")
      .order("created_at", {
        ascending: false,
      }),

    fetch("/api/classifica", {
      method: "GET",
      cache: "no-store",
    }),

    fetch(
      `/api/presenze?dates=${nextTuesday}`,
      {
        method: "GET",
        cache: "no-store",
      }
    ),
  ]);

  if (matchdaysResult.error) {
    throw matchdaysResult.error;
  }

  if (momentsResult.error) {
    throw momentsResult.error;
  }

  if (!classificaResponse.ok) {
    const errorData = await classificaResponse.json().catch(() => null);

    throw new Error(
      errorData?.error ||
        "Errore nel caricamento dei dati della stagione."
    );
  }

  const classificaData = await classificaResponse.json();

  const availabilityData = availabilityResponse.ok
  ? await availabilityResponse.json()
  : { availability: [] };

const availability =
  (availabilityData.availability || []) as Availability[];

  const matchdays = (matchdaysResult.data || []) as Matchday[];
  const moments = (momentsResult.data || []) as Moment[];

  const players = (classificaData.players || []) as Player[];
  const matches = (classificaData.matches || []) as Match[];
  const matchPlayers = (classificaData.matchPlayers ||
    []) as MatchPlayer[];
  const sets = (classificaData.sets || []) as MatchSet[];
  const presentCount = availability.filter(
  (item) => item.status === "present"
).length;

const absentCount = availability.filter(
  (item) => item.status === "absent"
).length;

const unansweredCount = 8 - presentCount - absentCount;

  /*
   * =========================================================
   * CLASSIFICA
   * =========================================================
   */

  const rankingMap = new Map<string, RankingPlayer>();

  players.forEach((player) => {
    rankingMap.set(player.id, {
      player,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    });
  });

  matches.forEach((match) => {
    const matchSets = sets.filter(
      (set) => set.match_id === match.id
    );

    if (matchSets.length === 0) {
      return;
    }

    const result = getMatchResult(matchSets);

    const participants = matchPlayers.filter(
      (item) => item.match_id === match.id
    );

    participants.forEach((participant) => {
      const rankingPlayer = rankingMap.get(
        participant.player_id
      );

      if (!rankingPlayer) {
        return;
      }

      if (result === "D") {
        rankingPlayer.points += 1;
        rankingPlayer.draws += 1;
      } else if (participant.team === result) {
        rankingPlayer.points += 2;
        rankingPlayer.wins += 1;
      } else {
        rankingPlayer.losses += 1;
      }
    });
  });

  const ranking = Array.from(rankingMap.values())
    .filter(
      (item) =>
        item.wins > 0 ||
        item.draws > 0 ||
        item.losses > 0
    )
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      return a.player.name.localeCompare(
        b.player.name,
        "it"
      );
    });

  const highestPoints =
    ranking.length > 0 ? ranking[0].points : 0;

  const leaders = ranking.filter(
    (item) => item.points === highestPoints
  );

  const leader = leaders[0] || null;

  /*
   * =========================================================
   * ULTIMO MOMENTO MEMORABILE
   * =========================================================
   */

  let lastMoment: HomeData["lastMoment"] = null;

  if (moments.length > 0) {
    const moment = moments[0];

    const match = matches.find(
      (item) => item.id === moment.match_id
    );

    if (match) {
      const matchday = matchdays.find(
        (item) => item.id === match.matchday_id
      );

      const participants = matchPlayers.filter(
        (item) => item.match_id === match.id
      );

      const playersA = participants
        .filter((item) => item.team === "A")
        .map((item) =>
          players.find(
            (player) => player.id === item.player_id
          )
        )
        .filter(Boolean) as Player[];

      const playersB = participants
        .filter((item) => item.team === "B")
        .map((item) =>
          players.find(
            (player) => player.id === item.player_id
          )
        )
        .filter(Boolean) as Player[];

      const matchSets = sets
        .filter((set) => set.match_id === match.id)
        .sort(
          (a, b) => a.set_number - b.set_number
        );

      if (matchday) {
        lastMoment = {
          moment,
          match,
          matchday,
          playersA,
          playersB,
          sets: matchSets,
        };
      }
    }
  }

  return {
  leader,
  presentCount,
  absentCount,
  unansweredCount,
  leaders,
  ranking,
  matchdaysPlayed: matchdays.length,
  totalMatches: matches.length,
  lastMoment,
};
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getTitleStory(data: HomeData) {
  if (!data.leader || data.ranking.length === 0) {
    return {
      kicker: "LA STAGIONE È AL VIA",
      title: "Tutto ancora da scrivere.",
      text:
        "La prima partita deve ancora decidere chi prenderà la testa.",
    };
  }

  const leaders = data.ranking.filter(
    (item) => item.points === data.ranking[0].points
  );

  const leaderNames = leaders.map((item) =>
    getPlayerName(item.player)
  );

  // Due o più giocatori a pari merito in vetta
  if (leaders.length >= 2) {
    const names =
      leaders.length === 2
        ? `${leaderNames[0]} e ${leaderNames[1]}`
        : `${leaderNames.slice(0, -1).join(", ")} e ${
            leaderNames[leaderNames.length - 1]
          }`;

    const firstChaser = data.ranking[leaders.length];

    if (firstChaser) {
      return {
        kicker: "LA VETTA È CONDIVISA",
        title: `${names} guidano la corsa al titolo.`,
        text: `${getPlayerName(
          firstChaser.player
        )} è il primo inseguitore.`,
      };
    }

    return {
      kicker: "LA VETTA È CONDIVISA",
      title: `${names} guidano la corsa al titolo.`,
      text:
        "La stagione è ancora tutta da decidere.",
    };
  }

  const leaderName = leaderNames[0];

  const chasers = data.ranking
    .slice(1)
    .filter(
      (item) =>
        data.ranking[0].points - item.points <= 2
    );

  // Nessun inseguitore vicino
  if (chasers.length === 0) {
    if (data.matchdaysPlayed <= 1) {
      return {
        kicker: `IN TESTA C'È ${leaderName.toUpperCase()}`,
        title: `${leaderName} parte davanti.`,
        text:
          "Ma è ancora troppo presto per fare pronostici.",
      };
    }

    return {
      kicker: `${leaderName.toUpperCase()} È IN VETTA`,
      title: "La corsa si fa interessante.",
      text:
        "Il gruppo degli inseguitori è ancora chiamato alla rimonta.",
    };
  }

  // Uno o due inseguitori vicini
  const closeNames = chasers
    .slice(0, 2)
    .map((item) => getPlayerName(item.player));

  const closeText =
    closeNames.length === 1
      ? closeNames[0]
      : `${closeNames[0]} e ${closeNames[1]}`;

  return {
    kicker: `${leaderName.toUpperCase()} È IN VETTA`,
    title: `Ancora ${leaderName} in vetta, ma ${closeText} si avvicinano.`,
    text:
      data.matchdaysPlayed <= 1
        ? "La stagione è appena cominciata e la corsa è tutta da scrivere."
        : "Ogni martedì può cambiare la storia.",
  };
}

export default function Home() {
   async function handleLogout() {
  await fetch("/api/logout", {
    method: "POST",
  });

  window.location.href = "/login";
}
  const [calendar, setCalendar] =
    useState<ReturnType<typeof getCalendarDays> | null>(null);

  const [data, setData] = useState<HomeData | null>(null);
  const nextTuesday = getNextTuesday();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCalendar(getCalendarDays());

    loadHomeData()
      .then(setData)
      .catch((error) => {
        console.error("Errore caricamento Home:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const story = data
    ? getTitleStory(data)
    : {
        kicker: "LA STAGIONE",
        title: "La corsa al titolo",
        text:
          "Ogni martedì può cambiare qualcosa.",
      };

  if (!calendar) {
    return null;
  }

  return (
    <main className="home-page">
<button
  type="button"
  onClick={handleLogout}
  style={{
    position: "absolute",
    top: 16,
    right: 16,
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.75)",
    color: "#333",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    zIndex: 20,
  }}
>
  Logout
</button>
      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="home-hero">
        <div className="home-hero-inner">

          <div className="home-calendar-hero">
            <div className="home-calendar-row">

<div className="home-calendar-hero-month">
  <span>{calendar.month}</span>
  <span>{calendar.year}</span>
</div>
              <div className="home-calendar">

                {calendar.days.map((item) => (
                  <div
  key={item.day}
  className={`home-calendar-day ${
    item.isNextTuesday
      ? "next-tuesday"
      : item.isToday
      ? "today"
      : ""
  }`}
>
                    <span className="home-calendar-weekday">
                      {item.weekday}
                    </span>

                    <span className="home-calendar-number">
                      {item.day}
                    </span>
                  </div>
                ))}

              </div>

            </div>
          </div>

          <p className="eyebrow">
  PADEL ON TUESDAY
</p>

<h1>
  Road to
  <br />
  Tuesday
</h1>
<div className="home-road-wrapper">

  <div className="home-road-bar">

    {Array.from({ length: 8 }).map((_, index) => {
      const present = data?.presentCount ?? 0;
      const absent = data?.absentCount ?? 0;

      let className = "home-road-open";
      let label = "?";

      if (index < present) {
        className = "home-road-present";
        label = "SI";
      } else if (index < present + absent) {
        className = "home-road-absent";
        label = "NO";
      }

      return (
        <div
          key={index}
          className={className}
        >
          {label}
        </div>
      );
    })}

  </div>

</div>

          <Link
  href="/presenze"
  className="home-hero-presenze"
>
  <span>Guarda e segna</span>
  <span>→</span>
</Link>

          <div className="home-hero-ball">
            🎾
          </div>

        </div>
      </section>


{/* =====================================================
    02 — LA CORSA AL TITOLO
    ===================================================== */}

<section className="home-section home-section-title">

  <div className="home-section-inner">

    <div className="home-section-label">
      <span>02</span>
      <span>LA STAGIONE</span>
    </div>

          <h2>
            La corsa
            <br />
            al titolo
          </h2>

          <div className="home-title-story">

            <p className="home-title-kicker">
              {loading
                ? "LA STAGIONE"
                : story.kicker}
            </p>


            <p className="home-title-main">
              {loading
                ? "Stiamo leggendo la stagione."
                : story.title}
            </p>

            <p className="home-section-lead">
              {loading
                ? "Ogni martedì cambia qualcosa."
                : story.text}
            </p>

          </div>

          <div className="home-title-links">
  <Link
    href="/classifica"
    className="home-section-action"
  >
    <span>Classifica &amp; Statistiche</span>
    <span>→</span>
  </Link>
</div>

        </div>

      </section>


      {/* =====================================================
          03 — MOMENTI MEMORABILI
          ===================================================== */}

      <section className="home-section home-section-moments">

        <div className="home-section-inner">

          <div className="home-section-label">
            <span>03</span>
            <span>LA STORIA</span>
          </div>

          <h2>
            Momenti
            <br />
            memorabili
          </h2>

          {loading ? (
            <div className="home-moment-placeholder">

              <p className="home-moment-date">
                LA STORIA SI STA SCRIVENDO
              </p>

              <p className="home-moment-text">
                Recupero l'ultimo momento della stagione...
              </p>

            </div>
          ) : data?.lastMoment ? (

            <div className="home-moment-placeholder">

              <p className="home-moment-date">
                {formatDate(
                  data.lastMoment.matchday.match_date
                )}
              </p>

              <p className="home-moment-teams">
                {data.lastMoment.playersA
                  .map(getPlayerName)
                  .join(" & ")}
                <br />
                <span>vs</span>
                <br />
                {data.lastMoment.playersB
                  .map(getPlayerName)
                  .join(" & ")}
              </p>

              <p className="home-moment-score">
                {data.lastMoment.sets
                  .map(
                    (set) =>
                      `${set.team1_score}–${set.team2_score}`
                  )
                  .join("  ·  ")}
              </p>

              <p className="home-moment-text">
  “
  {data.lastMoment.moment.comment.length > 350
    ? `${data.lastMoment.moment.comment.slice(0, 350).trim()}…`
    : data.lastMoment.moment.comment}
  ”
  {data.lastMoment.moment.comment.length > 350 && (
    <>
      {" "}
      <Link
        href="/momenti"
        style={{
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "underline",
          whiteSpace: "nowrap",
        }}
      >
        Leggi tutto
      </Link>
    </>
  )}
</p>

            </div>

          ) : (

            <div className="home-moment-placeholder">

              <p className="home-moment-date">
                ANCORA NESSUN MOMENTO
              </p>

              <p className="home-moment-text">
                La stagione è appena cominciata.
                Il primo momento memorabile deve
                ancora essere scritto.
              </p>

            </div>

          )}

          <Link
            href="/momenti"
            className="home-section-action"
          >
            <span>
              Archivio dei momenti
            </span>

            <span>→</span>
          </Link>

        </div>

      </section>


      {/* =====================================================
          04 / 05 — GIOCATORI E CLASSIFICA
          ===================================================== */}

      <section className="home-lower">

        <Link
          href="/giocatori"
          className="home-lower-card"
        >

          <span className="home-lower-number">
            04
          </span>

          <div>
            <p>IL GRUPPO</p>

            <h3>
              Giocatori
            </h3>
          </div>

          <span className="home-lower-arrow">
            →
          </span>

        </Link>


        <Link
          href="/trofei"
          className="home-lower-card"
        >

          <span className="home-lower-number">
            05
          </span>

          <div>
         <p>I TROFEI</p>

<h3>
  Trofei
</h3>
          </div>

          <span className="home-lower-arrow">
            →
          </span>

        </Link>

      </section>


      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="home-footer">

        <span>
          PADEL ON TUESDAY
        </span>

        <span>
          2026–27
        </span>

      </footer>

    </main>
  );
}