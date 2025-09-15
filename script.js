// URL do arquivo Excel no GitHub
const EXCEL_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/refs/heads/main/base_dados.xlsx';

// Usuários e senhas (todos mostram dados do José Paulo)
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com.br', senha: 'efaro2024' },
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
        
        document.getElementById('userName').textContent = 'José Paulo';
        document.getElementById('userNameHeader').textContent = 'José Paulo';

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
// FUNÇÕES DE CÁLCULO DEFINITIVAS
// ========================================

// Função DEFINITIVA para verificar se é fim de semana
function isFimDeSemana(dia) {
    if (!dia) return false;
    
    const diaLimpo = dia.toLowerCase().trim();
    
    // Lista exata de fins de semana
    const finsDeSemanaPalavras = [
        'sábado', 'sabado', 'saturday', 'sab', 'sat',
        'domingo', 'sunday', 'dom', 'sun'
    ];
    
    const ehFimDeSemana = finsDeSemanaPalavras.includes(diaLimpo);
    
    if (ehFimDeSemana) {
        console.log(`🎯 FIM DE SEMANA DETECTADO: "${dia}"`);
    }
    
    return ehFimDeSemana;
}

// Função DEFINITIVA para converter hora para minutos
function timeToMinutes(time) {
    // Verificar se é vazio ou inválido
    if (!time || time === '-' || time === '00:00:00' || time === '00:00' || time === '' || time === '0') {
        return 0;
    }
    
    // Converter para string e limpar
    const timeStr = String(time).trim();
    
    // Se ainda estiver vazio
    if (!timeStr || timeStr === '0') return 0;
    
    // Dividir por ':'
    const parts = timeStr.split(':');
    
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        
        // Validar se são números válidos
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const totalMinutos = hours * 60 + minutes;
            console.log(`⏰ ${timeStr} = ${totalMinutos} minutos`);
            return totalMinutos;
        }
    }
    
    console.log(`⚠️ Hora inválida: "${time}"`);
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
    console.log(`\n🕐 CALCULANDO HORAS:`);
    console.log(`🕐 E1: "${entrada1}" | S1: "${saida1}" | E2: "${entrada2}" | S2: "${saida2}"`);
    
    let totalMinutos = 0;
    
    // Período 1 (manhã ou período único)
    const entrada1Min = timeToMinutes(entrada1);
    const saida1Min = timeToMinutes(saida1);
    
    if (entrada1Min > 0 && saida1Min > 0 && saida1Min > entrada1Min) {
        const periodo1 = saida1Min - entrada1Min;
        totalMinutos += periodo1;
        console.log(`🕐 Período 1: ${periodo1} minutos (${minutesToTime(periodo1)})`);
    }
    
    // Período 2 (tarde - só se existir)
    const entrada2Min = timeToMinutes(entrada2);
    const saida2Min = timeToMinutes(saida2);
    
    if (entrada2Min > 0 && saida2Min > 0 && saida2Min > entrada2Min) {
        const periodo2 = saida2Min - entrada2Min;
        totalMinutos += periodo2;
        console.log(`🕐 Período 2: ${periodo2} minutos (${minutesToTime(periodo2)})`);
    }
    
    console.log(`🕐 TOTAL TRABALHADO: ${totalMinutos} minutos = ${minutesToTime(totalMinutos)}`);
    return totalMinutos;
}

// Função DEFINITIVA para calcular horas extras
function calcularHorasExtras(expediente, totalMinutosTrabalhados, dia) {
    console.log(`\n📊 CALCULANDO HORAS EXTRAS:`);
    console.log(`📊 Dia: "${dia}"`);
    console.log(`📊 Total trabalhado: ${totalMinutosTrabalhados} min = ${minutesToTime(totalMinutosTrabalhados)}`);
    console.log(`📊 Expediente: "${expediente}"`);
    
    let he50 = 0;
    let he100 = 0;
    
    // REGRA 1: Se for fim de semana, TUDO é HE 100%
    if (isFimDeSemana(dia)) {
        he100 = totalMinutosTrabalhados / 60;
        console.log(`🎯 FIM DE SEMANA! TUDO vira HE 100%: ${he100.toFixed(2)}h`);
        return { he50, he100 };
    }
    
    // REGRA 2: Para dias úteis, calcular baseado no expediente
    const expedienteMinutos = timeToMinutes(expediente);
    console.log(`📊 Expediente em minutos: ${expedienteMinutos}`);
    
    // Se expediente for 0 ou inválido, tratar como fim de semana
    if (expedienteMinutos === 0) {
        he100 = totalMinutosTrabalhados / 60;
        console.log(`📊 EXPEDIENTE ZERO! TUDO vira HE 100%: ${he100.toFixed(2)}h`);
        return { he50, he100 };
    }
    
    // Calcular saldo de horas extras
    const saldoMinutos = totalMinutosTrabalhados - expedienteMinutos;
    console.log(`📊 Saldo: ${saldoMinutos} minutos`);
    
    if (saldoMinutos > 0) {
        // Primeiras 2 horas = HE 50%
        if (saldoMinutos <= 120) {
            he50 = saldoMinutos / 60;
            console.log(`📊 HE 50%: ${he50.toFixed(2)}h`);
        } else {
            // Primeiras 2h = HE 50%, resto = HE 100%
            he50 = 2; // 2 horas fixas
            he100 = (saldoMinutos - 120) / 60;
            console.log(`📊 HE 50%: ${he50.toFixed(2)}h | HE 100%: ${he100.toFixed(2)}h`);
        }
    } else {
        console.log(`📊 SEM HORAS EXTRAS`);
    }
    
    console.log(`📊 RESULTADO: HE50=${he50.toFixed(2)}h | HE100=${he100.toFixed(2)}h`);
    return { he50, he100 };
}

// Função DEFINITIVA para processar dados (SEM PERDER REGISTROS)
function processarDadosUsuario() {
    console.log('\n🚀 INICIANDO PROCESSAMENTO DOS DADOS...');
    const dadosUsuario = [];
    
    if (!dadosExcel) {
        console.log('❌ Dados Excel não disponíveis');
        return dadosUsuario;
    }
    
    // Processar cada aba
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
            
            console.log(`\n📝 Linha ${i}: Data="${data}", Dia="${dia}"`);
            console.log(`📝 Horários: E1="${entrada1}", S1="${saida1}", E2="${entrada2}", S2="${saida2}", Exp="${expediente}"`);
            
            // Verificar se tem uma data válida (CRITÉRIO MAIS FLEXÍVEL)
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
                console.log(`✅ REGISTRO ADICIONADO: ${data} - ${dia} - Total: ${totalFormatado} - HE50: ${horasExtras.he50.toFixed(2)}h - HE100: ${horasExtras.he100.toFixed(2)}h`);
            } else {
                console.log(`⚠️ Linha ${i} ignorada - data inválida: "${data}"`);
            }
        }
    });
    
    // Ordenar por data (mais recente primeiro)
    dadosUsuario.sort((a, b) => new Date(b.dataOriginal) - new Date(a.dataOriginal));
    
    console.log(`\n🎉 PROCESSAMENTO CONCLUÍDO!`);
    console.log(`🎉 TOTAL DE REGISTROS PROCESSADOS: ${dadosUsuario.length}`);
    
    // Mostrar resumo das HE
    const totalHE50 = dadosUsuario.reduce((sum, row) => sum + (row.he50 || 0), 0);
    const totalHE100 = dadosUsuario.reduce((sum, row) => sum + (row.he100 || 0), 0);
    console.log(`🎉 TOTAL HE 50%: ${totalHE50.toFixed(2)}h`);
    console.log(`🎉 TOTAL HE 100%: ${totalHE100.toFixed(2)}h`);
    
    // Mostrar todos os registros processados
    console.log(`\n📋 LISTA DE TODOS OS REGISTROS:`);
    dadosUsuario.forEach((reg, index) => {
        console.log(`📋 ${index + 1}. ${reg.data} - ${reg.dia} - ${reg.total} - HE50: ${reg.he50.toFixed(2)}h - HE100: ${reg.he100.toFixed(2)}h`);
    });
    
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
    console.log('🔄 Carregando dados...');
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
    
    console.log('\n📊 ATUALIZANDO ESTATÍSTICAS:');
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
        tr.innerHTML = '<td colspan="10" style="text-align: center; padding: 20px; color: #666;">Nenhum dado encontrado</td>';
        tbody.appendChild(tr);
        return;
    }

    console.log(`📋 Renderizando tabela com ${dados.length} registros`);

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
            console.log(`🎯 Destacando fim de semana: ${row.data} - ${row.dia}`);
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
    
    console.log(`📊 Renderizando gráfico com ${dadosComHE.length} registros com HE`);
    
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
                        text: 'Horas Extras - José Paulo - Últimos 20 Registros',
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
