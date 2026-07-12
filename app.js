import "dotenv/config";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("client"));
app.use(express.json());

// --- GITHUB SAVE & OVERWRITE ROUTE ---
app.post('/api/save-roster', async (req, res) => {
    const { className, rosterText } = req.body;
    if (!className || !rosterText) return res.status(400).json({ error: 'Missing data.' });

    const filename = className.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.txt';
    const targetUrl = `https://api.github.com/repos/grp-chat/textfiles/contents/${filename}`;
    const base64Content = Buffer.from(rosterText).toString('base64');
    const headers = {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Scrambld-App'
    };

    let sha = null;
    try {
        const checkResponse = await fetch(targetUrl, { method: 'GET', headers });
        if (checkResponse.ok) {
            const fileData = await checkResponse.json();
            sha = fileData.sha;
        }

        const requestBody = {
            message: sha ? `Update ${className}` : `Create ${className}`,
            content: base64Content
        };
        if (sha) requestBody.sha = sha;

        const response = await fetch(targetUrl, { method: 'PUT', headers, body: JSON.stringify(requestBody) });
        const data = await response.json();

        if (response.ok) {
            res.json({ success: true, message: sha ? "Updated on GitHub!" : "Created on GitHub!" });
        } else {
            res.status(response.status).json({ error: data.message });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// --- REAL-TIME PLAYBOARD PERSISTENCE LAYER VIA DENO KV ---
// Safely instantiate Deno KV only if running in a Deno environment
let kv = null;
if (typeof Deno !== "undefined") {
    kv = await Deno.openKv();
}

io.on("connection", async (socket) => {
    // 1. Fetch layout setup from database (fallback to empty array if non-existent)
    let currentPlayboardState = [];
    if (kv) {
        const entry = await kv.get(["playboard", "state"]);
        if (entry.value) currentPlayboardState = entry.value;
    }
    
    // Send configuration history to device instantly on entry
    socket.emit("init-layout", currentPlayboardState);

    // 2. Intercept changes, commit to key-value storage, broadcast to peers
    socket.on("update-layout", async (updatedState) => {
        if (kv) {
            await kv.set(["playboard", "state"], updatedState);
        }
        socket.broadcast.emit("sync-layout", updatedState);
    });
});

// --- UNIFIED SERVER EXECUTION ENGINE ---
// Works flawlessly on both local Node.js and Deno Deploy
const PORT = process.env.PORT || 8000; 
server.listen(PORT, () => {
    console.log(`Server spinning live at http://localhost:${PORT}`);
});