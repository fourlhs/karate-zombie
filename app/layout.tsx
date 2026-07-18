import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const arcadeFont = Press_Start_2P({ weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Karate Zombies",
  description:
    "A single-screen canvas game: punch the zombies before they reach you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={arcadeFont.className}>{children}</body>
    </html>
  );
}
