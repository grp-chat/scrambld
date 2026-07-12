// Load Socket.io script element dynamically into page header framework safely
const script = document.createElement("script");
script.src = "/socket.io/socket.io.js";
document.head.appendChild(script);

script.onload = () => {
    const socket = io();

    // --- PACK LAYOUT STATE TO SEND ---
    function broadcastBoard() {
        const nodes = Array.from(document.querySelectorAll(".board-node"));
        const dataPayload = nodes.map(node => ({
            id: node.id,
            type: node.dataset.type,
            team: node.dataset.team,
            left: node.style.left,
            top: node.style.top,
            label: node.querySelector(".node-label").textContent,
            scrambleChecked: node.querySelector(".chk-scramble").checked
        }));
        socket.emit("update-layout", dataPayload);
    }

    // --- UNPACK RECEIVED LAYOUT STATE ---
    function renderIncomingLayout(remoteState) {
        const core = window.PlayboardCore;
        if (!core || !core.canvas) return;

        // 1. MEMORIZE SCROLL POSITIONS
        const targetCanvas = core.canvas;
        const currentScrollLeft = targetCanvas.scrollLeft;
        const currentScrollTop = targetCanvas.scrollTop;

        // 2. PURGE VANISHED REMOTE ITEMS
        const inboundIds = remoteState.map(n => n.id);
        Array.from(document.querySelectorAll(".board-node")).forEach(node => {
            if (!inboundIds.includes(node.id)) {
                node.remove();
            }
        });

        // 3. APPLY INBOUND PROPERTY CONFIGURES
        remoteState.forEach(remoteNode => {
            let localNode = document.getElementById(remoteNode.id);

            if (!localNode) {
                localNode = core.createNode(remoteNode.type, remoteNode.id);
            }

            const labelEl = localNode.querySelector(".node-label");
            if (labelEl && labelEl.textContent !== remoteNode.label) {
                labelEl.textContent = remoteNode.label;
            }

            localNode.style.left = remoteNode.left;
            localNode.style.top = remoteNode.top;
            
            localNode.dataset.team = remoteNode.team;
            localNode.style.backgroundColor = core.TEAM_COLORS[remoteNode.team];
            
            const selectEl = localNode.querySelector(".node-color-select");
            if (selectEl) selectEl.value = remoteNode.team;

            const chkEl = localNode.querySelector(".chk-scramble");
            if (chkEl) chkEl.checked = remoteNode.scrambleChecked;
        });

        // 4. MICRO-DELAY TO SNIP AUTO-SCROLL BEFORE RE-PAINT COMPLETES
        requestAnimationFrame(() => {
            targetCanvas.scrollLeft = currentScrollLeft;
            targetCanvas.scrollTop = currentScrollTop;
        });
    }

    // --- SOCKET EVENT HANDLERS ---
    socket.on("init-layout", renderIncomingLayout);
    socket.on("sync-layout", renderIncomingLayout);

    // Global exposure registry hook for core layout engine
    window.SyncEngine = { broadcastBoard };
};