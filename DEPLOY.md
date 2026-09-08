# Aurora Comercial — checklist de produção

## 1. Firebase

Antes do deploy, confirme no projeto Firebase `aurora-comerciall`:

- Authentication: Email/Password ativo.
- Authentication: Anonymous ativo, porque o checkout atual permite compra sem criar conta.
- Firestore: publicar `firestore.rules`.
- Storage: publicar `storage.rules`.
- Functions: instalar dependências dentro de `functions/` e publicar as Cloud Functions.

Com Firebase CLI instalado:

```bash
firebase use aurora-comerciall
firebase deploy --only firestore:rules,storage,functions
```

## 2. Administrador

O painel depende do custom claim:

```json
{"admin": true}
```

Esse claim deve ser atribuído por um ambiente administrativo confiável usando Firebase Admin SDK. Nunca aceite `admin=true` vindo do navegador.

## 3. Pagamentos

O checkout desta versão cria o pedido como `aguardando_pagamento`. O estoque e o cupom só são consumidos quando o pedido passa para `pago` através da função administrativa.

As chaves secretas de Stripe/Multicaixa foram removidas do frontend. Não coloque `sk_*`, `clientSecret` ou tokens de provedor em `js/` ou em qualquer HTML.

A integração automática com um provedor de pagamento só deve ser ativada depois de confirmar a API oficial, credenciais, moeda, ambiente de produção e mecanismo de webhook do provedor escolhido.

## 4. Fluxo seguro atual

1. Cliente envia somente IDs dos produtos e quantidades.
2. `criarPedido` lê catálogo, preços e estoque no servidor.
3. O servidor calcula subtotal, desconto e frete.
4. O pedido nasce como `aguardando_pagamento`.
5. O código público de rastreio não contém dados pessoais.
6. Ao confirmar o pagamento, `atualizarEstadoPedido` valida novamente estoque e cupom em transação.
7. Só então o estoque é baixado, o cupom é consumido e os pontos de fidelidade são atribuídos.

## 5. Teste antes de vender

Faça pelo menos estes testes:

- alterar preço no DevTools e confirmar que o servidor ignora o preço adulterado;
- enviar quantidade acima do estoque;
- tentar ler a venda de outro utilizador;
- tentar escrever diretamente em `vendas` como cliente;
- tentar alterar `pontos` diretamente;
- tentar usar cupom expirado ou acima do limite;
- criar dois pedidos simultâneos para o mesmo estoque e confirmar que apenas um pagamento consegue baixar as unidades disponíveis;
- tentar cancelar um pedido já pago;
- rastrear um código válido e confirmar que nenhuma PII aparece;
- inserir `<img onerror=alert(1)>` como nome de produto e verificar que não executa JavaScript no catálogo/admin.

## 6. Importante

As regras Firestore protegem o banco, mas o frontend continua sendo código público. Toda regra de negócio que afeta dinheiro, estoque, cupom, pontos ou estado de pagamento deve permanecer no servidor.
