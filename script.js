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
let paredesTablero = []; 

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

// --- SALAS PRIVADAS Y LOBBY ---
function crearSala() {
    let codigo = Math.floor(100000 + Math.random() * 900000).toString();
    salaActual = codigo;
    miRol = 1;
    
    // Configurar vista Lobby
    document.getElementById('codigo-sala-display').innerText = codigo;
    document.getElementById('estado-jugadores').innerText = "Jugadores: 1/2";
    document.getElementById('lobby-p1').innerText = "1. " + avatarJugador + " " + nombreJugador + " (Líder)";
    document.getElementById('lobby-p2').innerText = "2. Esperando rival...";
    
    let btnIniciar = document.getElementById('btn-iniciar-multijugador');
    btnIniciar.disabled = true;
    btnIniciar.style.background = "#555";
    btnIniciar.innerText = "Esperando rival...";

    if(typeof db !== 'undefined') {
        db.ref('salas/' + codigo).set({
            estado: 'esperando',
            p1: { nombre: nombreJugador, avatar: avatarJugador }
        });
        escucharSala(codigo);
    }
    
    alert("Tu código de sala es: " + codigo + ". Compártelo con tu amigo.");
    mostrarPantalla('pantalla-lobby');
}

// NUEVA FUNCIÓN: Muestra la pantalla para ingresar el código
function unirseSala() {
    document.getElementById('input-codigo-sala').value = ""; 
    mostrarPantalla('pantalla-unirse');
}

// NUEVA FUNCIÓN: Procesa el código ingresado
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

        // Actualizar UI del Lobby
        if (data.p1) {
            document.getElementById('lobby-p1').innerText = "1. " + data.p1.avatar + " " + data.p1.nombre;
        }
        if (data.p2) {
            document.getElementById('estado-jugadores').innerText = "Jugadores: 2/2";
            document.getElementById('lobby-p2').innerText = "2. " + data.p2.avatar + " " + data.p2.nombre;
            
            // Habilitar botón de iniciar solo para el líder
            if (miRol === 1 && data.estado === 'esperando') {
                let btn = document.getElementById('btn-iniciar-multijugador');
                btn.disabled = false;
                btn.style.background = "#4facfe";
                btn.innerText = "Iniciar Partida";
            }
        }

        // Si el líder le da click a iniciar
        if (data.estado === 'jugando' && !document.getElementById('pantalla-juego').classList.contains('activa')) {
            modoJuego = 'online';
            
            // Asignar los avatares según quién es quién
            if(miRol === 1) {
                document.getElementById('ficha-p1').innerText = data.p1.avatar;
                document.getElementById('ficha-p2').innerText = data.p2.avatar;
                // El líder crea el estado inicial del juego en la base de datos
                db.ref('salas/' + salaActual + '/estadoJuego').set({
                    p1: p1, p2: p2, turno: turno, paredesTablero: []
                });
            } else {
                document.getElementById('ficha-p1').innerText = data.p2.avatar; 
                document.getElementById('ficha-p2').innerText = data.p1.avatar; 
            }
            iniciarJuegoTablero();
        }

        // ACTUALIZACIÓN ONLINE: Sincronizar los movimientos y paredes
        if (data.estadoJuego && modoJuego === 'online' && document.getElementById('pantalla-juego').classList.contains('activa')) {
            p1 = data.estadoJuego.p1;
            p2 = data.estadoJuego.p2;
            turno = data.estadoJuego.turno;
            paredesTablero = data.estadoJuego.paredesTablero || [];
            renderizarEstado(); // Redibuja todo el tablero para ambos
        }
    });
}

function iniciarDesdeLobby() {
    if(typeof db !== 'undefined') {
        db.ref('salas/' + salaActual).update({
            estado: 'jugando'
        });
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
            
            // Mostrar sombra amarilla en base a paredes de 2 bloques
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

// Ahora simula colocar paredes que ocupan 2 posiciones
function simularPared(celda, x, y) {
    if(accionActual !== 'pared') return;
    document.querySelectorAll('.celda').forEach(c => c.style.boxShadow = 'none');
    
    if (orientacionPared === 'horizontal') {
        if (x < tamanoTablero - 1) { // Que no se salga del mapa por la derecha
            celda.style.boxShadow = 'inset 0 -5px 0 yellow';
            let celda2 = document.querySelector('.celda[data-x="' + (x+1) + '"][data-y="' + y + '"]');
            if(celda2) celda2.style.boxShadow = 'inset 0 -5px 0 yellow';
        }
    } else {
        if (y < tamanoTablero - 1) { // Que no se salga por abajo
            celda.style.boxShadow = 'inset -5px 0 0 yellow';
            let celda2 = document.querySelector('.celda[data-x="' + x + '"][data-y="' + (y+1) + '"]');
            if(celda2) celda2.style.boxShadow = 'inset -5px 0 0 yellow';
        }
    }
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
            "0" + Math.floor(tActivo/60) + ":" + (tActivo%60).toString().padStart(2, '0') + " (Tú)";
        document.getElementById('tiempo-turno').innerText = 
            Math.floor(tRival/60) + ":" + (tRival%60).toString().padStart(2, '0') + " (Rival)";

        if (tiempoP1 <= 0 || tiempoP2 <= 0) {
            clearInterval(timerInterval);
            let ganador = tiempoP1 <= 0 ? "Jugador 2" : "Jugador 1";
            alert("¡Se acabó el tiempo! Gana " + ganador);
            mostrarPantalla('pantalla-inicio');
        }
    }, 1000);
}

// Nueva función maestra para dibujar TODO (Fichas y Paredes) - Útil para Multijugador
function renderizarEstado() {
    // Dibujar Fichas
    let f1 = document.getElementById('ficha-p1');
    let f2 = document.getElementById('ficha-p2');
    f1.style.left = (p1.x * 45 + 5) + "px";
    f1.style.top = (p1.y * 45 + 5) + "px";
    f2.style.left = (p2.x * 45 + 5) + "px";
    f2.style.top = (p2.y * 45 + 5) + "px";

    // Limpiar paredes viejas y dibujar las nuevas
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

    if(p1.y === p1.metaY) { alert("¡Jugador 1 Gana!"); mostrarPantalla('pantalla-inicio'); }
    if(p2.y === p2.metaY) { alert("¡Jugador 2 Gana!"); mostrarPantalla('pantalla-inicio'); }
}

// --- LÓGICA DE MOVIMIENTO Y PAREDES ---
function procesarClic(x, y) {
    if (modoJuego === 'online' && turno !== miRol) {
        alert("No es tu turno.");
        return; 
    }

    let jugadorActual = turno === 1 ? p1 : p2;

    if (accionActual === 'mover') {
        let distX = Math.abs(jugadorActual.x - x);
        let distY = Math.abs(jugadorActual.y - y);
        
        if ((distX === 1 && distY === 0) || (distX === 0 && distY === 1)) {
            // Verificar colisiones con paredes antes de moverse
            let dirX = x - jugadorActual.x;
            let dirY = y - jugadorActual.y;
            if (!puedeMoverse(jugadorActual.x, jugadorActual.y, dirX, dirY)) {
                alert("Hay una pared en el camino.");
                return;
            }

            if (turno === 1) { p1.x = x; p1.y = y; }
            else { p2.x = x; p2.y = y; }
            ejecutarTurno();
        } else {
            alert("Movimiento inválido.");
        }
    } else {
        if (jugadorActual.paredes <= 0) {
            alert("No te quedan paredes.");
            return;
        }

        // Lógica de paredes ocupando 2 espacios
        let celda1, celda2;
        if (orientacionPared === 'horizontal') {
            if (x >= tamanoTablero - 1) return; // Fuera del mapa
            celda1 = { x: x, y: y, dir: 'h' };
            celda2 = { x: x + 1, y: y, dir: 'h' };
        } else {
            if (y >= tamanoTablero - 1) return; // Fuera del mapa
            celda1 = { x: x, y: y, dir: 'v' };
            celda2 = { x: x, y: y + 1, dir: 'v' };
        }

        // Chequear que no estemos poniendo la pared sobre otra pared
        let overlap = paredesTablero.some(p => 
            (p.x === celda1.x && p.y === celda1.y && p.dir === celda1.dir) ||
            (p.x === celda2.x && p.y === celda2.y && p.dir === celda2.dir)
        );
        if (overlap) { alert("Ya hay una pared ahí."); return; }

        paredesTablero.push(celda1, celda2);
        
        if (!existeCamino(p1) || !existeCamino(p2)) {
            paredesTablero.pop(); paredesTablero.pop(); // Revertimos las 2
            alert("¡Movimiento ilegal! Estás encerrando a un jugador sin salida a su meta.");
            return;
        }
        
        jugadorActual.paredes--;
        ejecutarTurno();
    }
}

// Ahora el turno se le pasa al otro jugador online
function ejecutarTurno() {
    reproducirSonido(accionActual);
    turno = turno === 1 ? 2 : 1; 
    
    if (modoJuego === 'online' && typeof db !== 'undefined') {
        // Enviar nuestro movimiento a Firebase para que el rival lo vea
        db.ref('salas/' + salaActual + '/estadoJuego').set({
            p1: p1,
            p2: p2,
            turno: turno,
            paredesTablero: paredesTablero || []
        });
    } else {
        renderizarEstado(); // Si es VS IA, solo dibuja
    }
}

// --- ALGORITMO BFS (VERIFICAR CAMINO Y COLISIONES) ---
function puedeMoverse(cx, cy, dx, dy) {
    if (dy === -1) return !paredesTablero.some(p => p.x === cx && p.y === cy - 1 && p.dir === 'h'); // Mover Arriba
    if (dy === 1)  return !paredesTablero.some(p => p.x === cx && p.y === cy && p.dir === 'h');     // Mover Abajo
    if (dx === -1) return !paredesTablero.some(p => p.x === cx - 1 && p.y === cy && p.dir === 'v'); // Mover Izquierda
    if (dx === 1)  return !paredesTablero.some(p => p.x === cx && p.y === cy && p.dir === 'v');     // Mover Derecha
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
                // Ahora el verificador sabe si hay una pared en el medio
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

// --- VISUALES Y SONIDO ---
function reproducirSonido(tipo) {
    try {
        let audio = document.getElementById(tipo === 'mover' ? 'sonido-mover' : 'sonido-pared');
        audio.currentTime = 0;
        audio.play();
    } catch(e) {} 
}
