import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, MAX_POINTS, MIN_POINTS, initialState, pointsAt, reducer, statsFor, visibleScores } from './engine';
import { keyToAnswer } from './keys';
import { GameState, Question } from './types';

const q = (correctIndex: number): Question => ({ category: 'Test', difficulty: 'easy', text: '?', answers: ['a', 'b', 'c', 'd'], correctIndex });

const started = (playerCount: 1 | 2 = 2, questions = [q(0), q(1)]): GameState => {
  let s = reducer(initialState(), { type: 'START', settings: { ...DEFAULT_SETTINGS, playerCount, secondsPerQuestion: 10 } });
  s = reducer(s, { type: 'LOADED', questions, usingBackup: false, now: 0 });
  return reducer(s, { type: 'BEGIN_QUESTION', now: 1000 });
};

describe('pointsAt', () => {
  it('drops from max to min over the timer', () => {
    expect(pointsAt(0, 10000)).toBe(MAX_POINTS);
    expect(pointsAt(5000, 10000)).toBe(550);
    expect(pointsAt(10000, 10000)).toBe(MIN_POINTS);
    expect(pointsAt(99999, 10000)).toBe(MIN_POINTS);
  });
});

describe('reducer', () => {
  it('scores a fast correct answer higher than a slow one', () => {
    let s = started();
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 0, now: 2000 });
    s = reducer(s, { type: 'ANSWER', player: 1, choice: 0, now: 6000 });
    expect(s.phase).toBe('reveal');
    expect(s.results[0][0]!.points).toBeGreaterThan(s.results[0][1]!.points);
  });

  it('gives zero for a wrong answer and locks the first answer', () => {
    let s = started();
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 3, now: 1500 });
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 0, now: 1600 });
    expect(s.results[0][0]).toMatchObject({ choice: 3, correct: false, points: 0 });
    expect(s.phase).toBe('question');
  });

  it('hides the current question from the scoreboard until reveal', () => {
    let s = started();
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 0, now: 1000 });
    expect(visibleScores(s)).toEqual([0, 0]);
    s = reducer(s, { type: 'TIME_UP', now: 0 });
    expect(visibleScores(s)).toEqual([MAX_POINTS, 0]);
  });

  it('ignores answers after time is up and from players not in the game', () => {
    let s = started(1);
    s = reducer(s, { type: 'ANSWER', player: 1, choice: 0, now: 1500 });
    expect(s.results[0]).toEqual([null]);
    s = reducer(s, { type: 'TIME_UP', now: 0 });
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 0, now: 1500 });
    expect(s.results[0]).toEqual([null]);
  });

  it('runs through to the final screen', () => {
    let s = started(1);
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 0, now: 1000 });
    s = reducer(s, { type: 'NEXT', now: 0 });
    expect(s).toMatchObject({ phase: 'intro', index: 1 });
    s = reducer(s, { type: 'BEGIN_QUESTION', now: 0 });
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 1, now: 2500 });
    s = reducer(s, { type: 'NEXT', now: 0 });
    expect(s.phase).toBe('final');
    expect(statsFor(s, 0)).toMatchObject({ correct: 2, score: MAX_POINTS + pointsAt(2500, 10000), fastestMs: 0 });
  });
});

describe('pause', () => {
  it('freezes the clock: time spent paused does not cost points', () => {
    let s = started(1);
    s = reducer(s, { type: 'PAUSE', now: 2000 });
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 0, now: 2500 });
    expect(s.results[0]).toEqual([null]);
    s = reducer(s, { type: 'RESUME', now: 62000 });
    s = reducer(s, { type: 'ANSWER', player: 0, choice: 0, now: 62000 });
    expect(s.results[0][0]!.elapsedMs).toBe(1000);
  });

  it('ignores the timer running out while paused', () => {
    let s = started();
    s = reducer(s, { type: 'PAUSE', now: 2000 });
    s = reducer(s, { type: 'TIME_UP', now: 11000 });
    expect(s.phase).toBe('question');
  });

  it('cannot pause on the setup or final screens', () => {
    expect(reducer(initialState(), { type: 'PAUSE', now: 0 }).pausedAt).toBeNull();
  });
});

describe('keyToAnswer', () => {
  it('splits the keyboard in two-player mode', () => {
    expect(keyToAnswer('KeyA', 2)).toEqual({ player: 0, choice: 0 });
    expect(keyToAnswer('Semicolon', 2)).toEqual({ player: 1, choice: 3 });
    expect(keyToAnswer('Digit1', 2)).toBeNull();
  });

  it('lets a solo player use any answer key', () => {
    expect(keyToAnswer('KeyK', 1)).toEqual({ player: 0, choice: 1 });
    expect(keyToAnswer('Digit3', 1)).toEqual({ player: 0, choice: 2 });
  });
});
