// network.js
class Camera {
    constructor() { this.x = 0; this.y = 0; this.zoom = 1; this.minZoom = 0.3; this.maxZoom = 2.5; }
    get viewWidth() { return (canvas.width - getPanelWidth()) / this.zoom; }
    get viewHeight() { return canvas.height / this.zoom; }
    screenToWorld(screenX, screenY) { return { x: (screenX / this.zoom) + this.x, y: (screenY / this.zoom) + this.y }; }
    clamp() {
        this.x = Math.max(0, Math.min(this.x, CONFIG.mapWidth - this.viewWidth));
        this.y = Math.max(0, Math.min(this.y, CONFIG.mapHeight - this.viewHeight));
        if (CONFIG.mapWidth < this.viewWidth) this.x = (CONFIG.mapWidth - this.viewWidth) / 2;
        if (CONFIG.mapHeight < this.viewHeight) this.y = (CONFIG.mapHeight - this.viewHeight) / 2;
    }
    centerOn(targetX, targetY) {
        this.x = targetX - (this.viewWidth / 2); this.y = targetY - (this.viewHeight / 2); this.clamp();
    }
    zoomToPoint(screenX, screenY, zoomAmount) {
        const oldZoom = this.zoom; this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + zoomAmount));
        if (oldZoom === this.zoom) return;
        this.x += (screenX / oldZoom) - (screenX / this.zoom); this.y += (screenY / oldZoom) - (screenY / this.zoom); this.clamp();
    }
}

class Node {
    constructor(id, x, y, type = 'data') {
        this.id = id; this.x = x; this.y = y;
        this.connections = []; this.type = type; 
        this.collected = false; this.item = null;
        this.prompted = false;
        this.visited = false;
        this.explored = false;
        this.visible = false;
        this.revealedEdges = false;
        this.shopItems = null;
        this.terminalFiles = null;
        this.lootTable = null;
    }
    
    draw(ctx, isVisible) {
        let template = (typeof NODE_LIBRARY !== 'undefined' && NODE_LIBRARY[this.type]) 
            ? NODE_LIBRARY[this.type] 
            : { iconType: 'default', color: CONFIG.colors.node };
        
        let color = template.color;
        let iconType = template.iconType;
        
        if (!isVisible) {
            color = '#444';
        } else if (this.collected && (this.type === 'database' || this.type === 'dark_net_access')) {
            color = '#555';
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        // Database Icon
        if (iconType === 'database') {
            const rx = 10;     
            const ry = 3.5;    
            const h = 5;       

            ctx.lineWidth = 2.5;           
            ctx.strokeStyle = '#000000'; 

            for (let i = 1; i >= -1; i--) {
                let y = i * h;

                ctx.beginPath();
                ctx.moveTo(-rx, y);
                ctx.lineTo(-rx, y + h);
                ctx.ellipse(0, y + h, rx, ry, 0, Math.PI, 0, true);
                ctx.lineTo(rx, y);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.ellipse(0, y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = color; 
            }

        // Router / Gateway Icon
        } else if (iconType === 'router' || iconType === 'gateway') {
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.nodeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Gateway Ring
            if (iconType === 'gateway') {
                ctx.lineWidth = 2;
                ctx.stroke(); 
                ctx.beginPath();
                ctx.arc(0, 0, CONFIG.nodeRadius + 4, 0, Math.PI*2);
                ctx.stroke(); 
            } else {
                ctx.stroke();
            }
            
            ctx.fillStyle = '#050a05'; ctx.strokeStyle = '#050a05'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(0, -7); ctx.lineTo(2, -4); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(0, 7); ctx.lineTo(2, 4); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-7, 0); ctx.lineTo(-4, 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(7, 0); ctx.lineTo(4, 2); ctx.fill();
        
        // Switch Icon
        } else if (iconType === 'switch') {
            ctx.beginPath();
            ctx.rect(-9, -9, 18, 18);
            ctx.fill();
            ctx.strokeStyle = '#050a05';
            ctx.beginPath();
            ctx.moveTo(-5, -2); ctx.lineTo(4, -2); ctx.lineTo(1, -5);
            ctx.moveTo(5, 2); ctx.lineTo(-4, 2); ctx.lineTo(-1, 5);
            ctx.stroke();
        
        // Darknet Access Icon
        } else if (iconType === 'shop') {
            // Geometric Glitch Skull
            ctx.beginPath();
            ctx.arc(0, -2, 7, Math.PI, 0); 
            ctx.lineTo(6, 2); 
            ctx.lineTo(4, 7); 
            ctx.lineTo(-4, 7); 
            ctx.lineTo(-6, 2); 
            ctx.closePath();
            ctx.fill();

            // Eye cutouts
            ctx.fillStyle = '#050a05';
            ctx.beginPath();
            ctx.rect(-4, -1, 3, 3);
            ctx.rect(1, -1, 3, 3);
            ctx.fill();

            // Jaw/teeth details
            ctx.beginPath();
            ctx.moveTo(-2, 4); ctx.lineTo(-2, 7);
            ctx.moveTo(0, 4); ctx.lineTo(0, 7);
            ctx.moveTo(2, 4); ctx.lineTo(2, 7);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#050a05';
            ctx.stroke();
        
        // Default Node Icon
        } else {
            ctx.beginPath(); ctx.arc(0, 0, CONFIG.nodeRadius, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }
}

class Network {
    constructor(config, isBossSubnet) {
        this.nodes = []; 
        this.enemies = [];
        this.config = config || {};
        this.generate(this.config.baseNodeCount || 30, isBossSubnet);
    }
    
    generate(count, isBossSubnet) {
        this.nodes = []; this.enemies = [];
        
        const maxDist = this.config.maxNodeDistance || 250;
        const minDist = this.config.minNodeDistance || 80;
        const connDist = this.config.connectionDistance || 350;
        const eChance = this.config.enemyChance || 0.15;
        const lChance = this.config.lootChance || 0.35;
        const darkNetNodeChance = this.config.darkNetNodeChance || 0.10;
        const lootTable = this.config.lootTable || { itemDropChance: 0.40, itemPool: [], creditMin: 20, creditMax: 100 };

        this.nodes.push(new Node(0, CONFIG.mapWidth / 2, CONFIG.mapHeight / 2, 'data'));

        const maxAttempts = 100; 
        for (let i = 1; i < count; i++) {
            let placed = false, attempts = 0;
            while (!placed && attempts < maxAttempts) {
                const baseNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * (maxDist - minDist) + minDist;
                const newX = baseNode.x + Math.cos(angle) * dist, newY = baseNode.y + Math.sin(angle) * dist;
                const padding = 150;
                
                if (newX < padding || newX > CONFIG.mapWidth - padding || newY < padding || newY > CONFIG.mapHeight - padding) { attempts++; continue; }

                let tooClose = false;
                for (let j = 0; j < this.nodes.length; j++) {
                    if (Math.hypot(newX - this.nodes[j].x, newY - this.nodes[j].y) < minDist) { tooClose = true; break; }
                }
                if (!tooClose) { this.nodes.push(new Node(i, newX, newY)); placed = true; }
                attempts++;
            }
        }

        const connected = [this.nodes[0]]; const unconnected = [...this.nodes.slice(1)];
        while (unconnected.length > 0) {
            let bestDist = Infinity, bestSource = null, bestTarget = null, targetIdx = -1;
            for (let i = 0; i < connected.length; i++) {
                for (let j = 0; j < unconnected.length; j++) {
                    const d = Math.hypot(connected[i].x - unconnected[j].x, connected[i].y - unconnected[j].y);
                    if (d < bestDist) { bestDist = d; bestSource = connected[i]; bestTarget = unconnected[j]; targetIdx = j; }
                }
            }
            if (bestSource && bestTarget) {
                bestSource.connections.push(bestTarget); bestTarget.connections.push(bestSource);
                connected.push(bestTarget); unconnected.splice(targetIdx, 1);
            } else { break; }
        }

        this.nodes.forEach(a => {
            this.nodes.forEach(b => {
                if (a === b || a.connections.includes(b)) return;
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < connDist) {
                    let prob = 0.3;
                    if (a.connections.length >= 3) prob *= 0.2;
                    if (b.connections.length >= 3) prob *= 0.2;
                    if (a.connections.length >= 5 || b.connections.length >= 5) prob = 0;
                    if (Math.random() < prob) { a.connections.push(b); b.connections.push(a); }
                }
            });    
        });

        let furthestDist = 0, furthestNode = this.nodes[this.nodes.length - 1]; 
        this.nodes.forEach(node => {
            const distToStart = Math.hypot(node.x - this.nodes[0].x, node.y - this.nodes[0].y);
            if (distToStart > furthestDist) { furthestDist = distToStart; furthestNode = node; }
        });

        furthestNode.type = 'gateway';

        let nonSpecial = this.nodes.filter(n => n.id !== 0 && n.id !== furthestNode.id);
        if (nonSpecial.length > 0) {
            let rIdx = Math.floor(Math.random() * nonSpecial.length);
            nonSpecial[rIdx].type = 'router';
            nonSpecial.splice(rIdx, 1);
        }
        for (let i = 0; i < 2; i++) {
            if (nonSpecial.length > 0) {
                let sIdx = Math.floor(Math.random() * nonSpecial.length);
                nonSpecial[sIdx].type = 'switch';
                nonSpecial.splice(sIdx, 1);
            }
        }

        if (isBossSubnet) {
            this.enemies.push(new Enemy(this.config.bossType || 'boss_anomaly', furthestNode));
        }

        nonSpecial.forEach(node => {
            if (node.id !== 0) {
                const roll = Math.random();

                // Darknet access node generation
                if (roll < darkNetNodeChance) {
                    node.type = 'dark_net_access';


                } else if (roll < (darkNetNodeChance + eChance)) {
                    const enemyList = this.config.enemyTypes || [];
                    if (enemyList.length > 0) {
                        this.enemies.push(new Enemy(enemyList[Math.floor(Math.random() * enemyList.length)], node));
                    }

                // Database node generation
                } else if (roll < (darkNetNodeChance + eChance + lChance)) {
                    node.type = 'database';
                    node.lootTable = lootTable; 

                    if (Math.random() < lootTable.itemDropChance) {
                        const itemTypes = lootTable.itemPool || [];

                        if (itemTypes.length > 0) {
                            node.item = new Item(itemTypes[Math.floor(Math.random() * itemTypes.length)]);
                        }
                    }
                }
            }
        });
    }
    
    draw(ctx, playerNode) {
        ctx.lineWidth = 2; ctx.setLineDash([]); 
        this.nodes.forEach(node => {
            node.connections.forEach(conn => {
                if (node.id < conn.id) {
                    if (!node.explored || !conn.explored) return;
                    
                    let isVisible = node.visible && conn.visible;
                    ctx.beginPath(); 
                    ctx.strokeStyle = isVisible ? CONFIG.colors.connection : 'rgba(100, 100, 100, 0.2)';
                    ctx.moveTo(node.x, node.y); ctx.lineTo(conn.x, conn.y); ctx.stroke();
                }
            });
        });

        // Animation to connection nodes
        if (playerNode) {
            const time = Date.now() / 1000;
            const speed = this.config.dataSpeed; 
            ctx.fillStyle = CONFIG.colors.node;

            playerNode.connections.forEach(conn => {
                if (conn.explored && playerNode.explored) {
                    const dist = Math.hypot(conn.x - playerNode.x, conn.y - playerNode.y);
                    const duration = dist / speed;
                    const numPackets = Math.max(1, Math.floor(dist / 40)); 

                    for(let i = 0; i < numPackets; i++) {
                        let tOut = ((time + i * (duration / numPackets)) % duration) / duration;
                        let pxOut = playerNode.x + (conn.x - playerNode.x) * tOut;
                        let pyOut = playerNode.y + (conn.y - playerNode.y) * tOut;
                        ctx.beginPath(); ctx.arc(pxOut, pyOut, 1.5, 0, Math.PI * 2); ctx.fill();

                        let tIn = ((time + i * (duration / numPackets)) % duration) / duration;
                        let pxIn = conn.x + (playerNode.x - conn.x) * tIn;
                        let pyIn = conn.y + (playerNode.y - conn.y) * tIn;
                        ctx.beginPath(); ctx.arc(pxIn, pyIn, 1.5, 0, Math.PI * 2); ctx.fill();
                    }
                }
            });
        }

        this.nodes.forEach(node => {
            if (node.explored) {
                node.draw(ctx, node.visible);
            }
        });

        this.enemies.forEach(e => e.draw(ctx)); 
    }
}