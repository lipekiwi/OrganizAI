const hoje = new Date();
const ano = hoje.getFullYear();
const mes = hoje.getMonth();
const diaHoje = hoje.getDate();
const diasNoMes = new Date(ano, mes + 1, 0).getDate();
const numSemanas = Math.ceil(diasNoMes / 7);

document.getElementById("mesAtual").textContent =
    hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const chaveMes = `${ano}-${mes}`;
const CHAVE_TEMA = "organizai-theme";

let dados = JSON.parse(localStorage.getItem(chaveMes)) || {
    tarefas: [],
    progresso: {}
};

// Visão atual: 'mensal' ou 'semanal'
let modoVisao = 'mensal';

// Used for drag & drop reordering
let indiceArrastando = null;

// ── Frequência por tarefa ────────────────────────────────────────────────────
function getConfigTarefa(index) {
    const tarefa = dados.tarefas[index] || {};
    return {
        tipoFrequencia: tarefa.tipoFrequencia || 'diario',
        diasSemana: Array.isArray(tarefa.diasSemana) ? tarefa.diasSemana : [],
        vezesSemana: tarefa.vezesSemana || 3
    };
}

function getDiaSemana(diaDoMes) {
    return new Date(ano, mes, diaDoMes).getDay(); // 0 = domingo
}

function getSemanaIndex(diaDoMes) {
    return Math.floor((diaDoMes - 1) / 7); // blocos de 7 dias dentro do mês
}

function isDiaEsperado(indexTarefa, diaDoMes) {
    const cfg = getConfigTarefa(indexTarefa);
    const dow = getDiaSemana(diaDoMes);

    if (cfg.tipoFrequencia === 'diario') return true;
    if (cfg.tipoFrequencia === 'semanal_dias') {
        return cfg.diasSemana.includes(dow);
    }
    // semanal_qtd: qualquer dia pode ser usado para bater a meta semanal
    return true;
}

// ── Theme ────────────────────────────────────────────────────────────────────
function aplicarTema(tema) {
    const body = document.body;
    body.classList.remove(
        "theme-dark",
        "theme-light",
        "theme-forest",
        "theme-ocean"
    );
    body.classList.add(`theme-${tema}`);
}

function changeTheme(tema) {
    aplicarTema(tema);
    localStorage.setItem(CHAVE_TEMA, tema);
}

// Apply saved theme on load
let temaSalvo = localStorage.getItem(CHAVE_TEMA) || "dark";
// Caso antigo "sunset" ou qualquer valor inválido, cai para dark
if (!["dark", "light", "forest", "ocean"].includes(temaSalvo)) {
    temaSalvo = "dark";
}
aplicarTema(temaSalvo);
const selectTema = document.getElementById("themeSelect");
if (selectTema) selectTema.value = temaSalvo;

// ── Persist ────────────────────────────────────────────────────────────────
function salvar() {
    localStorage.setItem(chaveMes, JSON.stringify(dados));
}

// ── Toast ──────────────────────────────────────────────────────────────────
function mostrarToast(mensagem, tipo = "default") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ── Modal ──────────────────────────────────────────────────────────────────
let editandoIndex = null;
let modalFreqTipo = 'diario';
let modalFreqDias = [];
let modalFreqQtd = 3;

function atualizarUIFrequenciaModal() {
    const tipoBtns = document.querySelectorAll('.freq-type-btn');
    tipoBtns.forEach(btn => {
        const tipo = btn.getAttribute('data-tipo');
        btn.classList.toggle('active', tipo === modalFreqTipo);
    });

    const diasContainer = document.getElementById('freqDiasContainer');
    const qtdContainer = document.getElementById('freqQtdContainer');

    if (diasContainer && qtdContainer) {
        diasContainer.classList.toggle('active', modalFreqTipo === 'semanal_dias');
        qtdContainer.classList.toggle('active', modalFreqTipo === 'semanal_qtd');
    }

    const dayBtns = document.querySelectorAll('.freq-day-btn');
    dayBtns.forEach(btn => {
        const dia = Number(btn.getAttribute('data-dia'));
        btn.classList.toggle('active', modalFreqDias.includes(dia));
    });

    const qtdInputEl = document.getElementById('freqQtdInput');
    if (qtdInputEl) {
        qtdInputEl.value = modalFreqQtd;
    }
}

function abrirModal(index) {
    editandoIndex = index;
    const overlay = document.getElementById("modalOverlay");
    const input = document.getElementById("modalInput");
    input.value = dados.tarefas[index].nome;

    const cfg = getConfigTarefa(index);
    modalFreqTipo = cfg.tipoFrequencia;
    modalFreqDias = [...cfg.diasSemana];
    modalFreqQtd = cfg.vezesSemana || 3;
    setTimeout(atualizarUIFrequenciaModal, 0);
    overlay.classList.add("ativo");
    setTimeout(() => input.focus(), 100);
}

function fecharModal() {
    document.getElementById("modalOverlay").classList.remove("ativo");
    editandoIndex = null;
}

function confirmarEdicao() {
    const input = document.getElementById("modalInput");
    const novoNome = input.value.trim();
    if (!novoNome || editandoIndex === null) return;
    const tarefa = dados.tarefas[editandoIndex];
    tarefa.nome = novoNome;
    tarefa.tipoFrequencia = modalFreqTipo;
    tarefa.diasSemana = modalFreqTipo === 'semanal_dias' ? [...modalFreqDias] : [];
    tarefa.vezesSemana = modalFreqTipo === 'semanal_qtd' ? modalFreqQtd : (tarefa.vezesSemana || 3);
    salvar();
    renderizar();
    fecharModal();
    mostrarToast("Meta editada com sucesso!", "success");
}

document.getElementById("modalInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarEdicao();
    if (e.key === "Escape") fecharModal();
});

// Eventos de frequência (delegação)
document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('freq-type-btn')) {
        modalFreqTipo = target.getAttribute('data-tipo');
        atualizarUIFrequenciaModal();
    }
    if (target.classList.contains('freq-day-btn')) {
        const dia = Number(target.getAttribute('data-dia'));
        if (modalFreqDias.includes(dia)) {
            modalFreqDias = modalFreqDias.filter(d => d !== dia);
        } else {
            modalFreqDias = [...modalFreqDias, dia];
        }
        atualizarUIFrequenciaModal();
    }
});

const freqQtdInputEl = document.getElementById('freqQtdInput');
if (freqQtdInputEl) {
    freqQtdInputEl.addEventListener('input', () => {
        const v = Number(freqQtdInputEl.value) || 1;
        modalFreqQtd = Math.min(Math.max(v, 1), 7);
    });
}

// ── Add ────────────────────────────────────────────────────────────────────
function adicionarTarefa() {
    const input = document.getElementById("novaTarefa");
    if (input.value.trim() === "") return;
    dados.tarefas.push({
        nome: input.value.trim(),
        tipoFrequencia: 'diario',
        diasSemana: [],
        vezesSemana: 3
    });
    input.value = "";
    salvar();
    renderizar();
    mostrarToast("Meta adicionada!", "success");
}

document.getElementById("novaTarefa").addEventListener("keydown", (e) => {
    if (e.key === "Enter") adicionarTarefa();
});

// ── Edit / Delete / Reorder ────────────────────────────────────────────────
function editarTarefa(index) {
    abrirModal(index);
}

function excluirTarefa(index) {
    const nome = dados.tarefas[index].nome;
    dados.tarefas.splice(index, 1);

    const novoProgresso = {};
    Object.keys(dados.progresso).forEach(chave => {
        const [i, dia] = chave.split("-").map(Number);
        if (i < index) novoProgresso[`${i}-${dia}`] = dados.progresso[chave];
        else if (i > index) novoProgresso[`${i - 1}-${dia}`] = dados.progresso[chave];
    });
    dados.progresso = novoProgresso;

    salvar();
    renderizar();
    mostrarToast(`"${nome}" removida.`, "danger");
}

function reordenarTarefa(fromIndex, toIndex) {
    if (fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= dados.tarefas.length ||
        toIndex >= dados.tarefas.length) {
        return;
    }

    // Reordenar array de tarefas
    const [movida] = dados.tarefas.splice(fromIndex, 1);
    dados.tarefas.splice(toIndex, 0, movida);

    // Recalcular índices no mapa de progresso
    function mapearIndice(i) {
        if (fromIndex < toIndex) {
            if (i < fromIndex || i > toIndex) return i;
            if (i === fromIndex) return toIndex;
            return i - 1;
        } else {
            if (i < toIndex || i > fromIndex) return i;
            if (i === fromIndex) return toIndex;
            return i + 1;
        }
    }

    const progressoAntigo = dados.progresso;
    const novoProgresso = {};
    Object.keys(progressoAntigo).forEach(chave => {
        const [iStr, diaStr] = chave.split("-");
        const i = Number(iStr);
        const dia = Number(diaStr);
        const novoI = mapearIndice(i);
        novoProgresso[`${novoI}-${dia}`] = progressoAntigo[chave];
    });
    dados.progresso = novoProgresso;

    salvar();
    renderizar();
}

function moverCima(index) {
    if (index === 0) return;
    reordenarTarefa(index, index - 1);
}

function moverBaixo(index) {
    if (index === dados.tarefas.length - 1) return;
    reordenarTarefa(index, index + 1);
}

function alternar(tarefaIndex, dia) {
    if (!isDiaEsperado(tarefaIndex, dia)) return;
    const chave = `${tarefaIndex}-${dia}`;
    dados.progresso[chave] = !dados.progresso[chave];
    salvar();
    renderizar();
}

// ── Stats ──────────────────────────────────────────────────────────────────
function calcularUnidadesEsperadasMeta(index) {
    const cfg = getConfigTarefa(index);

    if (cfg.tipoFrequencia === 'diario') {
        return diasNoMes;
    }

    if (cfg.tipoFrequencia === 'semanal_dias') {
        let count = 0;
        for (let d = 1; d <= diasNoMes; d++) {
            if (isDiaEsperado(index, d)) count++;
        }
        return count;
    }

    // semanal_qtd
    return numSemanas * cfg.vezesSemana;
}

function calcularUnidadesFeitasMeta(index) {
    const cfg = getConfigTarefa(index);

    if (cfg.tipoFrequencia === 'diario' || cfg.tipoFrequencia === 'semanal_dias') {
        let feitos = 0;
        for (let d = 1; d <= diasNoMes; d++) {
            if (!isDiaEsperado(index, d)) continue;
            const chave = `${index}-${d}`;
            if (dados.progresso[chave]) feitos++;
        }
        return feitos;
    }

    // semanal_qtd: limitado por vezesSemana por semana
    const semanas = new Array(numSemanas).fill(0);
    for (let d = 1; d <= diasNoMes; d++) {
        const chave = `${index}-${d}`;
        if (dados.progresso[chave]) {
            const w = getSemanaIndex(d);
            semanas[w]++;
        }
    }
    let total = 0;
    for (let w = 0; w < numSemanas; w++) {
        total += Math.min(semanas[w], cfg.vezesSemana);
    }
    return total;
}

function progressoPorMeta(index) {
    const esperadas = calcularUnidadesEsperadasMeta(index);
    const feitas = calcularUnidadesFeitasMeta(index);
    if (esperadas === 0) return 0;
    return Math.round((feitas / esperadas) * 100);
}

function calcularTotaisGlobais() {
    let totalEsperado = 0;
    let totalFeito = 0;

    dados.tarefas.forEach((_, i) => {
        totalEsperado += calcularUnidadesEsperadasMeta(i);
        totalFeito += calcularUnidadesFeitasMeta(i);
    });

    return { totalEsperado, totalFeito };
}

function atualizarBarra() {
    const { totalEsperado, totalFeito } = calcularTotaisGlobais();
    const pct = totalEsperado === 0 ? 0 : Math.round((totalFeito / totalEsperado) * 100);

    document.getElementById("barraProgresso").style.width = pct + "%";
    document.getElementById("porcentagem").textContent = pct + "%";
    document.getElementById("metasCompletas").textContent = totalFeito;
    document.getElementById("totalMetas").textContent = totalEsperado;
}

// ── View mode ───────────────────────────────────────────────────────────────
function mudarVisao(novoModo) {
    if (novoModo !== 'mensal' && novoModo !== 'semanal') return;
    modoVisao = novoModo;

    const tabMensal = document.getElementById('tabMensal');
    const tabSemanal = document.getElementById('tabSemanal');
    if (tabMensal && tabSemanal) {
        tabMensal.classList.toggle('active', modoVisao === 'mensal');
        tabSemanal.classList.toggle('active', modoVisao === 'semanal');
    }

    renderizar();
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderizar() {
    const container = document.getElementById("tabelaContainer");
    container.innerHTML = "";

    if (dados.tarefas.length === 0) {
        container.innerHTML = `<div class="empty-state">
            Nenhuma meta adicionada ainda.<br>Adicione sua primeira meta acima! 🚀
        </div>`;
        atualizarBarra();
        return;
    }

    let inicioDia = 1;
    let fimDia = diasNoMes;

    if (modoVisao === 'semanal') {
        const semanaAtual = getSemanaIndex(diaHoje);
        inicioDia = semanaAtual * 7 + 1;
        fimDia = Math.min(inicioDia + 6, diasNoMes);
    }

    const table = document.createElement("table");

    // Header
    let header = `<thead><tr><th>Meta</th>`;
    for (let d = inicioDia; d <= fimDia; d++) {
        const isHoje = d === diaHoje;
        header += `<th class="${isHoje ? 'hoje-col' : ''}">${isHoje ? '📍' : d}</th>`;
    }
    header += `<th>Ações</th></tr></thead>`;
    table.innerHTML = header;

    // Body
    const tbody = document.createElement("tbody");
    dados.tarefas.forEach((tarefa, i) => {
        const pct = progressoPorMeta(i);
        const tr = document.createElement("tr");

        // Drag & drop para reordenar – usando handle dedicado
        tr.draggable = true;
        tr.dataset.index = i;
        tr.addEventListener("dragstart", (e) => {
            indiceArrastando = i;
            tr.classList.add("dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
            }
        });
        tr.addEventListener("dragover", (e) => {
            e.preventDefault();
            tr.classList.add("drag-over");
        });
        tr.addEventListener("dragleave", () => {
            tr.classList.remove("drag-over");
        });
        tr.addEventListener("drop", (e) => {
            e.preventDefault();
            tr.classList.remove("drag-over");
            const from = indiceArrastando;
            const to = i;
            indiceArrastando = null;
            if (from === null || from === undefined || from === to) return;
            reordenarTarefa(from, to);
        });
        tr.addEventListener("dragend", () => {
            indiceArrastando = null;
            tr.classList.remove("dragging", "drag-over");
        });

        let cells = `<td class="goal-name">
            <span class="drag-handle" title="Arrastar para reordenar">⋮⋮</span>
            <div class="goal-main">
                <span class="goal-title">${tarefa.nome}</span>
                <span class="goal-progress-mini">
                    <span class="goal-progress-mini-fill" style="width:${pct}%"></span>
                </span>
            </div>
        </td>`;

        for (let d = inicioDia; d <= fimDia; d++) {
            const chave = `${i}-${d}`;
            const ativo = dados.progresso[chave] ? "ativo" : "";
            const isHoje = d === diaHoje ? "hoje-col" : "";
            const esperado = isDiaEsperado(i, d);
            const disabledClass = esperado ? "" : "disabled";
            const clickAttr = esperado ? `onclick="alternar(${i}, ${d})"` : "";
            cells += `<td class="check ${ativo} ${isHoje} ${disabledClass}" ${clickAttr}></td>`;
        }

        cells += `<td class="acoes">
            <button class="btn-action btn-edit" onclick="editarTarefa(${i})" title="Editar">Editar</button>
            <button class="btn-action btn-delete" onclick="excluirTarefa(${i})" title="Remover">Remover</button>
        </td>`;

        tr.innerHTML = cells;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
    atualizarBarra();
}

renderizar();