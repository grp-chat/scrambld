// --- SETTINGS DOM TARGETS ---
const configRosterInput = document.getElementById("student-names-input");
const saveNameInput = document.getElementById("input-save-name");
const saveBtn = document.getElementById("btn-save-roster");
const rosterSelect = document.getElementById("select-saved-rosters");

const menuPanel = document.getElementById("main-menu");
const settingsPanel = document.getElementById("phase-settings");

// Helper to get local storage data quickly
const getLocalRosters = () => JSON.parse(localStorage.getItem("scrambld_rosters") || "{}");

// 1. Navigation: Back to Main Menu
document.getElementById("btn-settings-back").addEventListener("click", () => {
    settingsPanel.classList.add("hidden");
    menuPanel.classList.remove("hidden");
});

// 2. Storage Action: Commit Roster to GitHub & Local Storage Backup
saveBtn.addEventListener("click", async () => {
    const className = saveNameInput.value.trim();
    const rosterText = configRosterInput.value.trim();

    if (!className || !rosterText) {
        alert(!className ? "Please enter a name for your class layout first!" : "Your student roster is empty! Add names before saving.");
        return;
    }

    try {
        const response = await fetch('/api/save-roster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ className, rosterText })
        });

        const result = await response.json();

        if (response.ok) {
            const savedClasses = getLocalRosters();
            savedClasses[className] = rosterText;
            localStorage.setItem("scrambld_rosters", JSON.stringify(savedClasses));

            saveNameInput.value = ""; 
            populateSavedRostersDropdown(); 
            alert(result.message);
        } else {
            alert(`GitHub Upload Failed: ${result.error}`);
        }
    } catch (err) {
        console.error(err);
        alert("Failed to communicate with the local server.");
    }
});

// 3. Storage Action: Fill text area from dropdown selection
rosterSelect.addEventListener("change", (e) => {
    const savedClasses = getLocalRosters();
    if (savedClasses[e.target.value]) {
        configRosterInput.value = savedClasses[e.target.value];
        configRosterInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
});

// 4. Utility: Regenerate dropdown listing options
function populateSavedRostersDropdown() {
    rosterSelect.innerHTML = '<option value="">-- Select a Saved Class --</option>';
    const savedClasses = getLocalRosters();
    
    Object.keys(savedClasses).forEach(className => {
        const option = new Option(className, className); // Shorter way to build options
        rosterSelect.appendChild(option);
    });
}

// Initial script loadup
populateSavedRostersDropdown();