import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import DiscordClient from "../discordClient";
import { Command } from "../types/command";
import {
  startCreateTagWorkflow,
  startDeleteTagWorkflow,
  startListTagWorkflow,
  startTagCardWorkflow,
} from "./helpers/tagHelper";

const Tag: Command = {
  data: new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Organize your cards")
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all tags")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new tag")
        .addStringOption((option) =>
          option.setName("name").setDescription("Name of tag").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Emoji of tag")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("card")
        .setDescription("Add new card to existing tag")
        .addStringOption((option) =>
          option.setName("name").setDescription("Name of tag").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("cardid")
            .setDescription("Card ID to tag. Defaults to last received card")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete an existing tag")
        .addStringOption((option) =>
          option.setName("name").setDescription("Name of tag").setRequired(true)
        )
    ),
  /*
   *   - Tag create: need tagname and emoji
   *   - Tag card: need tagname. Cardid is optional, default to last card
   *   - Tag delete: need tagname
   *   - Tag list: Need tagname. List emoji, tagname, and number of cards
   *   - Tag generation: Generate tags for all cards that meet certain filters. I.e rank === something. Rank > or < something. Gen < or > something. Champion name etc.
   */
  run: async (
    interaction: ChatInputCommandInteraction,
    _client: DiscordClient
  ) => {
    switch (interaction.options.getSubcommand()) {
      case "create":
        await startCreateTagWorkflow(interaction);
        return;
      case "card":
        await startTagCardWorkflow(interaction);
        return;
      case "delete":
        await startDeleteTagWorkflow(interaction);
        return;
      case "list":
        await startListTagWorkflow(interaction);
        return;
      case "generate":
        return;
    }
  },
};

export default Tag;
