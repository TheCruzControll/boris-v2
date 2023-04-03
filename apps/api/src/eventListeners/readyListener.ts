import { Events, Interaction } from "discord.js";
import { DiscordClient } from "../discordClient";
import { Listener } from "../types/listener";
import { commands } from "../types/command";

const run = async (
  client: DiscordClient,
  _interaction: Interaction
): Promise<void> => {
  if (!client.user || !client.application) {
    return;
  }

  for (const command of commands) {
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    console.log(`setting command: ${command.data.name}`);
    client.slashCommands.set(command.data.name, command);
  }
  console.log(`${client.user.username} is online`);
};

const readyListener: Listener = {
  name: Events.ClientReady,
  once: false,
  run,
};

export default readyListener;
