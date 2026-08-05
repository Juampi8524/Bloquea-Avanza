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
let orientacionPared = 'H'; // H (Horizontal) o V (Vertical)
let p1 = { x: 4, y: 8, paredes: 10 }; 
let p2 = { x: 4, y: 0, paredes: 10 }; 
let paredesEnTablero = [];

// --- INICIO Y CONFIGURACIÓN ---
window.onload = () => {
    try {
        let nombreGuardado = localStorage.getItem('nombreJugadorBA');
        if(nombreGuardado) nombreJugador = nombreGuardado;
        
        let colorGuardado = localStorage.getItem('colorParedBA');
        if(colorGuardado) {
            document.documentElement.style.setProperty('--color-pared', colorGuardado);
            document.getElementById('input-color-pared').value = colorGuardado;
        }
    } catch(e) {}
    document.getElementById('input-nombre').value = nombreJugador;
    document.getElementById('nombre-menu').innerText = nombreJugador;
};

function mostrarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(idPantalla).classList.add('activa');
}

function guardarConfig() {
    let valorNombre = document.getElementById('input-nombre').value.trim();
    let valorColor = document.getElementById('input-color-pared').value;

    if(valorNombre !== "") {
        nombreJugador = valorNombre;
        document.getElementById('nombre-menu').innerText = nombreJugador;
    }
    
    document.documentElement.style.setProperty('--color-pared', valorColor);

    try {
        localStorage.setItem('nombreJugadorBA', nombreJugador);
        localStorage.setItem('colorParedBA', valorColor);
    } catch (error) {
        console.warn("Android bloqueó el guardado local, pero se aplicó para esta partida.");
    }
    
    mostrarPantalla('pantalla-inicio');
}

function alternarOrientacion() {
    orientacionPared = orientacionPared === 'H' ? 'V' : 'H';
    document.getElementById('btn-orientacion').innerText = "Dir: " + (orientacionPared === 'H' ? 'Horizontal' : 'Vertical');
}

function cambiarAccion(accion) {
    accionActual = accion;
    document.getElementById('btn-mover').classList.toggle('activo', accion === 'mover');
    document.getElementById('btn-pared').classList.toggle('activo', accion === 'pared');
    document.getElementById('btn-orientacion').style.display = accion === 'pared' ? 'inline-block' : 'none';
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

    let btnConectar = document.querySelector('#modal-unirse button');
    let textoOriginal = btnConectar.innerText;
    btnConectar.innerText = "Buscando...";

    db.ref('salas/' + codigo).once('value').then((snapshot) => {
        btnConectar.innerText = textoOriginal;
        if (snapshot.exists()) {
            let dataSala = snapshot.val();
            if (dataSala.estado === 'esperando') {
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
                alert("La sala existe, pero la partida ya empezó o está llena.");
            }
        } else {
            alert("No encontramos ninguna sala con este código.");
        }
    }).catch((error) => {
        btnConectar.innerText = textoOriginal;
        alert("Error de conexión: " + error.message);
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
    orientacionPared = 'H';
    document.getElementById('btn-orientacion').innerText = "Dir: Horizontal";
    actualizarUI();
    dibujarTablero();
    mostrarPantalla('pantalla-juego');
}

function actualizarUI() {
    let texto = "";
    if (modoJuego === 'online') {
        texto = turno === miRol ? "Es tu turno, " + nombreJugador : "Turno de " + nombreOponente + "...";
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

            // Dibujar paredes dinámicas de 2 bloques
            paredesEnTablero.forEach(p => {
                if(p.o === 'H') {
                    if (x === p.x && y === p.y) celda.classList.add('pared-arriba');
                    if (x === p.x+1 && y === p.y) celda.classList.add('pared-arriba');
                    if (x === p.x && y === p.y-1) celda.classList.add('pared-abajo');
                    if (x === p.x+1 && y === p.y-1) celda.classList.add('pared-abajo');
                }
                if(p.o === 'V') {
                    if (x === p.x && y === p.y) celda.classList.add('pared-izquierda');
                    if (x === p.x && y === p.y+1) celda.classList.add('pared-izquierda');
                    if (x === p.x-1 && y === p.y) celda.classList.add('pared-derecha');
                    if (x === p.x-1 && y === p.y+1) celda.classList.add('pared-derecha');
                }
            });

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
        if (esMovimientoValido(jugadorActual.x, jugadorActual.y, x, y, paredesEnTablero)) {
            jugadorActual.x = x;
            jugadorActual.y = y;
            movimientoValido = true;
        } else {
            alert("Movimiento inválido o bloqueado por pared.");
        }
    } else if (accionActual === 'pared') {
        if (jugadorActual.paredes > 0) {
            if (esParedValida(x, y, orientacionPared)) {
                let paredesTemp = [...paredesEnTablero, {x: x, y: y, o: orientacionPared}];
                // Verificar que no se cierre el paso para ningún jugador
                if (existeCamino(p1, 0, paredesTemp) && existeCamino(p2, 8, paredesTemp)) {
                    paredesEnTablero.push({ x: x, y: y, o: orientacionPared });
                    jugadorActual.paredes--;
                    movimientoValido = true;
                } else {
                    alert("No podés bloquear por completo el camino a la meta.");
                }
            } else {
                alert("Posición inválida para la pared (Choca o sale del tablero).");
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

// --- SISTEMA DE COLISIÓN Y BÚSQUEDA DE CAMINO ---
function esMovimientoValido(ox, oy, dx, dy, paredes) {
    let distancia = Math.abs(ox - dx) + Math.abs(oy - dy);
    if (distancia !== 1) return false; 
    if (dx < 0 || dx > 8 || dy < 0 || dy > 8) return false;

    if (!esMovimientoLibre(ox, oy, dx, dy, paredes)) return false;

    if (dx === p1.x && dy === p1.y) return false;
    if (dx === p2.x && dy === p2.y) return false;

    return true;
}

function esMovimientoLibre(ox, oy, dx, dy, paredes) {
    if (dy < oy && paredes.some(p => p.o === 'H' && p.y === oy && (p.x === ox || p.x === ox - 1))) return false;
    if (dy > oy && paredes.some(p => p.o === 'H' && p.y === dy && (p.x === ox || p.x === ox - 1))) return false;
    if (dx < ox && paredes.some(p => p.o === 'V' && p.x === ox && (p.y === oy || p.y === oy - 1))) return false;
    if (dx > ox && paredes.some(p => p.o === 'V' && p.x === dx && (p.y === oy || p.y === oy - 1))) return false;
    return true;
}

function esParedValida(x, y, o) {
    if (o === 'H') {
        if (x >= 8 || y <= 0) return false;
        if (paredesEnTablero.some(p => p.o === 'H' && p.y === y && (p.x === x || p.x === x - 1 || p.x === x + 1))) return false;
        if (paredesEnTablero.some(p => p.o === 'V' && p.x === x + 1 && p.y === y - 1)) return false;
    } else {
        if (y >= 8 || x <= 0) return false;
        if (paredesEnTablero.some(p => p.o === 'V' && p.x === x && (p.y === y || p.y === y - 1 || p.y === y + 1))) return false;
        if (paredesEnTablero.some(p => p.o === 'H' && p.y === y + 1 && p.x === x - 1)) return false;
    }
    return true;
}

function existeCamino(jugador, filaObjetivo, paredesTemp) {
    let cola = [{x: jugador.x, y: jugador.y}];
    let visitados = new Set([`${jugador.x},${jugador.y}`]);

    while (cola.length > 0) {
        let actual = cola.shift();
        if (actual.y === filaObjetivo) return true;

        let movs = [
            {dx: actual.x, dy: actual.y-1}, {dx: actual.x, dy: actual.y+1},
            {dx: actual.x-1, dy: actual.y}, {dx: actual.x+1, dy: actual.y}
        ];

        for (let m of movs) {
            if (m.dx >= 0 && m.dx < 9 && m.dy >= 0 && m.dy < 9) {
                if (esMovimientoLibre(actual.x, actual.y, m.dx, m.dy, paredesTemp)) {
                    if (!visitados.has(`${m.dx},${m.dy}`)) {
                        visitados.add(`${m.dx},${m.dy}`);
                        cola.push({x: m.dx, y: m.dy});
                    }
                }
            }
        }
    }
    return false;
}

// --- VICTORIA O DERROTA ---
function verificarVictoria() {
    if (p1.y === 0) {
        if (modoJuego === 'online') {
            mostrarVictoria(miRol === 1 ? '¡Ganaste!' : 'Perdiste. Ganó ' + nombreOponente);
        } else {
            mostrarVictoria('¡Ganaste!');
        }
    } else if (p2.y === 8) {
        if (modoJuego === 'online') {
            mostrarVictoria(miRol === 2 ? '¡Ganaste!' : 'Perdiste. Ganó ' + nombreOponente);
        } else {
            mostrarVictoria('Perdiste. Ganó La IA');
        }
    }
}

function mostrarVictoria(mensaje) {
    document.getElementById('titulo-victoria').innerText = mensaje;
    let colorTitulo = mensaje.includes('Ganaste') ? '#4facfe' : '#ff4b4b';
    document.getElementById('titulo-victoria').style.color = colorTitulo;
    document.getElementById('modal-victoria').style.display = 'flex';
}

function cerrarVictoria() {
    document.getElementById('modal-victoria').style.display = 'none';
    mostrarPantalla('pantalla-inicio');
}

// --- INTELIGENCIA ARTIFICIAL MEJORADA ---
function turnoIA() {
    if (p1.y === 0 || p2.y === 8) return; // Si terminó no hace nada

    let accionRealizada = false;

    if (p2.paredes > 0 && Math.random() < 0.3) {
        accionRealizada = intentarPonerParedIA();
    }

    if (!accionRealizada) {
        let siguientePaso = obtenerSiguientePasoIA();
        
        if (siguientePaso && esMovimientoValido(p2.x, p2.y, siguientePaso.x, siguientePaso.y, paredesEnTablero)) {
            p2.x = siguientePaso.x;
            p2.y = siguientePaso.y;
            accionRealizada = true;
        } else {
            let intentos = [
                { dx: p2.x, dy: p2.y + 1 }, { dx: p2.x - 1, dy: p2.y },
                { dx: p2.x + 1, dy: p2.y }, { dx: p2.x, dy: p2.y - 1 }
            ];
            for (let mov of intentos) {
                if (mov.dx >= 0 && mov.dx < 9 && mov.dy >= 0 && mov.dy < 9) {
                    if (esMovimientoValido(p2.x, p2.y, mov.dx, mov.dy, paredesEnTablero)) {
                        p2.x = mov.dx;
                        p2.y = mov.dy;
                        accionRealizada = true;
                        break;
                    }
                }
            }
        }
    }

    if (!accionRealizada && p2.paredes > 0) {
        accionRealizada = intentarPonerParedIA();
    }

    turno = 1;
    actualizarUI();
    dibujarTablero();
    verificarVictoria();
}

function intentarPonerParedIA() {
    let intentosMax = 30;
    while(intentosMax > 0) {
        let px = Math.floor(Math.random() * 9);
        let py = Math.floor(Math.random() * 9); 
        let po = Math.random() < 0.5 ? 'H' : 'V';
        
        if (esParedValida(px, py, po)) {
            let paredesTemp = [...paredesEnTablero, {x: px, y: py, o: po}];
            if (existeCamino(p1, 0, paredesTemp) && existeCamino(p2, 8, paredesTemp)) {
                paredesEnTablero.push({ x: px, y: py, o: po });
                p2.paredes--;
                return true;
            }
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

        if (actual.y === 8) return actual.camino[0]; 

        let adyacentes = [
            { dx: actual.x, dy: actual.y + 1 },
            { dx: actual.x - 1, dy: actual.y }, 
            { dx: actual.x + 1, dy: actual.y }, 
            { dx: actual.x, dy: actual.y - 1 }
        ];

        for (let mov of adyacentes) {
            if (mov.dx >= 0 && mov.dx < 9 && mov.dy >= 0 && mov.dy < 9) {
                if (!visitados.has(`${mov.dx},${mov.dy}`)) {
                    if (esMovimientoLibre(actual.x, actual.y, mov.dx, mov.dy, paredesEnTablero)) {
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
    return null;
}
