// ============================================================
// INTEGRAÇÃO COM TRANSPORTADORAS - VORA 313
// ============================================================

const TRANSPORTADORAS = {
    'luanda': {
        nome: 'VORA Express',
        taxaBase: 1000,
        taxaPorKg: 0,
        prazo: '24-48 horas'
    },
    'viana': {
        nome: 'VORA Express',
        taxaBase: 3500,
        taxaPorKg: 0,
        prazo: '48 horas'
    },
    'talatona': {
        nome: 'VORA Premium',
        taxaBase: 4000,
        taxaPorKg: 0,
        prazo: '24 horas'
    },
    'kilamba': {
        nome: 'VORA Premium',
        taxaBase: 4500,
        taxaPorKg: 0,
        prazo: '24-48 horas'
    },
    'outro': {
        nome: 'VORA Nacional',
        taxaBase: 5000,
        taxaPorKg: 0,
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