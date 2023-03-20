import {
  ChatInputCommandInteraction,
  CommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { intersection } from "lodash";
import DiscordClient from "../discordClient";
import { Command } from "../types/command";
import { getAllCards, getSingleCard } from "./helpers/inventoryHelpers";

const Inventory: Command = {
  data: new SlashCommandBuilder()
    .setName("inv")
    .setDescription("Show claimed cards")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("card")
        .setDescription("View single card")
        .addStringOption((option) =>
          option
            .setName("cardid")
            .setDescription("Id of card")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("View inventory of user")
        .addUserOption((option) =>
          option
            .setName("username")
            .setDescription("Name of user you want to view the inventory of ")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("self").setDescription("View inventory of self")
    ),
  run: async (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient
  ) => {
    switch (interaction.options.getSubcommand()) {
      case "card":
        const cardid = interaction.options.getString("cardid");
        if (!cardid) {
          const channel = client.channels.cache.get(
            interaction.channelId
          ) as TextChannel;
          await channel.send(
            `${interaction.user.toString()} no card id provided`
          );
        }
        await getSingleCard(cardid!, interaction, client);
        return;
      case "user":
        const user = interaction.options.getUser("username");
        await getAllCards(user!, interaction, client);
        return;
      default:
        await getAllCards(interaction.user, interaction, client);
        return;
    }
  },
};

export default Inventory;
