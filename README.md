# Trivia

Bar-style speed trivia — the kind on the TV at the bar where everyone's racing to buzz in.
One or two players on one keyboard, questions from [Open Trivia DB](https://opentdb.com).

## How it plays

- Pick **Solo** or **Head to head**, enter names, choose 5–20 questions, the timer, a category and difficulty.
- Each question shows for a quick "Q3" intro, then four multiple-choice answers.
- Points start at **1000** and drain to **100** as the clock runs down. Answer right and you bank whatever was showing; answer wrong and you get nothing.
- Your first answer is locked in — no changing it. Your opponent can't see what you picked until the reveal.
- The reveal shows the right answer, who picked what, and how fast. It moves on automatically, or press **space**.
- Final screen shows the winner, correct count, fastest and average correct times. **Enter** for a rematch.

## Controls

| | A | B | C | D |
|---|---|---|---|---|
| Player 1 (left hand) | `A` | `S` | `D` | `F` |
| Player 2 (right hand) | `J` | `K` | `L` | `;` |

Solo players can use either side, the number keys `1`–`4`, or click/tap. `Esc` pauses (the clock stops and the question is hidden) — from there resume or quit. Switching tabs pauses too. `M` (or the speaker button) toggles sound. `?` or `H` (or the ? button) shows the controls for solo or head-to-head.

If Open Trivia DB is unreachable or rate-limited, the game falls back to a built-in question set.

## Development

Vite + React 18 + TypeScript + Sass.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # rules, question loading, and full-game tests (vitest)
npm run build
npm run deploy   # GitHub Pages
```

Game rules live in `src/game/engine.ts` as a pure reducer; `src/game/useGame.ts` wires it to timers and the keyboard.
