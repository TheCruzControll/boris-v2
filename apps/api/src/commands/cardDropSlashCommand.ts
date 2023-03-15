import { prisma, Skin } from "database";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  MessageComponentInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { Duration } from "luxon";
import { v4 } from "uuid";
import DiscordClient from "../discordClient";
import { getChance } from "../singletons/chance";
import { Command } from "../types/command";
import { emojisToEmojiIds } from "../types/emoji";
import { UserActions } from "../types/users";
import {
  canUserMakeAction,
  CardImage,
  createCards,
  drawImages,
  getCooldownDuration,
  trackUserAction,
} from "./helpers/cardDropHelpers";

async function handleComponentInteraction(
  buttonInteraction: MessageComponentInteraction,
  interaction: CommandInteraction,
  client: DiscordClient,
  uniqueButtonIds: Record<string, Set<string>>,
  cardImages: CardImage[]
) {
  if (
    !(await canUserMakeAction(buttonInteraction.user.id, UserActions.Claim))
  ) {
    const cdDuration = await getCooldownDuration(
      buttonInteraction.user.id,
      UserActions.Claim
    );
    const channel = client.channels.cache.get(
      interaction.channelId
    ) as TextChannel;
    if (channel) {
      await channel.send(
        `${buttonInteraction.user.toString()} **You must wait ${
          cdDuration.minutes
        }m and ${Math.floor(
          cdDuration.seconds
        )}s before you can claim another card**`
      );
    }
    return;
  }

  const chosenSkin: CardImage | undefined = cardImages.find((cardImage) => {
    return cardImage.mappedCustomButtonId === buttonInteraction.customId;
  });
  if (!chosenSkin) {
    const channel = client.channels.cache.get(
      interaction.channelId
    ) as TextChannel;
    if (channel) {
      await channel.send(
        `${buttonInteraction.user.toString()} woops, an error happened. Please try again`
      );
      console.log("no chosen skin");
    }
    return;
  }

  if (buttonInteraction.user.id === interaction.user.id) {
    delete uniqueButtonIds[chosenSkin.mappedCustomButtonId];
    const card = await prisma.card.create({
      data: {
        generation: chosenSkin.generation,
        rank: chosenSkin.rank,
        ownerDiscordId: buttonInteraction.user.id,
        skin: {
          connect: {
            id: chosenSkin.skinId,
          },
        },
      },
    });
    const channel = client.channels.cache.get(
      interaction.channelId
    ) as TextChannel;
    if (channel) {
      await channel.send(
        `${buttonInteraction.user.toString()} claimed **${chosenSkin.name} | ${
          emojisToEmojiIds[chosenSkin.rank]
        }${chosenSkin.rank}` + ` | \`${card.id}\`!**`
      );
    }
    await trackUserAction(buttonInteraction.user.id, UserActions.Claim);
  } else {
    const channel = client.channels.cache.get(
      interaction.channelId
    ) as TextChannel;

    // if already claimed
    if (!uniqueButtonIds[chosenSkin.mappedCustomButtonId]) {
      await channel.send(
        `${buttonInteraction.user.toString()} sorry, ${
          chosenSkin.name
        } is already claimed`
      );
      return;
    }

    // if name is already in raffle
    if (
      uniqueButtonIds[chosenSkin.mappedCustomButtonId].has(
        buttonInteraction.user.id
      )
    ) {
      await channel.send(
        `${buttonInteraction.user.toString()} you can only have one raffle entru`
      );
      return;
    }
    uniqueButtonIds[buttonInteraction.customId].add(buttonInteraction.user.id);
    if (channel) {
      await channel.send(
        `${buttonInteraction.user.toString()} has joined the raffle for **${
          chosenSkin.name
        } | ${emojisToEmojiIds[chosenSkin.rank]}${chosenSkin.rank}**`
      );
    }
  }
}

const DropCards: Command = {
  data: new SlashCommandBuilder().setName("drop").setDescription("Drop Cards"),
  run: async (interaction: CommandInteraction, client: DiscordClient) => {
    if (!(await canUserMakeAction(interaction.user.id, UserActions.Drop))) {
      const cdDuration = await getCooldownDuration(
        interaction.user.id,
        UserActions.Drop
      );
      await interaction.deleteReply();
      const channel = client.channels.cache.get(
        interaction.channelId
      ) as TextChannel;
      if (channel) {
        await channel.send(
          `${interaction.user.toString()} **You must wait ${
            cdDuration.minutes
          }m and ${Math.floor(cdDuration.seconds)}s before you can drop again**`
        );
      }
      return;
    }
    const buttonIds = new Array(3).fill("").map(() => {
      return v4();
    });

    const uniqueButtonIds: Record<string, Set<string>> = buttonIds.reduce(
      (acc, id) => {
        acc[id] = new Set<string>();
        return acc;
      },
      {} as Record<string, Set<string>>
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setCustomId(buttonIds[0])
        .setLabel("1")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttonIds[1])
        .setLabel("2")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buttonIds[2])
        .setLabel("3")
        .setStyle(ButtonStyle.Primary),
    ]);
    const itemCount = await prisma.skin.count();
    const skips: number[] = Array.from(Array(3)).map(() =>
      getChance().integer({ min: 0, max: itemCount })
    );
    const skinsFromDb: Array<Skin | null> = await Promise.all([
      prisma.skin.findFirst({ skip: skips[0] }),
      prisma.skin.findFirst({ skip: skips[1] }),
      prisma.skin.findFirst({ skip: skips[2] }),
    ]);
    const cardImages = createCards(
      [buttonIds[0], buttonIds[1], buttonIds[2]],
      skinsFromDb
    );
    const images = await drawImages(cardImages);
    const attachment = new AttachmentBuilder(images);

    const message = await interaction.editReply({
      content: `${interaction.user.toString()} is dropping cards`,
      files: [attachment],
      components: [row],
    });
    await trackUserAction(interaction.user.id, UserActions.Drop);

    const interactionTime = Duration.fromObject({ seconds: 30 });
    const collector = message.createMessageComponentCollector({
      time: interactionTime.toMillis(),
    });

    collector.on(
      "collect",
      async (buttonInteraction: MessageComponentInteraction) => {
        await handleComponentInteraction(
          buttonInteraction,
          interaction,
          client,
          uniqueButtonIds,
          cardImages
        );
        await buttonInteraction.deferUpdate();
      }
    );

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
          .setCustomId(buttonIds[0])
          .setLabel("1")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(buttonIds[1])
          .setLabel("2")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(buttonIds[2])
          .setLabel("3")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      ]);

      await interaction.editReply({
        content: "*Cards can no longer be claimed*",
        components: [disabledRow],
      });

      for (const [id, raffleEntrants] of Object.entries(uniqueButtonIds)) {
        const winnerUserid = await getWinnerUserId(raffleEntrants);
        if (winnerUserid === "") return;
        await trackUserAction(winnerUserid, UserActions.Claim);
        const chosenSkin = cardImages.find((cardImage) => {
          return cardImage.mappedCustomButtonId === id;
        })!;

        const card = await prisma.card.create({
          data: {
            generation: chosenSkin.generation,
            rank: chosenSkin.rank,
            ownerDiscordId: winnerUserid,
            skin: {
              connect: {
                id: chosenSkin.skinId,
              },
            },
          },
        });
        const channel = client.channels.cache.get(
          interaction.channelId
        ) as TextChannel;
        if (channel) {
          await channel.send(
            `<@${winnerUserid}> claimed **${chosenSkin.name} | ${
              emojisToEmojiIds[chosenSkin.rank]
            }${chosenSkin.rank}` + ` | \`${card.id}\`!**`
          );
        }
      }
    });
  },
};

async function getWinnerUserId(raffleEntrants: Set<string>): Promise<string> {
  if (raffleEntrants.size === 0) return "";
  const pickedUserId = getChance().pickone(Array.from(raffleEntrants));
  if (await canUserMakeAction(pickedUserId, UserActions.Claim)) {
    return pickedUserId;
  }
  raffleEntrants.delete(pickedUserId);
  return getWinnerUserId(raffleEntrants);
}

export default DropCards;
