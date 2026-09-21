import "./globals.css";

export const metadata = {
  title: "Institutional Flow System",
  description: "Trade with institutional intent",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}