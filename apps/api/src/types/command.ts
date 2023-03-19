import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import DiscordClient from "../discordClient";
import DropCards from "../commands/cardDropSlashCommand";
import Inventory from "../commands/inventorySlashCommand";
import Cooldowns from "../commands/cooldownSlashCommand";
import Burn from "../commands/burnSlashCommand";
import Items from "../commands/itemsSlashCommand";
import Tag from "../commands/tagSlashCommand";

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  run: (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient
  ) => Promise<void>;
}

export const commands: Command[] = [
  DropCards,
  Inventory,
  Cooldowns,
  Items,
  Burn,
  Tag,
];
