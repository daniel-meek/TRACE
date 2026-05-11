// combat.js
class CombatManager {
    constructor(game) {
        this.game = game;
        this.active = false; this.enemy = null; this.enemyIdx = -1;
        this.log = []; this.frames = 0; 
        this.turnOrder = []; this.currentTurnIdx = 0; this.ending = false; 
        
        this.round = 1;
        this.pCombat = { buf: 0 };
        this.eCombat = { buf: 0 };

        this.subStep = 0;
        this.activeItemIdx = -1;
        this.tempBonusAtk = 0;
    }

    start(enemy, idx) {
        this.active = true; this.ending = false;
        this.enemy = enemy; this.enemyIdx = idx;
        this.log = ["CONFLICT INITIALIZED!"]; this.frames = 0;
        this.round = 1;
        this.subStep = 0;
        this.activeItemIdx = -1;
        this.tempBonusAtk = 0;
        
        const pStats = this.game.player.getStats();
        this.pCombat = { buf: pStats.buf }; 
        this.eCombat = { buf: this.enemy.stats.buf };

        // INIT Stage - Trigger all INIT functions
        this.game.player.items.forEach(item => {
            if (item && item.type === 'function' && item.combatTriggers && item.combatTriggers.onCombatStart) {
                // INIT Buffs
                if (item.combatTriggers.onCombatStart.buf) {
                    this.pCombat.buf += item.combatTriggers.onCombatStart.buf;
                    this.log.unshift(`> [SYS_INIT] ${item.name} grants ${item.combatTriggers.onCombatStart.buf} BUF`);
                }
                // INIT Heals
                if (item.combatTriggers.onCombatStart.heal) {
                    let missing = pStats.maxHp - this.game.player.baseStats.hp;
                    let healAmt = Math.min(missing, item.combatTriggers.onCombatStart.heal);
                    if (healAmt > 0) {
                        this.game.player.baseStats.hp += healAmt;
                        this.log.unshift(`> [SYS_INIT] ${item.name} repairs ${healAmt} INT`);
                    }
                }
            }
        });

        if (pStats.spd >= this.enemy.stats.spd) this.turnOrder = ['player', 'enemy'];
        else this.turnOrder = ['enemy', 'player'];
    }

    update() {
        if (this.ending || this.game.combatSpeed === 'pause') return; 
        this.frames++;
        
        let interval = CONFIG.mechanics.combatSpeeds[this.game.combatSpeed] || 60;
        let subInterval = Math.floor(interval / 3); 

        if (this.frames >= subInterval) { 
            this.frames = 0; 
            this.executeNextStep(); 
        }
    }

    executeNextStep() {
        const attacker = this.turnOrder[this.currentTurnIdx];
        const isPlayer = attacker === 'player';
        const items = isPlayer ? this.game.player.items : [];
        let basePStats = this.game.player.getStats();

        // 1. Process Pre-Strike Conditionals (On Attack / Execution Windows)
        if (this.subStep < items.length) {
            let itemIdx = this.subStep;
            let item = items[itemIdx];
            
            if (!item || item.type !== 'function') {
                this.subStep++;
                this.executeNextStep();
                return;
            }

            this.activeItemIdx = itemIdx;
            let triggered = false;
            
            if (item.combatTriggers) {
                if (item.combatTriggers.onAttack && item.combatTriggers.onAttack.spdDoubleBonus) {
                    if (basePStats.spd >= this.enemy.stats.spd * 2) {
                        this.tempBonusAtk += item.combatTriggers.onAttack.spdDoubleBonus;
                        this.log.unshift(`> ${item.name}: +${item.combatTriggers.onAttack.spdDoubleBonus} ATK (Spd Adv)`);
                        triggered = true;
                    }
                }
                if (item.combatTriggers.onHit && item.combatTriggers.onHit.executeThreshold) {
                    if (this.enemy.stats.hp <= item.combatTriggers.onHit.executeThreshold) {
                        this.tempBonusAtk += item.combatTriggers.onHit.bonusAtk;
                        this.log.unshift(`> ${item.name}: +${item.combatTriggers.onHit.bonusAtk} ATK (Execute)`);
                        triggered = true;
                    }
                }
            }
            
            this.subStep++;
            if (!triggered) {
                this.executeNextStep(); 
            }
            return;
        }

        // 2. Resolve Strike
        this.activeItemIdx = -1;
        let baseAtk = isPlayer ? basePStats.atk : this.enemy.stats.atk;
        let finalAtk = baseAtk + this.tempBonusAtk;
        
        let defStats = isPlayer ? this.eCombat : this.pCombat;
        if (!isPlayer) defStats = this.pCombat; 

        let dmgToBuf = Math.min(defStats.buf, finalAtk);
        let dmgToHp = finalAtk - dmgToBuf;
        defStats.buf -= dmgToBuf;

        if (dmgToHp > 0) {
            if (isPlayer) this.enemy.stats.hp -= dmgToHp;
            else this.game.player.baseStats.hp -= dmgToHp;
        }

        let logMsg = `> ${isPlayer ? 'Player' : this.enemy.name} strikes! Deals ${dmgToHp} DMG.`;
        if (dmgToBuf > 0) logMsg += ` [${dmgToBuf} BUF]`;
        this.log.unshift(logMsg);

        // 3. Process Post-Strike Conditionals (On Hit / Assimilate)
        if (isPlayer && dmgToHp > 0) {
            items.forEach(item => {
                if (item && item.type === 'function' && item.combatTriggers && item.combatTriggers.onHit && item.combatTriggers.onHit.lifesteal) {
                    let missing = basePStats.maxHp - this.game.player.baseStats.hp;
                    let healAmt = Math.min(missing, item.combatTriggers.onHit.lifesteal);
                    if (healAmt > 0) {
                        this.game.player.baseStats.hp += healAmt;
                        this.log.unshift(`> ${item.name} assimilated ${healAmt} INT`);
                    }
                }
            });
        }

        this.finishTurn();
    }

    finishTurn() {
        if (this.enemy.stats.hp <= 0) { this.ending = true; this.winCombat(); return; }
        if (this.game.player.baseStats.hp <= 0) { this.ending = true; this.loseCombat(); return; }

        if (this.log.length > 6) this.log.length = 6;
        
        this.subStep = 0;
        this.activeItemIdx = -1;
        this.tempBonusAtk = 0;
        
        this.currentTurnIdx++;
        if (this.currentTurnIdx >= this.turnOrder.length) {
            this.currentTurnIdx = 0;
            this.round++;
        }
    }

    winCombat() {
        this.log.unshift("> ENEMY DEFEATED. ACCESS GRANTED.");
        
        if (this.enemy.id === 'system_hunter') {
            this.game.huntersActive--;
            if (this.game.huntersActive <= 0 && this.game.traceLevel >= CONFIG.mechanics.maxTrace) {
                this.game.hunterWave++;
                this.game.spawnHunters();
            }
        }

        setTimeout(() => {
            this.game.network.enemies.splice(this.enemyIdx, 1);
            
            let droppedItem = null;
            let droppedCredits = 0;

            if (this.enemy.drops) {
                this.enemy.drops.forEach(drop => {
                    if (Math.random() <= drop.chance) {
                        if (drop.type === 'credits') {
                            droppedCredits += Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                        } else if (drop.type === 'item') {
                            const pool = drop.pool || LOOT_TABLE.full_pool;
                            if (pool.length > 0) {
                                const itemId = pool[Math.floor(Math.random() * pool.length)];
                                droppedItem = new Item(itemId);
                            }
                        }
                    }
                });
            }

            this.game.combatResult = {
                enemyName: this.enemy.name,
                credits: droppedCredits,
                item: droppedItem
            };
            this.game.state = 'COMBAT_VICTORY';
            
        }, CONFIG.mechanics.combatDelay);
    }

    loseCombat() {
        this.log.unshift("> CRITICAL FAILURE! SYSTEM COMPROMISED.");
        setTimeout(() => { this.game.state = 'GAME_OVER'; }, CONFIG.mechanics.gameOverDelay);
    }

    drawOverlay(ctx, panelW) {
        const enemyPanelW = panelW;
        const mapW = canvas.width - panelW;
        const combatAreaW = mapW - enemyPanelW;
        const cx = panelW + combatAreaW / 2;
        const cy = canvas.height / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(panelW, 0, combatAreaW, canvas.height);

        const enemyPanelX = canvas.width - enemyPanelW;
        ctx.fillStyle = CONFIG.colors.uiBg; 
        ctx.fillRect(enemyPanelX, 0, enemyPanelW, canvas.height);
        
        ctx.beginPath(); 
        ctx.moveTo(enemyPanelX, 0); 
        ctx.lineTo(enemyPanelX, canvas.height); 
        ctx.strokeStyle = this.enemy.icon.color; 
        ctx.stroke();

        ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(-2); ctx.textAlign = "left";
        ctx.fillText(`CLASS: ${this.enemy.name}`, enemyPanelX + 10, 30);
        
        ctx.font = FONT(0, "bold"); ctx.fillText("-- STATS --", enemyPanelX + 10, 90); ctx.font = FONT(-2);
        ctx.fillText(`INT: ${this.enemy.stats.hp}/${this.enemy.stats.maxHp}`, enemyPanelX + 10, 120); 
        ctx.fillText(`ATK: ${this.enemy.stats.atk}`, enemyPanelX + 10, 140);
        ctx.fillText(`BUF: ${this.enemy.stats.buf}`, enemyPanelX + 10, 160); 
        ctx.fillText(`SPD: ${this.enemy.stats.spd}`, enemyPanelX + 10, 180);

        ctx.font = FONT(0, "bold"); ctx.fillText("-- DESCRIPTION --", enemyPanelX + 10, 230); ctx.font = FONT(-2);
        wrapText(ctx, this.enemy.desc, enemyPanelX + 10, 260, enemyPanelW - 20, 20);

        ctx.font = FONT(0, "bold"); ctx.fillText(`- FUNCTIONS / LOOT -`, enemyPanelX + 10, 320); ctx.font = FONT(-4);
        
        const slotW = enemyPanelW - 20; const slotH = CONFIG.ui.slotH;
        for (let i = 0; i < 2; i++) { 
            let bx = enemyPanelX + 10; let by = 340 + i * (slotH + 8);
            ctx.fillStyle = CONFIG.colors.uiBg; ctx.fillRect(bx, by, slotW, slotH);
            ctx.beginPath(); ctx.rect(bx, by, slotW, slotH); ctx.strokeStyle="#555"; ctx.stroke();
            ctx.fillStyle = "#555"; ctx.fillText("ENCRYPTED_DATA", bx + 5, by + 28);
        }

        const pStats = this.game.player.getStats();
        const pX = cx - Math.min(120, combatAreaW / 4);
        const eX = cx + Math.min(120, combatAreaW / 4);
        const iconY = cy - 50;
        
        let pBuf = this.active ? this.pCombat.buf : pStats.buf;
        let eBuf = this.active ? this.eCombat.buf : this.enemy.stats.buf;

        ctx.beginPath(); ctx.arc(pX, iconY, 40, 0, Math.PI*2); 
        ctx.fillStyle = CONFIG.colors.player; ctx.shadowBlur = 20; ctx.shadowColor = CONFIG.colors.player; 
        ctx.fill(); ctx.shadowBlur = 0;
        
        ctx.beginPath();
        ctx.moveTo(pX - 6, iconY - 10); ctx.lineTo(pX + 10, iconY); ctx.lineTo(pX - 6, iconY + 10);
        ctx.closePath(); ctx.fillStyle = CONFIG.colors.bg; ctx.fill();

        ctx.font = FONT(-2, "bold"); ctx.textAlign = "center";
        if (this.turnOrder[this.currentTurnIdx] === 'player') {
            ctx.fillStyle = CONFIG.colors.node;
            ctx.fillText("< ACTIVE >", pX, iconY + 60);
        } else {
            ctx.fillStyle = CONFIG.colors.enemy;
            ctx.fillText("< ACTIVE >", eX, iconY + 60);
        }
        ctx.textAlign = "left";

        ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(0);
        ctx.fillText(`INT: ${pStats.hp}/${pStats.maxHp}`, pX - 45, iconY + 95); 
        ctx.fillText(`ATK: ${pStats.atk}`, pX - 45, iconY + 120);
        ctx.fillText(`BUF: ${pBuf}`, pX - 45, iconY + 145); 
        ctx.fillText(`SPD: ${pStats.spd}`, pX - 45, iconY + 170);

        ctx.beginPath();
        let eColor = this.enemy.icon.color;
        let rad = this.enemy.isBoss ? 60 : 40;
        
        ctx.fillStyle = eColor; ctx.shadowBlur = 20; ctx.shadowColor = eColor;
        ctx.arc(eX, iconY, rad, 0, Math.PI*2);
        ctx.fill(); ctx.shadowBlur = 0;
        
        ctx.beginPath();
        ctx.arc(eX, iconY, rad * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#050a05';
        ctx.fill();
        
        ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(0);
        ctx.fillText(`INT: ${this.enemy.stats.hp}/${this.enemy.stats.maxHp}`, eX - 45, iconY + 95); 
        ctx.fillText(`ATK: ${this.enemy.stats.atk}`, eX - 45, iconY + 120);
        ctx.fillText(`BUF: ${eBuf}`, eX - 45, iconY + 145); 
        ctx.fillText(`SPD: ${this.enemy.stats.spd}`, eX - 45, iconY + 170);

        const logW = combatAreaW - 40;
        const logH = 250;
        const logY = canvas.height - logH - 40; 
        
        ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(panelW + 20, logY, logW, logH); 
        ctx.strokeStyle = CONFIG.colors.node; ctx.strokeRect(panelW + 20, logY, logW, logH); 
        ctx.fillStyle = CONFIG.colors.node;
        this.log.forEach((msg, idx) => { 
            ctx.globalAlpha = 1 - (idx * 0.15); 
            ctx.fillText(msg, panelW + 40, logY + 30 + (idx * 28)); 
        });
        ctx.globalAlpha = 1.0;

        const btnY = logY + logH + 5;
        const controls = [
            { id: 'pause', text: '||', w: 40 },
            { id: 'play', text: '>', w: 40 },
            { id: 'fast', text: '>>', w: 40 }
        ];

        let curX = panelW + 20;
        this.game.combatBtnRects = {}; 
        
        ctx.font = FONT(0, "bold");
        ctx.textAlign = "center";
        controls.forEach(ctrl => {
            let active = this.game.combatSpeed === ctrl.id;
            ctx.fillStyle = active ? CONFIG.colors.btnBg : CONFIG.colors.uiBg;
            ctx.fillRect(curX, btnY, ctrl.w, 30);
            ctx.strokeStyle = active ? CONFIG.colors.node : '#555';
            ctx.strokeRect(curX, btnY, ctrl.w, 30);
            ctx.fillStyle = active ? CONFIG.colors.node : '#888';
            ctx.fillText(ctrl.text, curX + ctrl.w/2, btnY + 20);

            this.game.combatBtnRects[ctrl.id] = { x: curX, y: btnY, w: ctrl.w, h: 30 };
            curX += ctrl.w + 10;
        });
        ctx.textAlign = "left";
    }
}