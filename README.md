# Rastro ⚡

**O caminho desaparece enquanto você joga.** Um tabuleiro mostra por um instante um caminho neon entre a entrada (▶) e a saída (★). Depois, partes dele somem — deslize o dedo seguindo o trajeto memorizado.

- **↻ / ↺ Giro:** ao pisar, o tabuleiro gira 90°. Antecipe como continuar depois da rotação.
- **◉ → ◎ Portal:** ao pisar, você é transportado para outro ponto do tabuleiro.
- **Partida:** 10 níveis, cada um mais difícil (~2 min). Pontuação = tempo + 2 s por erro (+5 s se o tempo de 20 s de um percurso esgotar).
- **Desafio do dia:** mesmos 10 níveis para todo mundo no dia.
- **Fantasma:** compartilhe o resultado; o amigo corre contra o seu fantasma (mesmos percursos) e vocês assistem aos dois rastros lado a lado, vendo quem errou ou hesitou primeiro.

## Stack

- Vite + React + TypeScript (web app mobile-first, roda no navegador do celular)
- Capacitor 6 (pastas `android/` e `ios/`) para gerar os apps nativos
- Ranking salvo no aparelho por enquanto (`src/services/ranking.ts` é a camada de dados que depois trocamos pela AWS)
- O desafio/fantasma viaja dentro do link (`?d=<código>`), sem servidor

## Rodar localmente

```bash
npm install
npm run dev      # abre em http://localhost:5173 (use o IP da rede para testar no celular)
npm test         # testes da lógica do jogo
npm run build    # gera a pasta dist/
```

## Publicar no AWS Amplify Hosting

O arquivo `amplify.yml` já está pronto (build com `npm ci && npm run build`, publica a pasta `dist`).

1. Acesse o console da AWS → **AWS Amplify** → **Create new app**.
2. Escolha **GitHub**, autorize e selecione o repositório `laudisio/game-trail`, branch `main`.
3. Na tela de build, confirme que ele detectou o `amplify.yml` → **Next** → **Save and deploy**.
4. Quando terminar, abra o link `https://main.xxxx.amplifyapp.com` no celular.
5. (Opcional) Em **Hosting → Environment variables**, crie `VITE_PUBLIC_URL` com esse link e faça **Redeploy** — assim os links de desafio compartilhados pelo app nativo apontam para o site.

## Anúncios (tela cheia a cada 3 partidas)

Depois de cada 3ª partida concluída (3, 6, 9…) aparece um anúncio de tela cheia antes do resultado (`src/services/ads.ts`).

- **App Android/iPhone:** usa o Google AdMob (`@capacitor-community/admob`) com os **IDs reais do Rastro**:
  - *App ID* em `android/app/src/main/AndroidManifest.xml` e `ios/App/App/Info.plist` (`GADApplicationIdentifier`);
  - blocos intersticiais em `PROD_UNITS` (`src/services/ads.ts`). As variáveis `VITE_ADMOB_INTERSTITIAL_ANDROID` / `VITE_ADMOB_INTERSTITIAL_IOS` sobrescrevem, se precisar.
  - Ao abrir o app, aparece a tela de consentimento do Google (só para quem precisa, ex.: Europa) e, no iPhone, o pedido de "permitir rastreamento" (`NSUserTrackingUsageDescription`).
  - **Para testar no seu celular sem risco de bloqueio da conta:** cadastre o aparelho em AdMob → Configurações → *Dispositivos de teste*, ou gere o app com `VITE_ADMOB_TEST=true` no `.env` (força anúncios de teste). Nunca clique nos seus anúncios reais.
  - `public/app-ads.txt` já está publicado no site para a verificação do AdMob.
- **Site (Amplify):** mostra um anúncio de exemplo próprio (`src/components/Interstitial.tsx`), com botão de fechar liberado após 5 s.

## Apps Android / iPhone (depois)

```bash
npm run cap:sync        # build + copia para android/ e ios/
npx cap open android    # abre no Android Studio
npx cap open ios        # abre no Xcode (precisa de um Mac)
```
