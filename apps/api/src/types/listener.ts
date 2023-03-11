import { Interaction, Events } from "discord.js";
import DiscordClient from "../discordClient";

export interface Listener {
  name: Events;
  once: boolean;
  run: (client: DiscordClient, interaction: Interaction) => Promise<void>;
}
