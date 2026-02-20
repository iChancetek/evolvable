import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolvable — AI-Native No-Code Platform",
  description: "Describe your idea. We'll build it. No code required. Evolvable transforms your ideas into production-ready apps with AI.",
  keywords: ["no-code", "AI", "app builder", "no-code platform", "AI development"],
  openGraph: {
    title: "Evolvable — Build Apps with Words, Not Code",
    description: "The AI-native platform that turns ideas into live applications. No coding required.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
