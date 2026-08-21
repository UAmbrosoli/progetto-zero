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
    <main className="dashboard-page">

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

        <Link
          href="/dashboard"
          className="back-link"
        >
          ← Dashboard
        </Link>

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
          ARCHIVIO DEI MOMENTI
          ===================================================== */}

      {!loading &&
        !message &&
        moments.length > 0 && (

          <section className="moments-list">

            {moments.map((moment, index) => (

  <article
    key={moment.id}
    className="moment-item"
  >

    <div className="moment-item-top">

      <span className="moment-number">
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="moment-date">
        {formatDate(
          moment.match.matchday.match_date
        )}
      </span>

      <span className="moment-court">
        CAMPO {moment.match.court}
      </span>

    </div>


    <div className="moment-item-content">

      <div className="moment-teams">

        <div className="moment-team">
          {moment.match.players
            .filter(
              (player) => player.team === "A"
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
              (player) => player.team === "B"
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


      <p
  className="moment-story"
  style={{
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1.35,
    margin: "18px 0 0",
    letterSpacing: "-0.01em",
  }}
>
  “{moment.comment}”
</p>

</div>

{index < moments.length - 1 && (
  <div
    style={{
      height: 1,
      background: "rgba(60, 60, 60, 0.35)",
      marginTop: 22,
      marginBottom: 22,
    }}
  />
)}

</article>

))}

          </section>

        )}

    </main>
  );
}