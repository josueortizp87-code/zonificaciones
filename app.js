var mapZ, markerZ;
var puntosLevantados = [];
var lineasRed = [];
var tipoPuntoActual = "";
var modoDibujo = null;
var puntoOrigenParaLinea = null;

const capaSatelite = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], crossOrigin: true });
const capaCallesPlano = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: true });

// --- 1. BASE DE DATOS DE USUARIOS Y CIRCUITOS ---
const CONFIG_ACCESO = {
    "SUPER_JUT1": { pass: "enee2026", sector: "JUTICALPA", circuitos: ["JUT-L379", "JUT-L380", "JUT-L381", "JUT-L382", "CAT-L375", "CAT-L376"] },
    "SUPER_JUT2": { pass: "enee2026", sector: "JUTICALPA", circuitos: ["JUT-L379", "JUT-L380", "JUT-L381", "JUT-L382", "CAT-L375", "CAT-L376"] },
    "SUPER_CHO1": { pass: "enee2026", sector: "CHOLUTECA", circuitos: ["CHS-L307", "EBI-L312", "EBI-L313", "NNC-L304", "PAV-L365", "PAV-L366", "PAV-L367", "PAV-L368", "PAV-L369", "PRD-L360", "PRD-L361", "SLU-L318", "SLU-L320", "SLU-L355", "SLU-L356", "SLU-L357", "SLU-L358", "SLU-L359", "SLU-L361"] },
    "SUPER_CHO2": { pass: "enee2026", sector: "CHOLUTECA", circuitos: ["CHS-L307", "EBI-L312", "EBI-L313", "NNC-L304", "PAV-L365", "PAV-L366", "PAV-L367", "PAV-L368", "PAV-L369", "PRD-L360", "PRD-L361", "SLU-L318", "SLU-L320", "SLU-L355", "SLU-L356", "SLU-L357", "SLU-L358", "SLU-L359", "SLU-L361"] },
    "SUPER_TGU1": { pass: "enee2026", sector: "TEGUCIGALPA", circuitos: ["AMT-L333", "AMT-L335", "CDA-L270", "CDA-L271", "CDA-L272", "CDA-L273", "CDH-L344", "CDH-L345", "CHS-L307", "EBI-L312", "EBI-L313", "GMC-L377", "GMC-L378", "LLN-L231", "LLN-L232", "LLN-L233", "LLN-L234", "LNZ-L261", "LNZ-L262", "LNZ-L263", "LNZ-L264"] },
    "SUPER_TGU2": { pass: "enee2026", sector: "TEGUCIGALPA", circuitos: ["AMT-L333", "AMT-L335", "CDA-L270", "CDA-L271", "CDA-L272", "CDA-L273", "CDH-L344", "CDH-L345", "CHS-L307", "EBI-L312", "EBI-L313", "GMC-L377", "GMC-L378", "LLN-L231", "LLN-L232", "LLN-L233", "LLN-L234", "LNZ-L261", "LNZ-L262", "LNZ-L263", "LNZ-L264"] }
};

let usuarioActivo = null;

function validarAcceso() {
    const u = document.getElementById('user-login').value.toUpperCase();
    const p = document.getElementById('pass-login').value;

    if (CONFIG_ACCESO[u] && CONFIG_ACCESO[u].pass === p) {
        usuarioActivo = CONFIG_ACCESO[u];
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-zonificacion-container').style.display = 'block';

        const selectSector = document.getElementById('zonif-sector');
        selectSector.innerHTML = `<option value="${usuarioActivo.sector}">${usuarioActivo.sector}</option>`;
        selectSector.disabled = true;

        const selectCircuito = document.getElementById('zonif-circuito');
        selectCircuito.innerHTML = usuarioActivo.circuitos.map(c => `<option value="${c}">${c}</option>`).join('');

        initMapZonif();
        obtenerUbicacionGPS(); // <-- Llamada al GPS

        setTimeout(() => { mapZ.invalidateSize(); }, 400);
    } else {
        alert("Usuario o Contraseña incorrectos.");
    }
}

function initMapZonif() {
    if (mapZ) mapZ.remove();
    mapZ = L.map('map-zonif', { preferCanvas: false, renderer: L.svg() }).setView([14.65, -86.21], 16);
    capaSatelite.addTo(mapZ);
    markerZ = L.marker([14.65, -86.21], {draggable: true}).addTo(mapZ);
}

function obtenerUbicacionGPS() {
    if ("geolocation" in navigator) {
        // Opción para móviles: máxima precisión
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            mapZ.setView([lat, lng], 18);
            markerZ.setLatLng([lat, lng]);
        }, function(error) {
            console.warn("Error de GPS: ", error.message);
        }, geoOptions);
    }
}

function setModoDibujo(tipo) {
    modoDibujo = tipo;
    puntoOrigenParaLinea = null;
    alert("MODO LÍNEA " + tipo + " ACTIVO\nSeleccione el poste inicial y luego el final.");
}

function abrirModalPunto(tipo) {
    tipoPuntoActual = tipo;
    modoDibujo = null;
    document.getElementById('modal-punto').style.display = 'flex';
}

function cerrarModalPunto() {
    document.getElementById('modal-punto').style.display = 'none';
    document.getElementById('p-apoyo').value = "";
    document.getElementById('p-clientes').value = "0";
    document.getElementById('p-estructura').value = "";
    document.getElementById('p-voltaje').value = "";
}

function guardarPunto() {
    const coords = markerZ.getLatLng();
    const punto = {
        id: Date.now(),
        tipoRed: tipoPuntoActual,
        lat: coords.lat, lng: coords.lng,
        utm: latLngToUTM(coords.lat, coords.lng),
        apoyo: document.getElementById('p-apoyo').value || "S/N",
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

// --- 2. DIBUJO DE ICONOS (50% más pequeños y texto negro) ---
function dibujarPuntoEnMapa(p) {
    let color = (p.tipoRed === 'EXISTENTE') ? '#000000' : '#27ae60';
    let etiqueta = p.clientes + " C";

    // Tamaño reducido de 40 a 20. viewBox se mantiene en 100 para dibujo interno.
    // fill="black" en el texto por solicitud.
    let svgHtml = p.trafo !== "N/A" ?
        `<svg width="20" height="20" viewBox="0 0 100 100">
            <polygon points="50,25 90,85 10,85" fill="${color}" stroke="white" stroke-width="5"/>
            <text x="50" y="20" font-family="Arial" font-size="28" font-weight="bold" fill="black" text-anchor="middle" stroke="white" stroke-width="4" paint-order="stroke">${etiqueta}</text>
        </svg>` :
        `<svg width="20" height="20" viewBox="0 0 100 100">
            <circle cx="50" cy="65" r="25" fill="${color}" stroke="white" stroke-width="6"/>
            <text x="50" y="30" font-family="Arial" font-size="28" font-weight="bold" fill="black" text-anchor="middle" stroke="white" stroke-width="4" paint-order="stroke">${etiqueta}</text>
        </svg>`;

    const icon = L.divIcon({ className: 'svg-marker', html: svgHtml, iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10]});
    const m = L.marker([p.lat, p.lng], { icon: icon }).addTo(mapZ);

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
    const opciones = {
        color: esProy ? '#27ae60' : '#000000',
        weight: 3,
        dashArray: esProy ? '8, 12' : null,
        opacity: 1.0
    };
    L.polyline([[pA.lat, pA.lng], [pB.lat, pB.lng]], opciones).addTo(mapZ);
}

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

// --- 3. REPORTE PPTX (Paginación de 10 y nuevas columnas) ---
async function generarPowerPoint() {
    try {
        let pptx = new PptxGenJS();
        const sector = document.getElementById('zonif-sector').value;
        const circuito = document.getElementById('zonif-circuito').value;
        const zona = document.getElementById('zonif-area').value || "Sector Sin Nombre";

        // Cambiar a mapa de calles para el reporte
        mapZ.removeLayer(capaSatelite);
        capaCallesPlano.addTo(mapZ);

        // Esperar a que las baldosas del mapa carguen
        await new Promise(r => setTimeout(r, 3000));

        let slidePortada = pptx.addSlide();
        slidePortada.addText(`PLANO TÉCNICO: ${circuito}`, { x:0.5, y:0.3, fontSize:18, bold:true, color:'003366' });
        slidePortada.addText(`Sector: ${sector} | Zona: ${zona}`, { x:0.5, y:0.6, fontSize:14, color:'555555' });

        // Captura del mapa con manejo de errores
        try {
            const mapaElemento = document.getElementById('map-zonif');
            const canvas = await html2canvas(mapaElemento, {
                useCORS: true,
                scale: 2,
                logging: false,
                allowTaint: true
            });
            slidePortada.addImage({ data: canvas.toDataURL('image/png'), x:0.5, y:1.2, w:9, h:4.5 });
        } catch (e) {
            console.error("Error capturando mapa:", e);
            slidePortada.addText("(Error al cargar imagen del mapa)", { x:2, y:3, color:'FF0000' });
        }

        // --- TABLA DE APOYOS ---
        if (puntosLevantados.length === 0) {
            alert("No hay puntos para exportar.");
            return;
        }

        for (let i = 0; i < puntosLevantados.length; i += 10) {
            let slide = pptx.addSlide();
            slide.addText(`RESUMEN DE APOYOS - ${sector} - ${circuito}`, { x:0.5, y:0.2, fontSize:10, bold:true });

            let filasTabla = [
                [
                    { text: "Apoyo", options: { bold: true, fill: "003366", color: "FFFFFF" } },
                    { text: "UTM (E,N)", options: { bold: true, fill: "003366", color: "FFFFFF" } },
                    { text: "Lat, Lng", options: { bold: true, fill: "003366", color: "FFFFFF" } },
                    { text: "Poste / Estr.", options: { bold: true, fill: "003366", color: "FFFFFF" } },
                    { text: "Trafo", options: { bold: true, fill: "003366", color: "FFFFFF" } },
                    { text: "Cli.", options: { bold: true, fill: "003366", color: "FFFFFF" } }
                ]
            ];

            for (let j = i; j < i + 10 && j < puntosLevantados.length; j++) {
                let p = puntosLevantados[j];
                filasTabla.push([
                    p.apoyo,
                    p.utm,
                    `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`,
                    `${p.poste} / ${p.estructura}`,
                    p.trafo,
                    p.clientes
                ]);
            }
            slide.addTable(filasTabla, { x: 0.3, y: 0.5, w: 9.4, fontSize: 7, border: { type: 'solid', color: 'CCCCCC' }, align: 'center' });
        }

        await pptx.writeFile({ fileName: `Zonificacion_${sector}_${circuito}.pptx` });

        // Regresar a vista satelital
        mapZ.removeLayer(capaCallesPlano);
        capaSatelite.addTo(mapZ);
        alert("Reporte generado con éxito.");

    } catch (error) {
        console.error("Error general:", error);
        alert("Ocurrió un error al generar el archivo: " + error.message);
    }
}
