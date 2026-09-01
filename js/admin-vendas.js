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
            const response = await fetch('/api/login', {
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

function renderizarResumoDiario(vendas) {
    const tbody = document.getElementById('corpoResumoDiario');
    if (!tbody) return;
    tbody.innerHTML = '';
    const resumo = {};
    
    vendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const dataStr = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
        if (!resumo[dataStr]) resumo[dataStr] = { total: 0, faturamento: 0, custo: 0, lucro: 0 };
        resumo[dataStr].total++;
        resumo[dataStr].faturamento += v.valor_total || 0;
        resumo[dataStr].custo += calcularCustoDaVenda(v);
        resumo[dataStr].lucro += calcularLucroVenda(v);
    });
    
    const datas = Object.keys(resumo).sort((a,b)=>b.localeCompare(a));
    datas.forEach(dataStr => {
        const info = resumo[dataStr];
        const [ano, mes, dia] = dataStr.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        const margem = info.faturamento > 0 ? (info.lucro / info.faturamento) * 100 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${dataFormatada}</td>
            <td style="padding:8px; text-align:center;">${info.total}</td>
            <td style="padding:8px; text-align:right;">${info.faturamento.toLocaleString('pt-AO')} Kz</td>
            <td style="padding:8px; text-align:right;">${info.custo.toLocaleString('pt-AO')} Kz</td>
            <td style="padding:8px; text-align:right; color:#27ae60;">${info.lucro.toLocaleString('pt-AO')} Kz</td>
            <td style="padding:8px; text-align:center;">${margem.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarGraficoVendasMes(vendas) {
    const porMes = {};
    vendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const key = `${ano}-${mes}`;
        if (!porMes[key]) porMes[key] = 0;
        porMes[key] += 1;
    });
    const keys = Object.keys(porMes).sort();
    const labels = keys.map(k => {
        const [ano, mes] = k.split('-');
        return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mes] + ' ' + ano;
    });
    const valores = keys.map(k => porMes[k]);

    const ctx = document.getElementById('graficoVendasMes');
    if (!ctx || labels.length === 0) return;

    if (typeof Chart !== 'undefined') {
        if (graficos.vendasMes) graficos.vendasMes.destroy();
        graficos.vendasMes = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Pedidos', data: valores, backgroundColor: '#2ecc71' }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
    }
}

// ===================== ABAS INDIVIDUAIS =====================

function renderizarDiario() {
    const diaSelecionado = document.getElementById('inputDiaDiario').value;
    let vendas = todasVendas;
    if (diaSelecionado) {
        vendas = todasVendas.filter(v => {
            const data = parseDataHora(v.data_hora);
            if (!data) return false;
            const dataStr = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
            return dataStr === diaSelecionado;
        });
    }

    const faturamento = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const custo = vendas.reduce((acc, v) => acc + calcularCustoDaVenda(v), 0);
    const lucro = faturamento - custo;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

    const resumoDiv = document.getElementById('resumoDiaContabil');
    if (resumoDiv) {
        resumoDiv.innerHTML = `
            <div class="kpi-contabil">
                <div class="card-kpi verde"><p>💰 Receita</p><h3>${faturamento.toLocaleString('pt-AO')} Kz</h3></div>
                <div class="card-kpi"><p>📦 Custo</p><h3>${custo.toLocaleString('pt-AO')} Kz</h3></div>
                <div class="card-kpi verde"><p>📈 Lucro</p><h3>${lucro.toLocaleString('pt-AO')} Kz</h3></div>
                <div class="card-kpi azul"><p>🎯 Margem</p><h3>${margem.toFixed(1)}%</h3></div>
            </div>
        `;
    }

    const container = document.getElementById('listaPedidosDia');
    if (!container) return;
    container.innerHTML = '';
    if (vendas.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Nenhum pedido neste dia.</p>';
    } else {
        vendas.sort((a,b) => (parseDataHora(b.data_hora)?.getTime() || 0) - (parseDataHora(a.data_hora)?.getTime() || 0));
        vendas.forEach(v => {
            const lucroVenda = calcularLucroVenda(v);
            const margemVenda = calcularMargemVenda(v);
            const div = document.createElement('div');
            div.style.cssText = 'border:1px solid #ddd; padding:10px; margin-bottom:8px; border-radius:8px; background:#f9f9f9;';
            div.innerHTML = `
                <strong>${v.data_hora}</strong> - ${v.nome_cliente}<br>
                ${v.produtos_resumo}<br>
                <span style="color:#25D366; font-weight:bold;">${(v.valor_total||0).toLocaleString('pt-AO')} Kz</span> |
                <span style="color:#005A4C;">Lucro: ${lucroVenda.toLocaleString('pt-AO')} Kz (${margemVenda.toFixed(1)}%)</span> |
                <span style="color:${v.status==='entregue'?'#27ae60':'#E74C3C'};">${v.status==='entregue'?'✅ Entregue':'⚠️ Pendente'}</span>
            `;
            container.appendChild(div);
        });
    }
}

function renderizarSemanal() {
    const semanaFiltro = document.getElementById('selectSemanaFiltro').value;
    const vendas = todasVendas.filter(v => {
        if (!semanaFiltro) return true;
        const data = parseDataHora(v.data_hora);
        if (!data) return false;
        const semana = Math.floor((data.getDate() - 1) / 7) + 1;
        return semana === parseInt(semanaFiltro);
    });

    const resumo = {};
    vendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const semana = Math.floor((data.getDate() - 1) / 7) + 1;
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const key = `${ano}-${mes}-${semana}`;
        if (!resumo[key]) resumo[key] = { semana, mes, ano, total: 0, faturamento: 0, custo: 0, lucro: 0 };
        resumo[key].total++;
        resumo[key].faturamento += v.valor_total || 0;
        resumo[key].custo += calcularCustoDaVenda(v);
        resumo[key].lucro += calcularLucroVenda(v);
    });

    const tbody = document.getElementById('corpoTabelaSemanal');
    if (!tbody) return;
    tbody.innerHTML = '';
    const keys = Object.keys(resumo).sort();
    keys.forEach(key => {
        const info = resumo[key];
        const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][info.mes];
        const margem = info.faturamento > 0 ? (info.lucro / info.faturamento) * 100 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">Semana ${info.semana} - ${mesNome}/${info.ano}</td>
            <td style="padding:8px; text-align:center;">${info.total}</td>
            <td style="padding:8px; text-align:right;">${info.faturamento.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right;">${info.custo.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right; color:#27ae60;">${info.lucro.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:center;">${margem.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarMensal() {
    const mesFiltro = document.getElementById('selectMesFiltro').value;
    const vendas = todasVendas.filter(v => {
        if (!mesFiltro) return true;
        const data = parseDataHora(v.data_hora);
        if (!data) return false;
        return data.getMonth() === parseInt(mesFiltro);
    });

    const resumo = {};
    vendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const key = `${ano}-${mes}`;
        if (!resumo[key]) resumo[key] = { mes, ano, total: 0, faturamento: 0, custo: 0, lucro: 0 };
        resumo[key].total++;
        resumo[key].faturamento += v.valor_total || 0;
        resumo[key].custo += calcularCustoDaVenda(v);
        resumo[key].lucro += calcularLucroVenda(v);
    });

    const tbody = document.getElementById('corpoTabelaMensal');
    if (!tbody) return;
    tbody.innerHTML = '';
    const keys = Object.keys(resumo).sort();
    keys.forEach(key => {
        const info = resumo[key];
        const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][info.mes];
        const margem = info.faturamento > 0 ? (info.lucro / info.faturamento) * 100 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${mesNome} ${info.ano}</td>
            <td style="padding:8px; text-align:center;">${info.total}</td>
            <td style="padding:8px; text-align:right;">${info.faturamento.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right;">${info.custo.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right; color:#27ae60;">${info.lucro.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:center;">${margem.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });

    renderizarGraficoMensal(vendas);
}

function renderizarGraficoMensal(vendas) {
    const resumo = {};
    vendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const key = `${ano}-${mes}`;
        if (!resumo[key]) resumo[key] = { mes, ano, faturamento: 0, lucro: 0 };
        resumo[key].faturamento += v.valor_total || 0;
        resumo[key].lucro += calcularLucroVenda(v);
    });
    const keys = Object.keys(resumo).sort();
    const ctx = document.getElementById('graficoMensal');
    if (!ctx) return;
    const labels = keys.map(k => {
        const [ano, mes] = k.split('-');
        return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mes] + ' ' + ano;
    });
    const faturamentos = keys.map(k => resumo[k].faturamento);
    const lucros = keys.map(k => resumo[k].lucro);
    if (labels.length === 0) return;

    if (typeof Chart !== 'undefined') {
        if (graficos.mensal) graficos.mensal.destroy();
        graficos.mensal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Faturamento', data: faturamentos, borderColor: '#005A4C', backgroundColor: 'rgba(0,90,76,0.2)', fill: true, tension: 0.4 },
                    { label: 'Lucro', data: lucros, borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.2)', fill: true, tension: 0.4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function renderizarAnual() {
    const anoFiltro = document.getElementById('selectAnoFiltro').value;
    const vendas = todasVendas.filter(v => {
        if (!anoFiltro) return true;
        const data = parseDataHora(v.data_hora);
        if (!data) return false;
        return data.getFullYear() === parseInt(anoFiltro);
    });

    const resumo = {};
    vendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const ano = data.getFullYear();
        if (!resumo[ano]) resumo[ano] = { total: 0, faturamento: 0, custo: 0, lucro: 0 };
        resumo[ano].total++;
        resumo[ano].faturamento += v.valor_total || 0;
        resumo[ano].custo += calcularCustoDaVenda(v);
        resumo[ano].lucro += calcularLucroVenda(v);
    });

    const tbody = document.getElementById('corpoTabelaAnual');
    if (!tbody) return;
    tbody.innerHTML = '';
    const anos = Object.keys(resumo).sort();
    anos.forEach(ano => {
        const info = resumo[ano];
        const margem = info.faturamento > 0 ? (info.lucro / info.faturamento) * 100 : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${ano}</td>
            <td style="padding:8px; text-align:center;">${info.total}</td>
            <td style="padding:8px; text-align:right;">${info.faturamento.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right;">${info.custo.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right; color:#27ae60;">${info.lucro.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:center;">${margem.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });

    renderizarGraficoAnual(vendas);
}

function renderizarGraficoAnual(vendas) {
    const resumo = {};
    vendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const ano = data.getFullYear();
        if (!resumo[ano]) resumo[ano] = { faturamento: 0, lucro: 0 };
        resumo[ano].faturamento += v.valor_total || 0;
        resumo[ano].lucro += calcularLucroVenda(v);
    });
    const anos = Object.keys(resumo).sort();
    const ctx = document.getElementById('graficoAnual');
    if (!ctx) return;
    const faturamentos = anos.map(a => resumo[a].faturamento);
    const lucros = anos.map(a => resumo[a].lucro);
    if (anos.length === 0) return;

    if (typeof Chart !== 'undefined') {
        if (graficos.anual) graficos.anual.destroy();
        graficos.anual = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: anos,
                datasets: [
                    { label: 'Faturamento', data: faturamentos, backgroundColor: 'rgba(0,90,76,0.7)' },
                    { label: 'Lucro', data: lucros, backgroundColor: 'rgba(39,174,96,0.7)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function renderizarProdutos() {
    const vendasPorProduto = {};
    todasVendas.forEach(venda => {
        if (venda.itens && Array.isArray(venda.itens)) {
            venda.itens.forEach(item => {
                const nome = item.nome;
                const qtd = item.quantidade || 1;
                if (!vendasPorProduto[nome]) vendasPorProduto[nome] = { qtd: 0, receita: 0, custo: 0 };
                vendasPorProduto[nome].qtd += qtd;
                vendasPorProduto[nome].receita += (item.preco || 0) * qtd;
                const prod = catalogo.find(p => p.nome === nome);
                if (prod) vendasPorProduto[nome].custo += extrairValorNumerico(prod.custo) * qtd;
                else vendasPorProduto[nome].custo += (item.preco || 0) * qtd * 0.6;
            });
        }
    });

    const tbody = document.getElementById('corpoTabelaProdutos');
    if (!tbody) return;
    tbody.innerHTML = '';
    catalogo.forEach(prod => {
        const info = vendasPorProduto[prod.nome] || { qtd: 0, receita: 0, custo: 0 };
        const receita = info.receita;
        const custo = info.custo;
        const lucro = receita - custo;
        const margem = receita > 0 ? (lucro / receita) * 100 : 0;
        const estoque = prod.estoque || 0;
        const estoqueBaixo = estoque <= 5 ? 'background:#ffe0e0;' : '';
        const idCurto = prod.id ? String(prod.id).substring(0, 8) : 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px; font-weight:600;">${idCurto}</td>
            <td style="padding:8px;">${prod.nome}</td>
            <td style="padding:8px; text-align:center;">${info.qtd}</td>
            <td style="padding:8px; text-align:right;">${receita.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right;">${custo.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right; color:#27ae60;">${lucro.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:center;">${margem.toFixed(1)}%</td>
            <td style="padding:8px; text-align:center; ${estoqueBaixo}">${estoque}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarContabilidade() {
    const receita = todasVendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const custo = todasVendas.reduce((acc, v) => acc + calcularCustoDaVenda(v), 0);
    const lucro = receita - custo;
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;

    setText('contReceita', receita.toLocaleString('pt-AO') + ' Kz');
    setText('contCusto', custo.toLocaleString('pt-AO') + ' Kz');
    setText('contLucro', lucro.toLocaleString('pt-AO') + ' Kz');
    setText('contMargem', margem.toFixed(1) + '%');

    const tbody = document.getElementById('corpoLancamentos');
    if (!tbody) return;
    tbody.innerHTML = '';
    const vendasOrdenadas = [...todasVendas].sort((a,b) => {
        const da = parseDataHora(a.data_hora);
        const db = parseDataHora(b.data_hora);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    }).slice(0,20);
    vendasOrdenadas.forEach(v => {
        const lucroVenda = calcularLucroVenda(v);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${v.data_hora}</td>
            <td style="padding:8px;">${v.nome_cliente}</td>
            <td style="padding:8px; font-size:11px;">${v.produtos_resumo || ''}</td>
            <td style="padding:8px; text-align:right;">${(v.valor_total||0).toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right;">${calcularCustoDaVenda(v).toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right; color:#27ae60;">${lucroVenda.toLocaleString('pt-AO')}</td>
        `;
        tbody.appendChild(tr);
    });

    renderizarGraficoMargemMensal();
    renderizarGraficoTopLucro();
}

function renderizarGraficoMargemMensal() {
    const resumo = {};
    todasVendas.forEach(v => {
        const data = parseDataHora(v.data_hora);
        if (!data) return;
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const key = `${ano}-${mes}`;
        if (!resumo[key]) resumo[key] = { mes, ano, faturamento: 0, lucro: 0 };
        resumo[key].faturamento += v.valor_total || 0;
        resumo[key].lucro += calcularLucroVenda(v);
    });
    const keys = Object.keys(resumo).sort();
    const ctx = document.getElementById('graficoMargemMensal');
    if (!ctx) return;
    const labels = keys.map(k => {
        const [ano, mes] = k.split('-');
        return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mes] + ' ' + ano;
    });
    const margens = keys.map(k => {
        const info = resumo[k];
        return info.faturamento > 0 ? (info.lucro / info.faturamento) * 100 : 0;
    });
    if (labels.length === 0) return;

    if (typeof Chart !== 'undefined') {
        if (graficos.margem) graficos.margem.destroy();
        graficos.margem = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 'Margem (%)', data: margens, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.2)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}

function renderizarGraficoTopLucro() {
    const lucroPorProduto = {};
    todasVendas.forEach(venda => {
        if (venda.itens && Array.isArray(venda.itens)) {
            venda.itens.forEach(item => {
                const nome = item.nome;
                const qtd = item.quantidade || 1;
                const prod = catalogo.find(p => p.nome === nome);
                const custo = prod ? extrairValorNumerico(prod.custo) : (item.preco || 0) * 0.6;
                const receita = (item.preco || 0) * qtd;
                if (!lucroPorProduto[nome]) lucroPorProduto[nome] = 0;
                lucroPorProduto[nome] += receita - custo * qtd;
            });
        }
    });
    const top = Object.entries(lucroPorProduto).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const ctx = document.getElementById('graficoTopLucro');
    if (!ctx) return;
    if (top.length === 0) return;

    if (typeof Chart !== 'undefined') {
        if (graficos.topLucro) graficos.topLucro.destroy();
        graficos.topLucro = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top.map(p => p[0]),
                datasets: [{ label: 'Lucro (Kz)', data: top.map(p => p[1]), backgroundColor: '#27ae60' }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}

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

// ===================== EXPORTAÇÕES =====================
function exportarPDF(tipo) {
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
        alert('Biblioteca jsPDF não carregada.');
        return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(0, 90, 76);
    doc.text('Relatório de Vendas - Aurora Comercial', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

    let dados = [];
    let head = [];
    let startY = 35;

    if (tipo === 'dashboard') {
        head = [['Data', 'Pedidos', 'Faturamento', 'Custo', 'Lucro', 'Margem']];
        const resumo = {};
        todasVendas.forEach(v => {
            const data = parseDataHora(v.data_hora);
            if (!data) return;
            const dataStr = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
            if (!resumo[dataStr]) resumo[dataStr] = { total: 0, faturamento: 0, custo: 0, lucro: 0 };
            resumo[dataStr].total++;
            resumo[dataStr].faturamento += v.valor_total || 0;
            resumo[dataStr].custo += calcularCustoDaVenda(v);
            resumo[dataStr].lucro += calcularLucroVenda(v);
        });
        Object.keys(resumo).sort().forEach(d => {
            const info = resumo[d];
            const margem = info.faturamento > 0 ? (info.lucro / info.faturamento) * 100 : 0;
            const [ano, mes, dia] = d.split('-');
            dados.push([`${dia}/${mes}/${ano}`, info.total, info.faturamento.toLocaleString('pt-AO')+' Kz', info.custo.toLocaleString('pt-AO')+' Kz', info.lucro.toLocaleString('pt-AO')+' Kz', margem.toFixed(1)+'%']);
        });
    } else if (tipo === 'produtos') {
        head = [['ID', 'Produto', 'Qtd', 'Receita', 'Custo', 'Lucro', 'Margem']];
        const vendasPorProduto = {};
        todasVendas.forEach(venda => {
            if (venda.itens) {
                venda.itens.forEach(item => {
                    const nome = item.nome;
                    if (!vendasPorProduto[nome]) vendasPorProduto[nome] = { qtd: 0, receita: 0, custo: 0 };
                    vendasPorProduto[nome].qtd += item.quantidade || 1;
                    vendasPorProduto[nome].receita += (item.preco || 0) * (item.quantidade || 1);
                    const prod = catalogo.find(p => p.nome === nome);
                    if (prod) vendasPorProduto[nome].custo += extrairValorNumerico(prod.custo) * (item.quantidade || 1);
                });
            }
        });
        catalogo.forEach(prod => {
            const info = vendasPorProduto[prod.nome] || { qtd: 0, receita: 0, custo: 0 };
            const lucro = info.receita - info.custo;
            const margem = info.receita > 0 ? (lucro / info.receita) * 100 : 0;
            const idCurto = prod.id ? String(prod.id).substring(0, 8) : 'N/A';
            dados.push([idCurto, prod.nome, info.qtd, info.receita.toLocaleString('pt-AO')+' Kz', info.custo.toLocaleString('pt-AO')+' Kz', lucro.toLocaleString('pt-AO')+' Kz', margem.toFixed(1)+'%']);
        });
    }

    doc.autoTable({
        startY: startY,
        head: head,
        body: dados,
        headStyles: { fillColor: [0, 90, 76], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 }
    });
    doc.save(`Relatorio_${tipo}.pdf`);
}

function exportarExcel(tipo) {
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca XLSX não carregada.');
        return;
    }
    let dados = [];
    let headers = [];

    if (tipo === 'dashboard') {
        headers = ['Data', 'Pedidos', 'Faturamento', 'Custo', 'Lucro', 'Margem'];
        const resumo = {};
        todasVendas.forEach(v => {
            const data = parseDataHora(v.data_hora);
            if (!data) return;
            const dataStr = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
            if (!resumo[dataStr]) resumo[dataStr] = { total: 0, faturamento: 0, custo: 0, lucro: 0 };
            resumo[dataStr].total++;
            resumo[dataStr].faturamento += v.valor_total || 0;
            resumo[dataStr].custo += calcularCustoDaVenda(v);
            resumo[dataStr].lucro += calcularLucroVenda(v);
        });
        Object.keys(resumo).sort().forEach(d => {
            const info = resumo[d];
            const margem = info.faturamento > 0 ? (info.lucro / info.faturamento) * 100 : 0;
            const [ano, mes, dia] = d.split('-');
            dados.push([`${dia}/${mes}/${ano}`, info.total, info.faturamento, info.custo, info.lucro, margem.toFixed(1)+'%']);
        });
    } else if (tipo === 'produtos') {
        headers = ['ID', 'Produto', 'Qtd', 'Receita', 'Custo', 'Lucro', 'Margem'];
        const vendasPorProduto = {};
        todasVendas.forEach(venda => {
            if (venda.itens) {
                venda.itens.forEach(item => {
                    const nome = item.nome;
                    if (!vendasPorProduto[nome]) vendasPorProduto[nome] = { qtd: 0, receita: 0, custo: 0 };
                    vendasPorProduto[nome].qtd += item.quantidade || 1;
                    vendasPorProduto[nome].receita += (item.preco || 0) * (item.quantidade || 1);
                    const prod = catalogo.find(p => p.nome === nome);
                    if (prod) vendasPorProduto[nome].custo += extrairValorNumerico(prod.custo) * (item.quantidade || 1);
                });
            }
        });
        catalogo.forEach(prod => {
            const info = vendasPorProduto[prod.nome] || { qtd: 0, receita: 0, custo: 0 };
            const lucro = info.receita - info.custo;
            const margem = info.receita > 0 ? (lucro / info.receita) * 100 : 0;
            const idCurto = prod.id ? String(prod.id).substring(0, 8) : 'N/A';
            dados.push([idCurto, prod.nome, info.qtd, info.receita, info.custo, lucro, margem.toFixed(1)+'%']);
        });
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dados]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
    XLSX.writeFile(wb, `Relatorio_${tipo}.xlsx`);
}