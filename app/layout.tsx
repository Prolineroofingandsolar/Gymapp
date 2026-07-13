import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corner — Be in every member's corner",
  description:
    "The retention and community hub for gyms, coaches and PTs. Know who's drifting before they cancel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
