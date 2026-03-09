/**
 * CesiumJS Spatiotemporal Ontology Story Map - App Logic
 */

// 1. Initialize Cesium Viewer
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMmYyMTg2MC05MmEzLTQ5M2ItYTRhMS02MjVlYzZlMTA3N2UiLCJpZCI6MzA1NywiaWF0IjoxNzA3OTg4NDM2fQ.ueW30N6i7eC3Byxs7v0EhZqvSBd2o6TQPoNV2FCOnxM';

const viewer = new Cesium.Viewer('cesiumContainer', {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    fullscreenButton: false,
    geocoder: false,
    selectionIndicator: false
});

viewer.scene.globe.show = false; // For photorealistic 3D Tiles, hide base globe if desired, or keep it true for distant views.

async function loadGoogle3DTiles() {
    try {
        const tileset = await Cesium.createGooglePhotorealistic3DTileset();
        viewer.scene.primitives.add(tileset);
    } catch (error) {
        console.error("Failed to load 3D Tiles:", error);
    }
}

// 2. OntologyGraphManager Class
class OntologyGraphManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.graphData = { nodes: [], edges: [] };
        this.nodeMap = new Map();

        this.currentNodeId = null;
        this.activeFilter = 'ALL';
        this.autoPlay = false;

        // Player State
        this.state = 'IDLE'; // FLYING, STAYING
        this.stateStartTime = 0;
        this.currentBehavior = null;
        this.currentCenter = null;
        this.currentHeading = 0;
        this.currentPitch = 0;
        this.currentRange = 0;

        // UI Elements
        this.ui = {
            title: document.getElementById('tourMainTitle'),
            desc: document.getElementById('tourMainDesc'),
            chapTitle: document.getElementById('chapterTitle'),
            chapDesc: document.getElementById('chapterDesc'),
            typeBadge: document.getElementById('nodeTypeBadge'),
            svg: document.getElementById('networkGraph'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            autoToggle: document.getElementById('autoPlayToggle'),
            progressBar: document.getElementById('progressBar'),
            // V2 Additions
            searchInput: document.getElementById('nodeSearchInput'),
            searchResults: document.getElementById('searchResults'),
            randomBtn: document.getElementById('luckyRandomBtn')
        };

        this.initEvents();
        this.viewer.clock.onTick.addEventListener(this.onTick.bind(this));
    }

    async loadData(jsonUrl) {
        try {
            const res = await fetch(jsonUrl);
            const data = await res.json();

            this.ui.title.innerText = data.title;
            this.ui.desc.innerText = data.description;

            data.nodes.forEach(n => this.nodeMap.set(n.id, n));

            if (data.startNode) {
                this.goToNode(data.startNode);
            }
        } catch (e) {
            console.error("Failed to load ontology data", e);
        }
    }

    initEvents() {
        this.ui.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.ui.filterBtns.forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.activeFilter = target.dataset.type;
                this.renderGraph(); // Re-render with new filter
            });
        });

        this.ui.autoToggle.addEventListener('change', (e) => {
            this.autoPlay = e.target.checked;
            if (this.autoPlay && this.state === 'IDLE') {
                this.autoProceed();
            }
        });

        // V2 Search Event
        this.ui.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.handleSearch(query);
        });

        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.ui.searchInput.contains(e.target) && !this.ui.searchResults.contains(e.target)) {
                this.ui.searchResults.classList.add('hidden');
            }
        });

        // V2 Random Button
        this.ui.randomBtn.addEventListener('click', () => {
            this.goToRandomNode();
        });

        // Handle window resize for SVG
        window.addEventListener('resize', () => {
            if (this.currentNodeId) this.renderGraph();
        });
    }

    goToNode(nodeId) {
        if (!this.nodeMap.has(nodeId)) return;

        // Hide search results and clear input if transitioning
        this.ui.searchResults.classList.add('hidden');
        this.ui.searchInput.value = '';

        this.currentNodeId = nodeId;
        const node = this.nodeMap.get(nodeId);

        // Update UI Panel
        this.ui.chapTitle.innerText = node.title;
        this.ui.chapDesc.innerText = node.description || "";
        this.ui.typeBadge.innerText = node.type;
        this.ui.typeBadge.className = `node-badge badge-${node.type}`;

        // Reset progress
        this.ui.progressBar.style.width = '0%';
        this.ui.progressBar.style.transition = 'none';
        setTimeout(() => this.ui.progressBar.style.transition = 'width 0.1s linear', 50);

        // Animation trigger
        const infoDiv = document.querySelector('.chapter-info');
        infoDiv.style.animation = 'none';
        infoDiv.offsetHeight; // reflow
        infoDiv.style.animation = 'fadeIn 0.5s ease-out';

        this.renderGraph();

        if (node.location && node.camera) {
            this.startFlyTo(node);
        } else {
            // Node without location (e.g. abstract concepts like Artists Protest might not have perfect location, but we assigned them)
            // Default stay simulation
            this.currentBehavior = node.behavior || { flyDuration: 2, stayDuration: 10, rotationSpeed: 0 };
            this.startStaying();
        }
    }

    startFlyTo(node) {
        this.state = 'FLYING';
        this.currentBehavior = node.behavior || { flyDuration: 4, stayDuration: 15, rotationSpeed: 0.2 };

        const loc = node.location;
        const cam = node.camera;

        this.currentCenter = Cesium.Cartesian3.fromDegrees(loc.lng, loc.lat, loc.height);
        this.currentHeading = Cesium.Math.toRadians(cam.heading);
        this.currentPitch = Cesium.Math.toRadians(cam.pitch);
        this.currentRange = cam.range;

        this.viewer.camera.cancelFlight();

        const bs = new Cesium.BoundingSphere(this.currentCenter, 1);
        const offset = new Cesium.HeadingPitchRange(this.currentHeading, this.currentPitch, this.currentRange);

        this.viewer.camera.flyToBoundingSphere(bs, {
            duration: this.currentBehavior.flyDuration,
            offset: offset,
            easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
            complete: () => {
                this.startStaying();
            }
        });
    }

    startStaying() {
        this.state = 'STAYING';
        this.stateStartTime = performance.now();
    }

    getColorForType(type) {
        switch (type) {
            case 'SPACE': return '#10b981';
            case 'TIME': return '#f59e0b';
            case 'PERSON': return '#3b82f6';
            case 'CULTURE': return '#8b5cf6';
            default: return '#cbd5e1';
        }
    }

    // V2: Search Logic
    handleSearch(query) {
        this.ui.searchResults.innerHTML = '';
        if (query.length === 0) {
            this.ui.searchResults.classList.add('hidden');
            return;
        }

        const results = Array.from(this.nodeMap.values()).filter(node =>
            node.title.toLowerCase().includes(query) ||
            (node.description && node.description.toLowerCase().includes(query))
        );

        if (results.length > 0) {
            this.ui.searchResults.classList.remove('hidden');
            results.forEach(node => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `
                    <span>${node.title}</span>
                    <span class="search-item-type" style="color: ${this.getColorForType(node.type)}">${node.type}</span>
                `;
                div.addEventListener('click', () => {
                    this.goToNode(node.id);
                });
                this.ui.searchResults.appendChild(div);
            });
        } else {
            this.ui.searchResults.classList.add('hidden');
        }
    }

    // V2: Random Logic
    goToRandomNode() {
        const keys = Array.from(this.nodeMap.keys());
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        // Add a slight effect
        this.ui.randomBtn.style.transform = 'scale(0.95)';
        setTimeout(() => this.ui.randomBtn.style.transform = '', 150);
        this.goToNode(randomKey);
    }

    // Custom SVG Renderer to draw the Neighborhood of the current node
    renderGraph() {
        if (!this.currentNodeId) return;
        const svg = this.ui.svg;
        svg.innerHTML = ''; // Clear existing

        const svgRect = svg.getBoundingClientRect();
        const cx = svgRect.width / 2;
        const cy = svgRect.height / 2;
        const radius = Math.min(cx, cy) - 40; // distance to satellite nodes

        const centerNode = this.nodeMap.get(this.currentNodeId);
        let connections = centerNode.connections || [];

        // Apply filtering
        if (this.activeFilter !== 'ALL') {
            connections = connections.filter(c => c.type === this.activeFilter);
        }

        const totalSats = connections.length;
        const angleStep = (Math.PI * 2) / (totalSats || 1);

        // 1. Draw Links
        connections.forEach((conn, i) => {
            const angle = i * angleStep;
            const targetX = cx + Math.cos(angle) * radius;
            const targetY = cy + Math.sin(angle) * radius;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', cx);
            line.setAttribute('y1', cy);
            line.setAttribute('x2', targetX);
            line.setAttribute('y2', targetY);
            line.setAttribute('class', 'link');

            // Link Label Background
            const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            // Link Label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', (cx + targetX) / 2);
            text.setAttribute('y', (cy + targetY) / 2 + 3); // slight vertical adjust
            text.setAttribute('class', 'link-label');
            text.textContent = conn.label;

            svg.appendChild(line);
            svg.appendChild(text);
        });

        // 2. Draw Satellite Nodes
        connections.forEach((conn, i) => {
            const targetNode = this.nodeMap.get(conn.targetId);
            if (!targetNode) return;

            const angle = i * angleStep;
            const targetX = cx + Math.cos(angle) * radius;
            const targetY = cy + Math.sin(angle) * radius;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'node-group');
            g.setAttribute('transform', `translate(${targetX}, ${targetY})`);

            // Event
            g.addEventListener('click', () => {
                this.goToNode(conn.targetId);
            });

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', 16);
            circle.setAttribute('class', 'node-circle');
            circle.setAttribute('fill', this.getColorForType(targetNode.type));

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('y', 28);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'node-label');
            text.textContent = targetNode.title;

            g.appendChild(circle);
            g.appendChild(text);
            svg.appendChild(g);
        });

        // 3. Draw Center Node (Render last to be on top)
        const centerG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        centerG.setAttribute('class', 'node-group center');
        centerG.setAttribute('transform', `translate(${cx}, ${cy})`);

        const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        centerCircle.setAttribute('r', 24);
        centerCircle.setAttribute('class', 'node-circle');
        centerCircle.setAttribute('fill', this.getColorForType(centerNode.type));

        const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        centerText.setAttribute('y', 40);
        centerText.setAttribute('text-anchor', 'middle');
        centerText.setAttribute('class', 'node-label');
        centerText.textContent = centerNode.title;

        centerG.appendChild(centerCircle);
        centerG.appendChild(centerText);
        svg.appendChild(centerG);
    }

    autoProceed() {
        if (!this.currentNodeId) return;
        const node = this.nodeMap.get(this.currentNodeId);
        let connections = node.connections || [];

        if (this.activeFilter !== 'ALL') {
            connections = connections.filter(c => c.type === this.activeFilter);
        }

        // If no connections available in current filter, fallback to ALL to prevent dead end, 
        // or just pick the first connection.
        if (connections.length === 0 && (node.connections || []).length > 0) {
            connections = node.connections;
            // Optionally auto-reset filter
            // document.querySelector('.filter-btn[data-type="ALL"]').click();
        }

        // V2 Modification: Pick a random connection instead of just [0]
        if (connections.length > 0) {
            const randomConn = connections[Math.floor(Math.random() * connections.length)];
            this.goToNode(randomConn.targetId);
        }
    }

    onTick(clock) {
        if (this.state !== 'STAYING' || !this.currentBehavior) return;

        const now = performance.now();
        const elapsedSec = (now - this.stateStartTime) / 1000.0;
        const stayDur = this.currentBehavior.stayDuration || 10;

        // UI Progress
        const progress = Math.min((elapsedSec / stayDur) * 100, 100);
        this.ui.progressBar.style.width = `${progress}%`;

        // Check completion
        if (elapsedSec >= stayDur) {
            this.state = 'IDLE';
            if (this.autoPlay) {
                this.autoProceed();
            }
            return;
        }

        // Camera Rotation Magic
        const ds = this.currentBehavior.rotationSpeed || 0;
        if (ds !== 0 && this.currentCenter) {
            const dt = (viewer.scene.deltaTime || 16) / 1000.0;
            this.currentHeading += Cesium.Math.toRadians(ds) * dt;

            const offset = new Cesium.HeadingPitchRange(
                this.currentHeading,
                this.currentPitch,
                this.currentRange
            );
            this.viewer.camera.lookAt(this.currentCenter, offset);
        }
    }
}

// 3. Boot
async function initApp() {
    await loadGoogle3DTiles();
    const gm = new OntologyGraphManager(viewer);
    gm.loadData('data/story_tour.json');
}

initApp();
