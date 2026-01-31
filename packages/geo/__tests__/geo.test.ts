import { describe, it, expect } from 'vitest';
import { calcDistance, calcConvenience, addressNormalize, addressFingerprint } from '@aus-prop/geo';

describe('Geo Module', () => {
  describe('Distance Calculations', () => {
    it('should calculate distance between two points', () => {
      // Sydney CBD to Bondi Beach
      const distance = calcDistance(-33.8688, 151.2093, -33.8808, 151.2753);
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(8);
    });

    it('should return 0 for same point', () => {
      const distance = calcDistance(-33.8688, 151.2093, -33.8688, 151.2093);
      expect(distance).toBe(0);
    });
  });

  describe('Convenience Scoring', () => {
    it('should calculate family convenience score', () => {
      const score = calcConvenience(-33.8688, 151.2093, 'family');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate investor convenience score', () => {
      const score = calcConvenience(-33.8688, 151.2093, 'investor');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Address Parsing', () => {
    it('should normalize Australian address', () => {
      const result = addressNormalize('123 Elizabeth St, Sydney NSW 2000');
      expect(result.address).toContain('Elizabeth');
      expect(result.suburb).toBe('Sydney');
      expect(result.state).toBe('NSW');
      expect(result.postcode).toBe('2000');
    });

    it('should handle unit numbers', () => {
      const result = addressNormalize('Unit 12/45 Park Lane, Bondi NSW 2026');
      expect(result.address).toContain('Park Lane');
    });

    it('should generate consistent fingerprint', () => {
      const addr1 = addressNormalize('123 Elizabeth St, Sydney NSW 2000');
      const addr2 = addressNormalize('123 Elizabeth Street, SYDNEY NSW 2000');
      const fp1 = addressFingerprint(addr1);
      const fp2 = addressFingerprint(addr2);
      expect(fp1).toBe(fp2);
    });
  });
});
