/*
 * Funções privilegiadas da VORA 313.
 *
 * Credenciais de Stripe, Multicaixa e qualquer segredo de um provedor de
 * pagamento pertencem a este ambiente (Secret Manager), nunca ao browser.
 */
const { randomBytes } = require('node:crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

const FRETES = Object.freeze({
  'Luanda Centro': 1000,
  Ingombota: 1000,
  Maianga: 1200,
  Rangel: 1500,
  Cazenga: 2000,
  Viana: 3500,
  Talatona: 4000,
  Kilamba: 4500,
  Benfica: 3000,
  'Ondjiva (Cunene)': 1500,
  'Cuanhama (Ondjiva)': 1500,
  'Ombadja (Xangongo)': 2500,
  'Cuvelai (Cunene)': 2500,
  'Namacunde (Santa Clara)': 2000,
  'Curoca (Cunene)': 3500,
  'Cahama (Cunene)': 3000,
  'Outro (Cunene)': 4000
});

const ESTADOS = new Set([
  'aguardando_pagamento',
  'pago',
  'em_preparacao',
  'enviado',
  'entregue',
  'cancelado'
]);

function erro(code, message) {
  throw new HttpsError(code, message);
}

function texto(value, field, maxLength, required = true) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (required && !result) erro('invalid-argument', `${field} é obrigatório.`);
  if (result.length > maxLength) erro('invalid-argument', `${field} excede o limite permitido.`);
  return result;
}

function inteiroPositivo(value, field, max = 100) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > max) {
    erro('invalid-argument', `${field} é inválido.`);
  }
  return result;
}

function centavosDePreco(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
  const original = String(value ?? '').replace(/[^0-9.,]/g, '');
  if (!original) return 0;

  const comma = original.lastIndexOf(',');
  const dot = original.lastIndexOf('.');
  let normalizado = original;
  if (comma > dot) normalizado = original.replace(/\./g, '').replace(',', '.');
  else if (dot > comma) normalizado = original.replace(/,/g, '');
  else if (comma !== -1) normalizado = original.replace(',', '.');

  const valor = Number(normalizado);
  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : 0;
}

function moeda(centavos) {
  return Number((centavos / 100).toFixed(2));
}

function codigo(prefix) {
  return `${prefix}-${randomBytes(10).toString('hex').toUpperCase()}`;
}

function podeUsarCupom(cupom, uid, agora) {
  if (!cupom || cupom.ativo !== true) return false;
  if (cupom.uidCliente && cupom.uidCliente !== uid) return false;
  if (cupom.validade) {
    const validade = cupom.validade.toDate ? cupom.validade.toDate() : new Date(cupom.validade);
    if (Number.isNaN(validade.getTime()) || validade < agora) return false;
  }
  if (Number.isFinite(cupom.maxUsos) && (cupom.usos || 0) >= cupom.maxUsos) return false;
  return Number.isFinite(Number(cupom.percentual)) && Number(cupom.percentual) > 0 && Number(cupom.percentual) <= 100;
}

async function buscarCupom(codigoCupom) {
  if (!codigoCupom) return null;
  const snapshot = await db.collection('cupons')
    .where('codigo', '==', codigoCupom)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0];
}

function garantirAdmin(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    erro('permission-denied', 'Acesso administrativo necessário.');
  }
}

/*
 * Cria um pedido pendente. Preço, frete, cupom e dados de catálogo são
 * sempre calculados no servidor; o navegador não tem autoridade sobre eles.
 */
exports.criarPedido = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) erro('unauthenticated', 'Inicie sessão para finalizar o pedido.');

  const input = request.data || {};
  if (!Array.isArray(input.itens) || input.itens.length === 0 || input.itens.length > 30) {
    erro('invalid-argument', 'O carrinho é inválido.');
  }

  const cliente = {
    nome: texto(input.cliente?.nome, 'Nome', 120),
    telefone: texto(input.cliente?.telefone, 'Telefone', 15),
    nif: texto(input.cliente?.nif, 'NIF', 10),
    morada: texto(input.cliente?.morada, 'Morada', 300, false),
    bairro: texto(input.cliente?.bairro, 'Bairro', 80),
    observacao: texto(input.cliente?.observacao, 'Observação', 500, false)
  };

  if (!/^[0-9]{9,15}$/.test(cliente.telefone)) erro('invalid-argument', 'Telefone inválido.');
  if (!/^[0-9]{10}$/.test(cliente.nif)) erro('invalid-argument', 'NIF inválido.');
  if (!Object.hasOwn(FRETES, cliente.bairro)) erro('invalid-argument', 'Bairro não atendido.');

  const itensPorProduto = new Map();
  for (const item of input.itens) {
    const produtoId = texto(item?.produtoId, 'Produto', 128);
    const quantidade = inteiroPositivo(item?.quantidade, 'Quantidade', 20);
    itensPorProduto.set(produtoId, (itensPorProduto.get(produtoId) || 0) + quantidade);
  }
  if ([...itensPorProduto.values()].some((quantidade) => quantidade > 20)) {
    erro('invalid-argument', 'Quantidade máxima por produto excedida.');
  }

  const codigoCupom = texto(input.cupom, 'Cupom', 60, false).toUpperCase();
  const cupomRef = await buscarCupom(codigoCupom);
  const pedidoRef = db.collection('vendas').doc();
  const codigoRastreio = codigo('AURORA');
  const rastreioRef = db.collection('rastreiosPublicos').doc(codigoRastreio);
  const numeroFatura = codigo('FR');
  const agora = Timestamp.now();

  const pedido = await db.runTransaction(async (transaction) => {
    const snapshots = [];
    for (const produtoId of itensPorProduto.keys()) {
      let snapshot = await transaction.get(db.collection('produtos').doc(produtoId));
      // Compatibilidade com produtos antigos, criados antes de o ID público ser
      // usado como ID do documento. Novos produtos não passam por esta consulta.
      if (!snapshot.exists) {
        const legado = await transaction.get(db.collection('produtos').where('id', '==', produtoId).limit(1));
        if (legado.empty) erro('not-found', 'Um produto do carrinho já não existe.');
        snapshot = legado.docs[0];
      }
      snapshots.push(snapshot);
    }
    let subtotalCentavos = 0;
    const itens = [];

    snapshots.forEach((snapshot) => {
      const produto = snapshot.data();
      const quantidade = itensPorProduto.get(String(produto.id || snapshot.id));
      const estoque = Number(produto.estoque ?? 0);
      const precoCentavos = centavosDePreco(produto.preco);
      if (!Number.isInteger(estoque) || estoque < quantidade) {
        erro('failed-precondition', `${produto.nome || 'Produto'} não possui estoque suficiente.`);
      }
      if (precoCentavos <= 0) erro('failed-precondition', 'Um produto tem preço inválido.');

      subtotalCentavos += precoCentavos * quantidade;
      itens.push({
        produtoId: snapshot.id,
        nome: texto(produto.nome, 'Nome do produto', 160),
        quantidade,
        preco: moeda(precoCentavos),
        observacao: ''
      });
    });

    let descontoCentavos = 0;
    let cupomAplicado = null;
    if (cupomRef) {
      const cupomSnapshot = await transaction.get(cupomRef.ref);
      if (!cupomSnapshot.exists || !podeUsarCupom(cupomSnapshot.data(), request.auth.uid, agora.toDate())) {
        erro('failed-precondition', 'Cupom inválido, expirado ou indisponível.');
      }
      const cupom = cupomSnapshot.data();
      descontoCentavos = Math.round(subtotalCentavos * (Number(cupom.percentual) / 100));
      cupomAplicado = { codigo: codigoCupom, percentual: Number(cupom.percentual) };
    } else if (codigoCupom) {
      erro('failed-precondition', 'Cupom inválido.');
    }

    const freteCentavos = Math.round(FRETES[cliente.bairro] * 100);
    const totalCentavos = subtotalCentavos - descontoCentavos + freteCentavos;
    const venda = {
      codigoRastreio,
      numeroFatura,
      uidCliente: request.auth.uid,
      status: 'aguardando_pagamento',
      pagamento: { metodo: 'multicaixa_manual', status: 'pendente' },
      nomeCliente: cliente.nome,
      telefoneCliente: cliente.telefone,
      nifCliente: cliente.nif,
      moradaCliente: cliente.morada,
      bairro: cliente.bairro,
      observacao: cliente.observacao,
      itens,
      produtosResumo: itens.map((item) => `${item.nome} (x${item.quantidade})`).join(', '),
      totalItens: itens.reduce((total, item) => total + item.quantidade, 0),
      subtotal: moeda(subtotalCentavos),
      frete: moeda(freteCentavos),
      valorDesconto: moeda(descontoCentavos),
      valorTotal: moeda(totalCentavos),
      cupomAplicado,
      criadoEm: agora,
      atualizadoEm: agora,
      dataHora: agora.toDate().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' }),
      expiraEm: Timestamp.fromMillis(agora.toMillis() + 2 * 60 * 60 * 1000)
    };

    transaction.create(pedidoRef, venda);
    transaction.create(rastreioRef, {
      codigo: codigoRastreio,
      status: venda.status,
      criadoEm: agora,
      atualizadoEm: agora
    });
    return venda;
  });

  logger.info('Pedido pendente criado', { pedidoId: pedidoRef.id, uid: request.auth.uid });
  return {
    pedidoId: pedidoRef.id,
    codigoRastreio: pedido.codigoRastreio,
    numeroFatura: pedido.numeroFatura,
    status: pedido.status,
    subtotal: pedido.subtotal,
    frete: pedido.frete,
    valorDesconto: pedido.valorDesconto,
    valorTotal: pedido.valorTotal,
    itens: pedido.itens,
    cupomAplicado: pedido.cupomAplicado
  };
});

/*
 * Uso administrativo após conferir o pagamento no provedor ou em um webhook
 * autenticado. A baixa de estoque ocorre atomamente apenas uma vez, quando o
 * pedido efetivamente passa para "pago".
 */
exports.atualizarEstadoPedido = onCall({ region: 'us-central1' }, async (request) => {
  garantirAdmin(request);
  const codigoRastreio = texto(request.data?.codigoRastreio, 'Código de rastreio', 64).toUpperCase();
  const novoStatus = texto(request.data?.status, 'Estado', 32);
  if (!ESTADOS.has(novoStatus)) erro('invalid-argument', 'Estado inválido.');

  const pedidoQuery = await db.collection('vendas')
    .where('codigoRastreio', '==', codigoRastreio)
    .limit(1)
    .get();
  if (pedidoQuery.empty) erro('not-found', 'Pedido não encontrado.');

  const pedidoRef = pedidoQuery.docs[0].ref;
  const rastreioRef = db.collection('rastreiosPublicos').doc(codigoRastreio);

  await db.runTransaction(async (transaction) => {
    const pedidoSnapshot = await transaction.get(pedidoRef);
    if (!pedidoSnapshot.exists) erro('not-found', 'Pedido não encontrado.');
    const pedido = pedidoSnapshot.data();
    const atual = pedido.status;

    const transicoes = {
      aguardando_pagamento: ['pago', 'cancelado'],
      pago: ['em_preparacao', 'enviado', 'cancelado'],
      em_preparacao: ['enviado', 'cancelado'],
      enviado: ['entregue'],
      entregue: [],
      cancelado: []
    };
    if (atual !== novoStatus && !(transicoes[atual] || []).includes(novoStatus)) {
      erro('failed-precondition', `Não é permitido mudar de ${atual} para ${novoStatus}.`);
    }

    if (atual !== 'pago' && novoStatus === 'pago') {
      const expiraEm = pedido.expiraEm?.toDate ? pedido.expiraEm.toDate() : null;
      if (expiraEm && expiraEm.getTime() < Date.now()) {
        erro('failed-precondition', 'Este pedido expirou. Crie um novo pedido para continuar.');
      }
      const refs = (pedido.itens || []).map((item) => db.collection('produtos').doc(item.produtoId));
      const produtos = await transaction.getAll(...refs);
      produtos.forEach((produtoSnapshot, index) => {
        const item = pedido.itens[index];
        if (!produtoSnapshot.exists) erro('failed-precondition', 'Produto não encontrado para baixa de estoque.');
        const estoque = Number(produtoSnapshot.data().estoque ?? 0);
        if (!Number.isInteger(estoque) || estoque < item.quantidade) {
          erro('failed-precondition', `Estoque insuficiente para ${item.nome}.`);
        }
        transaction.update(produtoSnapshot.ref, { estoque: estoque - item.quantidade, atualizadoEm: Timestamp.now() });
      });

      // O cupom só é consumido quando o pagamento é efetivamente confirmado.
      if (pedido.cupomAplicado?.codigo) {
        const cupomRef = await buscarCupom(pedido.cupomAplicado.codigo);
        if (!cupomRef) erro('failed-precondition', 'O cupom do pedido não está mais disponível.');
        const cupomSnapshot = await transaction.get(cupomRef.ref);
        if (!cupomSnapshot.exists || !podeUsarCupom(cupomSnapshot.data(), pedido.uidCliente, Timestamp.now().toDate())) {
          erro('failed-precondition', 'O cupom do pedido expirou ou atingiu o limite de uso.');
        }
        transaction.update(cupomRef.ref, { usos: FieldValue.increment(1), atualizadoEm: Timestamp.now() });
      }

      const pontos = Math.floor(Number(pedido.valorTotal || 0) / 1000);
      if (pontos > 0 && pedido.uidCliente) {
        const clienteRef = db.collection('clientes').doc(pedido.uidCliente);
        transaction.set(clienteRef, {
          pontos: FieldValue.increment(pontos),
          historico: FieldValue.arrayUnion({
            data: Timestamp.now(),
            tipo: 'ganho',
            pontos,
            descricao: `Compra ${pedido.numeroFatura || pedido.codigoRastreio}`
          })
        }, { merge: true });
      }
    }

    // Cancelamento após pagamento exigiria estorno e reposição de estoque.
    // Para evitar inconsistências, o painel só pode cancelar pedidos ainda pendentes.
    if (novoStatus === 'cancelado' && atual !== 'aguardando_pagamento') {
      erro('failed-precondition', 'Um pedido pago/em preparação não pode ser cancelado por este fluxo. Faça o estorno e a reposição por um processo específico.');
    }

    const agora = Timestamp.now();
    transaction.update(pedidoRef, {
      status: novoStatus,
      'pagamento.status': novoStatus === 'pago' ? 'confirmado' : pedido.pagamento?.status || 'pendente',
      atualizadoEm: agora
    });
    transaction.set(rastreioRef, { status: novoStatus, atualizadoEm: agora }, { merge: true });
  });

  return { codigoRastreio, status: novoStatus };
});
