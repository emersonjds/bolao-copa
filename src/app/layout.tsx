import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryProvider } from "@/shared/lib/query";
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

// Origem do Supabase para preconnect (aquece DNS+TLS antes do 1º request de
// dados — ganho relevante pra usuários BR contra Supabase US).
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : null;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://flagcdn.com" crossOrigin="anonymous" />
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />}
      </head>
      <body
        className={`${inter.variable} ${hanken.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Ir para o conteúdo principal
        </a>
        <QueryProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
