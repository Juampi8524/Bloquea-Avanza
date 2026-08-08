// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBxCFp3QPKXAQ2RGvJggVeIZU_ckoPmBr4",
    authDomain: "chapas-42a4b.firebaseapp.com",
    databaseURL: "https://chapas-42a4b-default-rtdb.firebaseio.com",
    projectId: "chapas-42a4b",
    storageBucket: "chapas-42a4b.firebasestorage.app",
    messagingSenderId: "456792916464",
    appId: "1:456792916464:web:ceb1bdd9c3ad78bd595d35",
    measurementId: "G-QNJELSL2C9"
};

// Inicializar Firebase y la Base de Datos
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- VARIABLES BASE Y MULTIJUGADOR ---
let modoJuego = 'ia';
let turno = 1;
let miRol = 1;
let p1 = { x: 4, y: 8, paredes: 10, metaY: 0, color: 'blue' };
let p2 = { x: 4, y: 0, paredes: 10, metaY: 8, color: 'red' };
let accionActual = 'mover';
let orientacionPared = 'horizontal';
let nombreJugador = "Jugador";
let salaActual = "";
let paredesTablero = []; 
let nombreRival = "Oponente";

// --- VARIABLES GLOBALES NUEVAS ---
let tamanoTablero = 9;
let avatarJugador = "😃";
let avatarOponente = "🤖";
let tiempoInicial = 180; 

// Temporizadores Blitz
let tiempoP1 = 180; 
let tiempoP2 = 180; 
let timerInterval;
let juegoTerminado = false;

// --- FUNCIONES DE NAVEGACIÓN Y MENÚS ---
function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

function iniciarJuego(modo) {
    modoJuego = modo;
    iniciarJuegoTablero();
}

// --- SALAS PRIVADAS Y LOBBY ---
function crearSala() {
    let codigo = Math.floor(100000 + Math.random() * 900000).toString();
    salaActual = codigo;
    miRol = 1;
    
    document.getElementById('codigo-sala-display').innerText = codigo;
    document.getElementById('estado-jugadores').innerText = "Jugadores: 1/2";
    document.getElementById('lobby-p1').innerText = "1. " + avatarJugador + " " + nombreJugador + " (Líder)";
    document.getElementById('lobby-p2').innerText = "2. Esperando rival...";
    
    let btnIniciar = document.getElementById('btn-iniciar-multijugador');
    btnIniciar.disabled = true;
    btnIniciar.style.background = "#555";
    btnIniciar.innerText = "Esperando rival...";

    // Habilitar selector del lobby y copiar el valor actual del menú principal
    let selectLobby = document.getElementById('select-tamano-lobby');
    selectLobby.disabled = false;
    selectLobby.value = document.getElementById('select-tamano').value;
    let tamanoLider = parseInt(selectLobby.value);

    if(typeof db !== 'undefined') {
        db.ref('salas/' + codigo).set({
            estado: 'esperando',
            tamano: tamanoLider, 
            p1: { nombre: nombreJugador, avatar: avatarJugador }
        });
        escucharSala(codigo);
    }
    
    alert("Tu código de sala es: " + codigo + ". Compártelo con tu amigo.");
    mostrarPantalla('pantalla-lobby');
}

// NUEVA FUNCIÓN: Permite al líder actualizar el tamaño estando en la sala
function actualizarTamanoLobby() {
    if (miRol === 1 && typeof db !== 'undefined' && salaActual !== "") {
        let nuevoTamano = parseInt(document.getElementById('select-tamano-lobby').value);
        // Sincronizar el select original por si acaso
        document.getElementById('select-tamano').value = nuevoTamano;
        db.ref('salas/' + salaActual).update({ tamano: nuevoTamano });
    }
}

function unirseSala() {
    document.getElementById('input-codigo-sala').value = ""; 
    mostrarPantalla('pantalla-unirse');
}

function confirmarUnirseSala() {
    let codigo = document.getElementById('input-codigo-sala').value;
    
    if(codigo && codigo.length === 6) {
        salaActual = codigo;
        miRol = 2;
        
        document.getElementById('codigo-sala-display').innerText = codigo;
        document.getElementById('btn-iniciar-multijugador').disabled = true;
        document.getElementById('btn-iniciar-multijugador').innerText = "Esperando al líder...";

        if(typeof db !== 'undefined') {
            db.ref('salas/' + codigo).update({
                p2: { nombre: nombreJugador, avatar: avatarJugador }
            });
            escucharSala(codigo);
        }
        mostrarPantalla('pantalla-lobby');
    } else {
        alert("Por favor, ingresa un código válido de 6 dígitos.");
    }
}

function escucharSala(codigo) {
    if(typeof db === 'undefined') return;
    
    db.ref('salas/' + codigo).on('value', (snapshot) => {
        let data = snapshot.val();
        if(!data) return;

        // Si el líder cambia el tamaño de la sala, sincronizar los menús
        if (data.tamano) {
            document.getElementById('select-tamano-lobby').value = data.tamano;
            document.getElementById('select-tamano').value = data.tamano; 
            if (miRol === 2) {
                // El jugador 2 no puede cambiarlo
                document.getElementById('select-tamano-lobby').disabled = true; 
            }
        }

        if (data.p1) {
            document.getElementById('lobby-p1').innerText = "1. " + data.p1.avatar + " " + data.p1.nombre;
            if(miRol === 2) nombreRival = data.p1.nombre;
        }
        if (data.p2) {
            document.getElementById('estado-jugadores').innerText = "Jugadores: 2/2";
            document.getElementById('lobby-p2').innerText = "2. " + data.p2.avatar + " " + data.p2.nombre;
            if(miRol === 1) nombreRival = data.p2.nombre;
            
            if (miRol === 1 && data.estado === 'esperando') {
                let btn = document.getElementById('btn-iniciar-multijugador');
                btn.disabled = false;
                btn.style.background = "#4facfe";
                btn.innerText = "Iniciar Partida";
            }
        }

        if (data.estado === 'jugando' && !document.getElementById('pantalla-juego').classList.contains('activa')) {
            modoJuego = 'online';
            
            if(miRol === 1) {
                document.getElementById('ficha-p1').innerText = data.p1.avatar;
                document.getElementById('ficha-p2').innerText = data.p2.avatar;
                db.ref('salas/' + salaActual + '/estadoJuego').set({
                    p1: p1, p2: p2, turno: turno, paredesTablero: []
                });
            } else {
                document.getElementById('ficha-p1').innerText = data.p2.avatar; 
                document.getElementById('ficha-p2').innerText = data.p1.avatar; 
            }
            iniciarJuegoTablero();
        }

        if (data.estadoJuego && modoJuego === 'online' && document.getElementById('pantalla-juego').classList.contains('activa') && !juegoTerminado) {
            p1 = data.estadoJuego.p1;
            p2 = data.estadoJuego.p2;
            turno = data.estadoJuego.turno;
            paredesTablero = data.estadoJuego.paredesTablero || [];
            renderizarEstado(); 
        }
    });
}

function iniciarDesdeLobby() {
    if(typeof db !== 'undefined') {
        db.ref('salas/' + salaActual).update({ estado: 'jugando' });
    }
}

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
    juegoTerminado = false;
    tamanoTablero = parseInt(document.getElementById('select-tamano').value);
    
    // MATEMÁTICA DEL TIEMPO SEGÚN EL TAMAÑO
    let mapaTiempos = { 5: 60, 7: 120, 9: 180, 11: 240, 13: 300 };
    tiempoInicial = mapaTiempos[tamanoTablero] || 180;
    
    let centro = Math.floor(tamanoTablero / 2);
    let cantParedes = Math.floor(tamanoTablero * 1.2); 
    
    p1 = { x: centro, y: tamanoTablero - 1, paredes: cantParedes, metaY: 0, color: 'blue' };
    p2 = { x: centro, y: 0, paredes: cantParedes, metaY: tamanoTablero - 1, color: 'red' };
    paredesTablero = [];
    turno = 1;
    
    const tablero = document.getElementById('tablero');
    tablero.style.gridTemplateColumns = "repeat(" + tamanoTablero + ", 40px)";
    tablero.style.gridTemplateRows = "repeat(" + tamanoTablero + ", 40px)";
    tablero.innerHTML = '';
    
    for (let y = 0; y < tamanoTablero; y++) {
        for (let x = 0; x < tamanoTablero; x++) {
            let celda = document.createElement('div');
            celda.className = 'celda';
            celda.dataset.x = x;
            celda.dataset.y = y;
            celda.onclick = () => procesarClic(x, y);
            celda.onmouseover = () => simularPared(celda, x, y);
            celda.onmouseout = () => { document.querySelectorAll('.celda').forEach(c => c.style.boxShadow = 'none'); };
            tablero.appendChild(celda);
        }
    }

    document.getElementById('ficha-p1').style.background = p1.color;
    document.getElementById('ficha-p2').style.background = p2.color;

    cambiarAccion('mover');
    iniciarCronometros();
    renderizarEstado();
    mostrarPantalla('pantalla-juego');
}

function simularPared(celda, x, y) {
    if(accionActual !== 'pared') return;
    document.querySelectorAll('.celda').forEach(c => c.style.boxShadow = 'none');
    
    if (orientacionPared === 'horizontal') {
        if (x < tamanoTablero - 1) { 
            celda.style.boxShadow = 'inset 0 -5px 0 yellow';
            let celda2 = document.querySelector('.celda[data-x="' + (x+1) + '"][data-y="' + y + '"]');
            if(celda2) celda2.style.boxShadow = 'inset 0 -5px 0 yellow';
        }
    } else {
        if (y < tamanoTablero - 1) { 
            celda.style.boxShadow = 'inset -5px 0 0 yellow';
            let celda2 = document.querySelector('.celda[data-x="' + x + '"][data-y="' + (y+1) + '"]');
            if(celda2) celda2.style.boxShadow = 'inset -5px 0 0 yellow';
        }
    }
}

function iniciarCronometros() {
    clearInterval(timerInterval);
    tiempoP1 = tiempoInicial;
    tiempoP2 = tiempoInicial;
    
    timerInterval = setInterval(() => {
        if (juegoTerminado) return;

        if(turno === 1) tiempoP1--;
        else tiempoP2--;

        let tActivo = miRol === 1 ? tiempoP1 : tiempoP2;
        let tRival = miRol === 1 ? tiempoP2 : tiempoP1;

        document.getElementById('tiempo-total').innerText = 
            "0" + Math.floor(tActivo/60) + ":" + (tActivo%60).toString().padStart(2, '0') + " (Tú)";
        document.getElementById('tiempo-turno').innerText = 
            Math.floor(tRival/60) + ":" + (tRival%60).toString().padStart(2, '0') + " (Rival)";

        if (tiempoP1 <= 0 || tiempoP2 <= 0) {
            clearInterval(timerInterval);
            let ganador = tiempoP1 <= 0 ? nombreRival : nombreJugador;
            dispararVictoria(ganador, "Ganó por quedarse sin tiempo");
        }
    }, 1000);
}

function dispararVictoria(ganador, motivo) {
    if (juegoTerminado) return;
    juegoTerminado = true;
    clearInterval(timerInterval);
    
    document.getElementById('texto-victoria').innerText = "¡" + ganador + " Gana!";
    document.getElementById('motivo-victoria').innerText = motivo;
    document.getElementById('pantalla-victoria').style.display = 'flex';
}

function renderizarEstado() {
    if (juegoTerminado) return;

    let f1 = document.getElementById('ficha-p1');
    let f2 = document.getElementById('ficha-p2');
    f1.style.left = (p1.x * 45 + 5) + "px";
    f1.style.top = (p1.y * 45 + 5) + "px";
    f2.style.left = (p2.x * 45 + 5) + "px";
    f2.style.top = (p2.y * 45 + 5) + "px";

    document.querySelectorAll('.celda').forEach(c => {
        c.classList.remove('pared-abajo');
        c.classList.remove('pared-derecha');
    });
    
    paredesTablero.forEach(p => {
        let cell = document.querySelector('.celda[data-x="' + p.x + '"][data-y="' + p.y + '"]');
        if (cell) {
            if (p.dir === 'h') cell.classList.add('pared-abajo');
            if (p.dir === 'v') cell.classList.add('pared-derecha');
        }
    });

    document.getElementById('turno-texto').innerText = turno === miRol ? "Tu turno" : "Turno del oponente";
    
    document.getElementById('paredes-p1').innerText = miRol === 1 ? p1.paredes : p2.paredes;
    document.getElementById('paredes-p2').innerText = miRol === 1 ? p2.paredes : p1.paredes;

    if(p1.y === p1.metaY) { dispararVictoria(miRol === 1 ? nombreJugador : nombreRival, "Llegó al otro lado de la mesa"); }
    if(p2.y === p2.metaY) { dispararVictoria(miRol === 2 ? nombreJugador : nombreRival, "Llegó al otro lado de la mesa"); }
}

function procesarClic(x, y) {
    if (juegoTerminado) return;
    if (modoJuego === 'online' && turno !== miRol) {
        alert("No es tu turno.");
        return; 
    }

    let jugadorActual = turno === 1 ? p1 : p2;
    let oponenteActual = turno === 1 ? p2 : p1;

    if (accionActual === 'mover') {
        let dirX = x - jugadorActual.x;
        let dirY = y - jugadorActual.y;
        let distAbs = Math.abs(dirX) + Math.abs(dirY);
        
        if (distAbs === 1) { 
            if (x === oponenteActual.x && y === oponenteActual.y) {
                alert("Oponente en frente. ¡Haz clic detrás de él para saltarlo!");
                return;
            }
            if (!puedeMoverse(jugadorActual.x, jugadorActual.y, dirX, dirY)) {
                alert("Hay una pared en el camino.");
                return;
            }
            if (turno === 1) { p1.x = x; p1.y = y; } else { p2.x = x; p2.y = y; }
            ejecutarTurno();

        } else if (distAbs === 2 && (dirX === 0 || dirY === 0)) { 
            let medioX = jugadorActual.x + (dirX / 2);
            let medioY = jugadorActual.y + (dirY / 2);
            
            if (oponenteActual.x === medioX && oponenteActual.y === medioY) {
                if (puedeMoverse(jugadorActual.x, jugadorActual.y, dirX/2, dirY/2) && 
                    puedeMoverse(oponenteActual.x, oponenteActual.y, dirX/2, dirY/2)) {
                    
                    if (turno === 1) { p1.x = x; p1.y = y; } else { p2.x = x; p2.y = y; }
                    ejecutarTurno();
                } else {
                    alert("No puedes saltar al oponente porque hay una pared bloqueando.");
                }
            } else {
                alert("Movimiento inválido. Solo puedes moverte 1 bloque, a menos que saltes al oponente.");
            }
        } else {
            alert("Movimiento inválido.");
        }

    } else {
        if (jugadorActual.paredes <= 0) {
            alert("No te quedan paredes.");
            return;
        }

        let celda1, celda2;
        if (orientacionPared === 'horizontal') {
            if (x >= tamanoTablero - 1) return; 
            celda1 = { x: x, y: y, dir: 'h' };
            celda2 = { x: x + 1, y: y, dir: 'h' };
        } else {
            if (y >= tamanoTablero - 1) return; 
            celda1 = { x: x, y: y, dir: 'v' };
            celda2 = { x: x, y: y + 1, dir: 'v' };
        }

        let overlap = paredesTablero.some(p => 
            (p.x === celda1.x && p.y === celda1.y && p.dir === celda1.dir) ||
            (p.x === celda2.x && p.y === celda2.y && p.dir === celda2.dir)
        );
        if (overlap) { alert("Ya hay una pared ahí."); return; }

        paredesTablero.push(celda1, celda2);
        
        if (!existeCamino(p1) || !existeCamino(p2)) {
            paredesTablero.pop(); paredesTablero.pop(); 
            alert("¡Movimiento ilegal! Estás encerrando a un jugador sin salida a su meta.");
            return;
        }
        
        jugadorActual.paredes--;
        ejecutarTurno();
    }
}

function ejecutarTurno() {
    reproducirSonido(accionActual);
    turno = turno === 1 ? 2 : 1; 
    
    if (modoJuego === 'online' && typeof db !== 'undefined') {
        db.ref('salas/' + salaActual + '/estadoJuego').set({
            p1: p1,
            p2: p2,
            turno: turno,
            paredesTablero: paredesTablero || []
        });
    } else {
        renderizarEstado();
    }
}

function puedeMoverse(cx, cy, dx, dy) {
    if (dy === -1) return !paredesTablero.some(p => p.x === cx && p.y === cy - 1 && p.dir === 'h'); 
    if (dy === 1)  return !paredesTablero.some(p => p.x === cx && p.y === cy && p.dir === 'h');     
    if (dx === -1) return !paredesTablero.some(p => p.x === cx - 1 && p.y === cy && p.dir === 'v'); 
    if (dx === 1)  return !paredesTablero.some(p => p.x === cx && p.y === cy && p.dir === 'v');     
    return true;
}

function existeCamino(jugador) {
    let visitados = new Set();
    let cola = [{ x: jugador.x, y: jugador.y }];
    visitados.add(jugador.x + "," + jugador.y);

    while (cola.length > 0) {
        let actual = cola.shift();

        if (actual.y === jugador.metaY) return true;

        let movimientos = [
            { dx: 0, dy: -1 }, 
            { dx: 0, dy: 1 },  
            { dx: -1, dy: 0 }, 
            { dx: 1, dy: 0 }   
        ];

        for (let mov of movimientos) {
            let nx = actual.x + mov.dx;
            let ny = actual.y + mov.dy;

            if (nx >= 0 && nx < tamanoTablero && ny >= 0 && ny < tamanoTablero) {
                if (puedeMoverse(actual.x, actual.y, mov.dx, mov.dy)) {
                    let key = nx + "," + ny;
                    if (!visitados.has(key)) {
                        visitados.add(key);
                        cola.push({ x: nx, y: ny });
                    }
                }
            }
        }
    }
    return false;
}

function reproducirSonido(tipo) {
    try {
        let audio = document.getElementById(tipo === 'mover' ? 'sonido-mover' : 'sonido-pared');
        audio.currentTime = 0;
        audio.play();
    } catch(e) {} 
}
