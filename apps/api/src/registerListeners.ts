import fs from "fs";
import path from "path";
import DiscordClient from "./discordClient";
import readyListener from "./eventListeners/readyListener";
import interactionCreateListener from "./eventListeners/interactionCreateListener";

const registerListeners = (client: DiscordClient) => {
  const events = [readyListener, interactionCreateListener];

  for (const event of events) {
    if (event.once) {
      // @ts-ignore
      client.once(event.name, (...args) => event.run(client, ...args));
    } else {
      // @ts-ignore
      client.on(event.name, (...args) => event.run(client, ...args));
    }
  }
};

export default registerListeners;
