import { db } from './config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let map;
let marcador;
let linhaRota;

document.addEventListener('DOMContentLoaded', () => {
    const btnRastrear = document.getElementById('btnRastrear');
    const inputRastreio = document.getElementById('inputRastreio');

    btnRastrear.addEventListener('click', () => {
        const codigo = inputRastreio.value.trim().toUpperCase();
        buscarPedido(codigo);
    });

    // Permitir pesquisar com a tecla Enter
    inputRastreio.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnRastrear.click();
    });
});

async function buscarPedido(codigo) {
    const erroDiv = document.getElementById('erroRastreio');
    const resultadoDiv = document.getElementById('resultadoRastreio');
    const mapaDiv = document.getElementById('mapaRastreio');
    const btnRastrear = document.getElementById('btnRastrear');

    erroDiv.style.display = 'none';
    resultadoDiv.style.display = 'none';
    mapaDiv.style.display = 'none';

    if (!codigo) { alert('Digite um código.'); return; }

    btnRastrear.disabled = true;
    btnRastrear.textContent = '⏳ Buscando...';

    try {
        const q = query(collection(db, 'vendas'), where('codigoRastreio', '==', codigo));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            erroDiv.style.display = 'block';
            btnRastrear.disabled = false;
            btnRastrear.textContent = '🔍 Rastrear';
            return;
        }

        const venda = snapshot.docs[0].data();
        
        // Mostrar resultados
        resultadoDiv.style.display = 'block';
        mapaDiv.style.display = 'block';
        erroDiv.style.display = 'none';

        document.getElementById('rastreioNome').textContent = `Olá, ${venda.nomeCliente || 'Cliente'}`;
        document.getElementById('rastreioData').textContent = `Pedido realizado em: ${venda.dataHora || 'Data não disponível'}`;
        document.getElementById('rastreioProdutos').textContent = venda.produtosResumo || 'Nenhum produto listado';

        // Status
        const status = venda.status || 'confirmado';
        let progresso = 0, texto = '';
        if (status === 'confirmado') { progresso = 30; texto = '✅ Pedido confirmado'; }
        else if (status === 'enviado') { progresso = 70; texto = '🚚 Pedido saiu para entrega'; }
        else if (status === 'entregue') { progresso = 100; texto = '📦 Pedido entregue com sucesso!'; }

        document.getElementById('barraProgresso').style.width = progresso + '%';
        document.getElementById('statusAtualTexto').textContent = texto;

        // Ativar pontos do timeline
        document.getElementById('ponto-confirmado').classList.add('active');
        if (status !== 'confirmado') document.getElementById('ponto-enviado').classList.add('active');
        if (status === 'entregue') document.getElementById('ponto-entregue').classList.add('active');

        // Inicializar o Mapa (se ainda não existir)
        if (!map) {
            // Centro inicial em Luanda, Angola
            map = L.map('mapaRastreio').setView([-8.8383, 13.2344], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);
        }
        
        if (marcador) map.removeLayer(marcador);
        if (linhaRota) map.removeLayer(linhaRota);

        // Simulação de rota (baseada em coordenadas de Luanda)
        const destinoLuanda = [-8.9142, 13.1832]; // Centro
        const destinoTalantona = [-8.8964, 13.2902]; // Talatona

        let coords;
        if (status === 'entregue') {
            coords = destinoTalantona;
            marcador = L.marker(coords).addTo(map)
                .bindPopup('📦 Entregue!').openPopup();
        } else {
            coords = destinoLuanda;
            marcador = L.marker(coords).addTo(map)
                .bindPopup(`Status: ${texto}`).openPopup();
        }

        // Desenhar uma linha da origem (Luanda) até o destino
        const origem = [-8.8383, 13.2344];
        linhaRota = L.polyline([origem, coords], { color: '#D4AF37', weight: 4, dashArray: '8 8' }).addTo(map);
        
        map.setView(coords, 10);
        setTimeout(() => map.invalidateSize(), 200);

    } catch (e) {
        console.error(e);
        erroDiv.style.display = 'block';
        erroDiv.textContent = 'Erro de conexão. Tente novamente.';
    } finally {
        btnRastrear.disabled = false;
        btnRastrear.textContent = '🔍 Rastrear';
    }
}