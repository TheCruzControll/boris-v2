import {
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { commands } from "./types/command";

const registerSlashCommands = async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

  const commandsToJson = commands.map((command) => command.data.toJSON());
  try {
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      {
        body: commandsToJson,
      }
    );

    console.log(
      // @ts-ignore
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
};

export default registerSlashCommands;
