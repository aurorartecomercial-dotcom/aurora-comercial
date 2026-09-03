// ============================================================
// PAGAMENTO MULTICAIXA EXPRESS - ESTRUTURA BASE
// ============================================================

const MULTICAIXA_CONFIG = {
    // ⚠️ Preencher com credenciais fornecidas pelo BAI/Standard Bank
    clientId: 'SEU_CLIENT_ID',          // Obtido no portal do BAI
    clientSecret: 'SEU_CLIENT_SECRET',  // Obtido no portal do BAI
    apiUrl: 'https://api.multicaixaexpress.com/v1',
    merchantId: '5000048151' // NIF da empresa
};

// Função para obter token de acesso
async function obterToken() {
    try {
        const resposta = await fetch(`${MULTICAIXA_CONFIG.apiUrl}/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId: MULTICAIXA_CONFIG.clientId,
                clientSecret: MULTICAIXA_CONFIG.clientSecret
            })
        });

        if (!resposta.ok) {
            throw new Error(`Erro na autenticação: ${resposta.status}`);
        }

        const dados = await resposta.json();
        return dados.access_token;
    } catch (e) {
        console.error('Erro ao obter token:', e);
        throw new Error('Erro de autenticação com o Multicaixa Express.');
    }
}

// Função para gerar referência de pagamento
export async function gerarReferenciaMulticaixa(valor, referencia, descricao) {
    try {
        const token = await obterToken();
        const resposta = await fetch(`${MULTICAIXA_CONFIG.apiUrl}/payment/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                valor: valor,
                referencia: referencia,
                descricao: descricao,
                merchantId: MULTICAIXA_CONFIG.merchantId
            })
        });

        if (!resposta.ok) {
            throw new Error(`Erro ao gerar referência: ${resposta.status}`);
        }

        const dados = await resposta.json();
        return dados;
    } catch (e) {
        console.error('Erro ao gerar referência:', e);
        throw new Error('Erro ao comunicar com o Multicaixa Express.');
    }
}

// Função para verificar se o pagamento foi confirmado
export async function verificarPagamento(referencia) {
    try {
        const token = await obterToken();
        const resposta = await fetch(`${MULTICAIXA_CONFIG.apiUrl}/payment/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                referencia: referencia
            })
        });

        if (!resposta.ok) {
            throw new Error(`Erro ao verificar pagamento: ${resposta.status}`);
        }

        const dados = await resposta.json();
        return dados.status === 'CONFIRMED';
    } catch (e) {
        console.error('Erro ao verificar pagamento:', e);
        return false;
    }
}