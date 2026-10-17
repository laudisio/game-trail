import { useCallback, useEffect, useState } from 'react';
import { decodeRun } from './game/codec';
import { dailySeed, randomSeed } from './game/rng';
import type { Run } from './game/types';
import { getName, setName } from './services/profile';
import { ranking } from './services/ranking';
import { sfx } from './services/feedback';
import Home from './screens/Home';
import Play from './screens/Play';
import Result from './screens/Result';
import Replay from './screens/Replay';
import Ranking from './screens/Ranking';
import HowTo from './screens/HowTo';

type Screen = 'home' | 'howto' | 'play' | 'result' | 'replay' | 'ranking';

interface Game {
  seed: number;
  ghost: Run | null;
  daily: boolean;
  id: number;
}

function challengeFromUrl(): Run | null {
  const code = new URLSearchParams(location.search).get('d');
  if (!code) return null;
  history.replaceState(null, '', location.pathname);
  try {
    return decodeRun(code);
  } catch {
    return null;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [name, setNameState] = useState(getName());
  const [challenge, setChallenge] = useState<Run | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [lastRun, setLastRun] = useState<Run | null>(null);
  const [pair, setPair] = useState<{ a: Run; b: Run; back: Screen } | null>(null);

  const receiveChallenge = useCallback((run: Run) => {
    setChallenge(run);
    void ranking.submit(run, false);
  }, []);

  useEffect(() => {
    const run = challengeFromUrl();
    if (run) receiveChallenge(run);
  }, [receiveChallenge]);

  const start = (seed: number, ghost: Run | null = null, daily = false) => {
    sfx.unlock();
    setGame({ seed, ghost, daily, id: Date.now() });
    setScreen('play');
  };

  const playerName = name.trim() || 'Jogador';

  const onFinish = useCallback(
    (run: Run) => {
      void ranking.submit(run, true);
      setLastRun(run);
      setScreen('result');
      if (game?.ghost && challenge === game.ghost) setChallenge(null);
    },
    [game, challenge],
  );

  return (
    <div className="app">
      <div className="bg-grid" aria-hidden />
      {screen === 'home' && (
        <Home
          name={name}
          onName={(n) => {
            setNameState(n);
            setName(n);
          }}
          challenge={challenge}
          onPlay={() => start(randomSeed())}
          onDaily={() => start(dailySeed(), null, true)}
          onRace={(g) => start(g.seed, g)}
          onChallenge={receiveChallenge}
          onRanking={() => setScreen('ranking')}
          onHowTo={() => setScreen('howto')}
        />
      )}
      {screen === 'howto' && <HowTo onBack={() => setScreen('home')} onPlay={() => start(randomSeed())} />}
      {screen === 'play' && game && (
        <Play
          key={game.id}
          seed={game.seed}
          name={playerName}
          ghost={game.ghost}
          onFinish={onFinish}
          onQuit={() => setScreen('home')}
        />
      )}
      {screen === 'result' && lastRun && game && (
        <Result
          run={lastRun}
          ghost={game.ghost}
          daily={game.daily}
          onReplay={() => {
            if (game.ghost) {
              setPair({ a: lastRun, b: game.ghost, back: 'result' });
              setScreen('replay');
            }
          }}
          onAgain={() => start(game.ghost || game.daily ? game.seed : randomSeed(), game.ghost, game.daily)}
          onHome={() => setScreen('home')}
        />
      )}
      {screen === 'replay' && pair && <Replay a={pair.a} b={pair.b} onBack={() => setScreen(pair.back)} />}
      {screen === 'ranking' && (
        <Ranking
          onBack={() => setScreen('home')}
          onRace={(g) => start(g.seed, g)}
          onReplay={(a, b) => {
            setPair({ a, b, back: 'ranking' });
            setScreen('replay');
          }}
        />
      )}
    </div>
  );
}
