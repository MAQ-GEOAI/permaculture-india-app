// ======================================================================
// Permaculture India – FULL INTEGRATION (PHASE 3)
// Connects frontend → backend (DEM, Contours, Hydrology, Sun, AI)
// ======================================================================

const BACKEND_URL = "http://localhost:8000";   // change if deployed

// -------------- MAP INITIALIZATION -----------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/outdoor/style.json?key=EG0k5YdMy5JGWsVWbigv`,
    center: [78.96, 20.59],
    zoom: 4,
    pitch: 45
});

map.addControl(new maplibregl.NavigationControl());

// ---------------------------------------------------------------------
// AOI HANDLING
// ---------------------------------------------------------------------
let aoi = null;
let drawing = false;
let points = [];

document.getElementById("drawPolygonBtn").onclick = () => {
    alert("Click map to draw area, double-click to finish.");
    drawing = true;
    points = [];
};

map.on("click", (e) => {
    if (!drawing) return;
    points.push([e.lngLat.lng, e.lngLat.lat]);
});

map.on("dblclick", () => {
    if (!drawing) return;
    drawing = false;

    aoi = turf.polygon([[...points, points[0]]]);
    renderAOI();
});

function renderAOI() {
    if (map.getSource("aoi")) {
        map.getSource("aoi").setData(aoi);
    } else {
        map.addSource("aoi", { type: "geojson", data: aoi });
        map.addLayer({
            id: "aoi-layer",
            type: "fill",
            source: "aoi",
            paint: { "fill-color": "#22c55e", "fill-opacity": 0.35 }
        });
    }
}

// ---------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------
function bboxString(geojson) {
    return turf.bbox(geojson).join(",");
}

function setLoading(on = true) {
    const el = document.getElementById("loader");
    el.style.display = on ? "block" : "none";
}

// ---------------------------------------------------------------------
// 1. LOAD CONTOURS (From Backend /contours)
// ---------------------------------------------------------------------
document.getElementById("loadContoursBtn").onclick = async () => {
    if (!aoi) return alert("Draw AOI first");

    const interval = Number(document.getElementById("contourInterval").value);
    const bbox = bboxString(aoi);

    setLoading(true);
    const res = await fetch(`${BACKEND_URL}/contours?bbox=${bbox}&interval=${interval}`);
    const contours = await res.json();
    setLoading(false);

    if (map.getSource("contours")) {
        map.getSource("contours").setData(contours);
    } else {
        map.addSource("contours", { type: "geojson", data: contours });
        map.addLayer({
            id: "contours-layer",
            type: "line",
            source: "contours",
            paint: { "line-color": "#1e40af", "line-width": 1 }
        });
    }

    showToast("Contours loaded successfully");
};

// ---------------------------------------------------------------------
// 2. HYDROLOGY (From Backend /hydrology)
// ---------------------------------------------------------------------
document.getElementById("runHydrologyBtn").onclick = async () => {
    if (!aoi) return alert("Draw AOI first");

    const bbox = bboxString(aoi);

    setLoading(true);
    const res = await fetch(`${BACKEND_URL}/hydrology?bbox=${bbox}`);
    const hydro = await res.json();
    setLoading(false);

    if (map.getSource("hydro")) {
        map.getSource("hydro").setData(hydro);
    } else {
        map.addSource("hydro", { type: "geojson", data: hydro });
        map.addLayer({
            id: "hydro-layer",
            type: "line",
            source: "hydro",
            paint: {
                "line-color": "#0ea5e9",
                "line-width": 2
            }
        });
    }

    showToast("Hydrology generated");
};

// ---------------------------------------------------------------------
// 3. SUN PATH (Backend /sun)
// ---------------------------------------------------------------------
document.getElementById("sunPathBtn").onclick = async () => {
    if (!aoi) return alert("Draw AOI first");

    const center = turf.center(aoi).geometry.coordinates;
    const [lon, lat] = center;

    setLoading(true);
    const res = await fetch(`${BACKEND_URL}/sun?lat=${lat}&lon=${lon}`);
    const sunData = await res.json();
    setLoading(false);

    renderSunPath(sunData.sun_path);
    showToast("Sun path loaded");
};

function renderSunPath(data) {
    const pts = data.map(d => {
        const offset = (d.hour - 12) * 0.002;
        return turf.point([aoi.geometry.coordinates[0][0][0] + offset, aoi.geometry.coordinates[0][0][1] + Math.sin(offset)]);
    });

    const sunLine = turf.lineString(pts.map(p => p.geometry.coordinates));

    if (map.getSource("sun")) {
        map.getSource("sun").setData(sunLine);
    } else {
        map.addSource("sun", { type: "geojson", data: sunLine });
        map.addLayer({
            id: "sun-layer",
            type: "line",
            source: "sun",
            paint: { "line-color": "#f59e0b", "line-width": 3 }
        });
    }
}

// ---------------------------------------------------------------------
// 4. AI ADVISOR (free)
// ---------------------------------------------------------------------
document.getElementById("askAI").onclick = async () => {
    const q = document.getElementById("aiInput").value;
    if (!q) return;

    const res = await fetch(`${BACKEND_URL}/ai?q=${encodeURIComponent(q)}`, {
        method: "POST"
    });

    const data = await res.json();
    document.getElementById("aiOutput").innerHTML = data.answer;
};

// ---------------------------------------------------------------------
// 5. EXPORT
// ---------------------------------------------------------------------
document.getElementById("exportAOIBtn").onclick = () => {
    if (!aoi) return;
    downloadFile("aoi.geojson", JSON.stringify(aoi, null, 2));
};

function downloadFile(filename, content) {
    const a = document.createElement("a");
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(content);
    a.download = filename;
    a.click();
}

function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}
document.getElementById("exportPNG").onclick = async () => {
    showToast("Exporting map…");

    const mapCanvas = document.querySelector("canvas");
    const dataURL = mapCanvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "permaculture_map.png";
    a.click();
};
function exportGeoJSON(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveAs(blob, name + ".geojson");
}
function exportCSV(name, rows) {
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    saveAs(blob, name + ".csv");
}
document.getElementById("exportPDF").onclick = async () => {
    showToast("Generating PDF…");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // 1. Title
    pdf.setFontSize(20);
    pdf.text("Permaculture Design Report", 40, 50);

    // 2. Date
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 40, 70);

    // 3. AOI Coordinates
    if (aoi) {
        pdf.setFontSize(14);
        pdf.text("Area of Interest Coordinates:", 40, 110);

        const coords = aoi.geometry.coordinates[0].slice(0, 5);
        let y = 130;
        coords.forEach(c => {
            pdf.text(`• ${c[0].toFixed(6)}, ${c[1].toFixed(6)}`, 40, y);
            y += 16;
        });
    }

    // 4. Screenshot of Map
    const mapCanvas = document.querySelector("canvas");
    const imgData = mapCanvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 40, 220, 350, 250);

    // 5. Notes section
    pdf.setFontSize(14);
    pdf.text("Design Notes:", 40, 500);
    pdf.setFontSize(11);
    pdf.text(
        "• Swales recommended on contour at major ridgelines.\n" +
        "• Water flow identifies lowest catchment area suitable for pond.\n" +
        "• Sun path suggests ideal orientation for kitchen garden & solar panels.",
        40, 520
    );

    pdf.save("Permaculture_Report.pdf");

    showToast("PDF Ready");
};
document.getElementById("exportZIP").onclick = () => {
    if (!aoi) return alert("Draw AOI first");
    showToast("Preparing ZIP…");

    const zip = new JSZip();

    zip.file("aoi.geojson", JSON.stringify(aoi, null, 2));

    if (map.getSource("contours"))
        zip.file("contours.geojson", JSON.stringify(map.getSource("contours")._data));

    if (map.getSource("hydro"))
        zip.file("hydrology.geojson", JSON.stringify(map.getSource("hydro")._data));

    if (map.getSource("sun"))
        zip.file("sunpath.geojson", JSON.stringify(map.getSource("sun")._data));

    zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, "permaculture_output.zip");
    });
};
