import { extrairValorNumerico } from './utils.js';
import { CONFIG } from './config.js';

let todasVendas = [];
let catalogo = [];
let graficoVendas = null;
let graficoProdutos = null;

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

    document.getElementById('btnRelatorioSemanal').addEventListener('click', () => gerarRelatorio('semana'));
    document.getElementById('btnRelatorioMensal').addEventListener('click', () => gerarRelatorio('mes'));
    document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
    document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
    document.getElementById('btnLimparHistorico').addEventListener('click', limparHistorico);
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
        todasVendas = (dataVendas && Array.isArray(dataVendas.record)) ? dataVendas.record : [];

        const resProdutos = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Master-Key': CONFIG.MASTER_KEY }
        });
        if (!resProdutos.ok) throw new Error(`Erro Produtos: ${resProdutos.status}`);
        const dataProdutos = await resProdutos.json();
        let serverData = dataProdutos.record;
        catalogo = Array.isArray(serverData) ? serverData : (serverData && serverData.data ? serverData.data : []);
        if (!Array.isArray(catalogo)) catalogo = [];

        gerarRelatorio('semana');
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

    if (periodo === 'semana') {
        const inicioSemana = new Date(agora);
        inicioSemana.setDate(agora.getDate() - agora.getDay());
        vendasFiltradas = todasVendas.filter(v => new Date(v.dataHora.split(' ')[0].split('/').reverse().join('-')) >= inicioSemana);
    } else {
        vendasFiltradas = todasVendas.filter(v => {
            const data = new Date(v.dataHora.split(' ')[0].split('/').reverse().join('-'));
            return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
        });
    }

    const faturamento = vendasFiltradas.reduce((acc, v) => acc + v.valorTotal, 0);
    const pedidos = vendasFiltradas.length;
    const itensVendidos = vendasFiltradas.reduce((acc, v) => acc + v.totalItens, 0);
    const estoqueTotal = catalogo.reduce((acc, p) => acc + (p.estoque || 0), 0);

    let descontoTotal = 0;
    vendasFiltradas.forEach(v => {
        v.produtosResumo.split(', ').forEach(item => {
            const nome = item.split(' (x')[0];
            const qtd = parseInt(item.split('(x')[1]) || 1;
            const prod = catalogo.find(p => p.nome === nome);
            if (prod && prod.precoAntigo) {
                const precoFinal = extrairValorNumerico(prod.preco);
                const precoAntigo = extrairValorNumerico(prod.precoAntigo);
                if (precoAntigo > precoFinal) descontoTotal += (precoAntigo - precoFinal) * qtd;
            }
        });
    });

    document.getElementById('kpiFaturamento').textContent = faturamento.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiPedidos').textContent = pedidos;
    document.getElementById('kpiItens').textContent = itensVendidos;
    document.getElementById('kpiEstoque').textContent = estoqueTotal;
    document.getElementById('kpiDesconto').textContent = descontoTotal.toLocaleString('pt-AO') + ' Kz';

    // Tabela Produtos
    const vendasPorProduto = {};
    vendasFiltradas.forEach(venda => {
        venda.produtosResumo.split(', ').forEach(item => {
            const nome = item.split(' (x')[0];
            const qtd = parseInt(item.split('(x')[1]) || 1;
            vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
        });
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

    // Tabela Pedidos + BOTÕES DE STATUS E PDF
    const corpoTabelaPedidos = document.getElementById('corpoTabelaPedidos');
    corpoTabelaPedidos.innerHTML = '';
    vendasFiltradas.forEach(v => {
        const tr = document.createElement('tr');
        const statusMap = { confirmado: '🟡 Confirmado', enviado: '🔵 Enviado', entregue: '🟢 Entregue' };
        tr.innerHTML = `
            <td style="padding:8px;">${v.dataHora}</td>
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

    // Gráficos
    const vendasPorDia = {};
    vendasFiltradas.forEach(v => { const dia = v.dataHora.split(' ')[0]; vendasPorDia[dia] = (vendasPorDia[dia] || 0) + v.valorTotal; });
    const dias = Object.keys(vendasPorDia);
    const valores = Object.values(vendasPorDia);
    if (graficoVendas) graficoVendas.destroy();
    if (dias.length > 0) {
        graficoVendas = new Chart(document.getElementById('graficoVendas'), { type: 'bar', data: { labels: dias, datasets: [{ label: 'Faturamento (Kz)', data: valores, backgroundColor: 'rgba(0, 90, 76, 0.7)', borderColor: '#005A4C', borderWidth: 1 }] } });
    } else { document.getElementById('graficoVendas').style.display = 'none'; }

    const topProdutos = Object.entries(vendasPorProduto).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (graficoProdutos) graficoProdutos.destroy();
    if (topProdutos.length > 0) {
        graficoProdutos = new Chart(document.getElementById('graficoProdutos'), { type: 'pie', data: { labels: topProdutos.map(p => p[0]), datasets: [{ data: topProdutos.map(p => p[1]), backgroundColor: ['#D4AF37', '#005A4C', '#E74C3C', '#3498DB', '#2ECC71'] }] } });
    } else { document.getElementById('graficoProdutos').style.display = 'none'; }
}

async function limparHistorico() {
    if (!confirm('Apagar TODO o histórico?')) return;
    const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS }, body: JSON.stringify([]) });
    if (res.ok) { todasVendas = []; gerarRelatorio('semana'); alert('Histórico limpo!'); } else alert('Erro ao limpar.');
}

// ============================================================
// BOTÃO DE ATUALIZAR STATUS (RASTREAMENTO)
// ============================================================
window.atualizarStatus = async function(codigoRastreio, novoStatus) {
    if(!codigoRastreio) return alert('Este pedido não tem código de rastreio.');
    if(!confirm(`Marcar ${codigoRastreio} como "${novoStatus === 'enviado' ? 'Enviado' : 'Entregue'}"?`)) return;

    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}/latest`, { headers: { 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS } });
        const data = await res.json();
        let historico = data.record || [];
        const index = historico.findIndex(v => v.codigoRastreio === codigoRastreio);
        if(index !== -1) {
            historico[index].status = novoStatus;
            await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS }, body: JSON.stringify(historico) });
            alert('Status atualizado! Recarregue a página de rastreio.');
            location.reload();
        } else alert('Pedido não encontrado.');
    } catch(e) { alert('Erro ao atualizar status: ' + e.message); }
};

// ============================================================
// EXPORTAÇÕES E PDFS COMPLETOS (CORRIGIDO)
// ============================================================
async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    const corOuro = '#D4AF37';
    const corEsmeralda = '#005A4C';
    const corTexto = '#333333';
    const corCinza = '#999999';

    // Logo
    try {
        const logoImg = new Image();
        logoImg.src = 'logo auro.png';
        await new Promise((resolve) => {
            logoImg.onload = () => {
                doc.addImage(logoImg, 'PNG', 15, 10, 20, 20);
                resolve();
            };
            logoImg.onerror = resolve;
        });
    } catch (e) {}

    doc.setFontSize(24);
    doc.setTextColor(corOuro);
    doc.setFont('helvetica', 'bold');
    doc.text('AURORA COMERCIAL', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor('#555555');
    doc.setFont('helvetica', 'normal');
    doc.text('NIF: 5000048151  |  Telefone: +244 925 328 181', 105, 28, { align: 'center' });
    doc.text('Relatorio de Vendas - ADMIN', 105, 36, { align: 'center' });
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 42, { align: 'center' });

    doc.setDrawColor(corOuro);
    doc.setLineWidth(0.8);
    doc.line(20, 48, 190, 48);

    const faturamento = document.getElementById('kpiFaturamento').textContent;
    const pedidos = document.getElementById('kpiPedidos').textContent;
    const itens = document.getElementById('kpiItens').textContent;
    const estoque = document.getElementById('kpiEstoque').textContent;
    const desconto = document.getElementById('kpiDesconto').textContent;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(corEsmeralda);
    doc.text('Resumo do Periodo', 20, 60);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(corTexto);

    doc.text('Faturamento Total:', 20, 72);
    doc.text('Pedidos Realizados:', 110, 72);
    doc.text('Itens Vendidos:', 20, 82);
    doc.text('Estoque Restante:', 110, 82);
    doc.text('Desconto Total:', 20, 92);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(corEsmeralda);
    doc.text(faturamento, 70, 72, { align: 'right' });
    doc.text(pedidos, 160, 72, { align: 'right' });
    doc.text(itens, 70, 82, { align: 'right' });
    doc.text(estoque, 160, 82, { align: 'right' });
    doc.text(desconto, 70, 92, { align: 'right' });

    let yGrafico = 105;

    const canvasVendas = document.getElementById('graficoVendas');
    if (canvasVendas && canvasVendas.style.display !== 'none') {
        const imgVendas = canvasVendas.toDataURL('image/png');
        doc.addImage(imgVendas, 'PNG', 15, yGrafico, 85, 45);
    }

    const canvasProdutos = document.getElementById('graficoProdutos');
    if (canvasProdutos && canvasProdutos.style.display !== 'none') {
        const imgProdutos = canvasProdutos.toDataURL('image/png');
        doc.addImage(imgProdutos, 'PNG', 110, yGrafico, 85, 45);
    }

    yGrafico += 55;

    const corpoTabela = document.getElementById('corpoTabelaRelatorio');
    const linhas = corpoTabela.querySelectorAll('tr');
    const body = [];
    linhas.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        body.push([
            cols[0].textContent,
            cols[1].textContent,
            cols[2].textContent,
            cols[3].textContent,
            cols[4].textContent
        ]);
    });

    doc.autoTable({
        startY: yGrafico + 10,
        head: [['Produto', 'Qtd', 'Total (Kz)', 'Desconto', 'Estoque']],
        body: body,
        theme: 'grid',
        headStyles: { 
            fillColor: corEsmeralda, 
            textColor: '#FFFFFF',
            fontSize: 9,
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 8,
            textColor: corTexto
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: 15, right: 15 }
    });

    const corpoTabelaPedidos = document.getElementById('corpoTabelaPedidos');
    const linhasPedidos = corpoTabelaPedidos.querySelectorAll('tr');
    const bodyPedidos = [];
    linhasPedidos.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        bodyPedidos.push([
            cols[0].textContent,
            cols[1].textContent,
            cols[2].textContent,
            cols[3].textContent,
            cols[4].textContent,
            cols[5].textContent,
            cols[6].textContent
        ]);
    });

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Data', 'Cliente', 'Telefone', 'NIF', 'Morada', 'Produtos', 'Total']],
        body: bodyPedidos,
        theme: 'grid',
        headStyles: { 
            fillColor: corOuro, 
            textColor: '#000000',
            fontSize: 8,
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 7,
            textColor: corTexto
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 30 },
            5: { cellWidth: 35 },
            6: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 10, right: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    const footerY = Math.min(finalY, 272);

    doc.setDrawColor(corOuro);
    doc.setLineWidth(0.5);
    doc.line(20, footerY, 190, footerY);

    doc.setFontSize(8);
    doc.setTextColor(corCinza);
    doc.setFont('helvetica', 'italic');
    doc.text('Relatorio gerado pelo sistema Aurora Comercial.', 105, footerY + 5, { align: 'center' });
    doc.text('Pagina 1 de 1', 105, footerY + 10, { align: 'center' });

    doc.save(`Relatorio_Vendas_Admin_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportarExcel() {
    const corpoTabela = document.getElementById('corpoTabelaRelatorio');
    const linhas = corpoTabela.querySelectorAll('tr');
    const dadosProdutos = [['Produto', 'Qtd Vendida', 'Total (Kz)', 'Desconto', 'Estoque']];
    linhas.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        dadosProdutos.push([
            cols[0].textContent,
            cols[1].textContent,
            cols[2].textContent,
            cols[3].textContent,
            cols[4].textContent
        ]);
    });

    const kpis = [
        ['Indicador', 'Valor'],
        ['Faturamento Total', document.getElementById('kpiFaturamento').textContent],
        ['Pedidos Realizados', document.getElementById('kpiPedidos').textContent],
        ['Itens Vendidos', document.getElementById('kpiItens').textContent],
        ['Estoque Restante', document.getElementById('kpiEstoque').textContent],
        ['Desconto Total', document.getElementById('kpiDesconto').textContent]
    ];

    const corpoTabelaPedidos = document.getElementById('corpoTabelaPedidos');
    const linhasPedidos = corpoTabelaPedidos.querySelectorAll('tr');
    const dadosPedidos = [['Data', 'Cliente', 'Telefone', 'NIF', 'Morada', 'Produtos', 'Total']];
    linhasPedidos.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        dadosPedidos.push([
            cols[0].textContent,
            cols[1].textContent,
            cols[2].textContent,
            cols[3].textContent,
            cols[4].textContent,
            cols[5].textContent,
            cols[6].textContent
        ]);
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dadosProdutos), 'Produtos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpis), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dadosPedidos), 'Pedidos');

    XLSX.writeFile(wb, `Relatorio_Vendas_Admin_${new Date().toISOString().split('T')[0]}.xlsx`);
}

window.gerarPDFCliente = function(nomeCliente, telefoneCliente, nifCliente, moradaCliente, produtosResumo, valorTotal, dataHora) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const verdeEscuro = '#005A4C'; const dourado = '#D4AF37';
    try {
        const logoImg = new Image(); logoImg.src = 'logo auro.png';
        logoImg.onload = () => doc.addImage(logoImg, 'PNG', 15, 10, 20, 20);
    } catch (e) {}
    doc.setFontSize(24); doc.setTextColor(dourado); doc.setFont('helvetica', 'bold'); doc.text('AURORA COMERCIAL', 105, 20, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor('#444'); doc.setFont('helvetica', 'normal'); doc.text('Contribuinte: 5000048151 | Tel: +244 925 328 181', 105, 28, { align: 'center' });
    doc.text('contacto@aurorarte.ao | Luanda - Angola', 105, 34, { align: 'center' });
    doc.setDrawColor(dourado); doc.setLineWidth(0.8); doc.line(20, 40, 190, 40);

    const numeroFatura = `FR-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${Math.floor(Math.random()*9999)}`;
    doc.setFontSize(10); doc.setTextColor('#333'); doc.setFont('helvetica', 'bold'); doc.text(`Nº: ${numeroFatura}`, 20, 48);
    doc.setFont('helvetica', 'normal'); doc.text(`Data: ${dataHora}`, 120, 48);

    let y = 58;
    doc.setFontSize(10); doc.text('Cliente:', 20, y); doc.setFont('helvetica', 'bold'); doc.text(nomeCliente || 'N/A', 50, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.text('Telefone:', 20, y); doc.setFont('helvetica', 'bold'); doc.text(telefoneCliente || 'N/A', 50, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.text('NIF:', 20, y); doc.setFont('helvetica', 'bold'); doc.text(nifCliente || 'N/A', 50, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.text('Morada:', 20, y); doc.setFont('helvetica', 'bold'); doc.text(moradaCliente || 'N/A', 50, y); y += 10;

    const itens = produtosResumo.split(', ').map(item => {
        const nome = item.split(' (x')[0]; const qtd = item.split('(x')[1] ? item.split('(x')[1].replace(')', '') : '1';
        return [nome, qtd];
    });
    const body = itens.map(i => [i[0], i[1]]);
    doc.autoTable({
        startY: y + 5, head: [['Descrição', 'Qtd']], body: body, theme: 'grid',
        headStyles: { fillColor: verdeEscuro, textColor: '#FFF', fontSize: 9, halign: 'center' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 30, halign: 'center' } },
        margin: { left: 20, right: 20 }
    });
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14); doc.setTextColor(verdeEscuro); doc.setFont('helvetica', 'bold'); doc.text(`Total a Pagar: ${valorTotal.toLocaleString('pt-AO')} Kz`, 190, finalY, { align: 'right' });
    doc.setFontSize(7); doc.setTextColor('#888'); doc.setFont('helvetica', 'italic'); doc.text('Processado por Sistema Validado - Aurora Comercial v1.0', 105, 280, { align: 'center' });
    doc.save(`Fatura_Aurora_${numeroFatura}.pdf`);
    alert('Fatura gerada com sucesso! Baixe o PDF e envie para o cliente.');
};

window.gerarPDFMotoboy = function(nomeCliente, telefoneCliente, nifCliente, moradaCliente, produtosResumo, valorTotal) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(22); doc.setTextColor('#D4AF37'); doc.setFont('helvetica', 'bold'); doc.text('ROTEIRO DE ENTREGA - AURORA', 105, 20, { align: 'center' });
    doc.setFontSize(12); doc.setTextColor('#000'); doc.setFont('helvetica', 'bold'); doc.text(`PEDIDO: #${new Date().getTime()}`, 105, 30, { align: 'center' });
    doc.setDrawColor('#D4AF37'); doc.setLineWidth(0.5); doc.line(20, 35, 190, 35);

    let y = 50;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('📦 DADOS DO CLIENTE', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.text(`Cliente: ${nomeCliente || 'N/A'}`, 20, y); y += 7;
    doc.text(`Telefone: ${telefoneCliente || 'N/A'}`, 20, y); y += 7;
    doc.text(`NIF: ${nifCliente || 'N/A'}`, 20, y); y += 10;
    doc.setFont('helvetica', 'bold'); doc.text('📍 MORADA DE ENTREGA', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); const morada = moradaCliente || 'Não informada';
    const linhasMorada = doc.splitTextToSize(morada, 160); doc.text(linhasMorada, 20, y); y += linhasMorada.length * 7 + 10;
    doc.setFont('helvetica', 'bold'); doc.text('📋 ITENS A ENTREGAR', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); const produtos = produtosResumo.split(', ');
    produtos.forEach(item => { doc.text(`• ${item}`, 25, y); y += 7; }); y += 6;
    doc.setFont('helvetica', 'bold'); doc.text('💰 VALOR A COBRAR:', 20, y); doc.text(`${valorTotal.toLocaleString('pt-AO')} Kz`, 100, y); y += 15;
    doc.setFont('helvetica', 'bold'); doc.setTextColor('#D4AF37'); doc.text('✔️ INSTRUÇÕES AO MOTOBOY', 20, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setTextColor('#000');
    doc.text('1. Ligue para o cliente antes de sair.', 25, y); y += 7;
    doc.text('2. Tire uma foto do pacote antes de entregar.', 25, y); y += 7;
    doc.text('3. Confirme o dinheiro antes de soltar o pacote.', 25, y); y += 7;
    doc.text('4. Envie uma foto do cliente com a encomenda.', 25, y); y += 7;
    doc.setFontSize(8); doc.setTextColor('#999'); doc.text('Documento interno - AURORA COMERCIAL', 105, 280, { align: 'center' });
    doc.save(`Roteiro_Entrega_${new Date().toISOString().slice(0,10)}.pdf`);
    alert('Roteiro gerado! Entregue o PDF ao motoboy ou imprima.');
};