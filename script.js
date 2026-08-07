// --- VARIABLES BASE (Para que el resto del código funcione) ---
let db; 
let modoJuego = 'ia';
let turno = 1;
let miRol = 1;
let p1 = { x: 4, y: 8, paredes: 10 };
let p2 = { x: 4, y: 0, paredes: 10 };
let accionActual = 'mover';
let orientacionPared = 'horizontal';
let nombreJugador = "Jugador";
let salaActual = "";

// --- VARIABLES GLOBALES NUEVAS ---
let tamanoTablero = 9;
let avatarJugador = "😃";
let avatarOponente = "🤖";

// Temporizadores
let tiempoTotal = 180; // 3 minutos en segundos
let tiempoTurno = 15; // 15 segundos
let timerInterval;

// --- FUNCIONES DE NAVEGACIÓN Y MENÚS (Faltaban) ---
function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

function iniciarJuego(modo) {
    modoJuego = modo;
    iniciarJuegoTablero();
}

function crearSala() {
    alert("Función Crear Sala en desarrollo...");
}

function unirseSala() {
    alert("Función Unirse a Sala en desarrollo...");
}

// --- CONFIGURACIÓN ---
function guardarConfig() {
    let inputNombre = document.getElementById('input-nombre').value;
    if(inputNombre.trim() !== "") {
        nombreJugador = inputNombre;
        document.getElementById('nombre-menu').innerText = nombreJugador;
    }
    
    let colorPared = document.getElementById('input-color-pared').value;
    document.documentElement.style.setProperty('--color-pared', colorPared);

    avatarJugador = document.getElementById('select-avatar').value;
    document.getElementById('ficha-p1').innerText = avatarJugador;
    
    mostrarPantalla('pantalla-inicio');
}

// --- JUGABILIDAD: CONTROLES DEL JUEGO (Faltaban) ---
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

function dibujarTablero() {
    const tablero = document.getElementById('tablero');
    tablero.innerHTML = '';
    for (let y = 0; y < tamanoTablero; y++) {
        for (let x = 0; x < tamanoTablero; x++) {
            let celda = document.createElement('div');
            celda.className = 'celda';
            celda.dataset.x = x;
            celda.dataset.y = y;
            celda.onclick = () => procesarClic(x, y);
            tablero.appendChild(celda);
        }
    }
}

// --- JUGABILIDAD: TAMAÑOS Y TIEMPO ---
function iniciarJuegoTablero() {
    tamanoTablero = parseInt(document.getElementById('select-tamano').value);
    
    // Ajustar posiciones iniciales según el tamaño
    let centro = Math.floor(tamanoTablero / 2);
    p1 = { x: centro, y: tamanoTablero - 1, paredes: tamanoTablero + 1 };
    p2 = { x: centro, y: 0, paredes: tamanoTablero + 1 };
    
    // Configurar CSS dinámico
    const tablero = document.getElementById('tablero');
    tablero.style.gridTemplateColumns = `repeat(${tamanoTablero}, 40px)`;
    tablero.style.gridTemplateRows = `repeat(${tamanoTablero}, 40px)`;

    cambiarAccion('mover');
    iniciarCronometros();
    dibujarTablero();
    actualizarPosicionesFichas();
    document.getElementById('turno-texto').innerText = "Tu turno";
    mostrarPantalla('pantalla-juego');
}

function iniciarCronometros() {
    clearInterval(timerInterval);
    tiempoTotal = 180;
    tiempoTurno = 15;
    
    timerInterval = setInterval(() => {
        tiempoTotal--;
        if(modoJuego === 'online' && turno === miRol) tiempoTurno--;
        else if (modoJuego === 'ia' && turno === 1) tiempoTurno--;

        document.getElementById('tiempo-total').innerText = 
            `0${Math.floor(tiempoTotal/60)}:${(tiempoTotal%60).toString().padStart(2, '0')}`;
        document.getElementById('tiempo-turno').innerText = tiempoTurno;

        if (tiempoTotal <= 0 || tiempoTurno <= 0) {
            clearInterval(timerInterval);
            alert("¡Se acabó el tiempo!");
            // Lógica de pérdida por tiempo
        }
    }, 1000);
}

// --- VISUALES: ANIMACIONES Y SONIDO ---
function reproducirSonido(tipo) {
    try {
        let audio = document.getElementById(tipo === 'mover' ? 'sonido-mover' : 'sonido-pared');
        audio.currentTime = 0;
        audio.play();
    } catch(e) {} // Prevenir errores si el navegador bloquea el audio
}

function actualizarPosicionesFichas() {
    // Calculamos la posición en base al tamaño de celda (40px) y el gap (5px)
    let f1 = document.getElementById('ficha-p1');
    let f2 = document.getElementById('ficha-p2');
    
    // El +5 es por el padding del contenedor
    f1.style.left = (p1.x * 45 + 5) + "px";
    f1.style.top = (p1.y * 45 + 5) + "px";
    
    f2.style.left = (p2.x * 45 + 5) + "px";
    f2.style.top = (p2.y * 45 + 5) + "px";
}

function procesarClic(x, y) {
    // Simulamos que el movimiento es válido para que veas la interacción
    // (Aquí va tu lógica real de validación de movimiento/pared)
    let movimientoValido = true; 

    if (movimientoValido) {
        if (accionActual === 'mover') {
            if (turno === 1) { p1.x = x; p1.y = y; }
            else { p2.x = x; p2.y = y; }
        }

        reproducirSonido(accionActual);
        tiempoTurno = 15; // Resetear timer de turno
        
        // Indicador de último movimiento
        document.querySelectorAll('.ultimo-movimiento').forEach(el => el.classList.remove('ultimo-movimiento'));
        let celdaDOM = document.querySelector(`.celda[data-x="${x}"][data-y="${y}"]`);
        if(celdaDOM) celdaDOM.classList.add('ultimo-movimiento');

        actualizarPosicionesFichas();
        
        // Rotar turno de prueba
        turno = turno === 1 ? 2 : 1;
        document.getElementById('turno-texto').innerText = turno === 1 ? "Tu turno" : "Turno del oponente";
    }
}

// --- MULTIJUGADOR: CHAT EMOJIS Y MATCHMAKING GLOBAL ---
function enviarEmoji(emoji) {
    if (modoJuego !== 'online' || typeof db === 'undefined') return;
    db.ref('salas/' + salaActual + '/chat').set({
        emisor: nombreJugador,
        icono: emoji,
        timestamp: Date.now()
    });
}

// Escuchar chat
function escucharChat(codigo) {
    if(typeof db === 'undefined') return;
    db.ref('salas/' + codigo + '/chat').on('value', (snapshot) => {
        let chat = snapshot.val();
        if(chat) {
            document.getElementById('mensaje-chat').innerText = `${chat.emisor}: ${chat.icono}`;
            setTimeout(() => document.getElementById('mensaje-chat').innerText = "", 3000);
        }
    });
}

// Estructura base para el Matchmaking Global
function buscarPartidaGlobal() {
    alert("Buscando oponente aleatorio...");
    if(typeof db === 'undefined') return;
    db.ref('matchmaking/cola').push({
        nombre: nombreJugador,
        avatar: avatarJugador,
        elo: 1000 // Para implementar ELO a futuro
    }).then(() => {
        // Acá el servidor o el mismo cliente debería emparejar a dos usuarios
        // de la cola y crearles una sala privada automáticamente.
    });
}
