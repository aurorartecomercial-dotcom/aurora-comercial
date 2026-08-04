import { extrairValorNumerico } from './utils.js';
import { CONFIG } from './config.js';

let todasVendas = [];
let catalogo = [];
let graficoVendas = null;
let graficoProdutos = null;

document.addEventListener('DOMContentLoaded', () => {
    // Login
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

    senhaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnLogin.click();
    });

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

        if (!resVendas.ok) {
            throw new Error(`Erro nas Vendas: ${resVendas.status} - ${resVendas.statusText}`);
        }

        const dataVendas = await resVendas.json();
        todasVendas = (dataVendas && Array.isArray(dataVendas.record)) ? dataVendas.record : [];

        const resProdutos = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Master-Key': CONFIG.MASTER_KEY }
        });

        if (!resProdutos.ok) {
            throw new Error(`Erro nos Produtos: ${resProdutos.status} - ${resProdutos.statusText}`);
        }

        const dataProdutos = await resProdutos.json();
        catalogo = dataProdutos.record || [];

        gerarRelatorio('semana');
    } catch (e) {
        console.error('ERRO DETALHADO:', e);
        if (erroDiv) {
            erroDiv.style.display = 'block';
            erroDiv.style.color = '#E74C3C';
            erroDiv.style.fontWeight = 'bold';
            erroDiv.style.margin = '20px 0';
            erroDiv.style.padding = '10px';
            erroDiv.style.background = '#fde8e8';
            erroDiv.style.borderRadius = '8px';
            erroDiv.innerHTML = `❌ <strong>ERRO:</strong> ${e.message}`;
        }
    }
}

function gerarRelatorio(periodo) {
    const agora = new Date();
    let vendasFiltradas = [];

    if (periodo === 'semana') {
        const inicioSemana = new Date(agora);
        inicioSemana.setDate(agora.getDate() - agora.getDay());
        vendasFiltradas = todasVendas.filter(v => {
            const data = new Date(v.dataHora.split(' ')[0].split('/').reverse().join('-'));
            return data >= inicioSemana;
        });
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

    document.getElementById('kpiFaturamento').textContent = faturamento.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiPedidos').textContent = pedidos;
    document.getElementById('kpiItens').textContent = itensVendidos;
    document.getElementById('kpiEstoque').textContent = estoqueTotal;

    // Tabela de Produtos
    const vendasPorProduto = {};
    vendasFiltradas.forEach(venda => {
        const produtos = venda.produtosResumo.split(', ');
        produtos.forEach(item => {
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
        const estoqueRestante = prod.estoque || 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${prod.nome}</td>
            <td style="padding:8px; text-align:center;">${qtdVendida}</td>
            <td style="padding:8px; text-align:right;">${totalVendido.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:center;">${desconto}%</td>
            <td style="padding:8px; text-align:center;">${estoqueRestante}</td>
        `;
        corpoTabela.appendChild(tr);
    });

    // Tabela de Pedidos com Clientes
    const corpoTabelaPedidos = document.getElementById('corpoTabelaPedidos');
    corpoTabelaPedidos.innerHTML = '';
    vendasFiltradas.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${v.dataHora}</td>
            <td style="padding:8px; font-weight:600;">${v.nomeCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.telefoneCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.nifCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.moradaCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.produtosResumo}</td>
            <td style="padding:8px; color:#25D366; font-weight:bold;">${(v.valorTotal || 0).toLocaleString('pt-AO')} Kz</td>
        `;
        corpoTabelaPedidos.appendChild(tr);
    });

    // Gráficos
    const vendasPorDia = {};
    vendasFiltradas.forEach(v => {
        const dia = v.dataHora.split(' ')[0];
        vendasPorDia[dia] = (vendasPorDia[dia] || 0) + v.valorTotal;
    });

    const dias = Object.keys(vendasPorDia);
    const valores = Object.values(vendasPorDia);

    if (graficoVendas) graficoVendas.destroy();
    graficoVendas = new Chart(document.getElementById('graficoVendas'), {
        type: 'bar',
        data: {
            labels: dias,
            datasets: [{
                label: 'Faturamento (Kz)',
                data: valores,
                backgroundColor: 'rgba(0, 90, 76, 0.7)',
                borderColor: '#005A4C',
                borderWidth: 1
            }]
        }
    });

    const topProdutos = Object.entries(vendasPorProduto).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (graficoProdutos) graficoProdutos.destroy();
    graficoProdutos = new Chart(document.getElementById('graficoProdutos'), {
        type: 'pie',
        data: {
            labels: topProdutos.map(p => p[0]),
            datasets: [{
                data: topProdutos.map(p => p[1]),
                backgroundColor: ['#D4AF37', '#005A4C', '#E74C3C', '#3498DB', '#2ECC71']
            }]
        }
    });
}

async function limparHistorico() {
    if (!confirm('Tem certeza que deseja apagar TODO o histórico?')) return;
    const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': CONFIG.MASTER_KEY_VENDAS
        },
        body: JSON.stringify([])
    });
    if (res.ok) {
        todasVendas = [];
        gerarRelatorio('semana');
        alert('Histórico limpo!');
    } else {
        alert('Erro ao limpar.');
    }
}

// ============================================================
// EXPORTAR PDF (AGORA COM AS DUAS TABELAS)
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

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(corEsmeralda);
    doc.text(faturamento, 70, 72, { align: 'right' });
    doc.text(pedidos, 160, 72, { align: 'right' });
    doc.text(itens, 70, 82, { align: 'right' });
    doc.text(estoque, 160, 82, { align: 'right' });

    let yGrafico = 100; // Posição Y inicial dos gráficos

    const canvasVendas = document.getElementById('graficoVendas');
    if (canvasVendas) {
        const imgVendas = canvasVendas.toDataURL('image/png');
        doc.addImage(imgVendas, 'PNG', 15, yGrafico, 85, 45);
    }

    const canvasProdutos = document.getElementById('graficoProdutos');
    if (canvasProdutos) {
        const imgProdutos = canvasProdutos.toDataURL('image/png');
        doc.addImage(imgProdutos, 'PNG', 110, yGrafico, 85, 45);
    }

    yGrafico += 55; // Avança para a tabela

    // Tabela 1: Produtos
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

    // Tabela 2: Pedidos com Clientes
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

// ============================================================
// EXPORTAR EXCEL (AGORA COM 3 ABAS: Resumo, Produtos e Pedidos)
// ============================================================
function exportarExcel() {
    // Aba 1: Produtos
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

    // Aba 2: KPIs
    const kpis = [
        ['Indicador', 'Valor'],
        ['Faturamento Total', document.getElementById('kpiFaturamento').textContent],
        ['Pedidos Realizados', document.getElementById('kpiPedidos').textContent],
        ['Itens Vendidos', document.getElementById('kpiItens').textContent],
        ['Estoque Restante', document.getElementById('kpiEstoque').textContent]
    ];

    // Aba 3: Pedidos com clientes
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