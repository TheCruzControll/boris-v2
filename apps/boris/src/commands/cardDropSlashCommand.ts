import { ItemType, prisma, Skin, supabase } from "database";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  CommandInteraction,
  MessageComponentInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Duration } from "luxon";
import { v4 } from "uuid";
import { DiscordClient } from "../discordClient";
import { getChance } from "../singletons/chance";
import { Command } from "../types/command";
import { emojisToEmojiIds, itemTypeToEmoji } from "../types/emoji";
import { UserActions } from "../types/users";
import {
  canUserMakeAction,
  CardImage,
  createCards,
  drawImages,
  getCooldownDuration,
  trackUserAction,
} from "./helpers/cardDropHelpers";
import { sendMessageToChannel } from "./helpers/sharedHelpers";

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
    const message = `${buttonInteraction.user.toString()} **You must wait ${
      cdDuration.minutes
    }m and ${Math.floor(
      cdDuration.seconds
    )}s before you can claim another card**`;
    sendMessageToChannel(client, interaction.channelId, message);
    return;
  }

  const chosenSkin: CardImage | undefined = cardImages.find((cardImage) => {
    return cardImage.mappedCustomButtonId === buttonInteraction.customId;
  });

  if (!chosenSkin) {
    sendMessageToChannel(
      client,
      interaction.channelId,
      `${buttonInteraction.user.toString()} woops, an error happened. Please try again`
    );
    return;
  }

  if (buttonInteraction.user.id === interaction.user.id) {
    delete uniqueButtonIds[chosenSkin.mappedCustomButtonId];
    const cardImage = await drawImages([chosenSkin]);

    const cardUrl = v4();
    // this usually takes really long so were not awaiting.
    // This doesnt need to finish in order to go thorugh the rest so its fine to not await
    supabase.storage.from("cards").upload(`${cardUrl}.png`, cardImage, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });
    const card = await prisma.card.create({
      data: {
        generation: chosenSkin.generation,
        rank: chosenSkin.rank,
        url: `${process.env.SUPABASE_CARD_BUCKET_URL}/${cardUrl}.png`,
        user: {
          connectOrCreate: {
            where: {
              id: buttonInteraction.user.id,
            },
            create: {
              id: buttonInteraction.user.id,
              balance: 0,
            },
          },
        },
        skin: {
          connect: {
            id: chosenSkin.skinId,
          },
        },
      },
    });
    sendMessageToChannel(
      client,
      interaction.channelId,
      `${buttonInteraction.user.toString()} claimed **${chosenSkin.name} | ${
        emojisToEmojiIds[chosenSkin.rank]
      }${chosenSkin.rank}` + ` | \`${card.id}\`!**`
    );
    const itemUsed = await trackUserAction(
      buttonInteraction.user.id,
      UserActions.Claim
    );
    if (itemUsed) {
      await sendMessageToChannel(
        client,
        interaction.channelId,
        `${buttonInteraction.user.toString()} used item **${
          itemTypeToEmoji[itemUsed as ItemType]
        }${itemUsed}!**`
      );
    }
  } else {
    // if already claimed
    if (!uniqueButtonIds[chosenSkin.mappedCustomButtonId]) {
      const message = `${buttonInteraction.user.toString()} sorry, ${
        chosenSkin.name
      } is already claimed`;
      sendMessageToChannel(client, interaction.channelId, message);
      return;
    }

    // if name is already in raffle
    if (
      uniqueButtonIds[chosenSkin.mappedCustomButtonId].has(
        buttonInteraction.user.id
      )
    ) {
      sendMessageToChannel(
        client,
        interaction.channelId,
        `${buttonInteraction.user.toString()} you can only have one raffle entry`
      );
      return;
    }
    uniqueButtonIds[buttonInteraction.customId].add(buttonInteraction.user.id);
    sendMessageToChannel(
      client,
      interaction.channelId,
      `${buttonInteraction.user.toString()} has joined the raffle for **${
        chosenSkin.name
      } | ${emojisToEmojiIds[chosenSkin.rank]}${chosenSkin.rank}**`
    );
  }
}

const DropCards: Command = {
  data: new SlashCommandBuilder().setName("drop").setDescription("Drop Cards"),
  run: async (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient
  ) => {
    if (!(await canUserMakeAction(interaction.user.id, UserActions.Drop))) {
      const cdDuration = await getCooldownDuration(
        interaction.user.id,
        UserActions.Drop
      );
      interaction.deleteReply();
      sendMessageToChannel(
        client,
        interaction.channelId,
        `${interaction.user.toString()} **You must wait ${
          cdDuration.minutes
        }m and ${Math.floor(cdDuration.seconds)}s before you can drop again**`
      );
      return;
    }
    // Tracking earlier now to prevent people from spamming the drop command
    const itemUsed = await trackUserAction(
      interaction.user.id,
      UserActions.Drop
    );
    if (itemUsed) {
      await sendMessageToChannel(
        client,
        interaction.channelId,
        `${interaction.user.toString()} used item **${
          itemTypeToEmoji[itemUsed as ItemType]
        }${itemUsed}!**`
      );
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

    const cardData = createCards(
      [buttonIds[0], buttonIds[1], buttonIds[2]],
      skinsFromDb
    );

    const images = await drawImages(cardData);
    const attachment = new AttachmentBuilder(images);

    const message = await interaction.editReply({
      content: `${interaction.user.toString()} is dropping cards`,
      files: [attachment],
      components: [row],
    });

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
          cardData
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
        if (winnerUserid === "") {
          continue;
        }
        const itemUsed = await trackUserAction(winnerUserid, UserActions.Claim);
        if (itemUsed) {
          await sendMessageToChannel(
            client,
            interaction.channelId,
            `<@${winnerUserid}> used item **${
              itemTypeToEmoji[itemUsed as ItemType]
            }${itemUsed}!**`
          );
        }

        const chosenSkin = cardData.find((cardImage) => {
          return cardImage.mappedCustomButtonId === id;
        })!;

        const cardImage = await drawImages([chosenSkin]);
        const cardUrl = v4();
        supabase.storage.from("cards").upload(`${cardUrl}.png`, cardImage, {
          contentType: "image/png",
          cacheControl: "3600",
          upsert: true,
        });

        const card = await prisma.card.create({
          data: {
            generation: chosenSkin.generation,
            rank: chosenSkin.rank,
            url: `${process.env.SUPABASE_CARD_BUCKET_URL}/${cardUrl}.png`,
            user: {
              connectOrCreate: {
                where: {
                  id: winnerUserid,
                },
                create: {
                  id: winnerUserid,
                  balance: 0,
                },
              },
            },
            skin: {
              connect: {
                id: chosenSkin.skinId,
              },
            },
          },
        });
        sendMessageToChannel(
          client,
          interaction.channelId,
          `<@${winnerUserid}> claimed **${chosenSkin.name} | ${
            emojisToEmojiIds[chosenSkin.rank]
          }${chosenSkin.rank}` + ` | \`${card.id}\`!**`
        );
      }
    });
  },
};

async function getWinnerUserId(raffleEntrants: Set<string>): Promise<string> {
  if (raffleEntrants.size === 0) return "";
  const random = Math.floor(Math.random() * raffleEntrants.size);
  const pickedUserId = Array.from(raffleEntrants)[random];
  if (await canUserMakeAction(pickedUserId, UserActions.Claim)) {
    return pickedUserId;
  }
  raffleEntrants.delete(pickedUserId);
  return getWinnerUserId(raffleEntrants);
}

export default DropCards;
