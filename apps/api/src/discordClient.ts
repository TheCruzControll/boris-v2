import { Client, ClientOptions, Collection } from 'discord.js';
import _ from 'lodash';
import { Command } from './types/command';

export type InteractionCollection = Collection<string, Command>;

export default class DiscordClient extends Client {
  public readonly slashCommands: InteractionCollection;
  public readonly buttonCommands: InteractionCollection;

  constructor(options: ClientOptions) {
    const interactionsWithoutCollection = _.omit(options, 'commands');
    super(interactionsWithoutCollection);
    this.slashCommands = new Collection();
    this.buttonCommands = new Collection();
  }
}
