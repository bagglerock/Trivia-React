import type React from 'react';
import { pointsAt } from '../game/engine';
import { ANSWER_LETTERS, PLAYER_KEYS } from '../game/keys';
import { GameState } from '../game/types';
import { INTRO_MS, REVEAL_MS, useNow } from '../game/useGame';
import { Confetti } from './Confetti';
import { Scoreboard } from './Scoreboard';

interface Props {
  state: GameState;
  onAnswer: (player: number, choice: number) => void;
  onNext: () => void;
}

/** Covers one question from "Question 3 of 10" through the answer reveal. */
export const RoundScreen = ({ state, onAnswer, onNext }: Props) => {
  const { phase, settings, questions, index, questionStartedAt, results } = state;
  const question = questions[index];
  const answers = results[index];
  const now = useNow(phase === 'question');

  const durationMs = settings.secondsPerQuestion * 1000;
  const elapsed = phase === 'question' && questionStartedAt !== null ? now - questionStartedAt : durationMs;
  const fraction = Math.max(0, 1 - elapsed / durationMs);
  const points = pointsAt(elapsed, durationMs);
  const solo = settings.playerCount === 1;
  const revealing = phase === 'reveal';
  const everyoneAnswered = answers.every(a => a !== null);
  const timerLabel = revealing
    ? `${everyoneAnswered ? 'All answers in' : "Time's up"} — it's ${ANSWER_LETTERS[question.correctIndex]}`
    : `${points} pts`;

  return (
    <div className="round screen">
      <div className="round-meta">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span className="category">
          {question.category}
          {question.difficulty && <em> · {question.difficulty}</em>}
        </span>
      </div>

      {phase === 'intro' ? (
        <div className="question-wrapper intro" key={`intro-${index}`}>
          <div className="intro-label">Question {index + 1}</div>
          <div className="intro-count">
            {[3, 2, 1].map((n, i) => (
              <span key={n} style={{ animationDelay: `${(INTRO_MS / 3) * i}ms`, animationDuration: `${INTRO_MS / 3}ms` }}>
                {n}
              </span>
            ))}
          </div>
          <div className="intro-bar" style={{ animationDuration: `${INTRO_MS}ms` }} />
        </div>
      ) : (
        <>
          <div className="question-wrapper" key={`q-${index}`}>
            <h2>{question.text}</h2>
          </div>

          <div className="timer">
            <div className="timer-bar" style={{ width: `${fraction * 100}%` }} data-urgent={!revealing && fraction < 0.34} />
            <div className="timer-points" data-urgent={!revealing && fraction < 0.34} key={revealing ? 'reveal' : 'live'}>
              {timerLabel}
            </div>
          </div>

          <div className="answer-wrapper">
            {question.answers.map((answer, i) => {
              const isCorrect = i === question.correctIndex;
              const pickedBy = answers.map((a, p) => (a?.choice === i ? p : -1)).filter(p => p !== -1);
              const cls = [
                'answer',
                revealing && (isCorrect ? 'correct' : 'faded'),
                revealing && !isCorrect && pickedBy.length > 0 && 'picked-wrong',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={i}
                  className={cls}
                  style={{ '--i': i } as React.CSSProperties}
                  disabled={!solo || revealing || answers[0] !== null}
                  onClick={() => onAnswer(0, i)}
                >
                  <span className="letter">{ANSWER_LETTERS[i]}</span>
                  <span className="text">{answer}</span>
                  {!solo && !revealing && (
                    <span className="hint">
                      {PLAYER_KEYS.map((k, p) => (
                        <kbd key={p} className={`p${p + 1}`}>
                          {k.labels[i]}
                        </kbd>
                      ))}
                    </span>
                  )}
                  {revealing && pickedBy.length > 0 && (
                    <span className="picks">
                      {pickedBy.map(p => (
                        <span key={p} className={`pick p${p + 1}`}>
                          {settings.names[p]}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <Scoreboard state={state} />

      {revealing && answers.some(a => a?.correct) && <Confetti key={index} />}

      {revealing && (
        <button className="next-button" onClick={onNext}>
          {index === questions.length - 1 ? 'Final scores' : 'Next question'} <kbd>space</kbd>
          <span className="auto-bar" style={{ animationDuration: `${REVEAL_MS}ms` }} key={index} />
        </button>
      )}
    </div>
  );
};
