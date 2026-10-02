/**
 * Keyboard layout: each player gets four keys on their own half of the keyboard,
 * one per answer slot (A, B, C, D). Uses KeyboardEvent.code so it's position-based.
 */
export const PLAYER_KEYS: { codes: string[]; labels: string[] }[] = [
  { codes: ['KeyA', 'KeyS', 'KeyD', 'KeyF'], labels: ['A', 'S', 'D', 'F'] },
  { codes: ['KeyJ', 'KeyK', 'KeyL', 'Semicolon'], labels: ['J', 'K', 'L', ';'] },
];

/** In solo mode the number keys work too. */
const SOLO_EXTRA = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];

export const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

export const keyToAnswer = (code: string, playerCount: number): { player: number; choice: number } | null => {
  for (let player = 0; player < PLAYER_KEYS.length; player++) {
    const choice = PLAYER_KEYS[player].codes.indexOf(code);
    if (choice !== -1) {
      // Solo player can use either side of the keyboard.
      return { player: playerCount === 1 ? 0 : player, choice };
    }
  }
  if (playerCount === 1) {
    const choice = SOLO_EXTRA.indexOf(code);
    if (choice !== -1) return { player: 0, choice };
  }
  return null;
};
