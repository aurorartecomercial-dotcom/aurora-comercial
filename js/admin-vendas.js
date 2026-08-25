import { extrairValorNumerico } from './utils.js';
import { CONFIG } from './config.js';

let todasVendas = [];
let catalogo = [];
let graficoVendas = null;
let graficoProdutos = null;
let graficoComparativo = null;
let graficoMapa = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginVendas');
    const conteudoDiv = document.getElementById('conteudoVendas');
    const btnLogin = document.getElementById('btnLoginVendas');
    const senhaInput = document.getElementById('senhaVendas');
    const erroLogin = document.getElementById('erroLoginVendas');

    btnLogin.addEventListener('click', () => {
        if (senhaInput.value === CONFIG.ADMIN_SENHA) {
            loginDiv.style.display = 'none';
            conteudoDiv.style.display = 'block';
            carregarDados();
        } else {
            erroLogin.style.display = 'block';
        }
    });

    senhaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnLogin.click(); });

    document.getElementById('btnRelatorioTodos').addEventListener('click', () => gerarRelatorio('todos'));
    document.getElementById('btnRelatorioSemanal').addEventListener('click', () => gerarRelatorio('semana'));
    document.getElementById('btnRelatorioMensal').addEventListener('click', () => gerarRelatorio('mes'));
    document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
    document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
    document.getElementById('btnLimparHistorico').addEventListener('click', limparHistorico);

    // Filtro de cliente e status
    const filtroCliente = document.getElementById('filtroPedidoCliente');
    const filtroStatus = document.getElementById('filtroStatus');

    if (filtroCliente) {
        filtroCliente.addEventListener('input', () => {
            const termo = filtroCliente.value.toLowerCase();
            if (termo.trim() === '') {
                gerarRelatorio(document.getElementById('btnRelatorioAtivo')?.dataset?.periodo || 'todos');
                return;
            }
            const vendasFiltradas = todasVendas.filter(v => 
                (v.nomeCliente && v.nomeCliente.toLowerCase().includes(termo)) || 
                (v.codigoRastreio && v.codigoRastreio.toLowerCase().includes(termo))
            );
            renderizarPedidos(vendasFiltradas);
        });
    }

    if (filtroStatus) {
        filtroStatus.addEventListener('change', () => {
            const status = filtroStatus.value;
            const vendasFiltradas = todasVendas.filter(v => 
                status === 'todos' || v.status === status
            );
            renderizarPedidos(vendasFiltradas);
        });
    }
});

async function carregarDados() {
    const erroDiv = document.getElementById('erroMensagem');
    if (erroDiv) erroDiv.innerHTML = '';

    try {
        const resVendas = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}/latest`, {
            headers: { 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS }
        });
        if (!resVendas.ok) throw new Error(`Erro Vendas: ${resVendas.status}`);
        const dataVendas = await resVendas.json();

        let vendasRaw = dataVendas.record;
        if (vendasRaw && !Array.isArray(vendasRaw) && vendasRaw.data) vendasRaw = vendasRaw.data;
        todasVendas = Array.isArray(vendasRaw) ? vendasRaw : [];

        const resProdutos = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Master-Key': CONFIG.MASTER_KEY }
        });
        if (!resProdutos.ok) throw new Error(`Erro Produtos: ${resProdutos.status}`);
        const dataProdutos = await resProdutos.json();
        let serverData = dataProdutos.record;
        if (serverData && !Array.isArray(serverData) && serverData.data) serverData = serverData.data;
        catalogo = Array.isArray(serverData) ? serverData : [];

        gerarRelatorio('todos'); // Carrega todos por padrão
    } catch (e) {
        console.error('ERRO:', e);
        if (erroDiv) {
            erroDiv.style.display = 'block';
            erroDiv.style.color = '#E74C3C';
            erroDiv.innerHTML = `❌ <strong>ERRO:</strong> ${e.message}`;
        }
    }
}

function gerarRelatorio(periodo) {
    if (!Array.isArray(catalogo)) catalogo = [];
    const agora = new Date();
    let vendasFiltradas = [];

    // Definir período ativo para filtros (para reutilizar)
    document.querySelectorAll('.btn-admin[data-periodo]').forEach(btn => btn.classList.remove('ativo'));
    const btnAtivo = document.getElementById(`btnRelatorio${periodo.charAt(0).toUpperCase() + periodo.slice(1)}`);
    if (btnAtivo) {
        btnAtivo.classList.add('ativo');
        btnAtivo.dataset.periodo = periodo;
    }

    if (periodo === 'semana') {
        const inicioSemana = new Date(agora);
        inicioSemana.setDate(agora.getDate() - agora.getDay());
        vendasFiltradas = todasVendas.filter(v => {
            if (!v.dataHora) return false;
            const data = new Date(v.dataHora.split(' ')[0].split('/').reverse().join('-'));
            return data >= inicioSemana;
        });
    } else if (periodo === 'mes') {
        vendasFiltradas = todasVendas.filter(v => {
            if (!v.dataHora) return false;
            const data = new Date(v.dataHora.split(' ')[0].split('/').reverse().join('-'));
            return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
        });
    } else {
        vendasFiltradas = todasVendas;
    }

    const faturamento = vendasFiltradas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const pedidos = vendasFiltradas.length;
    const itensVendidos = vendasFiltradas.reduce((acc, v) => acc + (v.totalItens || 0), 0);
    const estoqueTotal = catalogo.reduce((acc, p) => acc + (p.estoque || 0), 0);

    let descontoTotal = 0;
    let lucroTotal = 0;
    
    vendasFiltradas.forEach(v => {
        if (v.produtosResumo) {
            const itens = v.produtosResumo.split(', ');
            itens.forEach(item => {
                const nome = item.split(' (x')[0];
                const qtd = parseInt(item.split('(x')[1]) || 1;
                const prod = catalogo.find(p => p.nome === nome);
                if (prod) {
                    const precoFinal = extrairValorNumerico(prod.preco);
                    const precoAntigo = prod.precoAntigo ? extrairValorNumerico(prod.precoAntigo) : precoFinal;
                    const custo = prod.custo ? extrairValorNumerico(prod.custo) : 0;
                    if (precoAntigo > precoFinal) descontoTotal += (precoAntigo - precoFinal) * qtd;
                    lucroTotal += (precoFinal - custo) * qtd;
                }
            });
        }
    });

    document.getElementById('kpiFaturamento').textContent = faturamento.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiPedidos').textContent = pedidos;
    document.getElementById('kpiItens').textContent = itensVendidos;
    document.getElementById('kpiEstoque').textContent = estoqueTotal;
    document.getElementById('kpiDesconto').textContent = descontoTotal.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiLucro').textContent = lucroTotal.toLocaleString('pt-AO') + ' Kz';

    // Tabela Produtos
    const vendasPorProduto = {};
    vendasFiltradas.forEach(venda => {
        if (venda.produtosResumo) {
            venda.produtosResumo.split(', ').forEach(item => {
                const nome = item.split(' (x')[0];
                const qtd = parseInt(item.split('(x')[1]) || 1;
                vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
            });
        }
    });
    const corpoTabela = document.getElementById('corpoTabelaRelatorio');
    corpoTabela.innerHTML = '';
    catalogo.forEach(prod => {
        const qtdVendida = vendasPorProduto[prod.nome] || 0;
        const totalVendido = qtdVendida * extrairValorNumerico(prod.preco);
        const desconto = prod.desconto ? parseInt(prod.desconto) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:8px;">${prod.nome}</td><td style="padding:8px; text-align:center;">${qtdVendida}</td><td style="padding:8px; text-align:right;">${totalVendido.toLocaleString('pt-AO')}</td><td style="padding:8px; text-align:center;">${desconto}%</td><td style="padding:8px; text-align:center;">${prod.estoque || 0}</td>`;
        corpoTabela.appendChild(tr);
    });

    // Tabela Pedidos
    renderizarPedidos(vendasFiltradas);

    // Gráficos com destruição antes de recriar
    const vendasPorDia = {};
    vendasFiltradas.forEach(v => { 
        if (v.dataHora) {
            const dia = v.dataHora.split(' ')[0]; 
            vendasPorDia[dia] = (vendasPorDia[dia] || 0) + (v.valorTotal || 0); 
        }
    });
    const dias = Object.keys(vendasPorDia);
    const valores = Object.values(vendasPorDia);

    if (graficoVendas) graficoVendas.destroy();
    if (dias.length > 0) {
        graficoVendas = new Chart(document.getElementById('graficoVendas'), { 
            type: 'bar', 
            data: { labels: dias, datasets: [{ label: 'Faturamento (Kz)', data: valores, backgroundColor: 'rgba(0, 90, 76, 0.7)', borderColor: '#005A4C', borderWidth: 1 }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                aspectRatio: 2,
                scales: { y: { beginAtZero: true } }
            }
        });
    } else {
        document.getElementById('graficoVendas').style.display = 'none';
        document.getElementById('graficoVendas').parentElement.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Sem dados para gráfico</p>';
    }

    const topProdutos = Object.entries(vendasPorProduto).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (graficoProdutos) graficoProdutos.destroy();
    if (topProdutos.length > 0) {
        graficoProdutos = new Chart(document.getElementById('graficoProdutos'), { 
            type: 'pie', 
            data: { labels: topProdutos.map(p => p[0]), datasets: [{ data: topProdutos.map(p => p[1]), backgroundColor: ['#D4AF37', '#005A4C', '#E74C3C', '#3498DB', '#2ECC71'] }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                aspectRatio: 2
            }
        });
    } else {
        document.getElementById('graficoProdutos').style.display = 'none';
        document.getElementById('graficoProdutos').parentElement.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Sem dados para gráfico</p>';
    }

    if (graficoComparativo) graficoComparativo.destroy();
    graficoComparativo = new Chart(document.getElementById('graficoComparativo'), {
        type: 'line',
        data: {
            labels: ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
            datasets: [{
                label: 'Vendas (Kz)',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            aspectRatio: 2
        }
    });

    if (graficoMapa) graficoMapa.destroy();
    graficoMapa = new Chart(document.getElementById('graficoMapa'), {
        type: 'bar',
        data: {
            labels: ['Luanda', 'Benguela', 'Huambo', 'Lubango'],
            datasets: [{
                label: 'Pedidos',
                data: [12, 5, 3, 2],
                backgroundColor: '#005A4C'
            }]
        },
        options: { 
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false,
            aspectRatio: 2
        }
    });
}

function renderizarPedidos(vendasFiltradas) {
    const corpoTabelaPedidos = document.getElementById('corpoTabelaPedidos');
    corpoTabelaPedidos.innerHTML = '';
    vendasFiltradas.forEach(v => {
        const tr = document.createElement('tr');
        const statusMap = { confirmado: '🟡 Confirmado', enviado: '🔵 Enviado', entregue: '🟢 Entregue' };
        tr.innerHTML = `
            <td style="padding:8px;">${v.dataHora || 'N/A'}</td>
            <td style="padding:8px; font-weight:600;">${v.nomeCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.telefoneCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.nifCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.moradaCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.produtosResumo}</td>
            <td style="padding:8px; color:#25D366; font-weight:bold;">${(v.valorTotal || 0).toLocaleString('pt-AO')} Kz</td>
            <td style="padding:8px; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; gap:4px;">
                    <span style="font-size:11px; font-weight:700;">${statusMap[v.status] || '🟡 Confirmado'}</span>
                </div>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'enviado')" style="background:#3498db; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🚚 Enviar</button>
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'entregue')" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">📦 Entregar</button>
                </div>
                <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:2px;">
                    <button onclick="window.gerarPDFCliente('${(v.nomeCliente || '').replace(/'/g, "\\'")}', '${(v.telefoneCliente || '').replace(/'/g, "\\'")}', '${(v.nifCliente || '').replace(/'/g, "\\'")}', '${(v.moradaCliente || '').replace(/'/g, "\\'")}', '${(v.produtosResumo || '').replace(/'/g, "\\'")}', ${v.valorTotal || 0}, '${(v.dataHora || '').replace(/'/g, "\\'")}')" style="background:#005A4C; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">📄 Fatura</button>
                    <button onclick="window.gerarPDFMotoboy('${(v.nomeCliente || '').replace(/'/g, "\\'")}', '${(v.telefoneCliente || '').replace(/'/g, "\\'")}', '${(v.nifCliente || '').replace(/'/g, "\\'")}', '${(v.moradaCliente || '').replace(/'/g, "\\'")}', '${(v.produtosResumo || '').replace(/'/g, "\\'")}', ${v.valorTotal || 0})" style="background:#D4AF37; color:#000; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🚚 Roteiro</button>
                </div>
            </td>
        `;
        corpoTabelaPedidos.appendChild(tr);
    });
}

async function limparHistorico() {
    if (!confirm('Apagar TODO o histórico?')) return;
    const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS }, 
        body: JSON.stringify([]) 
    });
    if (res.ok) { 
        todasVendas = []; 
        gerarRelatorio('todos'); 
        alert('Histórico limpo!'); 
    } else { 
        alert('Erro ao limpar.'); 
    }
}

window.atualizarStatus = async function(codigoRastreio, novoStatus) {
    if(!codigoRastreio) return alert('Este pedido não tem código de rastreio.');
    if(!confirm(`Marcar ${codigoRastreio} como "${novoStatus === 'enviado' ? 'Enviado' : 'Entregue'}"?`)) return;

    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}/latest`, { headers: { 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS } });
        const data = await res.json();
        let historico = data.record;
        if (historico && !Array.isArray(historico) && historico.data) historico = historico.data;
        if (!Array.isArray(historico)) historico = [];

        const index = historico.findIndex(v => v.codigoRastreio === codigoRastreio);
        if(index !== -1) {
            historico[index].status = novoStatus;
            const resPut = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS }, 
                body: JSON.stringify(historico) 
            });
            if (resPut.ok) {
                alert('Status atualizado!');
                location.reload();
            } else {
                alert('Erro ao atualizar status.');
            }
        } else alert('Pedido não encontrado.');
    } catch(e) { alert('Erro ao atualizar status: ' + e.message); }
};

// EXPORTAR PDF (Tabela de Produtos)
function exportarPDF() {
    const doc = new jspdf.jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Vendas - Aurora Comercial', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

    doc.autoTable({
        startY: 32,
        html: '#tabelaRelatorio',
        headStyles: { fillColor: [0, 90, 76] },
        styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total de Pedidos: ${document.getElementById('kpiPedidos').textContent}`, 14, finalY);
    doc.text(`Faturamento Total: ${document.getElementById('kpiFaturamento').textContent}`, 14, finalY + 6);

    doc.save('Relatorio_Vendas_Aurora.pdf');
}

// EXPORTAR EXCEL
function exportarExcel() {
    const tabela = document.getElementById('tabelaRelatorio');
    const ws = XLSX.utils.table_to_sheet(tabela);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, 'Relatorio_Vendas_Aurora.xlsx');
}

// GERAR PDF DO CLIENTE (Fatura)
window.gerarPDFCliente = function(nome, telefone, nif, morada, produtos, total, dataHora) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const verdeEscuro = [0, 90, 76];
    const dourado = [212, 175, 55];

    doc.setFontSize(20);
    doc.setTextColor(dourado[0], dourado[1], dourado[2]);
    doc.text('AURORA COMERCIAL', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor('#444');
    doc.text(`Data: ${dataHora}`, 14, 30);
    doc.text('Contribuinte: 5000048151 | Tel: +244 933 677 628', 105, 35, { align: 'center' });

    doc.setDrawColor(dourado[0], dourado[1], dourado[2]);
    doc.line(20, 40, 190, 40);

    doc.setFontSize(11);
    doc.setTextColor('#333');
    doc.text(`Nome: ${nome}`, 14, 50);
    doc.text(`Telefone: ${telefone}`, 14, 57);
    doc.text(`NIF: ${nif}`, 14, 64);
    doc.text(`Morada: ${morada}`, 14, 71);

    const body = produtos.split(', ').map(item => {
        const nome = item.split(' (x')[0];
        const qtd = parseInt(item.split('(x')[1]) || 1;
        const preco = extrairValorNumerico(item.split('-')[0]) || 0;
        return [nome, qtd.toString(), preco.toFixed(2), (preco * qtd).toFixed(2)];
    });

    doc.autoTable({
        startY: 80,
        head: [['Produto', 'Qtd', 'Preço Unit.', 'Subtotal']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: verdeEscuro },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.text(`Total: ${total.toLocaleString('pt-AO')} Kz`, 140, finalY, { align: 'right' });

    doc.save(`Fatura_${nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

// GERAR PDF DO MOTOBOY (Roteiro)
window.gerarPDFMotoboy = function(nome, telefone, nif, morada, produtos, total) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dourado = [212, 175, 55];

    doc.setFontSize(16);
    doc.setTextColor(dourado[0], dourado[1], dourado[2]);
    doc.text('ROTEIRO DE ENTREGA - AURORA COMERCIAL', 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor('#333');
    doc.text(`Cliente: ${nome}`, 14, 35);
    doc.text(`Telefone: ${telefone}`, 14, 42);
    doc.text(`Morada: ${morada}`, 14, 49);
    doc.text(`NIF: ${nif}`, 14, 56);
    doc.text(`Valor: ${total.toLocaleString('pt-AO')} Kz`, 14, 63);
    doc.text(`Produtos: ${produtos}`, 14, 70);

    doc.setFontSize(12);
    doc.setTextColor(0, 90, 76);
    doc.text('Instruções:', 14, 85);
    doc.setFontSize(10);
    doc.text('1. Confirmar identidade do cliente', 14, 92);
    doc.text('2. Verificar pagamento', 14, 99);
    doc.text('3. Entregar produtos', 14, 106);
    doc.text('4. Obter assinatura de recebimento', 14, 113);

    doc.save(`Roteiro_${nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};