import { extrairValorNumerico } from './utils.js';

let todasVendas = [];
let catalogo = [];
let graficos = {};

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginVendas');
    const conteudoDiv = document.getElementById('conteudoVendas');
    const btnLogin = document.getElementById('btnLoginVendas');
    const emailInput = document.getElementById('emailVendas');
    const senhaInput = document.getElementById('senhaVendas');
    const erroLogin = document.getElementById('erroLoginVendas');

    btnLogin.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: senhaInput.value })
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('admin_token', data.token);
                loginDiv.style.display = 'none';
                conteudoDiv.style.display = 'block';
                carregarDados();
            } else {
                erroLogin.style.display = 'block';
                erroLogin.textContent = 'Credenciais inválidas';
            }
        } catch (e) {
            erroLogin.style.display = 'block';
            erroLogin.textContent = 'Erro de ligação';
        }
    });

    senhaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnLogin.click(); });

    document.querySelectorAll('.aba-btn').forEach(btn => {
        btn.addEventListener('click', () => trocarAba(btn.dataset.aba));
    });

    document.getElementById('btnFiltrarDia')?.addEventListener('click', () => renderizarDiario());
    document.getElementById('btnLimparDia')?.addEventListener('click', () => {
        document.getElementById('inputDiaDiario').value = '';
        renderizarDiario();
    });
    document.getElementById('btnFiltrarSemana')?.addEventListener('click', () => renderizarSemanal());
    document.getElementById('btnLimparSemana')?.addEventListener('click', () => {
        document.getElementById('selectSemanaFiltro').value = '';
        renderizarSemanal();
    });
    document.getElementById('btnFiltrarMes')?.addEventListener('click', () => renderizarMensal());
    document.getElementById('btnLimparMes')?.addEventListener('click', () => {
        document.getElementById('selectMesFiltro').value = '';
        renderizarMensal();
    });
    document.getElementById('btnFiltrarAno')?.addEventListener('click', () => renderizarAnual());
    document.getElementById('btnLimparAno')?.addEventListener('click', () => {
        document.getElementById('selectAnoFiltro').value = '';
        renderizarAnual();
    });
    document.getElementById('filtroPedidoCliente')?.addEventListener('input', () => renderizarPedidos());
    document.getElementById('filtroStatus')?.addEventListener('change', () => renderizarPedidos());
    document.getElementById('btnFiltrarPendentes')?.addEventListener('click', () => {
        document.getElementById('filtroStatus').value = 'confirmado';
        renderizarPedidos();
    });
    document.getElementById('btnFiltrarEntregues')?.addEventListener('click', () => {
        document.getElementById('filtroStatus').value = 'entregue';
        renderizarPedidos();
    });

    // Configurar botões de exportação
    const botoes = ['Dashboard', 'Diario', 'Semanal', 'Mensal', 'Anual', 'Produtos', 'Contabilidade', 'Pedidos'];
    botoes.forEach(tipo => {
        const btnPdf = document.getElementById(`btnExportarPDF${tipo}`);
        const btnExcel = document.getElementById(`btnExportarExcel${tipo}`);
        if (btnPdf) btnPdf.addEventListener('click', () => exportarPDF(tipo.toLowerCase()));
        if (btnExcel) btnExcel.addEventListener('click', () => exportarExcel(tipo.toLowerCase()));
    });
});

async function carregarDados() {
    try {
        const token = sessionStorage.getItem('admin_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const vendasResponse = await fetch('/api/admin/vendas', { headers });
        todasVendas = await vendasResponse.json();

        const produtosResponse = await fetch('/api/admin/produtos', { headers });
        catalogo = await produtosResponse.json();

        renderizarDashboard();
        
        const dataAtualEl = document.getElementById('dataAtual');
        if (dataAtualEl) {
            const hoje = new Date();
            dataAtualEl.textContent = hoje.toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        alert('Erro ao carregar dados: ' + e.message);
    }
}

function trocarAba(abaId) {
    document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.toggle('ativa', btn.dataset.aba === abaId));
    document.querySelectorAll('.aba-conteudo').forEach(div => div.classList.toggle('ativa', div.id === `aba-${abaId}`));
    
    switch (abaId) {
        case 'dashboard': renderizarDashboard(); break;
        case 'diario': renderizarDiario(); break;
        case 'semanal': renderizarSemanal(); break;
        case 'mensal': renderizarMensal(); break;
        case 'anual': renderizarAnual(); break;
        case 'produtos': renderizarProdutos(); break;
        case 'contabilidade': renderizarContabilidade(); break;
        case 'pedidos': renderizarPedidos(); break;
    }
}

function parseDataHora(dataStr) {
    if (!dataStr) return null;
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/;
    const match = dataStr.match(regex);
    if (match) {
        const dia = parseInt(match[1]);
        const mes = parseInt(match[2]) - 1;
        const ano = parseInt(match[3]);
        const hora = match[4] ? parseInt(match[4]) : 0;
        const minuto = match[5] ? parseInt(match[5]) : 0;
        return new Date(ano, mes, dia, hora, minuto);
    }
    return null;
}

function calcularCustoDaVenda(venda) {
    if (venda.itens && venda.itens.length) {
        let custo = 0;
        venda.itens.forEach(item => {
            const prod = catalogo.find(p => p.nome === item.nome);
            if (prod) {
                const precoItem = item.preco || 0;
                const custoProduto = extrairValorNumerico(prod.custo || '0');
                if (custoProduto > 0 && custoProduto < precoItem * 0.1) custo += precoItem * 0.6 * item.quantidade;
                else custo += custoProduto * item.quantidade;
            } else {
                custo += (item.preco || 0) * item.quantidade * 0.6;
            }
        });
        return custo;
    }
    return (venda.valor_total || 0) * 0.6;
}

function calcularLucroVenda(venda) {
    return (venda.valor_total || 0) - calcularCustoDaVenda(venda);
}

function calcularMargemVenda(venda) {
    const receita = venda.valor_total || 0;
    return receita > 0 ? (calcularLucroVenda(venda) / receita) * 100 : 0;
}

function renderizarDashboard() {
    const vendas = todasVendas;
    const faturamentoBruto = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const custoTotal = vendas.reduce((acc, v) => acc + calcularCustoDaVenda(v), 0);
    const lucroBruto = faturamentoBruto - custoTotal;
    const margemLucro = faturamentoBruto > 0 ? (lucroBruto / faturamentoBruto) * 100 : 0;
    const pedidos = vendas.length;

    setText('kpiFaturamentoBruto', faturamentoBruto.toLocaleString('pt-AO') + ' Kz');
    setText('kpiCustoTotal', custoTotal.toLocaleString('pt-AO') + ' Kz');
    setText('kpiLucroBruto', lucroBruto.toLocaleString('pt-AO') + ' Kz');
    setText('kpiMargemLucro', margemLucro.toFixed(1) + '%');
    setText('kpiPedidos', pedidos);
    setText('kpiPendentes', vendas.filter(v => v.status !== 'entregue').length);

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;

    const vendasHoje = vendas.filter(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return false;
        const dataStr = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
        return dataStr === hojeStr;
    });
    setText('kpiFaturamentoHoje', vendasHoje.reduce((acc, v) => acc + (v.valor_total || 0), 0).toLocaleString('pt-AO') + ' Kz');
    setText('kpiPedidosHoje', vendasHoje.length);

    renderizarResumoDiario(vendas);
    renderizarGraficoVendasMes(vendas);
}

function setText(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function renderizarResumoDiario(vendas) { /* ... (igual ao antigo, mas usando v.valor_total) ... */ }

function renderizarPedidos() {
    const clienteFiltro = document.getElementById('filtroPedidoCliente').value.trim().toLowerCase();
    const statusFiltro = document.getElementById('filtroStatus').value;

    let vendas = todasVendas;
    if (clienteFiltro) vendas = vendas.filter(v => (v.nome_cliente || '').toLowerCase().includes(clienteFiltro));
    if (statusFiltro !== 'todos') vendas = vendas.filter(v => v.status === statusFiltro);

    const tbody = document.getElementById('corpoTabelaPedidos');
    if (!tbody) return;
    tbody.innerHTML = '';
    vendas.sort((a,b) => (parseDataHora(b.data_hora)?.getTime() || 0) - (parseDataHora(a.data_hora)?.getTime() || 0));
    vendas.forEach(v => {
        const status = v.status || 'confirmado';
        const isPendente = status === 'confirmado';
        const bg = isPendente ? 'background:#ffe0e0;' : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${v.data_hora || 'N/A'}</td>
            <td style="padding:8px; font-weight:600;">${v.nome_cliente || 'N/A'}</td>
            <td style="padding:8px;">${v.telefone_cliente || 'N/A'}</td>
            <td style="padding:8px;">${v.nif_cliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.morada_cliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.produtos_resumo || 'N/A'}</td>
            <td style="padding:8px; color:#25D366; font-weight:bold;">${(v.valor_total || 0).toLocaleString('pt-AO')} Kz</td>
            <td style="padding:8px; ${bg}">
                <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:12px; ${isPendente?'background:#E74C3C; color:#FFF;':status==='enviado'?'background:#3498db; color:#FFF;':'background:#27ae60; color:#FFF;'}">
                    ${isPendente?'⚠️ Pendente':status==='enviado'?'🔵 Enviado':'🟢 Entregue'}
                </span>
            </td>
            <td style="padding:8px; display:flex; gap:4px; flex-wrap:wrap;">
                <button onclick="window.atualizarStatus('${v.id}', 'enviado')" style="background:#3498db; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🚚 Enviar</button>
                <button onclick="window.atualizarStatus('${v.id}', 'entregue')" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">📦 Entregar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.atualizarStatus = async function(id, novoStatus) {
    const token = sessionStorage.getItem('admin_token');
    try {
        await fetch(`/api/admin/vendas?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: novoStatus })
        });
        carregarDados();
    } catch(e) { alert('Erro: ' + e.message); }
};

// ... (Adicione aqui as funções de renderizarDiario, Semanal, Mensal, Anual, Produtos, Contabilidade, Exportar, etc., adaptando para usar v.valor_total e v.data_hora)