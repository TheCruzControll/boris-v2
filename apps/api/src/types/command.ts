import {
  CommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import DiscordClient from "../discordClient";
import DropCards from "../commands/cardDropSlashCommand";
import Inventory from "../commands/inventorySlashCommand";

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  run: (
    interaction: CommandInteraction,
    client: DiscordClient
  ) => Promise<void>;
}

export const commands: Command[] = [DropCards, Inventory];
