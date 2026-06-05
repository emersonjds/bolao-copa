import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { QueryProvider } from "@/shared/lib/query";
import { MockProvider } from "@/mocks/MockProvider";
import { AuthProvider } from "@/features/auth";
import { AppShell } from "@/widgets/app-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bolão da Copa 2026",
  description: "Faça seus palpites na Copa do Mundo 2026 e dispute o ranking com os amigos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${hanken.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Ir para o conteúdo principal
        </a>
        <MockProvider>
          <QueryProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
              <Toaster richColors position="top-center" />
            </AuthProvider>
          </QueryProvider>
        </MockProvider>
      </body>
    </html>
  );
}
