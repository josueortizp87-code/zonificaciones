var mapZ, markerZ;
var puntosLevantados = [];
var tipoPuntoActual = "";
var modoDibujo = null;
var puntoOrigenParaLinea = null;

const capaSatelite = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3'],
    crossOrigin: true
});
const capaCallesPlano = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true
});

window.onload = function() { initMapZonif(); };

function initMapZonif() {
    if (mapZ) mapZ.remove();
    mapZ = L.map('map-zonif').setView([14.65, -86.21], 16);
    capaSatelite.addTo(mapZ);
    // Marcador principal arrastrable para ubicar puntos
    markerZ = L.marker([14.65, -86.21], {draggable: true}).addTo(mapZ);
}

function setModoDibujo(tipo) {
    modoDibujo = tipo;
    puntoOrigenParaLinea = null;
    alert("MODO LÍNEA " + tipo + " ACTIVO\nSeleccione el poste inicial y luego el final en el mapa.");
}

function abrirModalPunto(tipo) {
    tipoPuntoActual = tipo;
    modoDibujo = null;
    document.getElementById('modal-punto').style.display = 'flex';
}

function cerrarModalPunto() {
    document.getElementById('modal-punto').style.display = 'none';
    // Limpiar campos después de usar
    ['p-apoyo', 'p-estructura', 'p-voltaje'].forEach(id => document.getElementById(id).value = "");
    document.getElementById('p-clientes').value = "0";
}

function guardarPunto() {
    const coords = markerZ.getLatLng();
    const punto = {
        id: Date.now(),
        tipoRed: tipoPuntoActual,
        lat: coords.lat, lng: coords.lng,
        utm: latLngToUTM(coords.lat, coords.lng),
        apoyo: document.getElementById('p-apoyo').value || (puntosLevantados.length + 1),
        poste: document.getElementById('p-tipo-poste').value,
        estructura: document.getElementById('p-estructura').value || "S/D",
        trafo: document.getElementById('p-trafo').value,
        clientes: document.getElementById('p-clientes').value || "0",
        voltaje: document.getElementById('p-voltaje').value || "N/A"
    };
    puntosLevantados.push(punto);
    dibujarPuntoEnMapa(punto);
    document.getElementById('contador-puntos').innerText = puntosLevantados.length;
    cerrarModalPunto();
}

function dibujarPuntoEnMapa(p) {
    let color = (p.tipoRed === 'EXISTENTE') ? '#000000' : '#27ae60';
    let etiqueta = p.clientes + " C";

    // Si tiene transformador es un triángulo, si no, un círculo
    let svgHtml = p.trafo !== "N/A" ?
        `<svg width="40" height="40" viewBox="0 0 100 100">
            <polygon points="50,25 90,85 10,85" fill="${color}" stroke="white" stroke-width="5"/>
            <text x="50" y="20" font-family="Arial" font-size="24" font-weight="bold" fill="${color}" text-anchor="middle" stroke="white" stroke-width="3" paint-order="stroke">${etiqueta}</text>
        </svg>` :
        `<svg width="40" height="40" viewBox="0 0 100 100">
            <circle cx="50" cy="65" r="25" fill="${color}" stroke="white" stroke-width="6"/>
            <text x="50" y="30" font-family="Arial" font-size="24" font-weight="bold" fill="${color}" text-anchor="middle" stroke="white" stroke-width="3" paint-order="stroke">${etiqueta}</text>
        </svg>`;

    const icon = L.divIcon({ className: 'svg-marker', html: svgHtml, iconSize: [40, 40], iconAnchor: [20, 20] });
    const m = L.marker([p.lat, p.lng], { icon: icon }).addTo(mapZ);

    // Lógica para conectar líneas al hacer clic en los iconos
    m.on('click', function() {
        if (!modoDibujo) return;
        if (!puntoOrigenParaLinea) {
            puntoOrigenParaLinea = p;
            m.bindTooltip("INICIO", {permanent: true}).openTooltip();
        } else {
            trazarLinea(puntoOrigenParaLinea, p, modoDibujo);
            mapZ.eachLayer(l => { if(l.getTooltip) l.unbindTooltip(); });
            puntoOrigenParaLinea = null;
        }
    });
}

function trazarLinea(pA, pB, tipo) {
    const esProy = (tipo === 'PROYECTADA');
    L.polyline([[pA.lat, pA.lng], [pB.lat, pB.lng]], {
        color: esProy ? '#27ae60' : '#000000',
        weight: 4,
        dashArray: esProy ? '10, 15' : null
    }).addTo(mapZ);
}

// Función para convertir coordenadas a formato UTM
function latLngToUTM(lat, lng) {
    const zone = 16;
    const sa = 6378137.0; const e2 = 0.00669438;
    const latRad = lat * Math.PI / 180;
    const lonRad = lng * Math.PI / 180;
    const lonOriginRad = ((zone * 6) - 183) * Math.PI / 180;
    const n = sa / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
    const t = Math.tan(latRad) * Math.tan(latRad);
    const c = e2 * Math.cos(latRad) * Math.cos(latRad) / (1 - e2);
    const a = (lonRad - lonOriginRad) * Math.cos(latRad);
    const m = sa * ((1 - e2/4 - 3*e2*e2/64) * latRad - (3*e2/8 + 3*e2*e2/32) * Math.sin(2*latRad) + (15*e2*e2/256) * Math.sin(4*latRad));
    const x = 500000.0 + 0.9996 * n * (a + (1-t+c)*a*a*a/6 + (5-18*t+t*t+72*c)*a*a*a*a*a/120);
    const y = 0.9996 * (m + n * Math.tan(latRad) * (a*a/2 + (5-t+9*c+4*c*c)*a*a*a*a/24));
    return `E:${x.toFixed(0)} N:${y.toFixed(0)}`;
}

async function generarPowerPoint() {
    let pptx = new PptxGenJS();
    const circuito = document.getElementById('zonif-circuito').value;
    const zona = document.getElementById('zonif-area').value || "Sector Sin Nombre";

    // Cambiar a mapa de calles para que el reporte sea más legible (fondo blanco)
    mapZ.removeLayer(capaSatelite);
    capaCallesPlano.addTo(mapZ);
    await new Promise(r => setTimeout(r, 2000));

    // Slide 1: Plano del área
    let slidePortada = pptx.addSlide();
    slidePortada.addText(`PLANO TÉCNICO: ${circuito}`, { x:0.5, y:0.3, fontSize:18, bold:true, color:'003366' });
    slidePortada.addText(`Zona: ${zona}`, { x:0.5, y:0.6, fontSize:14, color:'555555' });

    const canvas = await html2canvas(document.getElementById('map-zonif'), { useCORS: true, scale: 2 });
    slidePortada.addImage({ data: canvas.toDataURL('image/png'), x:0.5, y:1.2, w:9, h:4.5 });

    // Slides de Tablas: Resumen técnico de cada poste
    for (let i = 0; i < puntosLevantados.length; i += 15) {
        let slide = pptx.addSlide();
        slide.addText(`RESUMEN DE APOYOS - ${circuito}`, { x:0.5, y:0.2, fontSize:12, bold:true });

        let filasTabla = [[
            { text: "Apoyo", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Tipo Red", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "UTM (E,N)", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Poste/Estr.", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Trafo", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "Voltaje", options: { bold: true, fill: "003366", color: "FFFFFF" } },
            { text: "CL", options: { bold: true, fill: "003366", color: "FFFFFF" } }
        ]];

        for (let j = i; j < i + 15 && j < puntosLevantados.length; j++) {
            let p = puntosLevantados[j];
            filasTabla.push([
                p.apoyo,
                { text: p.tipoRed, options: { color: p.tipoRed === 'PROYECTADA' ? '27ae60' : '000000' } },
                p.utm,
                `${p.poste} / ${p.estructura}`,
                p.trafo,
                p.voltaje,
                p.clientes
            ]);
        }
        slide.addTable(filasTabla, { x: 0.3, y: 0.6, w: 9.4, fontSize: 8, border: { type: 'solid', color: 'CCCCCC' }, align: 'center' });
    }

    pptx.writeFile({ fileName: `Levantamiento_${circuito}_${zona}.pptx` });

    // Regresar al modo satelital en la web
    mapZ.removeLayer(capaCallesPlano);
    capaSatelite.addTo(mapZ);
}
