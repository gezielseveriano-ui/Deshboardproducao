# Site do Flow Suite

Página de vendas do Flow Suite (arquivo único `index.html` + imagens em `img/`).

## Onde trocar os contatos
No final do `index.html`, no bloco **CONFIGURAÇÃO DE CONTATO**:

```js
const WHATSAPP = '';                         // ex.: '5531999998888' (DDI+DDD+número)
const EMAIL = 'contato@flowsuite.com.br';
```

Enquanto `WHATSAPP` estiver vazio, os botões de WhatsApp abrem o e-mail e o
botão verde flutuante fica escondido.

O Instagram (`@flowsuite`) e o e-mail também aparecem escritos na seção de
contato e no rodapé — procure por `flowsuite` no arquivo.

## Imagens
As telas em `img/` foram geradas do próprio Flow Suite rodando com **dados
fictícios** (nenhum cliente, pedido ou valor real aparece).

## Publicar
É um site estático: funciona no GitHub Pages, Netlify, Vercel ou qualquer
hospedagem. Basta publicar a pasta inteira.
