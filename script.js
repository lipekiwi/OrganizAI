const hoje = new Date();
const hojeAno = hoje.getFullYear();
const hojeMes = hoje.getMonth();
const hojeDia = hoje.getDate();

let viewAno = hojeAno;
let viewMes = hojeMes;
let diasNoMes = new Date(viewAno, viewMes + 1, 0).getDate();
let numSemanas = Math.ceil(diasNoMes / 7);

function recomputarDatas() {
    diasNoMes = new Date(viewAno, viewMes + 1, 0).getDate();
    numSemanas = Math.ceil(diasNoMes / 7);
}

function isHoje(viewDia) {
    return viewAno === hojeAno && viewMes === hojeMes && viewDia === hojeDia;
}

let chaveMes = `${viewAno}-${viewMes}`;
const CHAVE_TEMA = "organizai-theme";

let dados = { tarefas: [], progresso: {} };

// Visão atual: 'mensal' ou 'semanal'
let modoVisao = 'mensal';

// Date: the Monday of the currently displayed week (weekly view)
let currentWeekStart = null;

// Used for drag & drop reordering
let indiceArrastando = null;
let viewWeekBaseDay = hojeDia;

function carregarMes(ano, mes) {
    viewAno = ano;
    viewMes = mes;
    recomputarDatas();
    chaveMes = `${viewAno}-${viewMes}`;
    const salvo = localStorage.getItem(chaveMes);
    dados = salvo ? JSON.parse(salvo) : { tarefas: [], progresso: {} };

    // Ajusta base da semana para o mês carregado
    if (viewAno === hojeAno && viewMes === hojeMes) {
        viewWeekBaseDay = hojeDia;
    } else {
        viewWeekBaseDay = 1;
    }

    const titulo = document.getElementById("mesAtual");
    if (titulo) {
        titulo.textContent = new Date(viewAno, viewMes, 1).toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        });
    }
}

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
    return new Date(viewAno, viewMes, diaDoMes).getDay(); // 0 = domingo
}

function getSemanaIndex(diaDoMes) {
    return Math.floor((diaDoMes - 1) / 7); // blocos de 7 dias dentro do mês
}

function getDowMonday(diaDoMes) {
    // 0 = Monday, 6 = Sunday
    return (new Date(viewAno, viewMes, diaDoMes).getDay() + 6) % 7;
}

function getWeekOfMonth(diaDoMes) {
    const firstDow = getDowMonday(1);
    const offset = diaDoMes + firstDow - 1;
    return Math.floor(offset / 7) + 1;
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

// Custom dropdown handlers
function toggleThemeMenu() {
    const shell = document.getElementById("themeDropdown");
    if (!shell) return;
    shell.classList.toggle("open");
}

function selectTheme(tema) {
    changeTheme(tema);
    const shell = document.getElementById("themeDropdown");
    if (shell) shell.classList.remove("open");
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const shell = document.getElementById("themeDropdown");
    if (!shell) return;
    if (!shell.contains(e.target)) {
        shell.classList.remove("open");
    }
});

// Apply saved theme on load
let temaSalvo = localStorage.getItem(CHAVE_TEMA) || "dark";
if (!["dark", "light", "forest", "ocean"].includes(temaSalvo)) {
    temaSalvo = "dark";
}
aplicarTema(temaSalvo);

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
let criandoNova = false;
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
    criandoNova = false;
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
    criandoNova = false;
}

function confirmarEdicao() {
    const input = document.getElementById("modalInput");
    const novoNome = input.value.trim();
    if (!novoNome) {
        mostrarToast("Nome da meta é obrigatório.", "warning");
        return;
    }

    if (modalFreqTipo === 'semanal_dias' && modalFreqDias.length === 0) {
        mostrarToast("Selecione pelo menos um dia da semana.", "warning");
        return;
    }
    if (modalFreqTipo === 'semanal_qtd' && (!modalFreqQtd || modalFreqQtd < 1)) {
        mostrarToast("Informe um número de vezes por semana entre 1 e 7.", "warning");
        return;
    }

    // Capture before fecharModal() resets these flags
    const foiCriacao = criandoNova;

    if (foiCriacao) {
        dados.tarefas.push({
            nome: novoNome,
            tipoFrequencia: modalFreqTipo,
            diasSemana: modalFreqTipo === 'semanal_dias' ? [...modalFreqDias] : [],
            vezesSemana: modalFreqTipo === 'semanal_qtd' ? modalFreqQtd : 3
        });
    } else if (editandoIndex !== null) {
        const tarefa = dados.tarefas[editandoIndex];
        tarefa.nome = novoNome;
        tarefa.tipoFrequencia = modalFreqTipo;
        // Reset incompatible sub-fields when type changes
        tarefa.diasSemana = modalFreqTipo === 'semanal_dias' ? [...modalFreqDias] : [];
        tarefa.vezesSemana = modalFreqTipo === 'semanal_qtd' ? modalFreqQtd : (tarefa.vezesSemana || 3);
    }

    salvar();
    renderizar();
    fecharModal();

    if (foiCriacao) {
        // Clear the main text input that was used to pre-fill the modal
        const novaTarefaInput = document.getElementById("novaTarefa");
        if (novaTarefaInput) novaTarefaInput.value = '';
        mostrarToast("Meta adicionada com sucesso!", "success");
    } else {
        mostrarToast("Meta editada com sucesso!", "success");
    }
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
    const nomeBruto = input.value.trim();
    if (!nomeBruto) {
        mostrarToast("Digite um nome para a meta.", "warning");
        return;
    }
    criandoNova = true;
    editandoIndex = null;
    const overlay = document.getElementById("modalOverlay");
    const modalInput = document.getElementById("modalInput");
    modalInput.value = nomeBruto;
    modalFreqTipo = 'diario';
    modalFreqDias = [];
    modalFreqQtd = 3;
    atualizarUIFrequenciaModal();
    overlay.classList.add("ativo");
    setTimeout(() => modalInput.focus(), 100);
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

function mudarMes(delta) {
    const novaData = new Date(viewAno, viewMes + delta, 1);
    carregarMes(novaData.getFullYear(), novaData.getMonth());
    renderizar();
}

function mudarSemana(delta) {
    viewWeekBaseDay += delta * 7;
    if (viewWeekBaseDay < 1) viewWeekBaseDay = 1;
    if (viewWeekBaseDay > diasNoMes) viewWeekBaseDay = diasNoMes;
    renderizar();
}

// ── Month navigation ────────────────────────────────────────────────────────
function navegarMes(delta) {
    let m = viewMes + delta;
    let a = viewAno;
    if (m > 11) { m = 0; a++; }
    if (m < 0)  { m = 11; a--; }
    carregarMes(a, m);
    // Anchor the weekly start to the first Monday of the new month
    currentWeekStart = getMonday(new Date(a, m, 1));
    if (currentWeekStart.getMonth() !== m) {
        // 1st was a Sunday → Monday is day 2
        currentWeekStart = new Date(a, m, 2);
    }
    renderizar();
}

// ── Week navigation ─────────────────────────────────────────────────────────
function navegarSemana(delta) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + delta * 7);
    currentWeekStart = d;
    const newAno = d.getFullYear();
    const newMes = d.getMonth();
    if (newAno !== viewAno || newMes !== viewMes) {
        carregarMes(newAno, newMes);
    }
    renderizar();
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderizar() {
    const container = document.getElementById("tabelaContainer");
    container.innerHTML = "";

    const weekHeader = document.getElementById('weekHeader');
    if (modoVisao === 'semanal') {
        if (weekHeader) weekHeader.classList.remove('hidden');
        const weekLabelEl = document.getElementById('weekLabel');
        if (weekLabelEl) {
            const semanaNum = getWeekOfMonth(viewWeekBaseDay);
            const mesNome = new Date(viewAno, viewMes, 1).toLocaleDateString('pt-BR', { month: 'long' });
            weekLabelEl.textContent = `Semana ${semanaNum} de ${mesNome} ${viewAno}`;
        }
    } else {
        if (weekHeader) weekHeader.classList.add('hidden');
    }

    if (dados.tarefas.length === 0) {
        container.innerHTML = `<div class="empty-state">
            Nenhuma meta adicionada ainda.<br>Adicione sua primeira meta acima! 🚀
        </div>`;
        atualizarBarra();
        return;
    }

    const table = document.createElement("table");

    // Header
    let header = `<thead><tr><th>Meta</th>`;

    if (modoVisao === 'semanal') {
        const baseDow = getDowMonday(viewWeekBaseDay);
        const mondayDia = viewWeekBaseDay - baseDow;
        const weekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        for (let i = 0; i < 7; i++) {
            const dia = mondayDia + i;
            const hojeFlag = isHoje(dia);
            const outOfMonth = dia < 1 || dia > diasNoMes;
            header += `<th class="${hojeFlag ? 'hoje-col' : ''}">
                <div class="week-col">
                    <span class="week-day-label">${weekNames[i]}</span>
                    <span class="week-date-label">${outOfMonth ? '-' : dia}</span>
                </div>
            </th>`;
        }
    } else {
        for (let d = 1; d <= diasNoMes; d++) {
            const hojeFlag = isHoje(d);
            header += `<th class="${hojeFlag ? 'hoje-col' : ''}">${hojeFlag ? '📍' : d}</th>`;
        }
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

        if (modoVisao === 'semanal') {
            const baseDow = getDowMonday(viewWeekBaseDay);
            const mondayDia = viewWeekBaseDay - baseDow;

            for (let iCol = 0; iCol < 7; iCol++) {
                const dia = mondayDia + iCol;
                if (dia < 1 || dia > diasNoMes) {
                    cells += `<td class="check disabled"></td>`;
                    continue;
                }
                const chave = `${i}-${dia}`;
                const ativo = dados.progresso[chave] ? "ativo" : "";
                const hojeFlag = isHoje(dia) ? "hoje-col" : "";
                const esperado = isDiaEsperado(i, dia);
                const disabledClass = esperado ? "" : "disabled";
                const clickAttr = esperado ? `onclick="alternar(${i}, ${dia})"` : "";
                cells += `<td class="check ${ativo} ${hojeFlag} ${disabledClass}" ${clickAttr}></td>`;
            }
        } else {
            for (let d = 1; d <= diasNoMes; d++) {
                const chave = `${i}-${d}`;
                const ativo = dados.progresso[chave] ? "ativo" : "";
                const hojeFlag = isHoje(d) ? "hoje-col" : "";
                const esperado = isDiaEsperado(i, d);
                const disabledClass = esperado ? "" : "disabled";
                const clickAttr = esperado ? `onclick="alternar(${i}, ${d})"` : "";
                cells += `<td class="check ${ativo} ${hojeFlag} ${disabledClass}" ${clickAttr}></td>`;
            }
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

carregarMes(hojeAno, hojeMes);
renderizar();