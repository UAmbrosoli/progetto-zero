"use client";

import { useState } from "react";

export default function Home() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <main>
      <div>
        <div className="hero-ball">🎾</div>

        <p className="eyebrow">PADEL ON TUESDAY</p>

        <h1>
          Il campionato.
          <br />
          Ogni martedì.
        </h1>

        <p className="intro">
          Scegli i giocatori, organizza le partite,
          <br />
          registra i risultati e scala la classifica.
        </p>

        <div className="home-actions">
          <button
            className="primary-button"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Entra nel campionato
            <span>→</span>
          </button>

          <button
            className="secondary-button"
            onClick={() => setShowInfo(true)}
          >
            Come funziona
          </button>
        </div>

        <div className="season-info">
          <span>STAGIONE</span>
          <strong>2026–27</strong>
        </div>
      </div>

      {showInfo && (
        <div className="info-overlay">
          <div className="info-card">
            <button
              className="close-button"
              onClick={() => setShowInfo(false)}
            >
              ×
            </button>

            <p className="eyebrow">PADEL ON TUESDAY</p>

            <h2>Come funziona</h2>

            <p>
              Ogni martedì si scelgono i giocatori presenti,
              si organizzano le partite e si registrano i risultati.
            </p>

            <p>
              La classifica si aggiorna automaticamente
              dopo ogni giornata.
            </p>

            <button
              className="primary-button"
              onClick={() => setShowInfo(false)}
            >
              Iniziamo
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}