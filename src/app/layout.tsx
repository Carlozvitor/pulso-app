import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PULSO",
    template: "%s · PULSO",
  },
  description: "O que merece sua atenção agora.",
  applicationName: "PULSO",
  appleWebApp: {
    capable: true,
    title: "PULSO",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {children}
        <Toaster position="top-center" mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)" }} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
