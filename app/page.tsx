export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f7f7f5",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "500px",
          padding: "2rem",
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            marginBottom: "0.5rem",
          }}
        >
          Progetto .0
        </h1>

        <p
          style={{
            fontSize: "1.2rem",
            color: "#555",
            marginBottom: "2rem",
          }}
        >
          Prepara la mente.
          <br />
          Prima della partita.
        </p>

        <button
          style={{
            background: "#111",
            color: "white",
            border: "none",
            padding: "16px 36px",
            borderRadius: "12px",
            fontSize: "1.1rem",
            cursor: "pointer",
          }}
        >
          Inizia la preparazione
        </button>
      </div>
    </main>
  );
}