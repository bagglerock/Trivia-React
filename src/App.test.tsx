import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Question } from './game/types';
import { INTRO_MS, REVEAL_MS } from './game/useGame';
import { loadQuestions, topUpQuestionBank } from './services/questions';

vi.mock('./services/questions', async importOriginal => ({
  ...(await importOriginal<typeof import('./services/questions')>()),
  loadQuestions: vi.fn(),
  topUpQuestionBank: vi.fn(async () => {}),
}));

const QUESTIONS: Question[] = [
  { id: 'a', category: 'Animals', difficulty: 'easy', text: 'Fastest land animal?', answers: ['Cheetah', 'Lion', 'Horse', 'Ostrich'], correctIndex: 0 },
  { id: 'b', category: 'Science', difficulty: 'easy', text: 'Symbol for gold?', answers: ['Ag', 'Au', 'Gd', 'Go'], correctIndex: 1 },
];

const press = (code: string, key = '') => act(() => void fireEvent.keyDown(window, { code, key }));
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
/** Let the mocked question load resolve. */
const flush = () => act(async () => {});
const status = (player: 1 | 2) => document.querySelector(`.player-panel.p${player} .status`)?.textContent;
const score = (player: 1 | 2) => document.querySelector(`.player-panel.p${player} .score`)?.textContent;

const startGame = async (mode: 'Solo' | 'Head to head' = 'Head to head') => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: mode }));
  fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
  await flush();
};

/** Skip the 3-2-1 intro so the question is on screen. */
const toQuestion = () => advance(INTRO_MS);

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(loadQuestions).mockResolvedValue({ questions: QUESTIONS, notice: null });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.mocked(loadQuestions).mockReset();
});

describe('a head-to-head game', () => {
  it('plays from setup through to the winner and a rematch', async () => {
    await startGame();
    expect(loadQuestions).toHaveBeenCalledWith(expect.objectContaining({ playerCount: 2 }), expect.any(AbortSignal));

    // Intro, then the question.
    expect(screen.getByText('Question 1')).toBeTruthy();
    expect(screen.queryByText('Fastest land animal?')).toBeNull();
    toQuestion();
    expect(screen.getByText('Fastest land animal?')).toBeTruthy();

    // Player 1 is right (A = Cheetah), player 2 is wrong (K = B = Lion).
    press('KeyA');
    expect(status(1)).toBe('Locked in!');
    expect(status(2)).toMatch(/Thinking/);
    press('KeyK');

    // Both in: reveal straight away.
    expect(status(1)).toMatch(/^\+\d+/);
    expect(status(2)).toBe('Wrong!');
    expect(screen.getByText(/it's A/)).toBeTruthy();

    // Space skips to the next question; nobody answers this one.
    press('Space');
    toQuestion();
    expect(screen.getByText('Symbol for gold?')).toBeTruthy();
    advance(15_000);
    expect(status(1)).toBe("Time's up");
    expect(status(2)).toBe("Time's up");

    // The reveal moves on by itself.
    advance(REVEAL_MS);
    expect(screen.getByText('Player 1 wins!')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(screen.getByText('0 / 2')).toBeTruthy();

    // Somewhere in there it stocked up the question bank for next time.
    expect(topUpQuestionBank).toHaveBeenCalledWith(expect.objectContaining({ playerCount: 2 }), expect.any(AbortSignal));

    press('Enter');
    expect(loadQuestions).toHaveBeenCalledTimes(2);
  });

  it('locks in the first answer: pressing again changes nothing', async () => {
    await startGame();
    toQuestion();
    press('KeyS'); // wrong (B)
    press('KeyA'); // would be right, but too late
    press('KeyJ');
    expect(status(1)).toBe('Wrong!');
    expect(score(1)).toBe('0');
  });

  it("doesn't take answers during the intro countdown", async () => {
    await startGame();
    press('KeyA');
    toQuestion();
    expect(status(1)).toMatch(/Thinking/);
  });

  it('ignores answers for a player who is not in the game', async () => {
    await startGame('Solo');
    toQuestion();
    // In solo, the right-hand keys belong to player 1 too.
    press('KeyJ');
    expect(status(1)).toMatch(/^\+\d+/);
    expect(document.querySelector('.player-panel.p2')).toBeNull();
  });
});

describe('solo', () => {
  it('can answer by clicking', async () => {
    await startGame('Solo');
    toQuestion();
    fireEvent.click(screen.getByRole('button', { name: /Cheetah/ }));
    expect(status(1)).toMatch(/^\+\d+/);
  });

  it('accepts the number keys', async () => {
    await startGame('Solo');
    toQuestion();
    press('Digit2');
    expect(status(1)).toBe('Wrong!');
  });
});

describe('pause', () => {
  it('freezes the round, blocks answers, and resumes', async () => {
    await startGame();
    toQuestion();

    press('Escape');
    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeTruthy();

    press('KeyA');
    advance(60_000); // way past the 15 second timer
    expect(status(1)).toMatch(/Thinking/);
    expect(screen.queryByText("Time's up")).toBeNull();

    press('Escape');
    expect(screen.queryByRole('dialog', { name: 'Paused' })).toBeNull();
    press('KeyA');
    expect(status(1)).toBe('Locked in!');
  });

  it('can quit back to the menu', async () => {
    await startGame();
    toQuestion();
    press('Escape');
    press('KeyQ');
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeTruthy();
  });

  it('pauses when the tab is hidden', async () => {
    await startGame();
    toQuestion();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeTruthy();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });
});

describe('controls overlay', () => {
  it('opens with ?, switches between solo and head-to-head, and closes with Esc', async () => {
    render(<App />);
    press('Slash', '?');
    const dialog = screen.getByRole('dialog', { name: 'Controls' });
    expect(within(dialog).getByText('Player 1')).toBeTruthy();
    expect(within(dialog).getByText('Player 2')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Solo' }));
    expect(within(dialog).queryByText('Player 2')).toBeNull();
    expect(within(dialog).getByText('Answer A · B · C · D')).toBeTruthy();

    press('Escape');
    expect(screen.queryByRole('dialog', { name: 'Controls' })).toBeNull();
  });

  it('pauses a game in progress while open', async () => {
    await startGame();
    toQuestion();
    press('KeyH');
    press('KeyA'); // ignored while reading controls
    press('Escape'); // close controls...
    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeTruthy(); // ...still paused
    press('Escape');
    press('KeyA');
    expect(status(1)).toBe('Locked in!');
  });
});

describe('setup', () => {
  it('shows the error and stays on setup if questions fail to load', async () => {
    vi.mocked(loadQuestions).mockRejectedValue(new Error("Couldn't reach the question server for that category."));
    await startGame();
    expect(screen.getByText(/Couldn't reach the question server/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeTruthy();
  });

  it('remembers names and settings for next time', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Player 1 name'), { target: { value: 'Oscar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    await flush();
    cleanup();

    render(<App />);
    expect((screen.getByLabelText('Player 1 name') as HTMLInputElement).value).toBe('Oscar');
  });

  it('lists categories alphabetically', () => {
    render(<App />);
    const select = screen.getByRole('combobox', { name: /category/i }) as HTMLSelectElement;
    const names = [...select.options].slice(1).map(o => o.text);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('mute', () => {
  it('toggles with M and remembers it', () => {
    render(<App />);
    const button = screen.getByTitle(/Sound/);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    press('KeyM');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('trivia.muted')).toBe('1');
  });
});
