"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import {
  getChampionshipData,
} from "@/services/championship";
import {
  createPlayer,
  getPlayers,
} from "@/services/players";

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
  const [playerAppearances, setPlayerAppearances] = useState<
    Record<string, number>
  >({});

  const [presentPlayers, setPresentPlayers] =
    useState<string[]>([]);

  const [courts, setCourts] =
    useState<Court[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [todayMatchdayId, setTodayMatchdayId] =
    useState<string | null>(null);

  const [loadingTodayMatches, setLoadingTodayMatches] =
    useState(false);
    const [todayMatchesLoaded, setTodayMatchesLoaded] =
  useState(false);

  const [showAllPlayers, setShowAllPlayers] =
    useState(false);

  const savingRef = useRef(false);
  const savedRef = useRef(false);

  const [message, setMessage] =
    useState("");

  const [showAddPlayer, setShowAddPlayer] =
    useState(false);

  const [newFirstName, setNewFirstName] =
    useState("");

  const [newLastName, setNewLastName] =
    useState("");

  const [newEmail, setNewEmail] =
    useState("");

  const [addingPlayer, setAddingPlayer] =
    useState(false);

    useEffect(() => {
    loadPlayers();
    loadTodayMatchday();
  }, []);

 async function loadTodayMatchday() {
  setLoadingTodayMatches(true);

  try {
    const today =
      new Date().toLocaleDateString("en-CA");

    const { data: matchdays, error: matchdayError } =
      await supabase
        .from("matchdays")
        .select("id, match_date")
        .eq("match_date", today)
        .order("id", { ascending: false });

    if (matchdayError) {
      throw new Error(
        matchdayError.message
      );
    }

    if (!matchdays || matchdays.length === 0) {
      setTodayMatchdayId(null);
      setCourts([]);
      return;
    }

    const matchdayId =
      matchdays[0].id;

    setTodayMatchdayId(matchdayId);

    const { data: matches, error: matchesError } =
      await supabase
        .from("matches")
        .select(
          "id, court, score_team_a, score_team_b"
        )
        .eq("matchday_id", matchdayId)
        .order("court", {
          ascending: true,
        });

    if (matchesError) {
      throw new Error(
        matchesError.message
      );
    }

    if (!matches || matches.length === 0) {
      setCourts([]);
      return;
    }

    const matchIds =
      matches.map(
        (match) => match.id
      );

    const { data: matchPlayers, error: playersError } =
      await supabase
        .from("match_players")
        .select(
          "match_id, player_id, team"
        )
        .in(
          "match_id",
          matchIds
        );

    if (playersError) {
      throw new Error(
        playersError.message
      );
    }

    const { data: matchSets, error: setsError } =
      await supabase
        .from("match_sets")
        .select(
          "match_id, set_number, team1_score, team2_score"
        )
        .in(
          "match_id",
          matchIds
        )
        .order("set_number", {
          ascending: true,
        });

    if (setsError) {
      throw new Error(
        setsError.message
      );
    }

    const loadedCourts: Court[] =
      matches.map(
        (match) => {
          const playersForMatch =
            (matchPlayers || []).filter(
              (item) =>
                item.match_id ===
                match.id
            );

          const teamA =
            playersForMatch
              .filter(
                (item) =>
                  item.team === "A"
              )
              .map(
                (item) =>
                  item.player_id
              );

          const teamB =
            playersForMatch
              .filter(
                (item) =>
                  item.team === "B"
              )
              .map(
                (item) =>
                  item.player_id
              );

          const players: Court["players"] = [
  teamA[0] ?? null,
  teamA[1] ?? null,
  teamB[0] ?? null,
  teamB[1] ?? null,
];

          const setsForMatch =
            (matchSets || []).filter(
              (item) =>
                item.match_id ===
                match.id
            );

          const sets = [
            0,
            1,
            2,
          ].map(
            (index) => {
              const savedSet =
                setsForMatch.find(
                  (item) =>
                    item.set_number ===
                    index + 1
                );

              return {
                team1:
                  savedSet?.team1_score != null
                    ? String(
                        savedSet.team1_score
                      )
                    : "",
                team2:
                  savedSet?.team2_score != null
                    ? String(
                        savedSet.team2_score
                      )
                    : "",
              };
            }
          );

          return {
            id: `court-${match.id}`,
            players,
            sets,
            comment: "",
          };
        }
      );

    setCourts(loadedCourts);
  } catch (error) {
    console.error(
      "Errore caricamento giornata:",
      error
    );

    setCourts([]);
    setTodayMatchdayId(null);

    setMessage(
      error instanceof Error
        ? error.message
        : "Errore nel caricamento della giornata."
    );
  } finally {
    setLoadingTodayMatches(false);
    setTodayMatchesLoaded(true);
  }
}

async function loadTodayMatches(matchdayId: string) {
  setLoadingTodayMatches(true);

  const { data: matchesData, error: matchesError } =
    await supabase
      .from("matches")
      .select("id, matchday_id, court")
      .eq("matchday_id", matchdayId)
      .order("court");

  if (matchesError) {
    console.error(
      "Errore caricamento partite:",
      matchesError
    );
    setLoadingTodayMatches(false);
    setTodayMatchesLoaded(true);
    return;
  }

  if (!matchesData || matchesData.length === 0) {
    setLoadingTodayMatches(false);
    setTodayMatchesLoaded(true);
    return;
  }

  const matchIds = matchesData.map(
    (match) => match.id
  );

  const {
    data: matchPlayersData,
    error: playersError,
  } = await supabase
    .from("match_players")
    .select("match_id, player_id, team")
    .in("match_id", matchIds);

  if (playersError) {
    console.error(
      "Errore caricamento giocatori delle partite:",
      playersError
    );
    setLoadingTodayMatches(false);
    setTodayMatchesLoaded(true);
    return;
  }

  const {
    data: matchSetsData,
    error: setsError,
  } = await supabase
    .from("match_sets")
    .select(
      "match_id, set_number, team1_score, team2_score"
    )
    .in("match_id", matchIds)
    .order("set_number");

  if (setsError) {
    console.error(
      "Errore caricamento risultati delle partite:",
      setsError
    );
    setLoadingTodayMatches(false);
    setTodayMatchesLoaded(true);
    return;
  }

  const loadedCourts: Court[] =
    matchesData.map((match) => {
      const playersForMatch =
        (matchPlayersData || [])
          .filter(
            (item) =>
              item.match_id === match.id
          )
          .sort((a, b) => {
            if (a.team === b.team) {
              return 0;
            }

            return a.team === "A" ? -1 : 1;
          });

      const playerIds =
        playersForMatch.map(
          (item) => item.player_id
        );

      const sets = createSets();

      const setsForMatch =
        (matchSetsData || [])
          .filter(
            (item) =>
              item.match_id === match.id
          )
          .sort(
            (a, b) =>
              a.set_number - b.set_number
          );

      setsForMatch.forEach(
        (set, index) => {
          if (index < sets.length) {
            sets[index] = {
              team1: String(
                set.team1_score
              ),
              team2: String(
                set.team2_score
              ),
            };
          }
        }
      );

      return {
        id: match.id,

        players: [
          playerIds[0] || null,
          playerIds[1] || null,
          playerIds[2] || null,
          playerIds[3] || null,
        ],

        sets,

        comment: "",
      };
    });

  setCourts(loadedCourts);

  const loadedPlayerIds =
    loadedCourts
      .flatMap(
        (court) => court.players
      )
      .filter(
        (
          id
        ): id is string =>
          Boolean(id)
      );

  setPresentPlayers(
    loadedPlayerIds
  );

  setTodayMatchesLoaded(true);
  setLoadingTodayMatches(false);
}
  async function loadPlayers() {
    setLoading(true);

    try {
      const [
  playersData,
  matchPlayersResult,
] = await Promise.all([
  getPlayers(),
  supabase
    .from("match_players")
    .select("player_id"),
]);

      if (matchPlayersResult.error) {
        console.error(matchPlayersResult.error);
        setMessage(
          "Non riesco a leggere lo storico delle presenze."
        );
        setLoading(false);
        return;
      }

      const matchPlayersData =
        matchPlayersResult.data ?? [];

      // Conta quante partite ha giocato ogni giocatore
      const appearances = new Map<string, number>();

      matchPlayersData.forEach((item) => {
        appearances.set(
          item.player_id,
          (appearances.get(item.player_id) ?? 0) + 1
        );
      });

      const appearancesObject: Record<string, number> = {};

      appearances.forEach((count, playerId) => {
        appearancesObject[playerId] = count;
      });

      setPlayerAppearances(appearancesObject);

      // Prima i più assidui.
      // A parità di presenze, ordine alfabetico per cognome.
      const sortedPlayers = [...playersData].sort((a, b) => {
        const appearancesA = appearances.get(a.id) ?? 0;
        const appearancesB = appearances.get(b.id) ?? 0;

        if (appearancesB !== appearancesA) {
          return appearancesB - appearancesA;
        }

        const lastA = a.last_name || a.name || "";
        const lastB = b.last_name || b.name || "";

        return lastA.localeCompare(lastB, "it");
      });

      setPlayers(sortedPlayers);
    } catch (error) {
      console.error(
        "Errore caricamento giocatori:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a caricare i giocatori."
      );
    } finally {
      setLoading(false);
    }
  }

  function displayPlayerName(
    player: Player
  ) {
    if (
      player.last_name &&
      player.first_name
    ) {
      return `${player.last_name} ${player.first_name}`;
    }

    return player.name;
  }

  const visiblePlayers = useMemo(() => {
  if (showAllPlayers) {
    return players;
  }

  return [...players]
    .sort((a, b) => {
      const appearancesA =
        playerAppearances[a.id] || 0;

      const appearancesB =
        playerAppearances[b.id] || 0;

      if (appearancesB !== appearancesA) {
        return appearancesB - appearancesA;
      }

      const lastA =
        a.last_name || a.name || "";

      const lastB =
        b.last_name || b.name || "";

      return lastA.localeCompare(
        lastB,
        "it"
      );
    })
    .slice(0, 10);
}, [
  players,
  playerAppearances,
  showAllPlayers,
]);

  const hasMorePlayers =
    players.length > 10;

  const assignedPlayerIds = useMemo(
    () =>
      courts
        .flatMap(
          (court) => court.players
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        ),
    [courts]
  );

  function togglePresent(playerId: string) {
  setMessage("");

  if (presentPlayers.includes(playerId)) {
    const updatedPresentPlayers =
      presentPlayers.filter(
        (id) => id !== playerId
      );

    setPresentPlayers(
      updatedPresentPlayers
    );

    // Se scendiamo sotto 4 giocatori,
    // non deve rimanere nessun campo.
    if (
      updatedPresentPlayers.length < 4
    ) {
      setCourts([]);
      return;
    }

    // Se togliamo giocatori, aggiorniamo
    // i campi mantenendo solo quelli ancora presenti.
    setCourts((current) =>
      current.map((court) => {
        const updatedPlayers =
          court.players.map((id) =>
            id &&
            updatedPresentPlayers.includes(id)
              ? id
              : null
          ) as Court["players"];

        return {
          ...court,
          players: updatedPlayers,
        };
      })
    );

    return;
  }

  // Massimo 8 giocatori presenti.
  if (presentPlayers.length >= 8) {
    return;
  }

  const updatedPresentPlayers = [
    ...presentPlayers,
    playerId,
  ];

  setPresentPlayers(
    updatedPresentPlayers
  );

  // Quando arrivano 4 giocatori,
  // creiamo automaticamente il Campo 1
  // nell'ordine di selezione.
  if (
    updatedPresentPlayers.length === 4
  ) {
    const selectedPlayers =
      updatedPresentPlayers.slice(
        0,
        4
      );

    const newCourt: Court = {
      id: `court-${Date.now()}-1`,
      players: [
        selectedPlayers[0],
        selectedPlayers[1],
        selectedPlayers[2],
        selectedPlayers[3],
      ],
      sets: createSets(),
      comment: "",
    };

    setCourts([newCourt]);
    return;
  }

  // Quando arrivano 8 giocatori,
// creiamo automaticamente il Campo 2
// con gli ultimi 4 giocatori,
// nell'ordine di selezione.
if (
  updatedPresentPlayers.length === 8
) {
  const secondFour =
    updatedPresentPlayers.slice(4, 8);

  setCourts((current) => {
    if (current.length >= 2) {
      return current;
    }

    return [
      ...current,
      {
        id: `court-${Date.now()}-2`,
        players: [
          secondFour[0],
          secondFour[1],
          secondFour[2],
          secondFour[3],
        ],
        sets: createSets(),
        comment: "",
      },
    ];
  });

  return;
}
}

  function playerName(
    id: string | null
  ) {
    if (!id) return "";

    const player =
      players.find(
        (player) =>
          player.id === id
      );

    return player
      ? displayPlayerName(player)
      : "";
  }

  function availablePlayers(
    currentId: string | null
  ) {
    return players.filter(
      (player) =>
        presentPlayers.includes(
          player.id
        ) &&
        (
          player.id === currentId ||
          !assignedPlayerIds.includes(
            player.id
          )
        )
    );
  }

  function setCourtPlayer(
    courtId: string,
    slotIndex: number,
    playerId: string
  ) {
    setCourts(
      (current) =>
        current.map(
          (court) => {
            if (
              court.id !== courtId
            ) {
              return court;
            }

            const updatedPlayers =
              [
                ...court.players,
              ] as Court["players"];

            // Se scegliamo un giocatore già
            // presente in un'altra posizione
            // dello stesso campo, scambiamo
            // le due posizioni.
            const existingIndex =
              updatedPlayers.findIndex(
                (id, index) =>
                  id === playerId &&
                  index !== slotIndex
              );

            if (
              existingIndex !== -1
            ) {
              updatedPlayers[
                existingIndex
              ] =
                updatedPlayers[
                  slotIndex
                ];

              updatedPlayers[
                slotIndex
              ] =
                playerId;
            } else {
              updatedPlayers[
                slotIndex
              ] =
                playerId || null;
            }

            return {
              ...court,
              players:
                updatedPlayers,
            };
          }
        )
    );

    setMessage("");
  }
  function updateSet(
    courtId: string,
    setIndex: number,
    team:
      | "team1"
      | "team2",
    value: string
  ) {
    setCourts(
      (current) =>
        current.map(
          (court) => {
            if (
              court.id !==
              courtId
            ) {
              return court;
            }

            return {
              ...court,
              sets: court.sets.map(
                (
                  set,
                  index
                ) =>
                  index ===
                  setIndex
                    ? {
                        ...set,
                        [team]:
                          value,
                      }
                    : set
              ),
            };
          }
        )
    );
  }

function proposePairs() {
  if (
    presentPlayers.length !== 4 &&
    presentPlayers.length !== 8
  ) {
    return;
  }

  /*
   * L'App propone una nuova composizione ogni volta.
   *
   * Non cerchiamo una sola "soluzione perfetta":
   * costruiamo tutte le combinazioni possibili,
   * le ordiniamo in base allo storico e scegliamo
   * casualmente tra le migliori.
   *
   * In questo modo premendo più volte
   * "Proponi abbinamenti" otteniamo davvero
   * rotazioni diverse.
   */
  async function generateBestArrangement() {
    try {
      setMessage("");

      const {
        data: matchPlayersData,
        error,
      } = await supabase
        .from("match_players")
        .select(
          "match_id, player_id, team"
        );

      if (error) {
        throw new Error(
          "Non riesco a leggere lo storico delle partite."
        );
      }

      const history =
        matchPlayersData ?? [];

      const matches =
        new Map<
          string,
          {
            A: string[];
            B: string[];
          }
        >();

      history.forEach((item) => {
        if (!matches.has(item.match_id)) {
          matches.set(item.match_id, {
            A: [],
            B: [],
          });
        }

        const match =
          matches.get(item.match_id)!;

        if (item.team === "A") {
          match.A.push(item.player_id);
        }

        if (item.team === "B") {
          match.B.push(item.player_id);
        }
      });

      const teammates =
        new Map<
          string,
          Map<string, number>
        >();

      const opponents =
        new Map<
          string,
          Map<string, number>
        >();

      function addPair(
        map: Map<
          string,
          Map<string, number>
        >,
        a: string,
        b: string
      ) {
        if (!map.has(a)) {
          map.set(a, new Map());
        }

        const inner =
          map.get(a)!;

        inner.set(
          b,
          (inner.get(b) ?? 0) + 1
        );
      }

      matches.forEach((match) => {
        for (const a of match.A) {
          for (const b of match.A) {
            if (a !== b) {
              addPair(
                teammates,
                a,
                b
              );
            }
          }

          for (const b of match.B) {
            addPair(
              opponents,
              a,
              b
            );
          }
        }

        for (const a of match.B) {
          for (const b of match.B) {
            if (a !== b) {
              addPair(
                teammates,
                a,
                b
              );
            }
          }

          for (const b of match.A) {
            addPair(
              opponents,
              a,
              b
            );
          }
        }
      });

      function teammateCount(
        a: string,
        b: string
      ) {
        return (
          teammates
            .get(a)
            ?.get(b) ?? 0
        );
      }

      function opponentCount(
        a: string,
        b: string
      ) {
        return (
          opponents
            .get(a)
            ?.get(b) ?? 0
        );
      }

      function scoreCourt(
        court: string[]
      ) {
        const [
          player1,
          player2,
          player3,
          player4,
        ] = court;

        let score = 0;

        /*
         * Ripetere un compagno pesa molto.
         */
        score +=
          teammateCount(
            player1,
            player2
          ) * 100;

        score +=
          teammateCount(
            player3,
            player4
          ) * 100;

        /*
         * Anche ripetere gli avversari
         * non è desiderabile.
         */
        score +=
          opponentCount(
            player1,
            player3
          ) * 10;

        score +=
          opponentCount(
            player1,
            player4
          ) * 10;

        score +=
          opponentCount(
            player2,
            player3
          ) * 10;

        score +=
          opponentCount(
            player2,
            player4
          ) * 10;

        return score;
      }

      function sameArrangement(
        a: string[],
        b: string[]
      ) {
        return a.every(
          (player, index) =>
            player === b[index]
        );
      }

      /*
       * ============================
       * 4 GIOCATORI
       * ============================
       */

      if (
        presentPlayers.length === 4
      ) {
        const [
          a,
          b,
          c,
          d,
        ] = presentPlayers;

        const arrangements = [
          [a, b, c, d],
          [a, c, b, d],
          [a, d, b, c],
          [b, c, a, d],
          [b, d, a, c],
          [c, d, a, b],
        ];

        const current =
          courts[0]?.players.filter(
            (
              id
            ): id is string =>
              Boolean(id)
          ) ?? [];

        /*
         * Ordiniamo tutte le configurazioni
         * dalla migliore alla peggiore.
         */
        const ranked =
          arrangements
            .map((arrangement) => ({
              arrangement,
              score:
                scoreCourt(
                  arrangement
                ),
            }))
            .sort(
              (a, b) =>
                a.score - b.score
            );

        /*
         * Prima escludiamo la configurazione
         * attualmente visibile.
         */
        const alternatives =
          ranked.filter(
            (item) =>
              current.length !== 4 ||
              !sameArrangement(
                item.arrangement,
                current
              )
          );

        /*
         * Prendiamo casualmente una delle
         * migliori configurazioni.
         *
         * Così non torniamo sempre alla stessa.
         */
        const candidates =
          alternatives.length > 0
            ? alternatives.slice(
                0,
                Math.min(
                  3,
                  alternatives.length
                )
              )
            : ranked.slice(
                0,
                Math.min(
                  3,
                  ranked.length
                )
              );

        const chosen =
          candidates[
            Math.floor(
              Math.random() *
                candidates.length
            )
          ].arrangement;

        setCourts([
          {
            id:
              courts[0]?.id ||
              `court-${Date.now()}-1`,
            players: [
              chosen[0],
              chosen[1],
              chosen[2],
              chosen[3],
            ],
            sets:
              courts[0]?.sets ||
              createSets(),
            comment:
              courts[0]?.comment ||
              "",
          },
        ]);

        return;
      }

      /*
       * ============================
       * 8 GIOCATORI
       * ============================
       *
       * Generiamo configurazioni realmente
       * diverse.
       *
       * Non consideriamo diversa una partita
       * solo perché i giocatori sono scritti
       * in un ordine differente.
       */

      const players = [...presentPlayers];

      /*
       * Tutte le possibili coppie di 4 giocatori
       * da mettere sul primo campo.
       */
      const combinations4: string[][] = [];

      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          for (let k = j + 1; k < players.length; k++) {
            for (let l = k + 1; l < players.length; l++) {
              combinations4.push([
                players[i],
                players[j],
                players[k],
                players[l],
              ]);
            }
          }
        }
      }

      /*
       * Chiave della singola coppia.
       * L'ordine dei due giocatori non conta.
       */
      function pairKey(a: string, b: string) {
        return [a, b].sort().join("|");
      }

      /*
       * Chiave della partita.
       *
       * Esempio:
       * A-B / C-D
       *
       * è uguale a:
       * B-A / D-C
       *
       * ma è diversa da:
       * A-C / B-D
       */
      function courtKey(court: string[]) {
        const teamA = pairKey(
          court[0],
          court[1]
        );

        const teamB = pairKey(
          court[2],
          court[3]
        );

        return [teamA, teamB]
          .sort()
          .join("::");
      }

      /*
       * Chiave dell'intera giornata.
       *
       * I due campi sono considerati distinti,
       * quindi Campo 1 e Campo 2 restano separati.
       */
      function arrangementKey(
        arrangement: string[][]
      ) {
        return [
          courtKey(arrangement[0]),
          courtKey(arrangement[1]),
        ].join("###");
      }

      /*
       * Per ogni gruppo di 4 giocatori
       * costruiamo le 3 possibili divisioni
       * in due coppie.
       */
      function courtArrangements(
        group: string[]
      ): string[][] {
        const [a, b, c, d] = group;

        return [
          [a, b, c, d],
          [a, c, b, d],
          [a, d, b, c],
        ];
      }

      /*
       * Tutte le configurazioni REALMENTE diverse.
       */
      const allArrangements: {
        courts: string[][];
        score: number;
        key: string;
      }[] = [];

      const seen =
        new Set<string>();

      for (
        const court1Players of combinations4
      ) {
        const court1Set =
          new Set(court1Players);

        const court2Players =
          players.filter(
            (player) =>
              !court1Set.has(player)
          );

        /*
         * Evitiamo di generare due volte
         * la stessa divisione dei campi.
         */
        const court1PlayersSorted = [
          ...court1Players,
        ].sort();

        const court2PlayersSorted = [
          ...court2Players,
        ].sort();

        if (
          court1PlayersSorted.join("|") >
          court2PlayersSorted.join("|")
        ) {
          continue;
        }

        for (
          const court1 of courtArrangements(
            court1Players
          )
        ) {
          for (
            const court2 of courtArrangements(
              court2Players
            )
          ) {
            const courts = [
              court1,
              court2,
            ];

            const key =
              arrangementKey(courts);

            if (seen.has(key)) {
              continue;
            }

            seen.add(key);

            allArrangements.push({
              courts,
              key,
              score:
                scoreCourt(court1) +
                scoreCourt(court2),
            });
          }
        }
      }

      /*
       * Migliori configurazioni secondo
       * lo storico.
       */
      allArrangements.sort(
        (a, b) =>
          a.score - b.score
      );

      /*
       * Configurazione attuale.
       */
      const currentCourts =
        courts.map(
          (court) =>
            court.players.filter(
              (
                id
              ): id is string =>
                Boolean(id)
            )
        );

      let currentKey:
        string | null = null;

      if (
        currentCourts.length === 2 &&
        currentCourts[0].length === 4 &&
        currentCourts[1].length === 4
      ) {
        currentKey =
          arrangementKey(
            currentCourts
          );
      }

      /*
       * Escludiamo la configurazione
       * attualmente mostrata.
       */
      const alternatives =
        allArrangements.filter(
          (item) =>
            item.key !== currentKey
        );

      /*
       * Prendiamo alcune delle migliori
       * configurazioni realmente diverse.
       *
       * Non sono semplici rimescolamenti:
       * cambiano realmente le coppie.
       */
      const candidates =
        alternatives.length > 0
          ? alternatives.slice(
              0,
              Math.min(
                12,
                alternatives.length
              )
            )
          : allArrangements.slice(
              0,
              Math.min(
                12,
                allArrangements.length
              )
            );

      if (
        candidates.length === 0
      ) {
        return;
      }

      const chosen =
        candidates[
          Math.floor(
            Math.random() *
              candidates.length
          )
        ].courts;

      setCourts([
        {
          id:
            courts[0]?.id ||
            `court-${Date.now()}-1`,
          players: [
            chosen[0][0],
            chosen[0][1],
            chosen[0][2],
            chosen[0][3],
          ],
          sets:
            courts[0]?.sets ||
            createSets(),
          comment:
            courts[0]?.comment ||
            "",
        },
        {
          id:
            courts[1]?.id ||
            `court-${Date.now()}-2`,
          players: [
            chosen[1][0],
            chosen[1][1],
            chosen[1][2],
            chosen[1][3],
          ],
          sets:
            courts[1]?.sets ||
            createSets(),
          comment:
            courts[1]?.comment ||
            "",
        },
      ]);

    } catch (error) {
      console.error(
        "Errore generazione abbinamenti:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a generare gli abbinamenti."
      );
    }
  }

  generateBestArrangement();
}

  async function addPlayer() {
    const firstName =
      newFirstName.trim();
    const lastName =
      newLastName.trim();
    const email =
      newEmail.trim();

    if (!firstName) {
      setMessage(
        "Inserisci il nome del giocatore."
      );
      return;
    }

    if (!lastName) {
      setMessage(
        "Inserisci il cognome del giocatore."
      );
      return;
    }

    setAddingPlayer(true);
    setMessage("");

    const fullName = `${firstName} ${lastName}`;

        try {
const data = await createPlayer(
  firstName,
  lastName,
  email,
  false
);
      setPlayers(
        (current) =>
          [
            ...current,
            data,
          ].sort(
            (a, b) => {
              const appearancesA =
                playerAppearances[a.id] || 0;

              const appearancesB =
                playerAppearances[b.id] || 0;

              if (
                appearancesB !==
                appearancesA
              ) {
                return (
                  appearancesB -
                  appearancesA
                );
              }

              const lastA =
                a.last_name ||
                a.name ||
                "";

              const lastB =
                b.last_name ||
                b.name ||
                "";

              return lastA.localeCompare(
                lastB,
                "it"
              );
            }
          )
      );

      setPlayerAppearances(
        (current) => ({
          ...current,
          [data.id]: 0,
        })
      );

      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setShowAddPlayer(false);

      setMessage(
        "Giocatore aggiunto correttamente."
      );
    } catch (error) {
      console.error(
        "Errore aggiunta giocatore:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Errore nel salvataggio del giocatore."
      );
    } finally {
      setAddingPlayer(false);
    }
    setNewLastName("");
    setNewEmail("");
    setShowAddPlayer(false);
    setAddingPlayer(false);
    setMessage(
      "Giocatore aggiunto."
    );
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

  let hasAtLeastOneResult = false;

  for (let i = 0; i < courts.length; i++) {
    const court = courts[i];

    if (
      court.players.some(
        (player) => !player
      )
    ) {
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
      continue;
    }

    hasAtLeastOneResult = true;

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

  if (!hasAtLeastOneResult) {
    return "Inserisci almeno un set in una delle partite.";
  }

  return null;
}

 async function saveMatchday() {
  if (savingRef.current) {
    return;
  }

  const validationError =
    validateBeforeSave();

  if (validationError) {
  setMessage(validationError);
  return;
}

savingRef.current = true;
setSaving(true);
setMessage("");

let permissionWarning = false;

try {
  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

    // Cerchiamo la giornata di oggi.
    const {
      data: existingMatchdays,
      error: matchdaysError,
    } = await supabase
      .from("matchdays")
      .select("id, match_date")
      .eq("match_date", today)
      .order("id", {
        ascending: false,
      })
      .limit(1);

    if (matchdaysError) {
      throw new Error(
        matchdaysError.message
      );
    }

    let matchdayId: string;

    if (
      existingMatchdays &&
      existingMatchdays.length > 0
    ) {
      matchdayId =
        existingMatchdays[0].id;
    } else {
      const {
        data: newMatchday,
        error: matchdayError,
      } = await supabase
        .from("matchdays")
        .insert({
          match_date: today,
        })
        .select("id")
        .single();

      if (
        matchdayError ||
        !newMatchday
      ) {
        throw new Error(
          matchdayError?.message ||
            "Impossibile creare la giornata."
        );
      }

      matchdayId = newMatchday.id;
    }

    setTodayMatchdayId(matchdayId);

    // Recuperiamo le partite già registrate
    // nella giornata di oggi.
    const {
      data: existingMatches,
      error: existingMatchesError,
    } = await supabase
      .from("matches")
      .select("id, court")
      .eq(
        "matchday_id",
        matchdayId
      );

    if (existingMatchesError) {
      throw new Error(
        existingMatchesError.message
      );
    }

    for (
      const [
        index,
        court,
      ] of courts.entries()
    ) {
      const hasAnySet =
        court.sets.some(
          (set) =>
            set.team1 !== "" ||
            set.team2 !== ""
        );

      // Un campo senza risultato non viene ancora salvato.
      if (!hasAnySet) {
        continue;
      }
      const courtNumber = index + 1;
            // Una partita già caricata dal database ha
      // come id quello reale della partita.
      // Un campo ancora da salvare ha invece un
      // id provvisorio che inizia con "court-".
     const existingMatchId =
  court.id.startsWith("court-")
    ? court.id.substring(6)
    : court.id;

const alreadySaved =
  (existingMatches || []).some(
    (match) =>
      match.id === existingMatchId
  );

      if (alreadySaved) {
        permissionWarning = true;
        continue;
      }

      const [
        player1,
        player2,
        player3,
        player4,
      ] =
        court.players as [
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
          matchday_id:
            matchdayId,
          court:
            courtNumber,
        })
        .select("id")
        .single();

      if (
        matchError ||
        !savedMatch
      ) {
        throw new Error(
          matchError?.message ||
            "Impossibile salvare la partita."
        );
      }

      const {
        error: playersError,
      } = await supabase
        .from("match_players")
        .insert([
          {
            match_id:
              savedMatch.id,
            player_id:
              player1,
            team: "A",
          },
          {
            match_id:
              savedMatch.id,
            player_id:
              player2,
            team: "A",
          },
          {
            match_id:
              savedMatch.id,
            player_id:
              player3,
            team: "B",
          },
          {
            match_id:
              savedMatch.id,
            player_id:
              player4,
            team: "B",
          },
        ]);

      if (playersError) {
        throw new Error(
          playersError.message
        );
      }

      const setsToSave =
        court.sets
          .map(
            (
              set,
              setIndex
            ) => ({
              match_id:
                savedMatch.id,
              set_number:
                setIndex + 1,
              team1_score:
                Number(
                  set.team1
                ),
              team2_score:
                Number(
                  set.team2
                ),
            })
          )
          .filter(
            (set) =>
              !Number.isNaN(
                set.team1_score
              ) &&
              !Number.isNaN(
                set.team2_score
              )
          );

      if (
        setsToSave.length > 0
      ) {
        const {
          error: setsError,
        } = await supabase
          .from("match_sets")
          .insert(
            setsToSave
          );

        if (setsError) {
          throw new Error(
            setsError.message
          );
        }
      }

      if (
        court.comment.trim()
      ) {
        const {
          error:
            momentError,
        } = await supabase
          .from(
            "memorable_moments"
          )
          .insert({
            match_id:
              savedMatch.id,
            comment:
              court.comment.trim(),
          });

        if (momentError) {
          throw new Error(
            momentError.message
          );
        }
      }
    }

   setMessage(
  permissionWarning
    ? "⚠️ ATTENZIONE! Non hai i privilegi per modificare il risultato di una partita già registrata."
    : "Risultati salvati correttamente."
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
    savingRef.current =
      false;
  }
}

      

  return (
    <>
      <main
        className="matchday-page"
        style={{
          paddingBottom: 140,
        }}
      >
        <header className="matchday-header">
          <div>
            <p className="eyebrow">
              PADEL ON TUESDAY
            </p>

            <h1>
              Nuova giornata
            </h1>

            <p className="matchday-subtitle">
              Stagione 2026–27
            </p>
          </div>

       
        </header>

        <section className="matchday-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                PRESENZE
              </p>

              <h2>
                Chi gioca oggi?
              </h2>
            </div>

            <span className="players-count">
              {
                presentPlayers.length
              }{" "}
              / 8
            </span>
          </div>

          <p className="matchday-description">
            Seleziona i giocatori
            presenti. La giornata
            può avere 4 oppure 8
            giocatori.
          </p>

          {loading ? (
            <p>
              Caricamento
              giocatori...
            </p>
          ) : (
            <>
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing:
                    "0.08em",
                  opacity: 0.55,
                }}
              >
                I PIÙ ASSIDUI
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {visiblePlayers.map(
                  (player) => {
                    const selected =
                      presentPlayers.includes(
                        player.id
                      );

                    const appearances =
                      playerAppearances[
                        player.id
                      ] || 0;

                    return (
                      <button
                        key={
                          player.id
                        }
                        type="button"
                        onClick={() =>
                          togglePresent(
                            player.id
                          )
                        }
                        style={{
                          padding:
                            "12px 10px",
                          minHeight: 58,
                          borderRadius: 14,
                          border:
                            selected
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
                        <span
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {selected
                            ? "✓ "
                            : ""}
                          {
                            displayPlayerName(
                              player
                            )
                          }
                        </span>

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              3,
                            fontSize:
                              11,
                            opacity:
                              0.5,
                            fontWeight:
                              600,
                          }}
                        >
                          {appearances}{" "}
                          {appearances ===
                          1
                            ? "presenza"
                            : "presenze"}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {hasMorePlayers && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAllPlayers(
                      (current) =>
                        !current
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding:
                      "11px 14px",
                    border: "none",
                    background:
                      "transparent",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      "pointer",
                    textAlign:
                      "center",
                    opacity: 0.7,
                  }}
                >
                  {showAllPlayers
                    ? "− Nascondi elenco completo"
                    : "+ Elenco completo"}
                </button>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowAddPlayer(
                    (value) =>
                      !value
                  )
                }
                style={{
                  marginTop: 8,
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
                    value={
                      newFirstName
                    }
                    onChange={(
                      event
                    ) =>
                      setNewFirstName(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Nome"
                    style={
                      inputStyle
                    }
                  />

                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    COGNOME
                  </div>

                  <input
                    value={
                      newLastName
                    }
                    onChange={(
                      event
                    ) =>
                      setNewLastName(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Cognome"
                    style={
                      inputStyle
                    }
                  />

                  <input
                    value={
                      newEmail
                    }
                    onChange={(
                      event
                    ) =>
                      setNewEmail(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Email (facoltativa)"
                    type="email"
                    style={
                      inputStyle
                    }
                  />

                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      addPlayer
                    }
                    disabled={
                      addingPlayer
                    }
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

       {courts.length > 0 ? (
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
                Scegli direttamente
                i giocatori. Nessun
                giocatore può essere
                usato due volte.
              </p>

              {courts.map(
                (
                  court,
                  courtIndex
                ) => (
                  <div
                    key={
                      court.id
                    }
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
                      {courtIndex +
                        1}
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
                        fontWeight:
                          800,
                        opacity:
                          0.5,
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
                            maxLength={
                              1
                            }
                            inputMode="numeric"
                            id={`score-${court.id}-${setIndex}-team1`}
                            placeholder="A"
                            value={
                              set.team1
                            }
                            onChange={(
                              event
                            ) => {
                              const value =
                                event
                                  .target
                                  .value;

                              if (
                                value ===
                                  "" ||
                                /^[0-7]$/.test(
                                  value
                                )
                              ) {
                                updateSet(
                                  court.id,
                                  setIndex,
                                  "team1",
                                  value
                                );
                                if (value !== "") {
  document
    .getElementById(
      `score-${court.id}-${setIndex}-team2`
    )
    ?.focus();
}
                              }
                            }}
                            style={
                              scoreStyle
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            max="7"
                            maxLength={
                              1
                            }
                            inputMode="numeric"
                            id={`score-${court.id}-${setIndex}-team2`}
                            placeholder="B"
                            value={
                              set.team2
                            }
                            onChange={(
                              event
                            ) => {
                              const value =
                                event
                                  .target
                                  .value;

                              if (
                                value ===
                                  "" ||
                                /^[0-7]$/.test(
                                  value
                                )
                              ) {
                                updateSet(
                                  court.id,
                                  setIndex,
                                  "team2",
                                  value
                                );
                                if (
  value !== "" &&
  setIndex < 2
) {
  document
    .getElementById(
      `score-${court.id}-${setIndex + 1}-team1`
    )
    ?.focus();
}
                              }
                            }}
                            style={
                              scoreStyle
                            }
                          />
                        </div>
                      )
                    )}

                    <div
                      style={{
                        marginTop: 14,
                      }}
                    >
                      <label
                        style={{
                          display:
                            "block",
                          marginBottom:
                            6,
                          fontSize: 13,
                          fontWeight:
                            700,
                          opacity:
                            0.7,
                        }}
                      >
                        💬 Momento memorabile
                      </label>

                      <textarea
                        placeholder="Un colpo incredibile, una rimonta, una battuta..."
                        value={
                          court.comment
                        }
                        onChange={(
                          event
                        ) =>
                          setCourts(
                            (
                              current
                            ) =>
                              current.map(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  court.id
                                    ? {
                                        ...item,
                                        comment:
                                          event
                                            .target
                                            .value,
                                      }
                                    : item
                              )
                          )
                        }
                        rows={3}
                        style={{
                          width:
                            "100%",
                          borderRadius:
                            12,
                          border:
                            "1px solid rgba(0,0,0,0.15)",
                          padding:
                            12,
                          fontSize:
                            15,
                          resize:
                            "vertical",
                        }}
                      />
                    </div>
                  </div>
                )
              )}

              <div
  style={{
    display: "flex",
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
  }}
>
  {(presentPlayers.length === 4 ||
    presentPlayers.length === 8) && (
    <button
      type="button"
      className="secondary-button"
      onClick={() =>
        proposePairs()
      }
    >
      ✨ Abbinali tu
    </button>
  )}
</div>

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
                Seleziona 4 oppure
                8 giocatori.
              </h3>

              <p>
                Quando avrai scelto
                i presenti, qui
                compariranno
                automaticamente i
                campi.
              </p>
            </div>
          </section>
        )}
      </main>

      <div
        style={{
          position:
            "fixed",
          bottom: 76,
          left: 0,
          right: 0,
          zIndex: 100,
          padding:
            "10px 16px",
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
          disabled={
            saving
          }
          style={{
            width:
              "100%",
            maxWidth:
              600,
            margin:
              "0 auto",
            justifyContent:
              "center",
            display:
              "flex",
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
  letterSpacing:
    "0.08em",
  marginBottom: 8,
  opacity: 0.6,
};