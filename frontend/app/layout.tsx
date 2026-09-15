import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "./lib/context/SettingsContext";
import { FavoritesProvider } from "./lib/context/FavoritesContext";
import { AudioProvider } from "./lib/context/AudioContext";
import { BrowserStateProvider } from "./lib/context/BrowserStateContext";

export const metadata: Metadata = {
  title: "Sample Browser",
  description: "Browse and search your audio samples and loops",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <SettingsProvider>
          <FavoritesProvider>
            <BrowserStateProvider>
              <AudioProvider>{children}</AudioProvider>
            </BrowserStateProvider>
          </FavoritesProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
