import { supabase } from "@/utils/supabase/client";
import type { Player } from "@/types/player";

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");

  if (error) {
    throw error;
  }

  return data as Player[];
}

export async function createPlayer(
  name: string,
  email: string
): Promise<Player> {
  const { data, error } = await supabase
    .from("players")
    .insert([
      {
        name,
        email,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Player;
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}