import { ScrollViewStyleReset } from "expo-router/html";

/**
 * Documento HTML raiz do build web (só roda no servidor durante o export
 * estático). Customiza o <head> padrão do Expo Router pra deixar o link
 * instalável como app: "Adicionar à Tela de Início" no Safari/iOS e o
 * prompt de instalação (PWA) no Chrome/Android.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#1e40af" />

        <link rel="manifest" href="/manifest.json" />

        {/* iOS Safari: "Adicionar à Tela de Início" */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Checklist" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
