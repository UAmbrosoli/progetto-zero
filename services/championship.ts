export type ChampionshipPlayer = {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
};

export type ChampionshipMatchday = {
  id: string;
  match_date: string;
};

export type ChampionshipMatch = {
  id: string;
  matchday_id: string;
  court: number;
};

export type ChampionshipMatchPlayer = {
  match_id: string;
  player_id: string;
  team: "A" | "B";
};

export type ChampionshipSet = {
  match_id: string;
  set_number: number;
  team1_score: number;
  team2_score: number;
};

export type ChampionshipData = {
  players: ChampionshipPlayer[];
  matchdays: ChampionshipMatchday[];
  matches: ChampionshipMatch[];
  matchPlayers: ChampionshipMatchPlayer[];
  sets: ChampionshipSet[];
};

export async function getChampionshipData(): Promise<ChampionshipData> {
  const response = await fetch("/api/championship", {
    method: "GET",
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Errore nel caricamento dei dati del campionato."
    );
  }

  return result as ChampionshipData;
}

export function getPlayerName(
  player: ChampionshipPlayer
): string {
  if (player.first_name && player.last_name) {
    return `${player.last_name} ${player.first_name}`;
  }

  if (player.first_name) {
    return player.first_name;
  }

  if (player.last_name) {
    return player.last_name;
  }

  return player.name;
}

export function createPlayerMap(
  players: ChampionshipPlayer[]
): Map<string, string> {
  const playerMap = new Map<string, string>();

  for (const player of players) {
    playerMap.set(player.id, getPlayerName(player));
  }

  return playerMap;
}