// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBxCFP3QPKXAQ2RGvJggVeIZU_ckoPmBr4",
    authDomain: "chapas-42a4b.firebaseapp.com",
    databaseURL: "https://chapas-42a4b-default-rtdb.firebaseio.com",
    projectId: "chapas-42a4b",
    storageBucket: "chapas-42a4b.firebasestorage.app",
    messagingSenderId: "456792916464",
    appId: "1:456792916464:web:ceb1bdd9c3ad78bd595d35"
};

// Inicializar Firebase (Versión Clásica)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- VARIABLES GLOBALES ---
let salaActual = null;
let miRol = 1; 
let juegoIniciadoOnline = false;
let nombreJugador = "Jugador";
let nombreOponente = "Oponente";

let modoJuego = 'ia';
let turno = 1; 
let accionActual = 'mover'; 
let p1 = { x: 4, y: 8, paredes: 10 }; 
let p2 = { x: 4, y: 0, paredes: 10 }; 
let paredesEnTablero = [];

// --- INICIO Y CONFIGURACIÓN ---
window.onload = () => {
    let nombreGuardado = localStorage.getItem('nombreJugadorBA');
    if(nombreGuardado) {
        nombreJugador = nombreGuardado;
    }
    document.getElementById('input-nombre').value = nombreJugador;
    document.getElementById('nombre-menu').innerText = nombreJugador;
};

function mostrarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(idPantalla).classList.add('activa');
}

function guardarConfig() {
    let valor = document.getElementById('input-nombre').value.trim();
    if(valor !== "") {
        nombreJugador = valor;
        localStorage.setItem('nombreJugadorBA', nombreJugador);
        document.getElementById('nombre-menu').innerText = nombreJugador;
    }
    mostrarPantalla('pantalla-inicio');
}

function cambiarAccion(accion) {
    accionActual = accion;
    document.getElementById('btn-mover').classList.toggle('activo', accion === 'mover');
    document.getElementById('btn-pared').classList.toggle('activo', accion === 'pared');
}

// --- CREAR Y UNIRSE A SALAS ---
function crearSala() {
    let codigo = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    miRol = 1; 
    salaActual = codigo;
    modoJuego = 'online';
    juegoIniciadoOnline = false;

    db.ref('salas/' + codigo).set({
        estado: 'esperando',
        p1Nombre: nombreJugador,
        p2Nombre: '',
        turno: 1,
        p1: { x: 4, y: 8, paredes: 10 },
        p2: { x: 4, y: 0, paredes: 10 },
        paredesEnTablero: []
    });

    document.getElementById('codigo-sala-ui').innerText = codigo;
    document.getElementById('mensaje-espera').innerText = "Pasale el código a tu amigo y esperá a que se una...";
    document.getElementById('jugadores-sala').innerText = nombreJugador + " (Azul) VS ...";
    document.getElementById('btn-empezar').style.display = 'none';

    mostrarPantalla('pantalla-espera');
    escucharSala(codigo);
}

function unirseSala() {
    document.getElementById('input-codigo').value = ''; 
    document.getElementById('modal-unirse').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-unirse').style.display = 'none';
}

function confirmarUnirse() {
    let codigo = document.getElementById('input-codigo').value.trim();
    
    if (!codigo || codigo.length !== 6) {
        alert("El código debe tener exactamente 6 números.");
        return;
    }

    db.ref('salas/' + codigo).once('value').then((snapshot) => {
        if (snapshot.exists() && snapshot.val().estado === 'esperando') {
            miRol = 2; 
            salaActual = codigo;
            modoJuego = 'online';
            
            db.ref('salas/' + codigo).update({ 
                estado: 'listo',
                p2Nombre: nombreJugador
            });
            
            cerrarModal(); 
            document.getElementById('codigo-sala-ui').innerText = codigo;
            mostrarPantalla('pantalla-espera');
            escucharSala(codigo);
        } else {
            alert("No se encontró la sala o la partida ya empezó.");
        }
    });
}

function escucharSala(codigo) {
    db.ref('salas/' + codigo).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (!juegoIniciadoOnline) {
            if (data.estado === 'listo') {
                document.getElementById('jugadores-sala').innerText = data.p1Nombre + " (Azul) VS " + data.p2Nombre + " (Rojo)";
                
                if (miRol === 1) {
                    document.getElementById('mensaje-espera').innerText = "¡" + data.p2Nombre + " se unió!";
                    document.getElementById('btn-empezar').style.display = 'block'; 
                } else {
                    document.getElementById('mensaje-espera').innerText = "Esperando a que " + data.p1Nombre + " inicie la partida...";
                    document.getElementById('btn-empezar').style.display = 'none';
                }
            } 
            else if (data.estado === 'jugando') {
                juegoIniciadoOnline = true;
                nombreOponente = miRol === 1 ? data.p2Nombre : data.p1Nombre;
                iniciarJuegoTablero();
            }
        }

        if (juegoIniciadoOnline && data.estado === 'jugando') {
            p1 = data.p1;
            p2 = data.p2;
            turno = data.turno;
            paredesEnTablero = data.paredesEnTablero || []; 
            
            actualizarUI();
            dibujarTablero();
            verificarVictoria();
        }
    });
}

function empezarPartida() {
    db.ref('salas/' + salaActual).update({ estado: 'jugando' });
}

// --- LÓGICA DEL JUEGO ---
function iniciarJuego(modo) {
    modoJuego = modo;
    miRol = 1; 
    salaActual = null;
    nombreOponente = "IA";
    
    p1 = { x: 4, y: 8, paredes: 10 };
    p2 = { x: 4, y: 0, paredes: 10 };
    turno = 1;
    paredesEnTablero = [];
    
    iniciarJuegoTablero();
}

function iniciarJuegoTablero() {
    cambiarAccion('mover');
    actualizarUI();
    dibujarTablero();
    mostrarPantalla('pantalla-juego');
}

function actualizarUI() {
    let texto = "";
    if (modoJuego === 'online') {
        if (turno === miRol) {
            texto = "Es tu turno, " + nombreJugador;
        } else {
            texto = "Turno de " + nombreOponente + "...";
        }
    } else {
        texto = turno === 1 ? "Tu turno (" + nombreJugador + ")" : "Turno de la IA (Rojo)";
    }
    
    document.getElementById('turno-texto').innerText = texto;
    document.getElementById('paredes-p1').innerText = miRol === 1 ? p1.paredes : p2.paredes;
}

function dibujarTablero() {
    const tablero = document.getElementById('tablero');
    tablero.innerHTML = '';
    
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            let celda = document.createElement('div');
            celda.className = 'celda';
            celda.dataset.x = x;
            celda.dataset.y = y;
            
            let paredesAqui = paredesEnTablero.filter(p => p.x === x && p.y === y);
            paredesAqui.forEach(p => celda.classList.add(`pared-${p.lado}`));

            if (p1.x === x && p1.y === y) {
                let ficha = document.createElement('div');
                ficha.className = 'jugador1';
                celda.appendChild(ficha);
            }
            if (p2.x === x && p2.y === y) {
                let ficha = document.createElement('div');
                ficha.className = 'jugador2';
                celda.appendChild(ficha);
            }

            celda.onclick = () => procesarClic(x, y);
            tablero.appendChild(celda);
        }
    }
}

function procesarClic(x, y) {
    if ((modoJuego === 'online' && turno !== miRol) || (modoJuego === 'ia' && turno === 2)) return; 

    let jugadorActual = turno === 1 ? p1 : p2;
    let movimientoValido = false;

    if (accionActual === 'mover') {
        if (esMovimientoValido(jugadorActual.x, jugadorActual.y, x, y)) {
            jugadorActual.x = x;
            jugadorActual.y = y;
            movimientoValido = true;
        } else {
            alert("Movimiento inválido o bloqueado por pared.");
        }
    } else if (accionActual === 'pared') {
        if (jugadorActual.paredes > 0) {
            if (!paredesEnTablero.some(p => p.x === x && p.y === y && p.lado === 'arriba')) {
                paredesEnTablero.push({ x: x, y: y, lado: 'arriba' });
                if(y > 0) paredesEnTablero.push({ x: x, y: y-1, lado: 'abajo' });
                jugadorActual.paredes--;
                movimientoValido = true;
            }
        } else {
            alert("No te quedan paredes.");
        }
    }

    if (movimientoValido) {
        let proximoTurno = turno === 1 ? 2 : 1;
        
        if (modoJuego === 'online') {
            db.ref('salas/' + salaActual).update({
                p1: p1,
                p2: p2,
                turno: proximoTurno,
                paredesEnTablero: paredesEnTablero
            });
        } else {
            turno = proximoTurno;
            actualizarUI();
            dibujarTablero();
            verificarVictoria();
            if (turno === 2) setTimeout(turnoIA, 800);
        }
    }
}

function esMovimientoValido(ox, oy, dx, dy) {
    let distancia = Math.abs(ox - dx) + Math.abs(oy - dy);
    if (distancia !== 1) return false; 
    
    if (dy < oy && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'arriba')) return false;
    if (dy > oy && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'abajo')) return false;
    if (dx < ox && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'izquierda')) return false;
    if (dx > ox && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'derecha')) return false;

    if (dx === p1.x && dy === p1.y) return false;
    if (dx === p2.x && dy === p2.y) return false;

    return true;
}

function verificarVictoria() {
    if (p1.y === 0) {
        let ganador = modoJuego === 'online' ? (miRol === 1 ? nombreJugador : nombreOponente) : nombreJugador;
        alert("¡Ganó " + ganador + " (Azul)!");
        mostrarPantalla('pantalla-inicio');
    } else if (p2.y === 8) {
        let ganador = modoJuego === 'online' ? (miRol === 2 ? nombreJugador : nombreOponente) : "La IA";
        alert("¡Ganó " + ganador + " (Rojo)!");
        mostrarPantalla('pantalla-inicio');
    }
}

// --- INTELIGENCIA ARTIFICIAL MEJORADA ---
function turnoIA() {
    let accionRealizada = false;

    // 1. Decidir aleatoriamente si pone una pared para fastidiar (30% de probabilidad)
    if (p2.paredes > 0 && Math.random() < 0.3) {
        accionRealizada = intentarPonerParedIA();
    }

    // 2. Si no puso pared, buscar inteligentemente el mejor camino
    if (!accionRealizada) {
        let siguientePaso = obtenerSiguientePasoIA();
        
        if (siguientePaso && esMovimientoValido(p2.x, p2.y, siguientePaso.x, siguientePaso.y)) {
            p2.x = siguientePaso.x;
            p2.y = siguientePaso.y;
            accionRealizada = true;
        } else {
            // Movimiento de emergencia por si el jugador obstruye la visión directa temporalmente
            let intentos = [
                { dx: p2.x, dy: p2.y + 1 }, { dx: p2.x - 1, dy: p2.y },
                { dx: p2.x + 1, dy: p2.y }, { dx: p2.x, dy: p2.y - 1 }
            ];
            for (let mov of intentos) {
                if (mov.dx >= 0 && mov.dx < 9 && mov.dy >= 0 && mov.dy < 9) {
                    if (esMovimientoValido(p2.x, p2.y, mov.dx, mov.dy)) {
                        p2.x = mov.dx;
                        p2.y = mov.dy;
                        accionRealizada = true;
                        break;
                    }
                }
            }
        }
    }

    // 3. Si estaba completamente atrapada o acorralada, gasta una pared
    if (!accionRealizada && p2.paredes > 0) {
        accionRealizada = intentarPonerParedIA();
    }

    turno = 1;
    actualizarUI();
    dibujarTablero();
    verificarVictoria();
}

function intentarPonerParedIA() {
    let intentosMax = 20; // Intenta varias veces buscar un lugar vacío
    while(intentosMax > 0) {
        let px = Math.floor(Math.random() * 9);
        let py = Math.floor(Math.random() * 8) + 1; 
        
        let ocupado = paredesEnTablero.some(p => p.x === px && p.y === py && p.lado === 'arriba');
        if (!ocupado) {
            paredesEnTablero.push({ x: px, y: py, lado: 'arriba' });
            paredesEnTablero.push({ x: px, y: py-1, lado: 'abajo' });
            p2.paredes--;
            return true;
        }
        intentosMax--;
    }
    return false;
}

function obtenerSiguientePasoIA() {
    let cola = [{x: p2.x, y: p2.y, camino: []}];
    let visitados = new Set();
    visitados.add(`${p2.x},${p2.y}`);

    while (cola.length > 0) {
        let actual = cola.shift();

        // Si su algoritmo imaginario ya llega a la última fila, elige el primer paso de esa ruta
        if (actual.y === 8) {
            return actual.camino[0]; 
        }

        let adyacentes = [
            { dx: actual.x, dy: actual.y + 1 }, // Prioridad ir para abajo
            { dx: actual.x - 1, dy: actual.y }, 
            { dx: actual.x + 1, dy: actual.y }, 
            { dx: actual.x, dy: actual.y - 1 }
        ];

        for (let mov of adyacentes) {
            if (mov.dx >= 0 && mov.dx < 9 && mov.dy >= 0 && mov.dy < 9) {
                if (!visitados.has(`${mov.dx},${mov.dy}`)) {
                    if (caminoLibreIA(actual.x, actual.y, mov.dx, mov.dy)) {
                        visitados.add(`${mov.dx},${mov.dy}`);
                        cola.push({
                            x: mov.dx, 
                            y: mov.dy, 
                            camino: [...actual.camino, {x: mov.dx, y: mov.dy}]
                        });
                    }
                }
            }
        }
    }
    return null; // Si está atrapada sin salida
}

function caminoLibreIA(ox, oy, dx, dy) {
    if (dy < oy && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'arriba')) return false;
    if (dy > oy && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'abajo')) return false;
    if (dx < ox && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'izquierda')) return false;
    if (dx > ox && paredesEnTablero.some(p => p.x === ox && p.y === oy && p.lado === 'derecha')) return false;
    // La IA asume que el jugador no es un obstáculo permanente al planear su ruta larga
    return true; 
}
