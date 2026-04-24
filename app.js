const App = {

    estado: {
        puntos: [],
        lineas: [],
        modoLinea: null,
        tipoPunto: null,
        puntoOrigen: null
    },

    map: null,
    marker: null,
    capaDibujo: null,

    init() {
        this.map = L.map('map-zonif').setView([14.65, -86.21], 16);

        this.satelite = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains:['mt0','mt1','mt2','mt3']
        }).addTo(this.map);

        this.plano = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

        this.capaDibujo = L.layerGroup().addTo(this.map);

        this.marker = L.marker([14.65, -86.21], {draggable:true}).addTo(this.map);

        this.cargarLocal();
    },

    abrirModal(tipo){
        this.estado.tipoPunto = tipo;
        document.getElementById("modal").style.display = "flex";
    },

    cerrarModal(){
        document.getElementById("modal").style.display = "none";
    },

    guardarPunto(){

        const coords = this.marker.getLatLng();

        const punto = {
            id: Date.now(),
            tipo: this.estado.tipoPunto,
            lat: coords.lat,
            lng: coords.lng,
            apoyo: document.getElementById("apoyo").value,
            clientes: document.getElementById("clientes").value || 0
        };

        this.estado.puntos.push(punto);
        this.guardarLocal();

        this.dibujarPunto(punto);
        this.cerrarModal();
    },

    dibujarPunto(p){

        const color = p.tipo === 'PROYECTADA' ? 'green' : 'black';

        const marker = L.circleMarker([p.lat, p.lng], {
            radius: 8,
            color: color
        });

        marker.on('click', () => this.clickLinea(p));

        this.capaDibujo.addLayer(marker);
    },

    setModoLinea(tipo){
        this.estado.modoLinea = tipo;
        this.estado.puntoOrigen = null;
        alert("Seleccione inicio y fin");
    },

    clickLinea(p){

        if(!this.estado.modoLinea) return;

        if(!this.estado.puntoOrigen){
            this.estado.puntoOrigen = p;
        } else {

            this.trazarLinea(this.estado.puntoOrigen, p, this.estado.modoLinea);
            this.estado.puntoOrigen = null;
        }
    },

    trazarLinea(p1, p2, tipo){

        const linea = {
            tipo,
            coords: [[p1.lat, p1.lng],[p2.lat, p2.lng]]
        };

        this.estado.lineas.push(linea);
        this.guardarLocal();

        this.dibujarLinea(linea);
    },

    dibujarLinea(l){

        const poly = L.polyline(l.coords, {
            color: l.tipo === 'PROYECTADA' ? 'green' : 'black',
            dashArray: l.tipo === 'PROYECTADA' ? '10,10' : null,
            weight: 4
        });

        this.capaDibujo.addLayer(poly);
    },

    redibujar(){
        this.capaDibujo.clearLayers();

        this.estado.puntos.forEach(p => this.dibujarPunto(p));
        this.estado.lineas.forEach(l => this.dibujarLinea(l));
    },

    guardarLocal(){
        localStorage.setItem("data", JSON.stringify(this.estado));
    },

    cargarLocal(){
        const data = JSON.parse(localStorage.getItem("data"));
        if(data){
            this.estado = data;
            this.redibujar();
        }
    },

    async generarPPT(){

        this.map.removeLayer(this.satelite);
        this.plano.addTo(this.map);

        await new Promise(r => setTimeout(r, 1000));

        const canvas = await html2canvas(document.getElementById("map-zonif"), {
            useCORS:true,
            scale:2
        });

        const ppt = new PptxGenJS();
        const slide = ppt.addSlide();

        slide.addImage({
            data: canvas.toDataURL(),
            x:0.5,
            y:0.5,
            w:9,
            h:5
        });

        ppt.writeFile("Plano_Zonificacion.pptx");

        this.map.removeLayer(this.plano);
        this.satelite.addTo(this.map);
    }

};

window.onload = () => App.init();
