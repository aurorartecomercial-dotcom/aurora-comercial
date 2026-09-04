// ============================================================
// PAGAMENTO COM CARTÃO - AURORA COMERCIAL
// ============================================================
import { db } from './config.js';
import { doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Configuração do Stripe (substituir pelas tuas chaves)
const STRIPE_PUBLIC_KEY = 'pk_test_...'; // Chave pública (teste)
const STRIPE_SECRET_KEY = 'sk_test_...'; // Chave secreta (nunca expor no frontend)

// Para Paystack (alternativa africana):
// const PAYSTACK_PUBLIC_KEY = 'pk_test_...';

export async function iniciarPagamentoCartao(valor, referencia, descricao, emailCliente) {
    try {
        // 1. Criar uma intenção de pagamento (PaymentIntent) no Stripe
        const resposta = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
            },
            body: new URLSearchParams({
                amount: Math.round(valor * 100), // Stripe usa centavos
                currency: 'aoa', // ou 'usd' se preferir
                description: descricao,
                receipt_email: emailCliente,
                metadata: { referencia }
            })
        });

        const dados = await resposta.json();
        return dados;
    } catch (e) {
        console.error('Erro ao iniciar pagamento:', e);
        throw new Error('Erro ao processar pagamento.');
    }
}

export async function confirmarPagamento(paymentIntentId) {
    try {
        // Verificar se o pagamento foi confirmado
        const resposta = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
            }
        });

        const dados = await resposta.json();
        return dados.status === 'succeeded';
    } catch (e) {
        console.error('Erro ao verificar pagamento:', e);
        return false;
    }
}

// Exemplo de integração com o checkout
export async function processarCheckoutCartao(valorTotal, dadosCliente) {
    try {
        const paymentIntent = await iniciarPagamentoCartao(valorTotal, `PAY-${Date.now()}`, 'Pedido Aurora', dadosCliente.email);
        
        // Aqui o Stripe.js irá lidar com a inserção dos dados do cartão
        // Para simplificar, usaremos o Stripe Elements ou o Checkout Hosted

        return paymentIntent;
    } catch (e) {
        console.error('Erro no checkout:', e);
        throw e;
    }
}