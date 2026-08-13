import { supabase } from "@/utils/supabase/client";
import type { Player } from "@/types/player";

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data as Player[];
}

export async function createPlayer(
  first_name: string,
  last_name: string,
  email: string
): Promise<Player> {
  const fullName = `${first_name} ${last_name}`.trim();

  const { data, error } = await supabase
    .from("players")
    .insert([
      {
        name: fullName,
        first_name,
        last_name,
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