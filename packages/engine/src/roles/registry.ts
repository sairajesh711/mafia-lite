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
      if (channel === 'day' && phase === 'day' && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
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
      if (channel === 'day' && phase === 'day' && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
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
      if (channel === 'day' && phase === 'day' && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
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
      if (channel === 'day' && phase === 'day' && isAlive) return true;
      if (channel === 'dead' && !isAlive) return true;
      if (channel === 'lobby' && phase === 'lobby') return true;
      return false;
    },
  },
  voting: {
    canVote: true,
    weight: 1,
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