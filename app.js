var mapZ, markerZ;
var puntosLevantados = [];
var lineasRed = [];

var tipoPuntoActual = "";
var modoDibujo = null;
var puntoOrigenParaLinea = null;

// 🔥 NUEVO: capa única para TODO lo dibujado
var capaDibujo;

const capaSatelite = L.tileLayer(
    'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
    { maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'] }
);

const capaCallesPlano = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);

window.onload = function() {
    initMapZonif();
};

function initMapZonif() {

    mapZ = L.map('map-zonif').setView([14.65, -86.21], 16);
    capaSatelite.addTo(mapZ);

    // 🔥 capa de dibujo
    capaDibujo = L.layerGroup().addTo(mapZ);

    markerZ = L.marker([14.65, -86.21], {draggable: true}).addTo(mapZ);
}

function setModoDibujo(tipo) {
    modoDibujo = tipo;
    puntoOrigenParaLinea = null;
    alert("Seleccione punto inicial y final");
}

function abrirModalPunto(tipo) {
    tipoPuntoActual = tipo;
    modoDibujo = null;
    document.getElementById('modal-punto').style.display = 'flex';
}

function cerrarModalPunto() {
    document.getElementById('modal-punto').style.display = 'none';
}

function guardarPunto() {

    const coords = markerZ.getLatLng();

    const punto = {
        id: Date.now(),
        tipoRed: tipoPuntoActual,
        lat: coords.lat,
        lng: coords.lng,
        apoyo: document.getElementById('p-apoyo').value || "S/N",
        trafo: document.getElementById('p-trafo').value,
        clientes: document.getElementById('p-clientes').value || 0
    };

    puntosLevantados.push(punto);

    dibujarPuntoEnMapa(punto);
}

function dibujarPuntoEnMapa(p) {

    const color = p.tipoRed === 'PROYECTADA' ? '#27ae60' : '#000';

    const m = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: color
    });

    m.on('click', function() {

        if (!modoDibujo) return;

        if (!puntoOrigenParaLinea) {
            puntoOrigenParaLinea = p;
        } else {
            trazarLinea(puntoOrigenParaLinea, p, modoDibujo);
            puntoOrigenParaLinea = null;
        }
    });

    capaDibujo.addLayer(m);
}

function trazarLinea(pA, pB, tipo) {

    const linea = {
        tipo: tipo,
        coords: [[pA.lat, pA.lng], [pB.lat, pB.lng]]
    };

    lineasRed.push(linea);

    dibujarLinea(linea);
}

function dibujarLinea(l) {

    const opciones = {
        color: l.tipo === 'PROYECTADA' ? '#27ae60' : '#000',
        weight: 4,
        dashArray: l.tipo === 'PROYECTADA' ? '10,15' : null
    };

    L.polyline(l.coords, opciones).addTo(capaDibujo);
}

// 🔥 CLAVE PARA EL PPT
function redibujarTodo() {

    capaDibujo.clearLayers();

    puntosLevantados.forEach(p => dibujarPuntoEnMapa(p));

    lineasRed.forEach(l => dibujarLinea(l));
}

async function generarPowerPoint() {

    let pptx = new PptxGenJS();

    mapZ.removeLayer(capaSatelite);
    capaCallesPlano.addTo(mapZ);

    // 🔥 Forzar redibujo
    redibujarTodo();

    await new Promise(r => setTimeout(r, 1200));

    const canvas = await html2canvas(document.getElementById('map-zonif'), {
        useCORS: true,
        scale: 2
    });

    let slide = pptx.addSlide();

    slide.addImage({
        data: canvas.toDataURL('image/png'),
        x:0.5,
        y:0.5,
        w:9,
        h:5
    });

    pptx.writeFile("Plano_Zonificacion.pptx");

    mapZ.removeLayer(capaCallesPlano);
    capaSatelite.addTo(mapZ);
}
