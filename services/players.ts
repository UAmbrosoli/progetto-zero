import type { Player } from "@/types/player";

export async function getPlayers(): Promise<Player[]> {
  const response = await fetch(
    "/api/giocatori",
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Errore nel caricamento dei giocatori."
    );
  }

  return result as Player[];
}

export async function createPlayer(
  first_name: string,
  last_name: string,
  email: string,
  is_external = false
): Promise<Player> {
  const response = await fetch(
    "/api/giocatori",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name,
        last_name,
        email,
        is_external,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Errore nel salvataggio del giocatore."
    );
  }

  return result as Player;
}

export async function updatePlayer(
  id: string,
  first_name: string,
  last_name: string,
  email: string,
  is_external = false
): Promise<Player> {
  const response = await fetch(
    `/api/giocatori?id=${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name,
        last_name,
        email,
        is_external,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Errore nella modifica del giocatore."
    );
  }

  return result as Player;
}

export async function deletePlayer(
  id: string
): Promise<void> {
  const response = await fetch(
    `/api/giocatori?id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Errore nell'eliminazione del giocatore."
    );
  }
}