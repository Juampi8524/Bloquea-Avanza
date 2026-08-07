// --- VARIABLES BASE Y MULTIJUGADOR ---
let db; // Asume que Firebase se inicializa en el HTML
let modoJuego = 'ia';
let turno = 1;
let miRol = 1;
let p1 = { x: 4, y: 8, paredes: 10, metaY: 0, color: 'blue' };
let p2 = { x: 4, y: 0, paredes: 10, metaY: 8, color: 'red' };
let accionActual = 'mover';
let orientacionPared = 'horizontal';
let nombreJugador = "Jugador";
let salaActual = "";
let paredesTablero = []; // Guarda las paredes colocadas

// --- VARIABLES GLOBALES NUEVAS ---
let tamanoTablero = 9;
let avatarJugador = "😃";
let avatarOponente = "🤖";

// Temporizadores Blitz
let tiempoP1 = 180; 
let tiempoP2 = 180; 
let timerInterval;

// --- FUNCIONES DE NAVEGACIÓN Y MENÚS ---
function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

function iniciarJuego(modo) {
    modoJuego = modo;
    iniciarJuegoTablero();
}

// --- SALAS PRIVADAS (MULTIJUGADOR) ---
function crearSala() {
    let codigo = Math.floor(100000 + Math.random() * 900000).toString();
    salaActual = codigo;
    miRol = 1;
    alert(`Tu código de sala es: ${codigo}. Compártelo con tu amigo.`);
    
    // Lógica Firebase (Requiere db inicializada)
    if(typeof db !== 'undefined') {
        db.ref('salas/' + codigo).set({
            estado: 'esperando',
            p1: { nombre: nombreJugador, avatar: avatarJugador }
        });
        escucharSala(codigo);
    }
    mostrarPantalla('pantalla-jugar'); // Ir a config de tablero antes de iniciar
}

function unirseSala() {
    let codigo = prompt("Ingresa el código de 6 dígitos de la sala:");
    if(codigo && codigo.length === 6) {
        salaActual = codigo;
        miRol = 2;
        if(typeof db !== 'undefined') {
            db.ref('salas/' + codigo).update({
                estado: 'jugando',
                p2: { nombre: nombreJugador, avatar: avatarJugador }
            });
            escucharSala(codigo);
        }
        alert("Te has unido a la sala. Esperando que el líder inicie la partida...");
    } else {
        alert("Código no válido.");
    }
}

// --- CONFIGURACIÓN ---
function guardarConfig() {
    let inputNombre = document.getElementById('input-nombre').value;
    if(inputNombre.trim() !== "") {
        nombreJugador = inputNombre;
        document.getElementById('nombre-menu').innerText = nombreJugador;
    }
    
    avatarJugador = document.getElementById('select-avatar').value;
    document.getElementById('ficha-p1').innerText = avatarJugador;
    mostrarPantalla('pantalla-inicio');
}

// --- JUGABILIDAD Y TABLERO ---
function cambiarAccion(accion) {
    accionActual = accion;
    document.getElementById('btn-mover').classList.remove('activo');
    document.getElementById('btn-pared').classList.remove('activo');
    
    if(accion === 'mover') {
        document.getElementById('btn-mover').classList.add('activo');
        document.getElementById('btn-orientacion').style.display = 'none';
    } else {
        document.getElementById('btn-pared').classList.add('activo');
        document.getElementById('btn-orientacion').style.display = 'inline-block';
    }
}

function alternarOrientacion() {
    let btn = document.getElementById('btn-orientacion');
    if (orientacionPared === 'horizontal') {
        orientacionPared = 'vertical';
        btn.innerText = 'Dir: Vertical';
    } else {
        orientacionPared = 'horizontal';
        btn.innerText = 'Dir: Horizontal';
    }
}

function iniciarJuegoTablero() {
    tamanoTablero = parseInt(document.getElementById('select-tamano').value);
    
    let centro = Math.floor(tamanoTablero / 2);
    let cantParedes = Math.floor(tamanoTablero * 1.2); // Escala paredes por tamaño
    
    p1 = { x: centro, y: tamanoTablero - 1, paredes: cantParedes, metaY: 0, color: 'blue' };
    p2 = { x: centro, y: 0, paredes: cantParedes, metaY: tamanoTablero - 1, color: 'red' };
    paredesTablero = [];
    turno = 1;
    
    const tablero = document.getElementById('tablero');
    tablero.style.gridTemplateColumns = `repeat(${tamanoTablero}, 40px)`;
    tablero.style.gridTemplateRows = `repeat(${tamanoTablero}, 40px)`;
    tablero.innerHTML = '';
    
    for (let y = 0; y < tamanoTablero; y++) {
        for (let x = 0; x < tamanoTablero; x++) {
            let celda = document.createElement('div');
            celda.className = 'celda';
            celda.dataset.x = x;
            celda.dataset.y = y;
            celda.onclick = () => procesarClic(x, y);
            
            // Hover para ayudar visualmente dónde se pondrá la pared
            celda.onmouseover = () => simularPared(celda, x, y);
            celda.onmouseout = () => celda.style.boxShadow = 'none';
            
            tablero.appendChild(celda);
        }
    }

    // Configurar CSS de fichas
    document.getElementById('ficha-p1').style.background = p1.color;
    document.getElementById('ficha-p2').style.background = p2.color;

    cambiarAccion('mover');
    iniciarCronometros();
    actualizarPosicionesFichas();
    document.getElementById('turno-texto').innerText = "Tu turno";
    document.getElementById('paredes-p1').innerText = p1.paredes;
    mostrarPantalla('pantalla-juego');
}

// Ayuda visual para paredes
function simularPared(celda, x, y) {
    if(accionActual !== 'pared') return;
    celda.style.boxShadow = orientacionPared === 'horizontal' 
        ? 'inset 0 -5px 0 yellow' 
        : 'inset -5px 0 0 yellow';
}

function iniciarCronometros() {
    clearInterval(timerInterval);
    tiempoP1 = 180;
    tiempoP2 = 180;
    
    timerInterval = setInterval(() => {
        if(turno === 1) tiempoP1--;
        else tiempoP2--;

        let tActivo = miRol === 1 ? tiempoP1 : tiempoP2;
        let tRival = miRol === 1 ? tiempoP2 : tiempoP1;

        document.getElementById('tiempo-total').innerText = 
            `0${Math.floor(tActivo/60)}:${(tActivo%60).toString().padStart(2, '0')} (Tú)`;
        document.getElementById('tiempo-turno').innerText = 
            `${Math.floor(tRival/60)}:${(tRival%60).toString().padStart(2, '0')} (Rival)`;

        if (tiempoP1 <= 0 || tiempoP2 <= 0) {
            clearInterval(timerInterval);
            let ganador = tiempoP1 <= 0 ? "Jugador 2" : "Jugador 1";
            alert(`¡Se acabó el tiempo! Gana ${ganador}`);
            mostrarPantalla('pantalla-inicio');
        }
    }, 1000);
}

function actualizarPosicionesFichas() {
    let f1 = document.getElementById('ficha-p1');
    let f2 = document.getElementById('ficha-p2');
    
    f1.style.left = (p1.x * 45 + 5) + "px";
    f1.style.top = (p1.y * 45 + 5) + "px";
    
    f2.style.left = (p2.x * 45 + 5) + "px";
    f2.style.top = (p2.y * 45 + 5) + "px";
}

// --- LÓGICA DE MOVIMIENTO Y PAREDES ---
function procesarClic(x, y) {
    if (accionActual === 'mover') {
        // Validación básica de 1 casilla (sin salto por ahora)
        let jugadorActual = turno === 1 ? p1 : p2;
        let distX = Math.abs(jugadorActual.x - x);
        let distY = Math.abs(jugadorActual.y - y);
        
        if ((distX === 1 && distY === 0) || (distX === 0 && distY === 1)) {
            if (turno === 1) { p1.x = x; p1.y = y; }
            else { p2.x = x; p2.y = y; }
            ejecutarTurno();
        } else {
            alert("Movimiento inválido.");
        }
    } else {
        let jugadorActual = turno === 1 ? p1 : p2;
        if (jugadorActual.paredes <= 0) {
            alert("No te quedan paredes.");
            return;
        }

        // Agregar pared temporalmente para chequear camino
        let nuevaPared = { x, y, orientacion: orientacionPared };
        paredesTablero.push(nuevaPared);
        
        if (!existeCamino(p1) || !existeCamino(p2)) {
            paredesTablero.pop(); // Revertir
            alert("¡Movimiento ilegal! Estás encerrando a un jugador sin salida a su meta.");
            return;
        }

        // Si es válido, aplicamos estilos
        let celdaDOM = document.querySelector(`.celda[data-x="${x}"][data-y="${y}"]`);
        if (orientacionPared === 'horizontal') celdaDOM.classList.add('pared-abajo');
        else celdaDOM.classList.add('pared-derecha');
        
        jugadorActual.paredes--;
        document.getElementById('paredes-p1').innerText = miRol === 1 ? p1.paredes : p2.paredes;
        ejecutarTurno();
    }
}

function ejecutarTurno() {
    reproducirSonido(accionActual);
    actualizarPosicionesFichas();
    
    // Rotar turno
    turno = turno === 1 ? 2 : 1;
    document.getElementById('turno-texto').innerText = turno === miRol ? "Tu turno" : "Turno del oponente";
    
    // Validar Victoria
    if(p1.y === p1.metaY) { alert("¡Jugador 1 Gana!"); mostrarPantalla('pantalla-inicio'); }
    if(p2.y === p2.metaY) { alert("¡Jugador 2 Gana!"); mostrarPantalla('pantalla-inicio'); }
}

// --- ALGORITMO BFS (VERIFICAR CAMINO) ---
function existeCamino(jugador) {
    let visitados = new Set();
    let cola = [{ x: jugador.x, y: jugador.y }];
    visitados.add(`${jugador.x},${jugador.y}`);

    while (cola.length > 0) {
        let actual = cola.shift();

        if (actual.y === jugador.metaY) return true;

        let movimientos = [
            { dx: 0, dy: -1 }, // Arriba
            { dx: 0, dy: 1 },  // Abajo
            { dx: -1, dy: 0 }, // Izquierda
            { dx: 1, dy: 0 }   // Derecha
        ];

        for (let mov of movimientos) {
            let nx = actual.x + mov.dx;
            let ny = actual.y + mov.dy;

            // Limites del tablero
            if (nx >= 0 && nx < tamanoTablero && ny >= 0 && ny < tamanoTablero) {
                // AQUÍ iría la validación para cruzar paredes (simplificado para el script)
                // Se debe cruzar la lista paredesTablero para ver si bloquea este paso exacto.
                
                let key = `${nx},${ny}`;
                if (!visitados.has(key)) {
                    visitados.add(key);
                    cola.push({ x: nx, y: ny });
                }
            }
        }
    }
    return false;
}

// --- VISUALES Y SONIDO ---
function reproducirSonido(tipo) {
    try {
        let audio = document.getElementById(tipo === 'mover' ? 'sonido-mover' : 'sonido-pared');
        audio.currentTime = 0;
        audio.play();
    } catch(e) {} 
}
