/**
 * FFXIV Eorzea Time Utility
 * 1 Eorzea Day = 70 Real Time Minutes
 * 1 Eorzea Hour = 175 Real Time Seconds
 */

const EORZEA_MULTIPLIER = 3600 / 175; // ~20.57

export const getEorzeaTime = (date = new Date()) => {
  const unixTime = date.getTime();
  const eorzeaTime = unixTime * EORZEA_MULTIPLIER;
  const et = new Date(eorzeaTime);
  
  return {
    hours: et.getUTCHours(),
    minutes: et.getUTCMinutes(),
    totalMinutes: et.getUTCHours() * 60 + et.getUTCMinutes()
  };
};

/**
 * Calculate the next spawn and remaining time
 * @param {number[]} spawns - Array of ET hours (0-23)
 * @param {number} duration - Duration in ET minutes
 */
export const getSpawnStatus = (spawns, duration) => {
  const now = getEorzeaTime();
  const nowMin = now.totalMinutes;
  
  // Sort spawns just in case
  const sortedSpawns = [...spawns].sort((a, b) => a - b);
  
  let currentActive = null;
  let nextSpawn = null;
  
  for (const spawnHour of sortedSpawns) {
    const spawnStartMin = spawnHour * 60;
    const spawnEndMin = spawnStartMin + duration;
    
    // Check if currently active
    if (nowMin >= spawnStartMin && nowMin < spawnEndMin) {
      currentActive = {
        start: spawnHour,
        endMin: spawnEndMin,
        remainingET: spawnEndMin - nowMin
      };
      break;
    }
  }
  
  // If not active, find the next one
  if (!currentActive) {
    // Find the first spawn hour that is greater than current hour
    nextSpawn = sortedSpawns.find(s => s * 60 > nowMin);
    
    // If none found today, it's the first one tomorrow
    if (nextSpawn === undefined) {
      nextSpawn = sortedSpawns[0];
      const minutesUntilNext = (24 * 60 - nowMin) + (nextSpawn * 60);
      return {
        isActive: false,
        nextSpawn: nextSpawn,
        minutesUntilET: minutesUntilNext,
        secondsUntilReal: Math.floor(minutesUntilNext * (175 / 60))
      };
    } else {
      const minutesUntilNext = (nextSpawn * 60) - nowMin;
      return {
        isActive: false,
        nextSpawn: nextSpawn,
        minutesUntilET: minutesUntilNext,
        secondsUntilReal: Math.floor(minutesUntilNext * (175 / 60))
      };
    }
  } else {
    // Currently active
    return {
      isActive: true,
      remainingET: currentActive.remainingET,
      secondsRemainingReal: Math.floor(currentActive.remainingET * (175 / 60))
    };
  }
};

export const formatRealTime = (seconds) => {
  if (seconds < 60) return `${seconds}秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分 ${secs}秒`;
};
