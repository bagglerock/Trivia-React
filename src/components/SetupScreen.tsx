import { FormEvent, useState } from 'react';
import { DEFAULT_SETTINGS, MAX_POINTS } from '../game/engine';
import { PLAYER_KEYS } from '../game/keys';
import { Settings } from '../game/types';
import { CATEGORIES, savedQuestionCount } from '../services/questions';

const STORAGE_KEY = 'trivia.settings';

const loadSaved = (): Settings => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved) return DEFAULT_SETTINGS;
    const settings = { ...DEFAULT_SETTINGS, ...saved };
    // Categories used to be Open Trivia DB numbers; drop anything we don't recognise.
    if (!CATEGORIES.some(c => c.id === settings.category)) settings.category = null;
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const save = (settings: Settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // not fatal
  }
};

interface Props {
  onStart: (settings: Settings) => void;
  error: string | null;
}

export const SetupScreen = ({ onStart, error }: Props) => {
  const [settings, setSettings] = useState<Settings>(loadSaved);
  const update = (patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch }));
  const setName = (i: number, name: string) =>
    setSettings(s => ({ ...s, names: s.names.map((n, j) => (i === j ? name : n)) as [string, string] }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const names = settings.names.map((n, i) => n.trim() || `Player ${i + 1}`) as [string, string];
    const final = { ...settings, names };
    save(final);
    onStart(final);
  };

  return (
    <form className="setup screen" onSubmit={submit}>
      <p className="tagline">
        Multiple choice. Every question starts at <strong>{MAX_POINTS}</strong> points and drops every second — answer right, answer fast.
      </p>

      {error && <p className="error">{error}</p>}

      <fieldset>
        <legend>Players</legend>
        <div className="segmented">
          {([1, 2] as const).map(n => (
            <button type="button" key={n} className={settings.playerCount === n ? 'active' : ''} onClick={() => update({ playerCount: n })}>
              {n === 1 ? 'Solo' : 'Head to head'}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={`player-setup players-${settings.playerCount}`}>
        {Array.from({ length: settings.playerCount }, (_, i) => (
          <div className={`player-card p${i + 1}`} key={i}>
            <input value={settings.names[i]} maxLength={16} onChange={e => setName(i, e.target.value)} aria-label={`Player ${i + 1} name`} />
            <div className="keycaps">
              {PLAYER_KEYS[i].labels.map(k => (
                <kbd key={k}>{k}</kbd>
              ))}
            </div>
            <small>{settings.playerCount === 1 ? 'or 1 2 3 4, or click / tap' : i === 0 ? 'left hand' : 'right hand'}</small>
          </div>
        ))}
      </div>

      <div className="options">
        <label>
          Questions
          <select value={settings.questionCount} onChange={e => update({ questionCount: Number(e.target.value) })}>
            {[5, 10, 15, 20].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seconds each
          <select value={settings.secondsPerQuestion} onChange={e => update({ secondsPerQuestion: Number(e.target.value) })}>
            {[10, 15, 20, 30].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select value={settings.category ?? ''} onChange={e => update({ category: e.target.value || null })}>
            <option value="">Anything goes</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select
            value={settings.difficulty ?? ''}
            onChange={e => update({ difficulty: (e.target.value || null) as Settings['difficulty'] })}
          >
            <option value="">Mixed</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <button type="submit" className="big-button">
        Start Game
      </button>
      <SavedCount categoryId={settings.category} />
      <small className="setup-hint">
        Press <kbd>?</kbd> any time to see the controls
      </small>
    </form>
  );
};

/** How much the offline question bank holds for the chosen category. */
const SavedCount = ({ categoryId }: { categoryId: string | null }) => {
  const count = savedQuestionCount(categoryId);
  if (!count) return null;
  const name = CATEGORIES.find(c => c.id === categoryId)?.name;
  return (
    <small className="saved-count" title="Saved in this browser so you can keep playing if the connection drops">
      📦 {count.toLocaleString()} {name ? `${name} ` : ''}questions saved for offline play
    </small>
  );
};
