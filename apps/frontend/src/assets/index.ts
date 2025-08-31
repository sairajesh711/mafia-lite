// Asset manifest for Mafia Night game assets
// Using optimized WebP files for better performance

export interface AssetManifest {
  portraits: Record<string, string>;
  backgrounds: Record<string, string>;
}

export const ASSETS = {
  portraits: {
    townperson: "/static/RoleArt/Townperson.webp", // 237KB
    detective: "/static/RoleArt/Detective.webp",   // 279KB  
    mafia: "/static/RoleArt/Mafia.webp",          // 145KB
    doctor: "/static/RoleArt/Doctor.webp",        // 212KB
  },
  backgrounds: {
    night: "/static/BackgroundArt/night.webp",         // 572KB
    day: "/static/BackgroundArt/day.webp",             // 421KB
    mafiaWin: "/static/BackgroundArt/Mafiawin.webp",   // 367KB
    townWin: "/static/BackgroundArt/Townwin.webp",     // 452KB
  }
} as const;

// Type-safe asset getters
export const getRolePortrait = (role: string): string => {
  const portraits = ASSETS.portraits as Record<string, string>;
  const portrait = portraits[role.toLowerCase()];
  return portrait || portraits.townperson || "/static/RoleArt/Townperson.webp";
};

export const getPhaseBackground = (phase: string): string => {
  const backgrounds = ASSETS.backgrounds as Record<string, string>;
  const background = backgrounds[phase];
  return background || backgrounds.night || "/static/BackgroundArt/night.webp";
};

export const getVictoryBackground = (winner: 'mafia' | 'town'): string => {
  return winner === 'mafia' ? ASSETS.backgrounds.mafiaWin : ASSETS.backgrounds.townWin;
};

// Preload critical assets
export const preloadAssets = (assets: string[]) => {
  assets.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
};

// Error messages with casual tone
export const ERROR_MESSAGES: Record<string, string> = {
  'ROOM_NOT_FOUND': "Can't find that room - double check the code?",
  'CONNECTION_LOST': "Oops! Lost connection. Trying to reconnect...",
  'SESSION_EVICTED': "Looks like you joined from another tab. Using this one now!",
  'GAME_FULL': "Room's full! Try creating a new one?",
  'INVALID_NAME': "That name won't work - try something 3-15 characters?",
  'NETWORK_ERROR': "Something went wrong with the network. Try again?",
  'UNKNOWN_ERROR': "Hmm, something unexpected happened. Give it another shot?",
};