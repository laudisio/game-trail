import { useEffect, useState } from 'react';
import { AD_CLOSE_DELAY_S } from '../services/ads';

interface Props {
  onClose: () => void;
}

/** Full-screen placeholder ad for the web build (native apps use AdMob). */
export default function Interstitial({ onClose }: Props) {
  const [left, setLeft] = useState(AD_CLOSE_DELAY_S);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <div className="ad-overlay" role="dialog" aria-modal="true" aria-label="Anúncio">
      <div className="ad-top">
        <span className="ad-tag">Anúncio</span>
        <button className="ad-close" disabled={left > 0} onClick={onClose}>
          {left > 0 ? `Fechar em ${left}s` : 'Fechar ✕'}
        </button>
      </div>
      <div className="ad-body">
        <img className="ad-art" src="icon.svg" alt="" />
        <h3>Espaço para anúncio</h3>
        <p>Aqui vai aparecer um anúncio de tela cheia a cada 3 partidas.</p>
      </div>
    </div>
  );
}
