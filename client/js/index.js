// Core Panels
const mainMenu = document.getElementById("main-menu");
const phaseSettings = document.getElementById("phase-settings");
const phasePlay = document.getElementById("phase-play");

// --- NAVIGATION CLICK EVENTS ---
document.getElementById("btn-goto-settings").addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    phaseSettings.classList.remove("hidden");
});

// 2. Redirect completely to the isolated Playboard page
document.getElementById("btn-goto-playboard").addEventListener("click", () => {
    window.location.href = "/playboard.html";
});

document.getElementById("btn-back-to-menu").addEventListener("click", () => {
    location.reload();
});