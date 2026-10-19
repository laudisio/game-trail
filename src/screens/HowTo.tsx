interface Props {
  onBack: () => void;
  onPlay: () => void;
}

export default function HowTo({ onBack, onPlay }: Props) {
  return (
    <div className="screen howto">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">
          ←
        </button>
        <h2>Como jogar</h2>
        <span />
      </header>
      <ol className="steps">
        <li>
          <b>Memorize.</b> O caminho neon aparece por um instante, da <span className="c-in">▶ entrada</span> até a{' '}
          <span className="c-out">★ saída</span>.
        </li>
        <li>
          <b>Ele some.</b> Partes do caminho desaparecem. Deslize o dedo a partir da entrada seguindo o trajeto memorizado.
        </li>
        <li>
          <b>
            <span className="c-rot">↻ ↺</span> Giro:
          </b>{' '}
          ao pisar, o tabuleiro gira 90°. Antecipe como continuar depois da rotação e toque onde você está.
        </li>
        <li>
          <b>
            <span className="c-portal">◉ → ◎</span> Portal:
          </b>{' '}
          ao pisar, você é transportado para outro ponto. Continue a partir de lá.
        </li>
        <li>
          <b>Erros custam caro.</b> Sair do caminho soma <b>+2s</b>. Volte à casa acesa para continuar.
        </li>
        <li>
          <b>10 níveis</b>, cada um mais difícil, em cerca de 2 minutos. Menor tempo vence.
        </li>
        <li>
          <b>Desafie amigos:</b> compartilhe seu resultado, eles correm contra o seu <b>fantasma 👻</b> e vocês assistem aos dois
          rastros lado a lado.
        </li>
      </ol>
      <button className="btn primary" onClick={onPlay}>
        ▶ Jogar agora
      </button>
    </div>
  );
}
