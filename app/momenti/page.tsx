"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

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

type MatchPlayer = {
  player_id: string;
  team: string;
  player: {
    id: string;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
  };
};

function displayName(player: MatchPlayer["player"]) {
  if (player.last_name && player.first_name) {
    return `${player.first_name} ${player.last_name}`;
  }

  return player.name;
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMoments();
  }, []);

 async function loadMoments() {
  setLoading(true);
  setMessage("");

  try {
    const { data: momentsData, error: momentsError } =
      await supabase
        .from("memorable_moments")
        .select("id, match_id, comment, created_at")
        .order("created_at", { ascending: false });

    if (momentsError) {
      throw new Error(momentsError.message);
    }

    if (!momentsData || momentsData.length === 0) {
      setMoments([]);
      return;
    }

    const matchIds = momentsData.map(
      (moment) => moment.match_id
    );

    const { data: matchesData, error: matchesError } =
      await supabase
        .from("matches")
        .select(
          "id, matchday_id, court, score_team_a, score_team_b, created_at"
        )
        .in("id", matchIds);

    if (matchesError) {
      throw new Error(matchesError.message);
    }

    const matchdayIds = [
      ...new Set(
        (matchesData || []).map(
          (match) => match.matchday_id
        )
      ),
    ];

    const { data: matchdaysData, error: matchdaysError } =
      await supabase
        .from("matchdays")
        .select("id, match_date")
        .in("id", matchdayIds);

    if (matchdaysError) {
      throw new Error(matchdaysError.message);
    }

    const { data: matchPlayersData, error: matchPlayersError } =
      await supabase
        .from("match_players")
        .select("match_id, player_id, team")
        .in("match_id", matchIds);

    if (matchPlayersError) {
      throw new Error(matchPlayersError.message);
    }

    const playerIds = [
      ...new Set(
        (matchPlayersData || []).map(
          (item) => item.player_id
        )
      ),
    ];

    const { data: playersData, error: playersError } =
      await supabase
        .from("players")
        .select("id, name, first_name, last_name")
        .in("id", playerIds);

    if (playersError) {
      throw new Error(playersError.message);
    }

    const { data: matchSetsData, error: matchSetsError } =
      await supabase
        .from("match_sets")
        .select(
          "id, match_id, set_number, team1_score, team2_score"
        )
        .in("match_id", matchIds)
        .order("set_number", { ascending: true });

    if (matchSetsError) {
      throw new Error(matchSetsError.message);
    }

    const combinedMoments = momentsData
      .map((moment) => {
        const match = (matchesData || []).find(
          (item) => item.id === moment.match_id
        );

        if (!match) {
          return null;
        }

        const matchday = (matchdaysData || []).find(
          (item) => item.id === match.matchday_id
        );

        if (!matchday) {
          return null;
        }

        const playersForMatch =
          (matchPlayersData || [])
            .filter(
              (item) => item.match_id === match.id
            )
            .map((item) => {
              const player = (playersData || []).find(
                (p) => p.id === item.player_id
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
          (matchSetsData || [])
            .filter(
              (item) => item.match_id === match.id
            )
            .sort(
              (a, b) => a.set_number - b.set_number
            );

        return {
          ...moment,
          match: {
            id: match.id,
            court: match.court,
            score_team_a: match.score_team_a,
            score_team_b: match.score_team_b,
            created_at: match.created_at,
            matchday: {
              match_date: matchday.match_date,
            },
            players: playersForMatch,
            sets: setsForMatch,
          },
        };
      })
      .filter(Boolean) as Moment[];

    setMoments(combinedMoments);
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


  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: "inline-block",
          marginBottom: 20,
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        ← Dashboard
      </Link>

      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            lineHeight: 1.1,
          }}
        >
          Momenti memorabili
        </h1>

        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            opacity: 0.65,
          }}
        >
          Le partite, i colpi e le storie che vale la pena ricordare.
        </p>
      </header>

      {loading && <p>Caricamento...</p>}

      {!loading && message && (
        <p
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#fff3f3",
          }}
        >
          {message}
        </p>
      )}

      {!loading && !message && moments.length === 0 && (
        <section
          style={{
            padding: 24,
            borderRadius: 16,
            background: "#f5f5f5",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Ancora nessun momento memorabile
          </h2>

          <p style={{ marginBottom: 0, opacity: 0.7 }}>
            Quando durante una giornata registrerai un commento,
            comparirà qui.
          </p>
        </section>
      )}

      {!loading && !message && moments.length > 0 && (
        <section
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          {moments.map((moment) => (
            <article
              key={moment.id}
              style={{
                padding: 20,
                borderRadius: 18,
                background: "white",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  opacity: 0.6,
                  marginBottom: 12,
                }}
              >
                🎾 Campo {moment.match.court}
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {formatDate(
                  moment.match.matchday.match_date
                )}
              </div>

              <div
  style={{
    display: "grid",
    gap: 8,
    marginBottom: 16,
  }}
>
  <div>
    <strong>
      {moment.match.players
        .filter((player) => player.team === "A")
        .map((player) =>
          `${player.name} ${player.last_name}`.trim()
        )
        .join(" – ")}
    </strong>
  </div>

  <div>
    <strong>
      {moment.match.players
        .filter((player) => player.team === "B")
        .map((player) =>
          `${player.name} ${player.last_name}`.trim()
        )
        .join(" – ")}
    </strong>
  </div>
</div>

<div
  style={{
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 16,
  }}
>
  {moment.match.sets
    .map(
      (set) =>
        `${set.team1_score}–${set.team2_score}`
    )
    .join(" · ")}
</div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "#f7f7f7",
                  fontStyle: "italic",
                }}
              >
                “{moment.comment}”
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}