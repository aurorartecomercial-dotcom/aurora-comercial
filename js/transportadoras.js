// ============================================================
// INTEGRAÇÃO COM TRANSPORTADORAS - AURORA COMERCIAL
// ============================================================

const TRANSPORTADORAS = {
    'luanda': {
        nome: 'Aurora Express',
        taxaBase: 1000,
        taxaPorKg: 500,
        prazo: '24-48 horas'
    },
    'viana': {
        nome: 'Aurora Express',
        taxaBase: 2500,
        taxaPorKg: 500,
        prazo: '48 horas'
    },
    'talatona': {
        nome: 'Aurora Premium',
        taxaBase: 3000,
        taxaPorKg: 700,
        prazo: '24 horas'
    },
    'kilamba': {
        nome: 'Aurora Premium',
        taxaBase: 3500,
        taxaPorKg: 700,
        prazo: '24-48 horas'
    },
    'outro': {
        nome: 'Aurora Nacional',
        taxaBase: 5000,
        taxaPorKg: 1000,
        prazo: '3-5 dias'
    }
};

export function calcularFrete(bairro, pesoTotal) {
    const transportadora = TRANSPORTADORAS[bairro] || TRANSPORTADORAS['outro'];
    const frete = transportadora.taxaBase + (pesoTotal * transportadora.taxaPorKg);
    return {
        valor: frete,
        transportadora: transportadora.nome,
        prazo: transportadora.prazo
    };
}

export function calcularPesoTotal(itens) {
    // Simulação: cada item tem peso médio de 0.5kg
    return itens.reduce((acc, item) => acc + (item.quantidade * 0.5), 0);
}

export function obterTransportadora(bairro) {
    return TRANSPORTADORAS[bairro] || TRANSPORTADORAS['outro'];
}