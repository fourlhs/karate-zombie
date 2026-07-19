import Game from "@/components/Game";

export default function Home() {
  return (
    <main className="page">
      <a href="/" className="back-link">
        ← back to home page
      </a>
      <Game />
    </main>
  );
}
