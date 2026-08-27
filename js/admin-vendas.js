import { auth, db, CONFIG } from './config.js';
import { collection, getDocs, updateDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { extrairValorNumerico } from './utils.js';

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
    const emailInput = document.getElementById('emailVendas');
    const senhaInput = document.getElementById('senhaVendas');
    const erroLogin = document.getElementById('erroLoginVendas');

    btnLogin.addEventListener('click', async () => {
        try {
            await signInWithEmailAndPassword(auth, emailInput.value, senhaInput.value);
            loginDiv.style.display = 'none';
            conteudoDiv.style.display = 'block';
            carregarDados();
        } catch (error) {
            erroLogin.style.display = 'block';
            erroLogin.textContent = 'Credenciais inválidas';
        }
    });

    senhaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnLogin.click(); });

    document.getElementById('btnRelatorioTodos')?.addEventListener('click', () => gerarRelatorio('todos'));
    document.getElementById('btnRelatorioSemanal')?.addEventListener('click', () => gerarRelatorio('semana'));
    document.getElementById('btnRelatorioMensal')?.addEventListener('click', () => gerarRelatorio('mes'));
    document.getElementById('btnExportarPDF')?.addEventListener('click', exportarPDF);
});

async function carregarDados() {
    try {
        const vendasSnap = await getDocs(collection(db, 'vendas'));
        todasVendas = vendasSnap.docs.map(doc => doc.data());

        const produtosSnap = await getDocs(collection(db, 'produtos'));
        catalogo = produtosSnap.docs.map(doc => doc.data());

        gerarRelatorio('todos');
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        document.getElementById('erroMensagem').style.display = 'block';
        document.getElementById('erroMensagem').textContent = 'Erro: ' + e.message;
    }
}

function gerarRelatorio(periodo) {
    const agora = new Date();
    let vendasFiltradas = todasVendas;

    if (periodo === 'semana') {
        const inicioSemana = new Date(agora);
        inicioSemana.setDate(agora.getDate() - agora.getDay());
        vendasFiltradas = todasVendas.filter(v => {
            if (!v.dataHora) return false;
            const data = new Date(v.dataHora);
            return data >= inicioSemana;
        });
    } else if (periodo === 'mes') {
        vendasFiltradas = todasVendas.filter(v => {
            if (!v.dataHora) return false;
            const data = new Date(v.dataHora);
            return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
        });
    }

    // KPIs
    const faturamento = vendasFiltradas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const pedidos = vendasFiltradas.length;
    const itensVendidos = vendasFiltradas.reduce((acc, v) => acc + (v.totalItens || 0), 0);
    const estoqueTotal = catalogo.reduce((acc, p) => acc + (p.estoque || 0), 0);

    document.getElementById('kpiFaturamento').textContent = faturamento.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiPedidos').textContent = pedidos;
    document.getElementById('kpiItens').textContent = itensVendidos;
    document.getElementById('kpiEstoque').textContent = estoqueTotal;

    // Tabela de Pedidos (Clientes)
    const corpoTabelaPedidos = document.getElementById('corpoTabelaPedidos');
    corpoTabelaPedidos.innerHTML = '';

    vendasFiltradas.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${v.dataHora || 'N/A'}</td>
            <td style="padding:8px; font-weight:600;">${v.nomeCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.telefoneCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.nifCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.moradaCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.produtosResumo || 'N/A'}</td>
            <td style="padding:8px; color:#25D366; font-weight:bold;">${(v.valorTotal || 0).toLocaleString('pt-AO')} Kz</td>
            <td style="padding:8px; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; gap:4px;">
                    <span style="font-size:11px; font-weight:700;">${v.status === 'enviado' ? '🔵 Enviado' : v.status === 'entregue' ? '🟢 Entregue' : '🟡 Confirmado'}</span>
                </div>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'enviado')" style="background:#3498db; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🚚 Enviar</button>
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'entregue')" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">📦 Entregar</button>
                    <button onclick="window.imprimirFatura('${v.codigoRastreio || ''}')" style="background:#D4AF37; color:#000; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🖨️ Imprimir</button>
                </div>
            </td>
        `;
        corpoTabelaPedidos.appendChild(tr);
    });

    // Tabela de Detalhamento por Produto
    const vendasPorProduto = {};
    vendasFiltradas.forEach(venda => {
        if (venda.itens && Array.isArray(venda.itens)) {
            venda.itens.forEach(item => {
                const nome = item.nome;
                const qtd = item.quantidade || 1;
                vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
            });
        } else if (venda.produtosResumo) {
            venda.produtosResumo.split(', ').forEach(item => {
                const nome = item.split(' (x')[0];
                const qtd = parseInt(item.split('(x')[1]) || 1;
                vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
            });
        }
    });

    const corpoTabelaRelatorio = document.getElementById('corpoTabelaRelatorio');
    corpoTabelaRelatorio.innerHTML = '';
    catalogo.forEach(prod => {
        const qtdVendida = vendasPorProduto[prod.nome] || 0;
        const totalVendido = qtdVendida * (extrairValorNumerico(prod.preco) || 0);
        const desconto = prod.desconto ? parseInt(prod.desconto) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:8px;">${prod.nome}</td><td style="padding:8px; text-align:center;">${qtdVendida}</td><td style="padding:8px; text-align:right;">${totalVendido.toLocaleString('pt-AO')}</td><td style="padding:8px; text-align:center;">${desconto}%</td><td style="padding:8px; text-align:center;">${prod.estoque || 0}</td>`;
        corpoTabelaRelatorio.appendChild(tr);
    });

    // Renderizar todos os gráficos
    renderizarGraficoVendasPorDia(vendasFiltradas);
    renderizarGraficoProdutosMaisVendidos(vendasPorProduto);
    renderizarGraficoComparativoMensal(vendasFiltradas);
    renderizarGraficoMapaVendas(vendasFiltradas);
}

// ✅ FUNÇÃO PARA IMPRIMIR FATURA DO CLIENTE
window.imprimirFatura = async function(codigoRastreio) {
    if (!codigoRastreio) {
        alert('Este pedido não tem código de rastreio.');
        return;
    }
    try {
        const q = query(collection(db, 'vendas'), where('codigoRastreio', '==', codigoRastreio));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            alert('Pedido não encontrado.');
            return;
        }
        const venda = snapshot.docs[0].data();
        // Gerar PDF
        const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.setTextColor(0, 90, 76);
        doc.text('AURORA COMERCIAL', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Código de Rastreio: ${codigoRastreio}`, 20, 30);
        doc.text(`Data: ${venda.dataHora || 'N/A'}`, 20, 36);
        doc.text(`Cliente: ${venda.nomeCliente || 'N/A'}`, 20, 42);
        doc.text(`Telefone: ${venda.telefoneCliente || 'N/A'}`, 20, 48);
        doc.text(`NIF: ${venda.nifCliente || 'N/A'}`, 20, 54);
        doc.text(`Morada: ${venda.moradaCliente || 'N/A'}`, 20, 60);
        doc.text('----------------------------------------', 20, 66);

        let y = 72;
        doc.text('Produtos:', 20, y);
        y += 6;
        if (venda.itens && venda.itens.length) {
            venda.itens.forEach(item => {
                doc.text(`- ${item.nome} (x${item.quantidade}) - ${item.preco.toFixed(2)} Kz`, 20, y);
                y += 6;
            });
        } else if (venda.produtosResumo) {
            const itens = venda.produtosResumo.split(', ');
            itens.forEach(item => {
                doc.text(`- ${item}`, 20, y);
                y += 6;
            });
        }
        doc.text('----------------------------------------', 20, y + 6);
        doc.setFontSize(12);
        doc.setTextColor(0, 90, 76);
        doc.text(`Total: ${(venda.valorTotal || 0).toFixed(2)} Kz`, 20, y + 12);

        // Abrir PDF numa nova aba
        const pdfBlob = doc.output('blob');
        const urlBlob = URL.createObjectURL(pdfBlob);
        const win = window.open(urlBlob, '_blank');
        if (win) {
            setTimeout(() => win.print(), 300);
        } else {
            // Fallback download
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = `Fatura_${codigoRastreio}.pdf`;
            a.click();
        }
        setTimeout(() => URL.revokeObjectURL(urlBlob), 5000);
    } catch (e) {
        console.error('Erro ao imprimir fatura:', e);
        alert('Erro ao gerar fatura: ' + e.message);
    }
};

window.atualizarStatus = async function(codigoRastreio, novoStatus) {
    if(!codigoRastreio) return alert('Este pedido não tem código de rastreio.');
    if(!confirm(`Marcar ${codigoRastreio} como "${novoStatus === 'enviado' ? 'Enviado' : 'Entregue'}"?`)) return;
    try {
        const q = query(collection(db, 'vendas'), where('codigoRastreio', '==', codigoRastreio));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            await updateDoc(docRef, { status: novoStatus });
            alert('Status atualizado!');
            location.reload();
        } else {
            alert('Pedido não encontrado.');
        }
    } catch(e) { alert('Erro: ' + e.message); }
};

function renderizarGraficoVendasPorDia(vendasFiltradas) {
    const vendasPorDia = {};
    vendasFiltradas.forEach(v => {
        if (v.dataHora) {
            const dia = v.dataHora.split(' ')[0];
            vendasPorDia[dia] = (vendasPorDia[dia] || 0) + (v.valorTotal || 0);
        }
    });

    const dias = Object.keys(vendasPorDia);
    const valores = Object.values(vendasPorDia);

    const ctx = document.getElementById('graficoVendas');
    if (ctx) {
        if (graficoVendas) graficoVendas.destroy();
        if (dias.length > 0) {
            graficoVendas = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dias,
                    datasets: [{ label: 'Faturamento (Kz)', data: valores, backgroundColor: 'rgba(0, 90, 76, 0.7)', borderColor: '#005A4C', borderWidth: 1 }]
                },
                options: { responsive: true, maintainAspectRatio: false, aspectRatio: 2, scales: { y: { beginAtZero: true } } }
            });
        } else {
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        }
    }
}

function renderizarGraficoProdutosMaisVendidos(vendasPorProduto) {
    const topProdutos = Object.entries(vendasPorProduto)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const ctx = document.getElementById('graficoProdutos');
    if (ctx) {
        if (graficoProdutos) graficoProdutos.destroy();
        if (topProdutos.length > 0) {
            graficoProdutos = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: topProdutos.map(p => p[0]),
                    datasets: [{
                        data: topProdutos.map(p => p[1]),
                        backgroundColor: ['#D4AF37', '#005A4C', '#E74C3C', '#3498DB', '#2ECC71']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, aspectRatio: 2 }
            });
        } else {
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        }
    }
}

function renderizarGraficoComparativoMensal(vendasFiltradas) {
    const meses = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
    const dados = [0, 0, 0, 0, 0, 0];

    vendasFiltradas.forEach(v => {
        if (v.dataHora) {
            const data = new Date(v.dataHora);
            const mesIndex = data.getMonth();
            if (mesIndex >= 2 && mesIndex <= 7) {
                dados[mesIndex - 2] += (v.valorTotal || 0);
            }
        }
    });

    const ctx = document.getElementById('graficoComparativo');
    if (ctx) {
        if (graficoComparativo) graficoComparativo.destroy();
        graficoComparativo = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Vendas (Kz)',
                    data: dados,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, aspectRatio: 2 }
        });
    }
}

function renderizarGraficoMapaVendas(vendasFiltradas) {
    const regioes = ['Luanda', 'Benguela', 'Huambo', 'Lubango'];
    const dados = [0, 0, 0, 0];

    vendasFiltradas.forEach(v => {
        const morada = (v.moradaCliente || '').toLowerCase();
        if (morada.includes('luanda')) dados[0]++;
        else if (morada.includes('benguela')) dados[1]++;
        else if (morada.includes('huambo')) dados[2]++;
        else if (morada.includes('lubango')) dados[3]++;
    });

    const ctx = document.getElementById('graficoMapa');
    if (ctx) {
        if (graficoMapa) graficoMapa.destroy();
        graficoMapa = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: regioes,
                datasets: [{
                    label: 'Pedidos',
                    data: dados,
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
}

function exportarPDF() {
    const doc = new jspdf.jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0, 90, 76);
    doc.text('Relatório de Vendas - Aurora Comercial', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);
    doc.text(`Total de Pedidos: ${document.getElementById('kpiPedidos').textContent}`, 14, 32);
    doc.text(`Faturamento Total: ${document.getElementById('kpiFaturamento').textContent}`, 14, 38);

    const dadosProdutos = [];
    const vendasPorProduto = {};

    todasVendas.forEach(venda => {
        if (venda.itens && Array.isArray(venda.itens)) {
            venda.itens.forEach(item => {
                const nome = item.nome;
                const qtd = item.quantidade || 1;
                vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
            });
        } else if (venda.produtosResumo) {
            venda.produtosResumo.split(', ').forEach(item => {
                const nome = item.split(' (x')[0];
                const qtd = parseInt(item.split('(x')[1]) || 1;
                vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
            });
        }
    });

    catalogo.forEach(prod => {
        const qtdVendida = vendasPorProduto[prod.nome] || 0;
        const totalVendido = qtdVendida * (extrairValorNumerico(prod.preco) || 0);
        const desconto = prod.desconto ? parseInt(prod.desconto) : 0;
        dadosProdutos.push([prod.nome, qtdVendida, totalVendido.toLocaleString('pt-AO') + ' Kz', desconto + '%', prod.estoque || 0]);
    });

    doc.autoTable({
        startY: 45,
        head: [['Produto', 'Qtd Vendida', 'Total (Kz)', 'Desconto', 'Estoque']],
        body: dadosProdutos.length > 0 ? dadosProdutos : [['Sem produtos vendidos', '-', '-', '-', '-']],
        headStyles: { fillColor: [0, 90, 76], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' }
        }
    });

    doc.save('Relatorio_Vendas_Aurora.pdf');
}