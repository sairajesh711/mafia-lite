import type { RoleConfig, Alignment, Phase } from '@mafia/contracts';

/**
 * Role registry following the Open/Closed principle.
 * Adding new roles requires only configuration, not changing core reducers.
 */

const MAFIA_ROLE: RoleConfig = {
  id: 'mafia',
  alignment: 'mafia',
  night: {
    type: 'KILL',
    priority: 10,
    maxTargets: 1,
    targetRequired: true,
  },
  targets: {
    allowSelf: false,
    allowAlive: true,
    allowDead: false,
    filter: 'nonMafia',
  },
  visibility: {
    knowsTeammates: true,
    seesVoteTallies: 'live',
  },
  chat: {
    canSpeak: ({ phase, channel, isAlive }) => {
      if (channel === 'nightMafia' && phase === 'night') return true;
      if (channel === 'day' && (phase === 'day_announcement' || phase === 'day_discussion' || phase === 'day_voting') && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
  },
  startingKnowledge: [
    "You are a member of the Mafia.",
    "Each night, you can choose someone to eliminate.",
    "You can communicate with other Mafia members during the night.",
    "Your goal is to eliminate all non-Mafia players."
  ],
  winCondition: {
    type: 'elimination',
    target: ['town', 'neutral'],
    description: 'Eliminate all non-Mafia players to win'
  },
};

const DETECTIVE_ROLE: RoleConfig = {
  id: 'detective',
  alignment: 'town',
  night: {
    type: 'INVESTIGATE',
    priority: 30,
    maxTargets: 1,
    targetRequired: true,
  },
  targets: {
    allowSelf: false,
    allowAlive: true,
    allowDead: false,
    filter: 'anyAlive',
  },
  visibility: {
    knowsTeammates: false,
    seesVoteTallies: 'live',
  },
  chat: {
    canSpeak: ({ phase, channel, isAlive }) => {
      if (channel === 'day' && (phase === 'day_announcement' || phase === 'day_discussion' || phase === 'day_voting') && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
  },
  startingKnowledge: [
    "You are the Detective.",
    "Each night, you can investigate one player to learn if they are suspicious.",
    "Use your investigations wisely to find the Mafia.",
    "Share your findings during the day to help the town."
  ],
  winCondition: {
    type: 'elimination',
    target: ['mafia'],
    description: 'Eliminate all Mafia members to win'
  },
};

const DOCTOR_ROLE: RoleConfig = {
  id: 'doctor',
  alignment: 'town',
  night: {
    type: 'PROTECT',
    priority: 20,
    maxTargets: 1,
    targetRequired: true,
  },
  targets: {
    allowSelf: true, // Doctor may self-heal per spec
    allowAlive: true,
    allowDead: false,
    filter: 'anyAlive',
  },
  visibility: {
    knowsTeammates: false,
    seesVoteTallies: 'live',
  },
  chat: {
    canSpeak: ({ phase, channel, isAlive }) => {
      if (channel === 'day' && (phase === 'day_announcement' || phase === 'day_discussion' || phase === 'day_voting') && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
  },
  startingKnowledge: [
    "You are the Doctor.",
    "Each night, you can protect one player from attacks.",
    "You can protect yourself, but not the same person twice in a row.",
    "Keep important town members alive to help win."
  ],
  winCondition: {
    type: 'elimination',
    target: ['mafia'],
    description: 'Eliminate all Mafia members to win'
  },
};

const TOWNSPERSON_ROLE: RoleConfig = {
  id: 'townsperson',
  alignment: 'town',
  targets: {
    allowSelf: false,
    allowAlive: false,
    allowDead: false,
  },
  visibility: {
    knowsTeammates: false,
    seesVoteTallies: 'live',
  },
  chat: {
    canSpeak: ({ phase, channel, isAlive }) => {
      if (channel === 'day' && (phase === 'day_announcement' || phase === 'day_discussion' || phase === 'day_voting') && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
  },
  startingKnowledge: [
    "You are a Townsperson.",
    "You have no special abilities, but your vote is crucial.",
    "Listen carefully during discussions and vote to eliminate suspicious players.",
    "Work with other town members to identify the Mafia."
  ],
  winCondition: {
    type: 'elimination',
    target: ['mafia'],
    description: 'Eliminate all Mafia members to win'
  },
};

/**
 * Central role registry - single source of truth for all role configurations
 */
export const ROLE_REGISTRY = {
  mafia: MAFIA_ROLE,
  detective: DETECTIVE_ROLE,
  doctor: DOCTOR_ROLE,
  townsperson: TOWNSPERSON_ROLE,
} as const;

/**
 * Get role configuration by ID
 */
export function getRoleConfig(roleId: string): RoleConfig {
  const config = ROLE_REGISTRY[roleId as keyof typeof ROLE_REGISTRY];
  if (!config) {
    throw new Error(`Unknown role: ${roleId}`);
  }
  return config;
}

/**
 * Check if a role can perform a night action
 */
export function canRoleActAtNight(roleId: string): boolean {
  const config = getRoleConfig(roleId);
  return config.night !== undefined && config.night.type !== 'NONE';
}

/**
 * Get all roles by alignment
 */
export function getRolesByAlignment(alignment: Alignment): RoleConfig[] {
  return Object.values(ROLE_REGISTRY).filter(role => role.alignment === alignment);
}

/**
 * Generate default role distribution for a given player count
 */
export function getDefaultRoleDistribution(playerCount: number): string[] {
  if (playerCount < 5) {
    throw new Error('Minimum 5 players required');
  }

  const roles: string[] = [];
  
  // Always include 1 detective and 1 doctor
  roles.push('detective', 'doctor');
  
  // Calculate mafia count (roughly 1/3 of players, minimum 1)
  const mafiaCount = Math.max(1, Math.floor(playerCount / 3));
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('mafia');
  }
  
  // Fill remaining slots with townsperson
  while (roles.length < playerCount) {
    roles.push('townsperson');
  }
  
  return roles;
}