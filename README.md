# Livro-Caixa — Sistema Financeiro Pessoal

Site pessoal de controle financeiro: receitas, despesas, categorias e
subcategorias, orçamento predefinido por categoria, bancos/contas e metas.

Os dados ficam salvos no **navegador do dispositivo** (localStorage) — não
depende de internet nem de servidor para funcionar no dia a dia. Isso quer
dizer que os lançamentos ficam só nesse navegador/computador; se quiser usar
em mais de um aparelho com os mesmos dados, é preciso migrar para um banco de
dados na nuvem (posso te ajudar com isso depois, ex. Supabase/Firebase).

## Usar agora, sem instalar nada

A pasta `dist/` já vem pronta, buildada. Dá pra:

1. **Abrir direto**: dois cliques em `dist/index.html`. Funciona bem no
   Firefox e no Safari. No Chrome, alguns navegadores bloqueiam módulos JS
   abertos via `file://` — se isso acontecer, use uma das opções abaixo.
2. **Netlify Drop** (mais fácil): entre em https://app.netlify.com/drop e
   arraste a pasta `dist` inteira. Em segundos você recebe um link público
   (ex. `nomequalquer.netlify.app`) — pode até trocar o subdomínio depois.
3. **Servidor local rápido**: com Node instalado, rode dentro da pasta do
   projeto:
   ```bash
   npx serve dist
   ```
   e abra o endereço que aparecer no terminal (ex. http://localhost:3000).

## Deploy definitivo (recomendado)

1. Crie um repositório no GitHub e suba esta pasta inteira (menos
   `node_modules` e `dist`, já ignorados pelo `.gitignore`).
2. Importe o repositório na [Vercel](https://vercel.com) ou
   [Netlify](https://netlify.com) (login com GitHub, "New Project", aponte
   pro repositório). Ambos detectam automaticamente que é um projeto Vite —
   comando de build `npm run build`, pasta de saída `dist`.
3. Pronto: toda vez que você der `git push`, o site atualiza sozinho.

## Rodar localmente para editar

```bash
npm install
npm run dev      # ambiente de desenvolvimento em http://localhost:5173
npm run build    # gera a pasta dist/ atualizada para publicar
```

## Estrutura

- `src/App.jsx` — toda a lógica e telas (Painel, Lançamentos, Categorias,
  Bancos, Metas).
- `src/storage.js` — camada de persistência (localStorage). É o único
  arquivo que precisaria mudar para trocar por um banco de dados real.
- `tailwind.config.js` / `src/index.css` — estilos (Tailwind CSS).
