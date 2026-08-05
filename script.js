// --- VARIABLES GLOBALES NUEVAS ---
let tamanoTablero = 9;
let avatarJugador = "😃";
let avatarOponente = "🤖";

// Temporizadores
let tiempoTotal = 180; // 3 minutos en segundos
let tiempoTurno = 15; // 15 segundos
let timerInterval;

// --- CONFIGURACIÓN ---
function guardarConfig() {
    // (Mismo código de antes) +
    avatarJugador = document.getElementById('select-avatar').value;
    document.getElementById('ficha-p1').innerText = avatarJugador;
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

// Modificar procesarClic para incluir sonidos e indicadores
function procesarClic(x, y) {
    // ... (lógica anterior de validación de movimiento/pared) ...

    if (movimientoValido) {
        reproducirSonido(accionActual);
        tiempoTurno = 15; // Resetear timer de turno
        
        // Indicador de último movimiento
        document.querySelectorAll('.ultimo-movimiento').forEach(el => el.classList.remove('ultimo-movimiento'));
        let celdaDOM = document.querySelector(`.celda[data-x="${x}"][data-y="${y}"]`);
        if(celdaDOM) celdaDOM.classList.add('ultimo-movimiento');

        actualizarPosicionesFichas();
        
        // ... (resto de lógica de turnos y Firebase)
    }
}

// --- MULTIJUGADOR: CHAT EMOJIS Y MATCHMAKING GLOBAL ---
function enviarEmoji(emoji) {
    if (modoJuego !== 'online') return;
    db.ref('salas/' + salaActual + '/chat').set({
        emisor: nombreJugador,
        icono: emoji,
        timestamp: Date.now()
    });
}

// Escuchar chat en la función escucharSala()
function escucharChat(codigo) {
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
    db.ref('matchmaking/cola').push({
        nombre: nombreJugador,
        avatar: avatarJugador,
        elo: 1000 // Para implementar ELO a futuro
    }).then(() => {
        // Acá el servidor o el mismo cliente debería emparejar a dos usuarios
        // de la cola y crearles una sala privada automáticamente.
    });
}
