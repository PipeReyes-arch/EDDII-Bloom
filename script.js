// ==================== CONFIGURACIÓN GLOBAL ====================
const Math_log = (x) => Math.log(x);
const Math_ln2 = Math.log(2);
let currentZoom = 1;
let filtro = null;

// ==================== CLASE FILTRO DE BLOOM ====================
class FiltroDeBloom {
    constructor(elementos_esperados, prob_falso_positivo) {
        this.n = elementos_esperados;
        this.p = prob_falso_positivo;
        
        this.m = this._calcularTamañoArreglo(this.n, this.p);
        this.k = this._calcularCantidadHashes(this.m, this.n);
        
        this.arreglo_bits = new Array(this.m).fill(0);
        this.palabras_insertadas = [];
        
        console.log(`✅ Filtro creado: m=${this.m}, k=${this.k}`);
    }

    _calcularTamañoArreglo(n, p) {
        const m = -(n * Math_log(p)) / (Math_ln2 ** 2);
        return Math.ceil(m);
    }

    _calcularCantidadHashes(m, n) {
        const k = (m / n) * Math_ln2;
        return Math.max(1, Math.ceil(k));
    }

    _hashMD5Simple(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    _generarIndicesHash(item) {
        const indices = [];
        const item_string = String(item).toLowerCase();
        
        for (let i = 0; i < this.k; i++) {
            const texto_a_hashear = `${i}:${item_string}`;
            const hash_valor = this._hashMD5Simple(texto_a_hashear);
            const indice_final = hash_valor % this.m;
            indices.push(indice_final);
        }
        
        return [...new Set(indices)];
    }

    insertar(item) {
        if (this.palabras_insertadas.includes(item)) {
            return { 
                success: false, 
                message: `⚠️ "${item}" ya fue insertada anteriormente.` 
            };
        }
        
        const indices = this._generarIndicesHash(item);
        indices.forEach(indice => {
            this.arreglo_bits[indice] = 1;
        });
        
        this.palabras_insertadas.push(item);
        console.log(`✅ Insertada: ${item}, Bits: ${indices.join(', ')}`);
        
        return { 
            success: true, 
            message: `✅ Insertado: "${item}" → Bits encendidos: ${indices.join(', ')}`,
            indices: indices
        };
    }

    consultar(item) {
        const indices = this._generarIndicesHash(item);
        
        for (let indice of indices) {
            if (this.arreglo_bits[indice] === 0) {
                return { 
                    found: false, 
                    message: `❌ "${item}": Definitivamente NO existe` 
                };
            }
        }
        
        if (this.palabras_insertadas.includes(item)) {
            return { 
                found: true, 
                isPositivo: true,
                message: `✅ "${item}": Probablemente SÍ (Verdadero Positivo)` 
            };
        } else {
            return { 
                found: true, 
                isPositivo: false,
                message: `⚠️ "${item}": Probablemente SÍ (¡FALSO POSITIVO!)` 
            };
        }
    }

    obtenerEstadisticas() {
        const bitsEncendidos = this.arreglo_bits.filter(bit => bit === 1).length;
        const porcentaje = (bitsEncendidos / this.m) * 100;
        const memoriaEstimada = (this.m / 8 / 1024).toFixed(2);
        
        return {
            bitsEncendidos,
            bitsApagados: this.m - bitsEncendidos,
            totalBits: this.m,
            porcentaje,
            elementosInsertados: this.palabras_insertadas.length,
            memoriaEstimada
        };
    }
}

// ==================== FUNCIONES DE INTERFAZ ====================
function crearFiltro() {
    const elementos = parseInt(document.getElementById('elementos_esperados').value);
    const probabilidad = parseFloat(document.getElementById('prob_falso_positivo').value);
    
    if (isNaN(elementos) || elementos < 10) {
        mostrarError('❌ Los elementos esperados deben ser al menos 10');
        return;
    }
    
    if (isNaN(probabilidad) || probabilidad <= 0 || probabilidad >= 1) {
        mostrarError('❌ La probabilidad debe estar entre 0 y 1');
        return;
    }
    
    filtro = new FiltroDeBloom(elementos, probabilidad);
    currentZoom = 1;
    
    document.getElementById('info_m').textContent = filtro.m;
    document.getElementById('info_k').textContent = filtro.k;
    
    const stats = filtro.obtenerEstadisticas();
    document.getElementById('info_memoria').textContent = `${stats.memoriaEstimada} KB`;
    
    const infoDiv = document.getElementById('info_config');
    infoDiv.innerHTML = `
        <p>✅ <strong>Filtro creado exitosamente!</strong></p>
        <p>Array de <strong>${filtro.m}</strong> bits, usando <strong>${filtro.k}</strong> funciones hash</p>
    `;
    
    renderizarBits();
    limpiarMensajes();
    
    console.log('Filtro listo para usar');
}

function renderizarBits() {
    const container = document.getElementById('bits_container');
    container.innerHTML = '';
    
    if (!filtro) return;
    
    const bitSize = 30 * currentZoom;
    
    for (let i = 0; i < filtro.m; i++) {
        const bitDiv = document.createElement('div');
        bitDiv.className = `bit ${filtro.arreglo_bits[i] === 1 ? 'on' : 'off'}`;
        bitDiv.textContent = filtro.arreglo_bits[i];
        bitDiv.title = `Bit ${i}: ${filtro.arreglo_bits[i] === 1 ? 'Encendido' : 'Apagado'}`;
        bitDiv.style.width = `${bitSize}px`;
        bitDiv.style.height = `${bitSize}px`;
        bitDiv.style.fontSize = `${0.8 * currentZoom}em`;
        
        container.appendChild(bitDiv);
    }
    
    actualizarEstadisticas();
}

function actualizarEstadisticas() {
    if (!filtro) return;
    
    const stats = filtro.obtenerEstadisticas();
    document.getElementById('bits_encendidos').textContent = stats.bitsEncendidos;
    document.getElementById('bits_totales').textContent = stats.totalBits;
    document.getElementById('ocupacion').textContent = stats.porcentaje.toFixed(2) + '%';
    document.getElementById('progress_fill').style.width = stats.porcentaje + '%';
    document.getElementById('info_elementos').textContent = stats.elementosInsertados;
}

function insertar() {
    if (!filtro) {
        mostrarError('⚠️ Primero debe crear un filtro');
        return;
    }
    
    const palabra = document.getElementById('palabra_insertar').value.trim();
    
    if (!palabra) {
        mostrarError('❌ Por favor ingresa una palabra válida');
        return;
    }
    
    const resultado = filtro.insertar(palabra);
    const messageBox = document.getElementById('message_insertar');
    
    if (resultado.success) {
        messageBox.className = 'message-box success';
        messageBox.textContent = resultado.message;
        document.getElementById('palabra_insertar').value = '';
        renderizarBits();
        actualizarPalabrasInsertadas();
    } else {
        messageBox.className = 'message-box warning';
        messageBox.textContent = resultado.message;
    }
}

function consultar() {
    if (!filtro) {
        mostrarError('⚠️ Primero debe crear un filtro');
        return;
    }
    
    const palabra = document.getElementById('palabra_consultar').value.trim();
    
    if (!palabra) {
        mostrarError('❌ Por favor ingresa una palabra válida');
        return;
    }
    
    const resultado = filtro.consultar(palabra);
    const messageBox = document.getElementById('message_consultar');
    
    if (resultado.found) {
        messageBox.className = resultado.isPositivo ? 'message-box success' : 'message-box warning';
    } else {
        messageBox.className = 'message-box danger';
    }
    
    messageBox.textContent = resultado.message;
    document.getElementById('palabra_consultar').value = '';
}

function actualizarPalabrasInsertadas() {
    if (!filtro) return;
    
    const palabrasList = document.getElementById('palabras_list');
    
    if (filtro.palabras_insertadas.length === 0) {
        palabrasList.innerHTML = '<p style="text-align: center; color: #999; grid-column: 1/-1;">No hay palabras insertadas aún</p>';
        return;
    }
    
    palabrasList.innerHTML = filtro.palabras_insertadas
        .map((palabra, index) => `
            <div class="palabra-item">
                <span class="palabra-nombre">${index + 1}. ${palabra}</span>
                <span class="palabra-indice">#${index + 1}</span>
            </div>
        `)
        .join('');
}

function cambiarTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(`tab_${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    event.target.classList.add('active');
    
    if (tabName === 'palabras') {
        actualizarPalabrasInsertadas();
    }
}

function zoomBits(direction) {
    if (!filtro) return;
    
    currentZoom += direction * 0.2;
    currentZoom = Math.max(0.5, Math.min(2, currentZoom));
    
    document.getElementById('zoom_level').textContent = (currentZoom * 100).toFixed(0) + '%';
    renderizarBits();
}

function toggleTheme() {
    const html = document.documentElement;
    const isDarkMode = html.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.querySelector('.theme-toggle').textContent = isDarkMode ? '☀️' : '🌙';
}

function mostrarError(mensaje) {
    alert(mensaje);
}

function limpiarMensajes() {
    document.getElementById('message_insertar').innerHTML = '';
    document.getElementById('message_consultar').innerHTML = '';
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Sincronizar sliders con inputs
    document.getElementById('elementos_slider')?.addEventListener('input', (e) => {
        document.getElementById('elementos_esperados').value = e.target.value;
    });
    
    document.getElementById('probabilidad_slider')?.addEventListener('input', (e) => {
        document.getElementById('prob_falso_positivo').value = e.target.value;
    });
    
    document.getElementById('elementos_esperados')?.addEventListener('change', (e) => {
        document.getElementById('elementos_slider').value = e.target.value;
    });
    
    document.getElementById('prob_falso_positivo')?.addEventListener('change', (e) => {
        document.getElementById('probabilidad_slider').value = e.target.value;
    });
    
    // Enter para enviar
    document.getElementById('palabra_insertar')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') insertar();
    });
    
    document.getElementById('palabra_consultar')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') consultar();
    });
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.querySelector('.theme-toggle').textContent = '☀️';
    }
    
    console.log('🚀 Filtro de Bloom listo');
});
