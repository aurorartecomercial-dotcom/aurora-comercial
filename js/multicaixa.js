// Multicaixa Express — Aurora Comercial
//
// As credenciais e chamadas ao provedor devem ficar no servidor.
// Este módulo é apenas uma interface segura para Cloud Functions.
import { functions } from './config.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';

export async function gerarReferenciaMulticaixa(valor, referencia, descricao) {
    if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) {
        throw new Error('Valor de pagamento inválido.');
    }
    const iniciar = httpsCallable(functions, 'criarPagamentoMulticaixa');
    const resposta = await iniciar({
        valor: Number(valor),
        referencia: String(referencia || ''),
        descricao: String(descricao || 'Pedido Aurora Comercial')
    });
    return resposta.data;
}

export async function verificarPagamento(referencia) {
    if (!referencia) return false;
    const consultar = httpsCallable(functions, 'consultarPagamentoMulticaixa');
    const resposta = await consultar({ referencia: String(referencia) });
    return resposta.data?.status === 'CONFIRMED';
}
