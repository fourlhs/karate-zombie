import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
