// entities.js
class Item {
    constructor(templateId) {
        let template = FUNCTION_LIBRARY[templateId];
        let type = 'function';
        
        if (!template) {
            template = UTILITY_LIBRARY[templateId];
            type = 'utility';
        }
        
        if (!template) {
            template = { name: 'CORRUPT_DATA', desc: 'Unknown residual data.', modifiers: {}, cost: 100 };
            type = 'unknown';
        }
            
        this.id = templateId; 
        this.name = template.name; 
        this.desc = template.desc || '';
        this.type = type;
        this.modifiers = template.modifiers ? { ...template.modifiers } : {}; 
        this.combatTriggers = template.combatTriggers ? JSON.parse(JSON.stringify(template.combatTriggers)) : {};
        this.cost = template.cost;
        this.sold = false;
    }

    getTooltip() {
        if (this.type === 'utility') return this.desc;
        
        let statStr = "> ";
        for(let k in this.modifiers) {
            let shortK = k === 'maxHp' ? 'int' : (k === 'buf' ? 'bfr' : k);
            statStr += `${shortK.toUpperCase()}: ${this.modifiers[k] > 0 ? '+' : ''}${this.modifiers[k]}  `;
        }
        
        if (this.combatTriggers) {
            if (this.combatTriggers.onCombatStart) {
                if (this.combatTriggers.onCombatStart.buf) statStr += `Init BFR: +${this.combatTriggers.onCombatStart.buf}  `;
                if (this.combatTriggers.onCombatStart.heal) statStr += `Init REP: ${this.combatTriggers.onCombatStart.heal}  `;
            }
            if (this.combatTriggers.onAttack) {
                if (this.combatTriggers.onAttack.spdDoubleBonus) statStr += `SpdAtk: +${this.combatTriggers.onAttack.spdDoubleBonus}  `;
            }
            if (this.combatTriggers.onHit) {
                if (this.combatTriggers.onHit.lifesteal) statStr += `Assim: ${this.combatTriggers.onHit.lifesteal}  `;
                if (this.combatTriggers.onHit.executeThreshold) statStr += `Exec(<${this.combatTriggers.onHit.executeThreshold}HP): +${this.combatTriggers.onHit.bonusAtk}ATK  `;
            }
        }
        return statStr.trim() === ">" ? "> NO COMBAT STATS" : statStr.trim();
    }
}

class AttackProgram {
    constructor(templateId) {
        const template = WEAPON_LIBRARY[templateId] || { name: 'FALLBACK.exe', desc: 'Failsafe low-impact attack.', baseDamage: 1, modifiers: [] };
            
        this.id = templateId; 
        this.name = template.name; 
        this.desc = template.desc || '';
        this.baseDamage = template.baseDamage;
        this.modifiers = JSON.parse(JSON.stringify(template.modifiers)); 
    }

    getDamage() {
        return this.modifiers.reduce((acc, mod) => {
            return mod.type === 'flat_damage' ? acc + mod.value : acc;
        }, this.baseDamage);
    }
}

class Enemy {
    constructor(templateId, startNode) {
        const template = ENEMY_LIBRARY[templateId] || ENEMY_LIBRARY['virus_v0.1'];
            
        this.id = templateId; 
        this.name = template.name; 
        this.desc = template.desc;
        this.behavior = template.behavior || 'stationary'; 
        this.activity = template.activity ?? 1.0;
        this.icon = template.icon;
        
        const ts = template.stats || {};
        this.stats = { 
            hp: ts.hp || 1, 
            maxHp: ts.maxHp || 1, 
            atk: ts.atk || 1, 
            buf: ts.buf || 0, 
            spd: ts.spd || 0 
        };

        this.networkMoves = template.networkMoves || 1;
        this.movesRemaining = 0;
        this.isBoss = template.isBoss || false;
        this.drops = template.drops || [];
        
        this.currentNode = startNode; 
        this.targetNode = startNode;
        this.x = startNode.x; 
        this.y = startNode.y;
    }

    calculateNextMove(game) {
        if (this.currentNode === game.player.currentNode || this.behavior === 'stationary') return;
        if (Math.random() > this.activity) return; 

        const validConnections = this.currentNode.connections.filter(conn => {
            return !game.network.enemies.some(e => e !== this && (e.currentNode === conn || e.targetNode === conn));
        });

        if (validConnections.length === 0) return;

        if (this.behavior === 'roam') {
            this.targetNode = validConnections[Math.floor(Math.random() * validConnections.length)];
        } 
        else if (this.behavior === 'chase') {
            this.targetNode = validConnections.reduce((best, curr) => {
                const distToPlayer = (node) => Math.hypot(node.x - game.player.currentNode.x, node.y - game.player.currentNode.y);
                return distToPlayer(curr) < distToPlayer(best) ? curr : best;
            }, this.currentNode);
        }
    }

    update() {
        if (this.currentNode === this.targetNode) return;
        
        const dx = this.targetNode.x - this.x;
        const dy = this.targetNode.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 1) {
            this.x = this.targetNode.x; 
            this.y = this.targetNode.y;
            this.currentNode = this.targetNode;
        } else {
            this.x += dx * CONFIG.enemySpeed;
            this.y += dy * CONFIG.enemySpeed;
        }
    }

    draw(ctx) {
        if (!this.currentNode.visible) return;

        const rad = this.isBoss ? CONFIG.nodeRadius * 1.5 : CONFIG.nodeRadius;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = this.icon.color;
        ctx.shadowBlur = this.isBoss ? 20 : 10; 
        ctx.shadowColor = this.icon.color;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, rad * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.colors.bg;
        ctx.fill();
        ctx.restore();
    }
}

class Player {
    constructor(startNode, loadoutId = 'default') {
        const loadout = LOADOUT_LIBRARY[loadoutId] || LOADOUT_LIBRARY['default'];
        
        this.devTool = loadout.devTool || false

        this.credits = loadout.startingCredits || 0;
        this.maxSlots = loadout.maxSlots || 2; 
        this.visionRange = loadout.visionRange || 1; 
        this.baseStats = JSON.parse(JSON.stringify(loadout.stats));
        this.weapon = new AttackProgram(loadout.weapon); 
        this.items = []; 
        
        if (loadout.startingItems) {
            loadout.startingItems.forEach((itemId, idx) => {
                if (idx < this.maxSlots) {
                    this.items[idx] = new Item(itemId);
                }
            });
        }

        if(startNode) this.reset(startNode);
    }

    getStats() {
        const stats = { ...this.baseStats };
        
        this.items.forEach(item => {
            if (!item || item.type !== 'function') return;
            Object.keys(item.modifiers).forEach(key => {
                if (stats.hasOwnProperty(key)) stats[key] += item.modifiers[key];
            });
        });

        if (this.baseStats.hp > stats.maxHp) {
            this.baseStats.hp = stats.maxHp;
        }
        
        stats.hp = this.baseStats.hp;
        stats.atk += this.weapon.getDamage();
        return stats;
    }

    reset(startNode) {
        this.currentNode = startNode; 
        this.targetNode = startNode;
        this.x = startNode.x; 
        this.y = startNode.y;
    }

    move(target) {
        if (this.currentNode.connections.includes(target)) {
            this.targetNode = target;
        }
    }

    update() {
        const dx = this.targetNode.x - this.x;
        const dy = this.targetNode.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 1) {
            this.x = this.targetNode.x; 
            this.y = this.targetNode.y;
            this.currentNode = this.targetNode;
            this.currentNode.visited = true; 
        } else {
            this.x += dx * CONFIG.playerSpeed;
            this.y += dy * CONFIG.playerSpeed;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.colors.player; 
        ctx.shadowBlur = 15; 
        ctx.shadowColor = CONFIG.colors.player;
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.x - 3, this.y - 5);
        ctx.lineTo(this.x + 5, this.y);
        ctx.lineTo(this.x - 3, this.y + 5);
        ctx.closePath();
        ctx.fillStyle = CONFIG.colors.bg;
        ctx.fill();
        ctx.restore();
    }
}