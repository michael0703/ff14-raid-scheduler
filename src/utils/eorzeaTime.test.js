import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEorzeaTime, getSpawnStatus, formatRealTime } from '../utils/eorzeaTime';

describe('eorzeaTime Utility', () => {
  it('correctly calculates Eorzea Time from a real Date', () => {
    // 2024-01-01 12:00:00 UTC
    const date = new Date('2024-01-01T12:00:00Z');
    const et = getEorzeaTime(date);
    
    // Eorzea time is 20.57x real time
    // This is just a basic check that it returns the expected structure
    expect(et).toHaveProperty('hours');
    expect(et).toHaveProperty('minutes');
    expect(et.hours).toBeGreaterThanOrEqual(0);
    expect(et.hours).toBeLessThan(24);
  });

  describe('getSpawnStatus', () => {
    it('identifies an active spawn correctly', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const et = getEorzeaTime(date);
      
      const spawns = [et.hours]; 
      const duration = 120; // 2 ET hours
      
      const status = getSpawnStatus(spawns, duration, date);
      expect(status.isActive).toBe(true);
      expect(status.remainingET).toBeGreaterThan(0);
    });

    it('identifies a waiting spawn correctly', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const et = getEorzeaTime(date);
      
      // Set a spawn in the future (next hour or wrapped)
      const nextHour = (et.hours + 2) % 24;
      const spawns = [nextHour];
      const duration = 60;
      
      const status = getSpawnStatus(spawns, duration, date);
      expect(status.isActive).toBe(false);
      expect(status.nextSpawn).toBe(nextHour);
    });
  });

  describe('formatRealTime', () => {
    it('formats seconds into 分 秒 correctly', () => {
      expect(formatRealTime(65)).toBe('1分 5秒');
      expect(formatRealTime(3600)).toBe('60分 0秒');
      expect(formatRealTime(10)).toBe('10秒');
      expect(formatRealTime(0)).toBe('0秒');
    });
  });
});
