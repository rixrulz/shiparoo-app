import { fmt } from '../UI';

describe('fmt', () => {
  describe('dollars', () => {
    it('formats cents as dollars', () => {
      expect(fmt.dollars(123456)).toBe('$1,234.56');
      expect(fmt.dollars(250000)).toBe('$2,500');
    });

    it('keeps fractional cents but does not pad whole dollars', () => {
      expect(fmt.dollars(500)).toBe('$5');
      expect(fmt.dollars(0)).toBe('$0');
    });

    it('renders a dash for missing values', () => {
      expect(fmt.dollars(null)).toBe('—');
      expect(fmt.dollars(undefined)).toBe('—');
    });
  });

  describe('weight', () => {
    it('formats pounds', () => {
      expect(fmt.weight(150)).toBe('150 lbs');
    });

    it('renders a dash for empty values', () => {
      expect(fmt.weight(0)).toBe('—');
      expect(fmt.weight(null)).toBe('—');
    });
  });

  describe('miles', () => {
    it('formats miles', () => {
      expect(fmt.miles(42)).toBe('42 mi');
    });

    it('renders a dash for empty values', () => {
      expect(fmt.miles(0)).toBe('—');
      expect(fmt.miles(null)).toBe('—');
    });
  });

  describe('route', () => {
    it('formats origin and destination', () => {
      expect(
        fmt.route({
          originCity: 'Austin',
          originState: 'TX',
          destCity: 'Dallas',
          destState: 'TX',
        }),
      ).toBe('Austin, TX → Dallas, TX');
    });

    it('renders a dash for a missing load', () => {
      expect(fmt.route(null)).toBe('—');
    });
  });
});
