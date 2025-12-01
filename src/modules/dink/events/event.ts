export enum DinkEventType {
  DEATH = 'DEATH',
  COLLECTION = 'COLLECTION',
  LEVEL = 'LEVEL',
  LOOT = 'LOOT',
  CLUE = 'CLUE',
  KILL_COUNT = 'KILL_COUNT',
  PET = 'PET',
  SPEEDRUN = 'SPEEDRUN',
  BARBARIAN_ASSAULT_GAMBLE = 'BARBARIAN_ASSAULT_GAMBLE',
  CHAT = 'CHAT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  UNKNOWN = 'UNKNOWN',
  
  // NOT USED
  ACHIEVEMENT_DIARY = 'ACHIEVEMENT_DIARY',
  COMBAT_ACHIEVEMENT = 'COMBAT_ACHIEVEMENT',
  GRAND_EXCHANGE = 'GRAND_EXCHANGE',
  PLAYER_KILL = 'PLAYER_KILL',
  GROUP_STORAGE = 'GROUP_STORAGE',
  SLAYER = 'SLAYER',
  QUEST = 'QUEST',
  TRADE = 'TRADE',
}

export type DinkEvent = {
  type: DinkEventType;
  content: string;
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

export type DinkDeathEvent = DinkEvent & {
  type: DinkEventType.DEATH;
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

export type DinkCollectionEvent = DinkEvent & {
  type: DinkEventType.COLLECTION;
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

export type DinkLevelEvent = DinkEvent & {
  type: DinkEventType.LEVEL;
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

export type DinkLootEvent = DinkEvent & {
  type: DinkEventType.LOOT;
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

export type DinkClueEvent = DinkEvent & {
  type: DinkEventType.CLUE;
  extra: {
    clueType: 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Elite';
    numberCompleted: number;
    items: {
      id: number;
      quantity: number;
      priceEach: number;
      name: string;
    }[];
  }
}

export type DinkKillCountEvent = DinkEvent & {
  type: DinkEventType.KILL_COUNT;
  extra: {
    boss: string;
    count: number;
    gameMessage: string;
    time: string;
    isPersonalBest: boolean;
    personalBest: null | string;
    party: string[];
  }
}

export type DinkPetEvent = DinkEvent & {
  type: DinkEventType.PET;
  extra: {
    petName: string;
    milestone: string;
    duplicate: boolean;
  }
}

export type DinkSpeedrunEvent = DinkEvent & {
  type: DinkEventType.SPEEDRUN;
  extra: {
    questName: string;
    personalBest: string;
    currentTime: string;
    isPersonalBest?: boolean;
  }
}

export type DinkBarbarianAssaultGambleEvent = DinkEvent & {
  type: DinkEventType.BARBARIAN_ASSAULT_GAMBLE;
  extra: {
    gambleCount: number;
    item: {
      id: number;
      quantity: number;
      priceEach: number;
      name: string;
    }[];
  }
}

export type DinkChatEvent = DinkEvent & {
  type: DinkEventType.CHAT;
  extra: {
    /** Message type: GAMEMESSAGE, PUBLICCHAT, PRIVATECHAT, FRIENDSCHAT, CLAN_CHAT, BROADCAST, UNKNOWN, etc. */
    type: string;
    /** The chat message content */
    message: string;
    /** The sender's name (for player-sent messages like PUBLICCHAT, PRIVATECHAT) */
    source: string | null;
    /** Clan title info (for CLAN_CHAT, CLAN_GUEST_CHAT, CLAN_GIM_CHAT, CLAN_MESSAGE) */
    clanTitle: {
      rankId: number;
      title: string;
    } | null;
  }
}

export type DinkLoginEvent = DinkEvent & {
  type: DinkEventType.LOGIN;
  extra: {
    world?: number
    collectionLog?: {
      completed: number
      total: number
    }
    combatAchievementPoints?: {
      completed: number
      total: number
    }
    achievementDiary?: {
      completed: number
      total: number
    }
    achievementDiaryTasks?: {
      completed: number
      total: number
    }
    barbarianAssault?: {
      highGambleCount: number
    }
    skills?: {
      totalExperience: number
      totalLevel: number
      levels: {
        Hunter: number
        Thieving: number
        Runecraft: number
        Construction: number
        Cooking: number
        Magic: number
        Fletching: number
        Herblore: number
        Firemaking: number
        Attack: number
        Fishing: number
        Crafting: number
        Hitpoints: number
        Ranged: number
        Mining: number
        Smithing: number
        Agility: number
        Woodcutting: number
        Slayer: number
        Defence: number
        Strength: number
        Prayer: number
        Farming: number
      }
      experience: {
        Hunter: number
        Thieving: number
        Runecraft: number
        Construction: number
        Cooking: number
        Magic: number
        Fletching: number
        Herblore: number
        Firemaking: number
        Attack: number
        Fishing: number
        Crafting: number
        Hitpoints: number
        Ranged: number
        Mining: number
        Smithing: number
        Agility: number
        Woodcutting: number
        Slayer: number
        Defence: number
        Strength: number
        Prayer: number
        Farming: number
      }
    }
    questCount?: {
      completed: number
      total: number
    }
    questPoints?: {
      completed: number
      total: number
    }
    slayer?: {
      points: number
      streak: number
    }
    pets?: Array<{
      itemId: number
      name: string
    }>
  }
}

export type DinkLogoutEvent = DinkEvent & {
  type: DinkEventType.LOGOUT;
}
