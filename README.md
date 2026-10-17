# Rastro ⚡

**O caminho desaparece enquanto você joga.** Um tabuleiro mostra por um instante um caminho neon entre a entrada (▶) e a saída (★). Depois, partes dele somem — deslize o dedo seguindo o trajeto memorizado.

- **↻ / ↺ Giro:** ao pisar, o tabuleiro gira 90°. Antecipe como continuar depois da rotação.
- **◉ → ◎ Portal:** ao pisar, você é transportado para outro ponto do tabuleiro.
- **Partida:** 5 percursos (~45 s). Pontuação = tempo + 2 s por erro (+5 s se o tempo de 20 s de um percurso esgotar).
- **Desafio do dia:** mesmos 5 percursos para todo mundo no dia.
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

## Apps Android / iPhone (depois)

```bash
npm run cap:sync        # build + copia para android/ e ios/
npx cap open android    # abre no Android Studio
npx cap open ios        # abre no Xcode (precisa de um Mac)
```
