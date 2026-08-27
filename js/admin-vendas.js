import { auth, db } from './config.js';
import { collection, getDocs, updateDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { extrairValorNumerico } from './utils.js';

let todasVendas = [];
let catalogo = [];
let graficoVendas = null;
let graficoProdutos = null;

// Estado dos filtros atuais
let filtroAtual = {
    mes: '',
    semana: '',
    dia: '',
    dataInicio: '',
    dataFim: ''
};

function chartDisponivel() {
    return typeof Chart !== 'undefined';
}

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

    // Botões rápidos
    document.getElementById('btnRelatorioTodos').addEventListener('click', () => {
        limparFiltros();
        gerarRelatorio('todos');
    });
    document.getElementById('btnRelatorioSemanal').addEventListener('click', () => gerarRelatorio('semana'));
    document.getElementById('btnRelatorioMensal').addEventListener('click', () => gerarRelatorio('mes'));

    // Filtros específicos
    document.getElementById('btnAplicarFiltro').addEventListener('click', () => {
        filtroAtual.mes = document.getElementById('selectMes').value;
        filtroAtual.semana = document.getElementById('selectSemana').value;
        filtroAtual.dia = document.getElementById('inputDia').value;
        gerarRelatorioComFiltros();
    });

    document.getElementById('btnLimparFiltro').addEventListener('click', () => {
        document.getElementById('selectMes').value = '';
        document.getElementById('selectSemana').value = '';
        document.getElementById('inputDia').value = '';
        filtroAtual = { mes: '', semana: '', dia: '', dataInicio: '', dataFim: '' };
        gerarRelatorio('todos');
    });

    // Período personalizado
    document.getElementById('btnAplicarPeriodo').addEventListener('click', () => {
        filtroAtual.dataInicio = document.getElementById('dataInicio').value;
        filtroAtual.dataFim = document.getElementById('dataFim').value;
        gerarRelatorioComFiltros();
    });

    document.getElementById('btnLimparPeriodo').addEventListener('click', () => {
        document.getElementById('dataInicio').value = '';
        document.getElementById('dataFim').value = '';
        filtroAtual.dataInicio = '';
        filtroAtual.dataFim = '';
        gerarRelatorio('todos');
    });

    document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
    document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
    document.getElementById('btnLimparHistorico').addEventListener('click', limparFiltros);
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

// Função principal para gerar relatório com período básico
function gerarRelatorio(periodo) {
    let vendasFiltradas = todasVendas;
    const agora = new Date();

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

    document.getElementById('tabelaDiasMensal').style.display = 'none';
    renderizarTudo(vendasFiltradas);
}

// Função para gerar relatório com filtros específicos (mês, semana, dia, período)
function gerarRelatorioComFiltros() {
    let vendasFiltradas = todasVendas.filter(v => {
        if (!v.dataHora) return false;
        const data = new Date(v.dataHora);

        // Filtro por mês (0-11)
        if (filtroAtual.mes !== '') {
            if (data.getMonth() !== parseInt(filtroAtual.mes)) return false;
        }

        // Filtro por semana do mês (1-5)
        if (filtroAtual.semana !== '') {
            const diaMes = data.getDate();
            const semanaCalculada = Math.floor((diaMes - 1) / 7) + 1;
            if (semanaCalculada !== parseInt(filtroAtual.semana)) return false;
        }

        // Filtro por dia específico (YYYY-MM-DD)
        if (filtroAtual.dia !== '') {
            const dataStr = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
            if (dataStr !== filtroAtual.dia) return false;
        }

        // Filtro por período personalizado (dataInicio e dataFim)
        if (filtroAtual.dataInicio !== '' && filtroAtual.dataFim !== '') {
            const inicio = new Date(filtroAtual.dataInicio + 'T00:00:00');
            const fim = new Date(filtroAtual.dataFim + 'T23:59:59');
            if (data < inicio || data > fim) return false;
        }

        return true;
    });

    // Mostra tabela de dias mensais apenas se um mês for selecionado
    const tabelaDiasMensal = document.getElementById('tabelaDiasMensal');
    if (filtroAtual.mes !== '') {
        tabelaDiasMensal.style.display = 'block';
        renderizarTabelaDiasMensal(parseInt(filtroAtual.mes), vendasFiltradas);
    } else {
        tabelaDiasMensal.style.display = 'none';
    }

    renderizarTudo(vendasFiltradas);
}

// Renderiza todos os componentes
function renderizarTudo(vendasFiltradas) {
    const faturamento = vendasFiltradas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const pedidos = vendasFiltradas.length;
    const itensVendidos = vendasFiltradas.reduce((acc, v) => acc + (v.totalItens || 0), 0);
    const estoqueTotal = catalogo.reduce((acc, p) => acc + (p.estoque || 0), 0);
    const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;

    document.getElementById('kpiFaturamento').textContent = faturamento.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiPedidos').textContent = pedidos;
    document.getElementById('kpiItens').textContent = itensVendidos;
    document.getElementById('kpiTicketMedio').textContent = ticketMedio.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiEstoque').textContent = estoqueTotal;

    renderizarTabelaPedidos(vendasFiltradas);
    renderizarTabelaProdutos(vendasFiltradas);

    renderizarGraficoVendasPorDia(vendasFiltradas);
    renderizarGraficoProdutosMaisVendidos(vendasFiltradas);
}

// Renderiza a tabela de pedidos
function renderizarTabelaPedidos(vendasFiltradas) {
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
                <span style="font-size:11px; font-weight:700;">${v.status === 'enviado' ? '🔵 Enviado' : v.status === 'entregue' ? '🟢 Entregue' : '🟡 Confirmado'}</span>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'enviado')" style="background:#3498db; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🚚 Enviar</button>
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'entregue')" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">📦 Entregar</button>
                    <button onclick="window.imprimirFatura('${v.codigoRastreio || ''}')" style="background:#D4AF37; color:#000; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🖨️ Imprimir</button>
                </div>
            </td>
        `;
        corpoTabelaPedidos.appendChild(tr);
    });
}

// Renderiza a tabela de produtos com ID, Lucro e Alerta de Estoque
function renderizarTabelaProdutos(vendasFiltradas) {
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
        const custoUnitario = extrairValorNumerico(prod.custo) || 0;
        const lucroEstimado = qtdVendida * (extrairValorNumerico(prod.preco) - custoUnitario);
        const desconto = prod.desconto ? parseInt(prod.desconto) : 0;
        const estoque = prod.estoque || 0;
        const estoqueBaixo = estoque <= 5 ? 'background:#ffe0e0;' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px; font-weight:600;">${prod.id || 'N/A'}</td>
            <td style="padding:8px;">${prod.nome}</td>
            <td style="padding:8px; text-align:center;">${qtdVendida}</td>
            <td style="padding:8px; text-align:right;">${totalVendido.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:right; color:#27ae60;">${lucroEstimado.toLocaleString('pt-AO')}</td>
            <td style="padding:8px; text-align:center;">${desconto}%</td>
            <td style="padding:8px; text-align:center; ${estoqueBaixo}">${estoque}</td>
        `;
        corpoTabelaRelatorio.appendChild(tr);
    });
}

// Renderiza a tabela de dias mensais
function renderizarTabelaDiasMensal(mesIndex, vendasFiltradas) {
    const tbody = document.getElementById('corpoTabelaDiasMensal');
    tbody.innerHTML = '';

    const diasNoMes = new Date(2026, mesIndex + 1, 0).getDate();

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const pedidos = vendasFiltradas.filter(v => {
            const data = new Date(v.dataHora);
            return data.getDate() === dia && data.getMonth() === mesIndex;
        });
        const faturamento = pedidos.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
        const semana = Math.floor((dia - 1) / 7) + 1;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${dia}</td>
            <td style="padding:8px; text-align:center;">Semana ${semana}</td>
            <td style="padding:8px; text-align:center;">${pedidos.length}</td>
            <td style="padding:8px; text-align:right;">${faturamento.toLocaleString('pt-AO')} Kz</td>
        `;
        tbody.appendChild(tr);
    }
}

// IMPRIMIR FATURA
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

        let itensHTML = '';
        if (venda.itens && venda.itens.length) {
            venda.itens.forEach(item => {
                const unitario = item.preco || 0;
                const subtotal = unitario * item.quantidade;
                itensHTML += `<tr><td>${item.nome}</td><td>${item.quantidade}</td><td>${unitario.toFixed(2)}</td><td>${subtotal.toFixed(2)}</td></tr>`;
            });
        } else if (venda.produtosResumo) {
            const itens = venda.produtosResumo.split(', ');
            itens.forEach(item => {
                const nome = item.split(' (x')[0];
                const qtd = item.split('(x')[1]?.replace(')', '') || 1;
                itensHTML += `<tr><td>${nome}</td><td>${qtd}</td><td>-</td><td>-</td></tr>`;
            });
        }

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Fatura ${codigoRastreio} - Aurora</title>
<style>
  body { font-family: Arial, sans-serif; margin: 30px; }
  h1 { color: #005A4C; text-align: center; }
  h2 { color: #D4AF37; text-align: center; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #005A4C; color: white; }
  .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
  .dados { margin-top: 20px; }
  .dados p { margin: 5px 0; }
</style>
</head>
<body>
<h1>AURORA COMERCIAL</h1>
<h2>Contribuinte: 5000048151 | Tel: +244 933 677 628</h2>
<hr>
<p><strong>Fatura Nº:</strong> ${codigoRastreio}</p>
<p><strong>Data:</strong> ${venda.dataHora || ''}</p>
<div class="dados">
<p><strong>Cliente:</strong> ${venda.nomeCliente || ''}</p>
<p><strong>Telefone:</strong> ${venda.telefoneCliente || ''}</p>
<p><strong>NIF:</strong> ${venda.nifCliente || ''}</p>
<p><strong>Morada:</strong> ${venda.moradaCliente || ''}</p>
</div>
<table>
<thead><tr><th>Descrição</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead>
<tbody>${itensHTML}</tbody>
</table>
<p class="total">Total a Pagar: ${(venda.valorTotal || 0).toFixed(2)} Kz</p>
<script>window.print();</script>
</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
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

// EXPORTAR PDF (agora inclui o filtro atual)
function exportarPDF() {
    try {
        if (typeof jspdf !== 'undefined' && jspdf.jsPDF) {
            const { jsPDF } = jspdf;
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.setTextColor(0, 90, 76);
            doc.text('Relatório de Vendas - Aurora Comercial', 14, 20);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);
            doc.text(`Total de Pedidos: ${document.getElementById('kpiPedidos').textContent}`, 14, 32);
            doc.text(`Faturamento Total: ${document.getElementById('kpiFaturamento').textContent}`, 14, 38);
            doc.text(`Ticket Médio: ${document.getElementById('kpiTicketMedio').textContent}`, 14, 44);

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
                const custoUnitario = extrairValorNumerico(prod.custo) || 0;
                const lucroEstimado = qtdVendida * (extrairValorNumerico(prod.preco) - custoUnitario);
                const desconto = prod.desconto ? parseInt(prod.desconto) : 0;
                dadosProdutos.push([prod.id || 'N/A', prod.nome, qtdVendida, totalVendido.toLocaleString('pt-AO') + ' Kz', lucroEstimado.toLocaleString('pt-AO') + ' Kz', desconto + '%', prod.estoque || 0]);
            });

            doc.autoTable({
                startY: 50,
                head: [['ID', 'Produto', 'Qtd Vendida', 'Total (Kz)', 'Lucro (Kz)', 'Desconto', 'Estoque']],
                body: dadosProdutos.length > 0 ? dadosProdutos : [['Sem produtos vendidos', '-', '-', '-', '-', '-', '-']],
                headStyles: { fillColor: [0, 90, 76], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 18, halign: 'center' },
                    3: { cellWidth: 30, halign: 'right' },
                    4: { cellWidth: 25, halign: 'right' },
                    5: { cellWidth: 15, halign: 'center' },
                    6: { cellWidth: 15, halign: 'center' }
                }
            });

            doc.save('Relatorio_Vendas_Aurora.pdf');
        } else {
            window.print();
        }
    } catch (e) {
        console.error('Erro ao exportar PDF:', e);
        window.print();
    }
}

// EXPORTAR EXCEL
function exportarExcel() {
    try {
        if (typeof XLSX !== 'undefined') {
            const dados = [];
            dados.push(['Data/Hora', 'Cliente', 'Telefone', 'NIF', 'Morada', 'Produtos', 'Total (Kz)', 'Status']);
            todasVendas.forEach(v => {
                dados.push([
                    v.dataHora || '',
                    v.nomeCliente || '',
                    v.telefoneCliente || '',
                    v.nifCliente || '',
                    v.moradaCliente || '',
                    v.produtosResumo || '',
                    v.valorTotal || 0,
                    v.status || ''
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
            XLSX.writeFile(wb, 'Vendas_Aurora.xlsx');
        } else {
            let csv = 'Data/Hora,Cliente,Telefone,NIF,Morada,Produtos,Total (Kz),Status\n';
            todasVendas.forEach(v => {
                csv += `"${v.dataHora || ''}","${v.nomeCliente || ''}","${v.telefoneCliente || ''}","${v.nifCliente || ''}","${v.moradaCliente || ''}","${v.produtosResumo || ''}","${v.valorTotal || 0}","${v.status || ''}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Vendas_Aurora.csv';
            a.click();
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        alert('Erro ao exportar: ' + e.message);
    }
}

// LIMPAR FILTROS
function limparFiltros() {
    document.getElementById('filtroPedidoCliente').value = '';
    document.getElementById('filtroStatus').value = 'todos';
    document.getElementById('selectMes').value = '';
    document.getElementById('selectSemana').value = '';
    document.getElementById('inputDia').value = '';
    document.getElementById('dataInicio').value = '';
    document.getElementById('dataFim').value = '';
    document.getElementById('tabelaDiasMensal').style.display = 'none';
    filtroAtual = { mes: '', semana: '', dia: '', dataInicio: '', dataFim: '' };
}

// GRÁFICOS
function renderizarGraficoVendasPorDia(vendasFiltradas) {
    const vendasPorDia = {};
    vendasFiltradas.forEach(v => {
        if (v.dataHora) {
            const dia = v.dataHora.split(' ')[0];
            vendasPorDia[dia] = (vendasPorDia[dia] || 0) + (v.valorTotal || 0);
        }
    });

    const ctx = document.getElementById('graficoVendas');
    if (!ctx) return;

    const dias = Object.keys(vendasPorDia);
    const valores = Object.values(vendasPorDia);

    if (dias.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Sem dados de vendas por dia.</p>';
        return;
    }

    if (chartDisponivel()) {
        if (graficoVendas) graficoVendas.destroy();
        graficoVendas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [{ label: 'Faturamento (Kz)', data: valores, backgroundColor: 'rgba(0, 90, 76, 0.7)', borderColor: '#005A4C', borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, aspectRatio: 2, scales: { y: { beginAtZero: true } } }
        });
    } else {
        const maxVal = Math.max(...valores);
        let html = '<div style="display:flex; align-items:flex-end; height:200px; gap:10px; padding:10px;">';
        dias.forEach((dia, i) => {
            const altura = (valores[i] / maxVal) * 100;
            html += `<div style="flex:1; text-align:center;">
                <div style="background:#005A4C; height:${altura}%; border-radius:4px;"></div>
                <span style="font-size:10px;">${dia}</span>
            </div>`;
        });
        html += '</div>';
        ctx.parentElement.innerHTML = html;
    }
}

function renderizarGraficoProdutosMaisVendidos(vendasFiltradas) {
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

    const topProdutos = Object.entries(vendasPorProduto)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const ctx = document.getElementById('graficoProdutos');
    if (!ctx) return;

    if (topProdutos.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Sem produtos vendidos.</p>';
        return;
    }

    if (chartDisponivel()) {
        if (graficoProdutos) graficoProdutos.destroy();
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
        let html = '<ul style="list-style:none; padding:20px;">';
        topProdutos.forEach(p => {
            html += `<li style="margin-bottom:10px;">🔹 ${p[0]} - ${p[1]} unidades</li>`;
        });
        html += '</ul>';
        ctx.parentElement.innerHTML = html;
    }
}