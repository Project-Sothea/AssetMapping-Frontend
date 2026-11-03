import { createNavigationGate } from './navigationGate';

test('100 repeated taps request one navigation; returning permits the next one', () => {
  const gate = createNavigationGate();
  const navigate = jest.fn();
  for (let i = 0; i < 100; i++) gate.run(navigate);
  expect(navigate).toHaveBeenCalledTimes(1);
  gate.reset();
  gate.run(navigate);
  expect(navigate).toHaveBeenCalledTimes(2);
});

test('a synchronous navigation failure unlocks the next attempt', () => {
  const gate = createNavigationGate();
  expect(() =>
    gate.run(() => {
      throw new Error('Route unavailable');
    })
  ).toThrow();
  const navigate = jest.fn();
  expect(gate.run(navigate)).toBe(true);
  expect(navigate).toHaveBeenCalledTimes(1);
});
