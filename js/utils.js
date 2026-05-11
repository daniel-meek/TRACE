// utils.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const FONT = (offset, weight='') => `${weight ? weight + ' ' : ''}${CONFIG.baseFontSize + offset}px monospace`;

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();
function getPanelWidth() { return Math.max(canvas.width / 5, 260); } 

function generateCorruptedText(length = 200) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+{}|:<>?~`-=[]\\;,./ ';
    let text = '';
    for(let i = 0; i < length; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
        if (Math.random() < 0.02) text += '\n';
        if (Math.random() < 0.1) text += ' ';
    }
    return text;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 0) {
    if (!text) text = "DATA CORRUPTED";
    const words = String(text).split(' '); 
    let line = ''; 
    let lineCount = 0;
    
    for (let i = 0; i < words.length; i++) {
        if (words[i].includes('\n')) {
            let parts = words[i].split('\n');
            for (let p = 0; p < parts.length; p++) {
                let testLine = line + parts[p] + ' ';
                let testWidth = ctx.measureText(testLine).width;
                if (testWidth > maxWidth && line !== '') {
                    ctx.fillText(line, x, y);
                    line = parts[p] + ' '; y += lineHeight; lineCount++;
                    if(maxLines && lineCount >= maxLines) return;
                } else { 
                    line = testLine; 
                }
                if (p < parts.length - 1) {
                    ctx.fillText(line, x, y);
                    line = ''; y += lineHeight; lineCount++;
                    if(maxLines && lineCount >= maxLines) return;
                }
            }
            continue;
        }

        let testLine = line + words[i] + ' ';
        let testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = words[i] + ' '; y += lineHeight; lineCount++;
            if(maxLines && lineCount >= maxLines) return;
        } else { line = testLine; }
    }
    ctx.fillText(line, x, y);
}