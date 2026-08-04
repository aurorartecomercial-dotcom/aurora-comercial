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
    document.getElementById('btnLimparHistorico').addEventListener('click', limparHistorico);
});

async function carregarDados() {
    try {
        // Carregar vendas do JSONbin
        const resVendas = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}/latest`, {
            headers: { 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS }
        });
        const dataVendas = await resVendas.json();
        todasVendas = dataVendas.record || [];

        // Carregar catálogo do JSONbin (CORRIGIDO: BIN_ID em vez de BIN_ID_PRODUTOS)
        const resProdutos = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Master-Key': CONFIG.MASTER_KEY }
        });
        const dataProdutos = await resProdutos.json();
        catalogo = dataProdutos.record || [];

        gerarRelatorio('semana');
    } catch (e) {
        alert('Erro ao carregar dados. Verifique sua conexão.');
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
    if (!confirm('Tem certeza que deseja apagar TODO o histórico de vendas?')) return;
    
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
        alert('Histórico limpo com sucesso!');
    } else {
        alert('Erro ao limpar histórico.');
    }
}

async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    const corOuro = '#D4AF37';
    const corEsmeralda = '#005A4C';
    const corTexto = '#333333';
    const corCinza = '#999999';

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
    doc.text('Relatório de Vendas - ADMIN', 105, 36, { align: 'center' });
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
    doc.text('📊 Resumo do Período', 20, 60);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(corTexto);

    doc.text('💰 Faturamento Total', 20, 72);
    doc.text('📦 Pedidos Realizados', 110, 72);
    doc.text('🛒 Itens Vendidos', 20, 82);
    doc.text('📦 Estoque Restante', 110, 82);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(corEsmeralda);
    doc.text(faturamento, 70, 72, { align: 'right' });
    doc.text(pedidos, 160, 72, { align: 'right' });
    doc.text(itens, 70, 82, { align: 'right' });
    doc.text(estoque, 160, 82, { align: 'right' });

    const corpoTabela = document.getElementById('corpoTabelaRelatorio');
    const linhas = corpoTabela.querySelectorAll('tr');
    const produtosGrafico = [];
    const vendasGrafico = [];

    linhas.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const nome = cols[0].textContent;
        const qtd = parseInt(cols[1].textContent);
        if (qtd > 0) {
            produtosGrafico.push(nome);
            vendasGrafico.push(qtd);
        }
    });

    const top5 = produtosGrafico.map((nome, i) => ({ nome, qtd: vendasGrafico[i] }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5);

    if (top5.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(corEsmeralda);
        doc.text('📈 Top 5 Produtos Mais Vendidos', 20, 98);

        const yStart = 108;
        const maxWidth = 140;
        const maxQtd = top5[0]?.qtd || 1;
        const barHeight = 6;
        const rowHeight = 10;

        top5.forEach((item, index) => {
            const y = yStart + index * rowHeight;
            const percent = (item.qtd / maxQtd) * maxWidth;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(corTexto);
            doc.text(item.nome, 20, y + 5);

            doc.setFillColor(corOuro);
            doc.rect(75, y, percent, barHeight, 'F');
            
            doc.setFontSize(8);
            doc.setTextColor('#FFFFFF');
            doc.text(item.qtd.toString(), 75 + percent - 5, y + 5, { align: 'right' });
        });

        var yGrafico = yStart + top5.length * rowHeight + 10;
    } else {
        var yGrafico = 98;
    }

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

    const finalY = doc.lastAutoTable.finalY + 15;
    const footerY = Math.min(finalY, 272);

    doc.setDrawColor(corOuro);
    doc.setLineWidth(0.5);
    doc.line(20, footerY, 190, footerY);

    doc.setFontSize(8);
    doc.setTextColor(corCinza);
    doc.setFont('helvetica', 'italic');
    doc.text('Relatório gerado automaticamente pelo sistema Aurora Comercial.', 105, footerY + 5, { align: 'center' });
    doc.text('Página 1 de 1', 105, footerY + 10, { align: 'center' });

    if (finalY < 250) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(corTexto);
        doc.text('____________________________________', 105, finalY + 30, { align: 'center' });
        doc.text('Assinatura do Administrador', 105, finalY + 38, { align: 'center' });
    }

    doc.save(`Relatorio_Vendas_Admin_${new Date().toISOString().split('T')[0]}.pdf`);
}