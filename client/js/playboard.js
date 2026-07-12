// --- CONFIGURATION CONSTANTS ---
const GRID_SIZE = 40; 
let isLocked = false;
let studentRoster = [];

const TEAM_COLORS = {
    blue: "#2980b9", green: "#27ae60", yellow: "#f1c40f",
    orange: "#e67e22", purple: "#8e44ad", pink: "#e84393"
};

const savedClasses = JSON.parse(localStorage.getItem("scrambld_rosters") || "{}");
const firstClassKey = Object.keys(savedClasses)[0];
if (firstClassKey) {
    studentRoster = savedClasses[firstClassKey].split('\n').map(n => n.trim()).filter(Boolean);
} 

let tableAssignedCount = 0;
let chairAssignedCount = 0;

const canvas = document.getElementById("canvas-grid");
const btnAddTable = document.getElementById("btn-add-table");
const btnAddChair = document.getElementById("btn-add-chair");
const btnScrambleTables = document.getElementById("btn-scramble-tables");
const btnScrambleChairs = document.getElementById("btn-scramble-chairs");
const btnLock = document.getElementById("btn-lock");

// --- EVENT LISTENERS ---
btnAddTable.addEventListener("click", () => { createNode("table"); triggerSync(); });
btnAddChair.addEventListener("click", () => { createNode("chair"); triggerSync(); });

btnLock.addEventListener("click", () => {
    isLocked = !isLocked;
    btnLock.textContent = isLocked ? "🔒 Locked" : "🔓 Unlocked";
    btnLock.classList.toggle("locked", isLocked);
});

btnScrambleTables.addEventListener("click", () => executeTargetedScramble("table"));
btnScrambleChairs.addEventListener("click", () => executeTargetedScramble("chair"));

// --- HOOK FOR ISOLATED SYNC ENGINE ---
function triggerSync() {
    if (window.SyncEngine && typeof window.SyncEngine.broadcastBoard === "function") {
        window.SyncEngine.broadcastBoard();
    }
}

// --- NODE MANAGEMENT CREATION ENGINE ---
function createNode(type, explicitId = null) {
    const node = document.createElement("div");
    node.classList.add("board-node", type);
    node.dataset.type = type;
    
    node.id = explicitId || `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    node.dataset.team = "blue";
    node.style.backgroundColor = TEAM_COLORS.blue;
    node.style.left = "80px";
    node.style.top = "80px";

    let assignedName = "Empty";
    if (!explicitId) {
        if (type === "table" && tableAssignedCount < studentRoster.length) {
            assignedName = studentRoster[tableAssignedCount];
            tableAssignedCount++;
        } else if (type === "chair" && chairAssignedCount < studentRoster.length) {
            assignedName = studentRoster[chairAssignedCount];
            chairAssignedCount++;
        }
    }

    node.innerHTML = `
        <div class="node-label">${assignedName}</div>
        <div class="node-controls">
            <select class="node-color-select">
                <option value="blue" selected>🟦</option>
                <option value="green">🟩</option>
                <option value="yellow">🟨</option>
                <option value="orange">🟧</option>
                <option value="purple">🟪</option>
                <option value="pink">🟥</option>
            </select>
            <label class="scramble-checkbox-label">
                <input type="checkbox" class="chk-scramble" checked> 🎲
            </label>
            <button class="btn-delete-node">×</button>
        </div>
    `;

    node.querySelector(".node-color-select").addEventListener("change", (e) => {
        const selectedTeam = e.target.value;
        node.dataset.team = selectedTeam;
        node.style.backgroundColor = TEAM_COLORS[selectedTeam];
        triggerSync();
    });

    node.querySelector(".btn-delete-node").addEventListener("click", () => {
        node.remove();
        triggerSync();
    });

    setupDragAndDrop(node);
    canvas.appendChild(node);
    return node;
}

// --- DRAG AND DROP MATH SNAP ENGINE ---
function setupDragAndDrop(node) {
    let offsetX = 0, offsetY = 0;

    node.addEventListener("mousedown", (e) => {
        if (isLocked || e.target.closest('.node-controls')) return; 
        
        node.classList.add("is-dragging");
        offsetX = e.clientX - node.getBoundingClientRect().left;
        offsetY = e.clientY - node.getBoundingClientRect().top;

        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
    });

    function mouseMoveHandler(e) {
        const canvasRect = canvas.getBoundingClientRect();
        let x = e.clientX - canvasRect.left - offsetX;
        let y = e.clientY - canvasRect.top - offsetY;

        let snapX = Math.round(x / GRID_SIZE) * GRID_SIZE;
        let snapY = Math.round(y / GRID_SIZE) * GRID_SIZE;

        snapX = Math.max(0, Math.min(snapX, canvasRect.width - node.offsetWidth));
        snapY = Math.max(0, Math.min(snapY, canvasRect.height - node.offsetHeight));

        node.style.left = `${snapX}px`;
        node.style.top = `${snapY}px`;
    }

    function mouseUpHandler() {
        node.classList.remove("is-dragging");
        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
        triggerSync(); 
    }
}

// --- TARGETED TEAM SCRAMBLE ALGORITHM (DERANGEMENT ENGINE) ---
function executeTargetedScramble(targetType) {
    // 1. LOCK THE SCROLL VALUES LOCALLY BEFORE SHUFFLING
    const currentScrollLeft = canvas.scrollLeft;
    const currentScrollTop = canvas.scrollTop;

    const allNodes = Array.from(document.querySelectorAll(".board-node"));
    const teams = ["blue", "green", "yellow", "orange", "purple", "pink"];
    let didScramble = false;

    teams.forEach(team => {
        const targetNodes = allNodes.filter(n => 
            n.dataset.type === targetType && 
            n.dataset.team === team && 
            n.querySelector(".chk-scramble").checked
        );

        if (targetNodes.length >= 2) {
            scrambleWithDerangement(targetNodes);
            didScramble = true;
        }
    });

    if (didScramble) {
        triggerSync(); 
    }

    // 2. RUN AN ANIMATION FRAME LOOP TO FORCE THE SCROLL POSITIONS TO REMAIN CONSTANT
    requestAnimationFrame(() => {
        canvas.scrollLeft = currentScrollLeft;
        canvas.scrollTop = currentScrollTop;
    });
}

function scrambleWithDerangement(nodeArray) {
    const originalCoords = nodeArray.map(node => ({ left: node.style.left, top: node.style.top }));
    let shuffledCoords = [...originalCoords];
    let isDerangement = false;

    while (!isDerangement) {
        for (let i = shuffledCoords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledCoords[i], shuffledCoords[j]] = [shuffledCoords[j], shuffledCoords[i]];
        }
        isDerangement = shuffledCoords.every((coord, idx) => {
            return coord.left !== originalCoords[idx].left || coord.top !== originalCoords[idx].top;
        });
    }

    nodeArray.forEach((node, index) => {
        node.style.left = shuffledCoords[index].left;
        node.style.top = shuffledCoords[index].top;
    });
}

// Global exposure so sync engine can access core generator methods
window.PlayboardCore = { createNode, canvas, TEAM_COLORS };