"use client";

import Link from "next/link";

const menuItems = [
  {
    title: "Giocatori",
    description: "Gestisci i partecipanti al campionato.",
    icon: "👥",
    href: "/giocatori",
  },
  {
    title: "Nuova giornata",
    description: "Scegli chi gioca e organizza le partite.",
    icon: "🎾",
    href: "/nuova-giornata",
  },
  {
    title: "Classifica",
    description: "Consulta la classifica e segui la stagione.",
    icon: "🏆",
    href: "/classifica",
  },
  {
    title: "Momenti memorabili",
    description: "Raccogli le storie e i momenti della stagione.",
    icon: "✨",
    href: "/momenti",
  },
];

export default function Dashboard() {
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">PADEL ON TUESDAY</p>

          <h1>Dashboard</h1>

          <p className="dashboard-subtitle">
            Stagione 2026–27
          </p>
        </div>

        <Link href="/" className="back-link">
          ← Home
        </Link>
      </header>

      <section className="welcome-card">
        <div>
          <span className="status-label">CAMPIONATO</span>

          <h2>È martedì.</h2>

          <p>
            Tutto pronto per la prossima giornata?
          </p>
        </div>

        <Link
          href="/nuova-giornata"
          className="primary-button"
        >
          Nuova giornata
          <span>→</span>
        </Link>
      </section>

      <section className="dashboard-grid">
        {menuItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="menu-card"
          >
            <div className="menu-icon">
              {item.icon}
            </div>

            <div>
              <h3>{item.title}</h3>

              <p>{item.description}</p>
            </div>

            <span className="card-arrow">
              →
            </span>
          </Link>
        ))}
      </section>

      <section className="ranking-preview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CLASSIFICA</p>

            <h2>La corsa al titolo</h2>
          </div>

          <Link
            href="/classifica"
            className="text-link"
          >
            Vedi tutto →
          </Link>
        </div>

        <div className="empty-ranking">
          <div className="empty-icon">
            🏆
          </div>

          <h3>
            La classifica è pronta a partire.
          </h3>

          <p>
            Registra la prima giornata per vedere
            i giocatori comparire qui.
          </p>
        </div>
      </section>
    </main>
  );
}