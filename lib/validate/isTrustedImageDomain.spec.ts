import isTrustedImageDomain, { trustedDomains } from './isTrustedImageDomain';

describe('lib/validate', () => {
  describe('isTrustedImageDomain', () => {
    test('should return false for unknown URL domains.', () => {
      const result = isTrustedImageDomain('//foo.com/bar.png');

      expect(result).toBe(false);
    });

    test('should return true for trusted URL domains.', () => {
      const result = isTrustedImageDomain(`//${trustedDomains[0]}/foo.png`);

      expect(result).toBe(true);
    });
  });
});
