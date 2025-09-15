// URL do arquivo Excel no GitHub
const EXCEL_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/refs/heads/main/base_dados.xlsx';

// Usuários e senhas (todos veem os mesmos dados, mas com identificação própria)
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com', senha: 'efaro2024' },
    { nome: 'Everton Henrique', email: 'everton@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Matheus Rodas', email: 'matheus@efaro.com.br', senha: 'efaro2024' }
];

let usuarioLogado = null;
let dadosExcel = null;
let graficoAtual = null;
let todosDados = [];

// Função de login
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        usuarioLogado = usuario;
        console.log(`🔐 Login realizado: ${usuario.nome} (${usuario.email})`);
        mostrarCarregamento(true);
        iniciarDashboard();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
});

// Função para mostrar/ocultar loading
function mostrarCarregamento(mostrar) {
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.style.display = mostrar ? 'block' : 'none';
    }
}

// Função para inicializar o dashboard
async function iniciarDashboard() {
    try {
        await carregarDadosExcel();
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        // CORRIGIDO: Usar o nome do usuário logado dinamicamente
        document.getElementById('userName').textContent = usuarioLogado.nome;
        document.getElementById('userNameHeader').textContent = usuarioLogado.nome;
        
        console.log(`👋 Dashboard iniciado para: ${usuarioLogado.nome}`);

        carregarDados();
        configurarFiltros();
        mostrarCarregamento(false);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar os dados. Tente novamente.');
        mostrarCarregamento(false);
    }
}

// Função para carregar dados do Excel
async function carregarDadosExcel() {
    try {
        console.log('🔄 Carregando dados do Excel...');
        
        const response = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', EXCEL_URL, true);
            xhr.responseType = 'arraybuffer';
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                    reject(new Error(`HTTP ${xhr.status}`));
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Erro de rede'));
            };
            
            xhr.send();
        });
        
        console.log('📊 Processando arquivo Excel...');
        
        const workbook = XLSX.read(response, { type: 'array' });
        dadosExcel = {};
        
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                raw: false
            });
            
            if (jsonData.length > 1) {
                dadosExcel[sheetName] = jsonData;
                console.log(`📋 Aba "${sheetName}" carregada com ${jsonData.length} linhas`);
            }
        });
        
        console.log('✅ Dados Excel carregados com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar arquivo Excel:', error);
        throw error;
    }
}

// ========================================
// FUNÇÕES DE CÁLCULO CORRIGIDAS E DEFINITIVAS
// ========================================

// Função CORRIGIDA para verificar se é fim de semana (mais rigorosa)
function isFimDeSemana(dia) {
    if (!dia) return false;
    
    const diaLimpo = dia.toLowerCase().trim();
    
    // Lista EXATA de fins de semana (sem variações que podem dar falso positivo)
    const sabados = ['sábado', 'sabado', 'saturday', 'sab'];
    const domingos = ['domingo', 'sunday', 'dom'];
    
    const ehSabado = sabados.includes(diaLimpo);
    const ehDomingo = domingos.includes(diaLimpo);
    const ehFimDeSemana = ehSabado || ehDomingo;
    
    if (ehFimDeSemana) {
        console.log(`🎯 FIM DE SEMANA DETECTADO: "${dia}" (${ehSabado ? 'SÁBADO' : 'DOMINGO'})`);
    }
    
    return ehFimDeSemana;
}

// Função CORRIGIDA para converter hora para minutos (mais robusta)
function timeToMinutes(time) {
    // Lista de valores que devem ser considerados como 0
    const valoresVazios = [null, undefined, '', '-', '00:00:00', '00:00', '0', 0, '12:00:00', '12:00'];
    
    if (valoresVazios.includes(time)) {
        return 0;
    }
    
    // Converter para string e limpar
    const timeStr = String(time).trim();
    
    // Se ainda estiver vazio ou for um dos valores vazios
    if (!timeStr || valoresVazios.includes(timeStr)) {
        return 0;
    }
    
    // Dividir por ':'
    const parts = timeStr.split(':');
    
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        // Validar se são números válidos
        if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const totalMinutos = hours * 60 + minutes;
            return totalMinutos;
        }
    }
    
    return 0;
}

// Função DEFINITIVA para converter minutos para hora
function minutesToTime(minutes) {
    if (!minutes || minutes <= 0) return '00:00';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Função DEFINITIVA para calcular horas trabalhadas
function calcularHorasTrabalhadas(entrada1, saida1, entrada2, saida2) {
    let totalMinutos = 0;
    
    // Período 1 (manhã ou período único)
    const entrada1Min = timeToMinutes(entrada1);
    const saida1Min = timeToMinutes(saida1);
    
    if (entrada1Min > 0 && saida1Min > 0 && saida1Min > entrada1Min) {
        const periodo1 = saida1Min - entrada1Min;
        totalMinutos += periodo1;
    }
    
    // Período 2 (tarde - só se existir)
    const entrada2Min = timeToMinutes(entrada2);
    const saida2Min = timeToMinutes(saida2);
    
    if (entrada2Min > 0 && saida2Min > 0 && saida2Min > entrada2Min) {
        const periodo2 = saida2Min - entrada2Min;
        totalMinutos += periodo2;
    }
    
    return totalMinutos;
}

// Função CORRIGIDA para calcular horas extras
function calcularHorasExtras(expediente, totalMinutosTrabalhados, dia) {
    let he50 = 0;
    let he100 = 0;
    
    // REGRA 1: Se for fim de semana, TUDO é HE 100%
    if (isFimDeSemana(dia)) {
        he100 = totalMinutosTrabalhados / 60;
        return { he50, he100 };
    }
    
    // REGRA 2: Para dias úteis, calcular baseado no expediente
    const expedienteMinutos = timeToMinutes(expediente);
    
    // Se expediente for 0 ou inválido, tratar como fim de semana
    if (expedienteMinutos === 0) {
        he100 = totalMinutosTrabalhados / 60;
        return { he50, he100 };
    }
    
    // Calcular saldo de horas extras (só conta se trabalhou MAIS que o expediente)
    const saldoMinutos = totalMinutosTrabalhados - expedienteMinutos;
    
    if (saldoMinutos > 0) {
        // Primeiras 2 horas extras = HE 50%
        if (saldoMinutos <= 120) { // 120 minutos = 2 horas
            he50 = saldoMinutos / 60;
        } else {
            // Primeiras 2h = HE 50%, resto = HE 100%
            he50 = 120 / 60; // Exatamente 2 horas
            he100 = (saldoMinutos - 120) / 60;
        }
    }
    
    return { he50, he100 };
}

// Função para processar dados (MESMA PLANILHA PARA TODOS)
function processarDadosUsuario() {
    console.log(`\n🚀 PROCESSANDO DADOS PARA: ${usuarioLogado.nome}`);
    const dadosUsuario = [];
    
    if (!dadosExcel) {
        console.log('❌ Dados Excel não disponíveis');
        return dadosUsuario;
    }
    
    // CORRIGIDO: Processar TODAS as abas da planilha (mesmos dados para todos)
    Object.keys(dadosExcel).forEach(sheetName => {
        const dados = dadosExcel[sheetName];
        
        if (!dados || dados.length < 2) return;
        
        console.log(`\n📄 Processando aba: ${sheetName} - ${dados.length} linhas`);
        
        // Processar todas as linhas (começando da linha 1, pulando cabeçalho)
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            
            // Verificar se a linha existe e tem dados
            if (!linha || linha.length === 0) continue;
            
            // Extrair dados das colunas
            const data = linha[0] || '';
            const dia = linha[1] || '';
            const entrada1 = linha[2] || '';
            const saida1 = linha[3] || '';
            const entrada2 = linha[4] || '';
            const saida2 = linha[5] || '';
            const expediente = linha[6] || '08:48';
            
            // Verificar se tem uma data válida
            if (data && data !== '00:00:00' && data !== '' && data !== '0' && data !== 0) {
                
                // Calcular horas trabalhadas
                const totalMinutosTrabalhados = calcularHorasTrabalhadas(entrada1, saida1, entrada2, saida2);
                
                // PROCESSAR TODOS OS REGISTROS, MESMO COM 0 HORAS
                const totalFormatado = minutesToTime(totalMinutosTrabalhados);
                const horasExtras = calcularHorasExtras(expediente, totalMinutosTrabalhados, dia);
                
                const registro = {
                    data: formatarData(data),
                    dataOriginal: converterDataParaDate(data),
                    dia: dia,
                    entrada1: formatarHora(entrada1),
                    saida1: formatarHora(saida1),
                    entrada2: formatarHora(entrada2),
                    saida2: formatarHora(saida2),
                    expediente: formatarHora(expediente),
                    total: totalFormatado,
                    totalMinutos: totalMinutosTrabalhados,
                    he50: horasExtras.he50,
                    he100: horasExtras.he100,
                    periodo: sheetName
                };
                
                dadosUsuario.push(registro);
            }
        }
    });
    
    // Ordenar por data (mais recente primeiro)
    dadosUsuario.sort((a, b) => new Date(b.dataOriginal) - new Date(a.dataOriginal));
    
    console.log(`✅ ${dadosUsuario.length} registros processados para ${usuarioLogado.nome}`);
    
    return dadosUsuario;
}

// Funções auxiliares
function converterDataParaDate(data) {
    try {
        if (!data) return new Date();
        
        // Se for um número (data do Excel)
        if (!isNaN(data) && data > 0) {
            return new Date((data - 25569) * 86400 * 1000);
        }
        
        // Se for string, tentar converter
        return new Date(data);
    } catch (error) {
        return new Date();
    }
}

function formatarData(data) {
    if (!data) return '-';
    
    try {
        // Se já estiver no formato correto
        if (typeof data === 'string' && (data.includes('/') || data.includes('-'))) {
            return data;
        }
        
        // Se for um número (data do Excel)
        if (!isNaN(data) && data > 0) {
            const excelDate = new Date((data - 25569) * 86400 * 1000);
            return excelDate.toLocaleDateString('pt-BR');
        }
        
        return String(data);
    } catch (error) {
        return String(data);
    }
}

function formatarHora(hora) {
    if (!hora || hora === '00:00:00' || hora === '0:00:00' || hora === '00:00' || hora === '' || hora === '0') {
        return '-';
    }
    
    // Se já estiver formatado
    if (typeof hora === 'string' && hora.includes(':')) {
        const parts = hora.split(':');
        if (parts.length >= 2) {
            const h = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            return `${h}:${m}`;
        }
    }
    
    return String(hora);
}

// Função para gerar análise detalhada das horas extras
function gerarAnaliseHorasExtras(dados) {
    // Análise HE 50%
    const registrosHE50 = dados.filter(row => row.he50 > 0);
    const totalHE50 = dados.reduce((sum, row) => sum + (row.he50 || 0), 0);
    const mediaHE50 = registrosHE50.length > 0 ? totalHE50 / registrosHE50.length : 0;
    
    // Análise HE 100%
    const registrosHE100 = dados.filter(row => row.he100 > 0);
    const totalHE100 = dados.reduce((sum, row) => sum + (row.he100 || 0), 0);
    const mediaHE100 = registrosHE100.length > 0 ? totalHE100 / registrosHE100.length : 0;
    
    // Separar HE 100% por tipo
    const he100FimSemana = dados.filter(row => row.he100 > 0 && isFimDeSemana(row.dia));
    const he100DiasUteis = dados.filter(row => row.he100 > 0 && !isFimDeSemana(row.dia));
    
    const totalHE100FimSemana = he100FimSemana.reduce((sum, row) => sum + row.he100, 0);
    const totalHE100DiasUteis = he100DiasUteis.reduce((sum, row) => sum + row.he100, 0);
    
    // Gerar texto da análise HE 50%
    const analiseHE50 = `
        • <strong>Total de registros:</strong> ${registrosHE50.length} dias<br>
        • <strong>Total de horas:</strong> ${totalHE50.toFixed(2)}h<br>
        • <strong>Média por dia:</strong> ${mediaHE50.toFixed(2)}h<br>
        • <strong>Maior registro:</strong> ${registrosHE50.length > 0 ? Math.max(...registrosHE50.map(r => r.he50)).toFixed(2) : '0.00'}h<br>
        • <strong>Observação:</strong> Primeiras 2 horas extras em dias úteis
    `;
    
    // Gerar texto da análise HE 100%
    const analiseHE100 = `
        • <strong>Total de registros:</strong> ${registrosHE100.length} dias<br>
        • <strong>Total de horas:</strong> ${totalHE100.toFixed(2)}h<br>
        • <strong>Média por dia:</strong> ${mediaHE100.toFixed(2)}h<br>
        • <strong>Fins de semana:</strong> ${he100FimSemana.length} dias (${totalHE100FimSemana.toFixed(2)}h)<br>
        • <strong>Dias úteis (>2h):</strong> ${he100DiasUteis.length} dias (${totalHE100DiasUteis.toFixed(2)}h)<br>
        • <strong>Maior registro:</strong> ${registrosHE100.length > 0 ? Math.max(...registrosHE100.map(r => r.he100)).toFixed(2) : '0.00'}h
    `;
    
    // Atualizar elementos HTML
    const elementoHE50 = document.getElementById('analiseHE50');
    const elementoHE100 = document.getElementById('analiseHE100');
    
    if (elementoHE50) {
        elementoHE50.innerHTML = analiseHE50;
    }
    
    if (elementoHE100) {
        elementoHE100.innerHTML = analiseHE100;
    }
    
    console.log(`📊 Análise detalhada das HE atualizada para ${usuarioLogado.nome}`);
}

// Função para configurar filtros
function configurarFiltros() {
    try {
        const filtroMes = document.getElementById('filtroMes');
        const filtroAno = document.getElementById('filtroAno');
        
        if (!filtroMes || !filtroAno) {
            console.log('⚠️ Filtros não encontrados no HTML');
            return;
        }
        
        const anosDisponiveis = [...new Set(todosDados.map(item => {
            const data = new Date(item.dataOriginal);
            return data.getFullYear();
        }))].sort((a, b) => b - a);
        
        filtroAno.innerHTML = '<option value="">Todos os anos</option>';
        anosDisponiveis.forEach(ano => {
            filtroAno.innerHTML += `<option value="${ano}">${ano}</option>`;
        });
        
        filtroMes.addEventListener('change', aplicarFiltros);
        filtroAno.addEventListener('change', aplicarFiltros);
        
        const btnLimpar = document.getElementById('btnLimparFiltros');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', limparFiltros);
        }
        
        console.log('✅ Filtros configurados com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao configurar filtros:', error);
    }
}

function aplicarFiltros() {
    try {
        const mes = document.getElementById('filtroMes')?.value || '';
        const ano = document.getElementById('filtroAno')?.value || '';
        
        let dadosFiltrados = [...todosDados];
        
        if (mes || ano) {
            dadosFiltrados = todosDados.filter(item => {
                const data = new Date(item.dataOriginal);
                const itemMes = data.getMonth() + 1;
                const itemAno = data.getFullYear();
                
                const mesMatch = !mes || itemMes == mes;
                const anoMatch = !ano || itemAno == ano;
                
                return mesMatch && anoMatch;
            });
        }
        
        renderizarTabela(dadosFiltrados);
        renderizarGrafico(dadosFiltrados);
        atualizarEstatisticas(dadosFiltrados);
        
        const registrosFiltrados = document.getElementById('registrosFiltrados');
        if (registrosFiltrados) {
            registrosFiltrados.textContent = `${dadosFiltrados.length} de ${todosDados.length} registros`;
        }
        
    } catch (error) {
        console.error('❌ Erro ao aplicar filtros:', error);
    }
}

function limparFiltros() {
    const filtroMes = document.getElementById('filtroMes');
    const filtroAno = document.getElementById('filtroAno');
    
    if (filtroMes) filtroMes.value = '';
    if (filtroAno) filtroAno.value = '';
    
    aplicarFiltros();
}

function logout() {
    console.log(`👋 Logout: ${usuarioLogado?.nome || 'Usuário desconhecido'}`);
    usuarioLogado = null;
    dadosExcel = null;
    todosDados = [];
    if (graficoAtual) {
        graficoAtual.destroy();
        graficoAtual = null;
    }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
}

async function atualizarDados() {
    mostrarCarregamento(true);
    try {
        await carregarDadosExcel();
        carregarDados();
        configurarFiltros();
        alert('Dados atualizados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao atualizar dados:', error);
        alert('Erro ao atualizar os dados. Tente novamente.');
    }
    mostrarCarregamento(false);
}

function carregarDados() {
    console.log(`🔄 Carregando dados para: ${usuarioLogado.nome}`);
    todosDados = processarDadosUsuario();
    renderizarTabela(todosDados);
    renderizarGrafico(todosDados);
    atualizarEstatisticas(todosDados);
    console.log('✅ Dados carregados e renderizados!');
}

function atualizarEstatisticas(dados) {
    const totalRegistros = dados.length;
    const totalHE50 = dados.reduce((sum, row) => sum + (row.he50 || 0), 0);
    const totalHE100 = dados.reduce((sum, row) => sum + (row.he100 || 0), 0);
    const totalHorasExtras = totalHE50 + totalHE100;
    
    console.log(`\n📊 ESTATÍSTICAS PARA ${usuarioLogado.nome}:`);
    console.log(`📊 Total de registros: ${totalRegistros}`);
    console.log(`📊 Total HE 50%: ${totalHE50.toFixed(2)}h`);
    console.log(`📊 Total HE 100%: ${totalHE100.toFixed(2)}h`);
    console.log(`📊 Total HE Geral: ${totalHorasExtras.toFixed(2)}h`);
    
    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalHE50').textContent = `${totalHE50.toFixed(2)}h`;
    document.getElementById('totalHE100').textContent = `${totalHE100.toFixed(2)}h`;
    
    const totalHorasExtrasElement = document.getElementById('totalHorasExtras');
    if (totalHorasExtrasElement) {
        totalHorasExtrasElement.textContent = `${totalHorasExtras.toFixed(2)}h`;
    }
    
    // Gerar análise detalhada
    gerarAnaliseHorasExtras(dados);
}

function renderizarTabela(dados) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) {
        console.log('⚠️ Elemento tableBody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';

    if (dados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="10" style="text-align: center; padding: 20px; color: #666;">Nenhum dado encontrado para ${usuarioLogado.nome}</td>`;
        tbody.appendChild(tr);
        return;
    }

    console.log(`📋 Renderizando tabela com ${dados.length} registros para ${usuarioLogado.nome}`);

    dados.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Destacar linhas com horas extras
        const temHE = (row.he50 && row.he50 > 0) || (row.he100 && row.he100 > 0);
        if (temHE) {
            tr.style.backgroundColor = '#f1f8e9';
        }
        
        // Destacar fins de semana
        if (isFimDeSemana(row.dia)) {
            tr.style.backgroundColor = '#e3f2fd';
            tr.style.fontWeight = 'bold';
        }
        
        tr.innerHTML = `
            <td>${row.data}</td>
            <td>${row.dia}</td>
            <td>${row.entrada1}</td>
            <td>${row.saida1}</td>
            <td>${row.entrada2}</td>
            <td>${row.saida2}</td>
            <td>${row.expediente}</td>
            <td style="font-weight: bold;">${row.total}</td>
            <td style="color: #2e7d32; font-weight: bold;">${(row.he50 || 0).toFixed(2)}h</td>
            <td style="color: #1b5e20; font-weight: bold;">${(row.he100 || 0).toFixed(2)}h</td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('✅ Tabela renderizada com sucesso!');
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('heChart');
    if (!ctx) {
        console.log('⚠️ Elemento heChart não encontrado');
        return;
    }
    
    if (graficoAtual) {
        graficoAtual.destroy();
    }
    
    if (dados.length === 0) {
        console.log('⚠️ Nenhum dado para renderizar gráfico');
        return;
    }
    
    // Filtrar apenas registros com horas extras
    const dadosComHE = dados.filter(row => (row.he50 && row.he50 > 0) || (row.he100 && row.he100 > 0));
    
    console.log(`📊 Renderizando gráfico com ${dadosComHE.length} registros com HE para ${usuarioLogado.nome}`);
    
    // Pegar últimos 20 registros com HE
    const dadosGrafico = dadosComHE.slice(0, 20).reverse();
    
    const labels = dadosGrafico.map(row => row.data);
    const he50Data = dadosGrafico.map(row => row.he50 || 0);
    const he100Data = dadosGrafico.map(row => row.he100 || 0);

    try {
        graficoAtual = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'HE 50%',
                        data: he50Data,
                        backgroundColor: 'rgba(46, 125, 50, 0.8)',
                        borderColor: 'rgba(46, 125, 50, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'HE 100%',
                        data: he100Data,
                        backgroundColor: 'rgba(76, 175, 80, 0.8)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Horas Extras - ${usuarioLogado.nome} - Últimos 20 Registros`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Horas',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Data',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico renderizado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao renderizar gráfico:', error);
    }
}
