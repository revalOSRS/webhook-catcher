export enum EventType {
  DEATH = 'DEATH',
  GRAND_EXCHANGE = 'GRAND_EXCHANGE',
  COLLECTION = 'COLLECTION',
  LEVEL = 'LEVEL',
  LOOT = 'LOOT',
  UNKNOWN = 'UNKNOWN',
}

export type Event = {
  type: EventType;
  playerName: string;
  accountType: 'NORMAL' | 'IRONMAN' | 'ULTIMATE_IRONMAN';
  seasonalWorld: boolean;
  dinkAccountHash: string;
  embeds: any[];
  world?: number;
  regionId?: number;
  discordUser?: {
    id: string;
    name: string;
    avatar: string;
  };
  clanName?: string;
};

export type DeathEvent = Event & {
  type: EventType.DEATH;
  extra: {
    valueLost: number;
    isPvp: boolean;
    killerName?: string;
    killerNpcId?: number;
    keptItems: {
      id: number;
      quantity: number;
      priceEach: number;
      name: string;
    }[];
    lostItems: {
      id: number;
      quantity: number;
      priceEach: number;
      name: string;
    }[];
    location: {
      regionId: number;
      plane: number;
      instanced: boolean;
    };
  };
}

export type CollectionEvent = Event & {
  type: EventType.COLLECTION;
  extra: {
    itemName: string;
    itemId: number;
    price: number;
    completedEntries: number;
    totalEntries: number;
    currentRank: string;
    rankProgress: number;
    logsNeededForNextRank: number;
    nextRank: string;
    justCompletedRank: string;
    dropperName: string;
    dropperType: string;
    dropperKillCount: number;
  }
}

export type LevelEvent = Event & {
  type: EventType.LEVEL;
  extra: {
    levelledSkills?: Record<string, number>;
    allSkills?: Record<string, number>;
    combatLevel?: {
      value: number;
      increased: boolean;
    };
    xpData?: Record<string, number>;
    milestoneAchieved?: string[];
    interval?: number;
  };
}

export type LootEvent = Event & {
  type: EventType.LOOT;
  extra: {
    items: {
      id: number;
      quantity: number;
      priceEach: number;
      name: string;
      criteria: string[];
      rarity: string | null;
    }[];
    source: string;
    party: string[];
    category: 'NPC' | 'PLAYER' | 'EVENT' | 'PICKPOCKET' | 'UNKNOWN';
    killCount: number;
    rarestProbability: number;
    npcId: number | null;
  }
}
