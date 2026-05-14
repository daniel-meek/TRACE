// ui.js
class UIManager {
    constructor(game) {
        this.game = game;
    }

    getTerminalLayout(w, h, sidebarW = 0) {
        const cxCenter = canvas.width / 2; 
        const cyCenter = canvas.height / 2;
        const startX = cxCenter - w/2; 
        const startY = cyCenter - h/2;
        const exitW = 100; 
        const exitH = 34;
        const exitX = startX + w - exitW - 10;
        const exitY = startY + 3;
        
        return {
            x: startX, y: startY, w: w, h: h,
            bodyX: startX, bodyY: startY + 40, bodyW: w, bodyH: h - 40,
            sidebarW: sidebarW,
            mainX: startX + sidebarW, mainW: w - sidebarW,
            exitRect: { x: exitX, y: exitY, w: exitW, h: exitH }
        };
    }

    drawTerminalWindow(ctx, title, w, h, titleColor = CONFIG.colors.node, sidebarW = 0, showExit = true) {
        const layout = this.getTerminalLayout(w, h, sidebarW);
        ctx.fillStyle = CONFIG.colors.overlay; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = CONFIG.colors.bg; ctx.fillRect(layout.x, layout.y, layout.w, layout.h);
        ctx.strokeStyle = titleColor; ctx.strokeRect(layout.x, layout.y, layout.w, layout.h);

        // Header
        ctx.fillStyle = CONFIG.colors.panel; ctx.fillRect(layout.x, layout.y, layout.w, 40);
        ctx.fillStyle = titleColor; ctx.font = FONT(4, "bold");
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(title, layout.x + 15, layout.y + 20);

        // Optional Sidebar Divider
        if (sidebarW > 0) {
            ctx.strokeStyle = titleColor;
            ctx.beginPath(); 
            ctx.moveTo(layout.bodyX + sidebarW, layout.bodyY); 
            ctx.lineTo(layout.bodyX + sidebarW, layout.bodyY + layout.bodyH); 
            ctx.stroke();
        }

        // Exit button
        if (showExit) {
            const eRect = layout.exitRect;
            ctx.fillStyle = '#1a1111'; ctx.fillRect(eRect.x, eRect.y, eRect.w, eRect.h);
            ctx.strokeStyle = CONFIG.colors.enemy; ctx.strokeRect(eRect.x, eRect.y, eRect.w, eRect.h);
            ctx.fillStyle = CONFIG.colors.enemy; ctx.textAlign = 'center'; ctx.font = FONT(0, "bold");
            ctx.fillText('>EXIT<', eRect.x + eRect.w/2, eRect.y + eRect.h/2);
        }
        
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        return layout;
    }

    drawTopBar(ctx, panelW) {
        const mapW = canvas.width - panelW;
        ctx.fillStyle = CONFIG.colors.uiBg;
        ctx.fillRect(panelW, 0, mapW, CONFIG.ui.topBarHeight);
        ctx.strokeStyle = CONFIG.colors.node;
        ctx.beginPath(); ctx.moveTo(panelW, CONFIG.ui.topBarHeight); ctx.lineTo(canvas.width, CONFIG.ui.topBarHeight); ctx.stroke();

        ctx.fillStyle = CONFIG.colors.textMain;
        ctx.font = FONT(-2);
        ctx.textBaseline = 'middle';
        
        let netName = NETWORK_LIBRARY[this.game.currentNetworkKey] ? NETWORK_LIBRARY[this.game.currentNetworkKey].name : "Network";
        ctx.textAlign = 'left';
        ctx.fillText(`${netName} - SUBNET ${this.game.subnetDepth}`, panelW + 15, 30);

        let nodeType = this.game.player.currentNode.type.toUpperCase().replace(/_/g, ' ');
        ctx.textAlign = 'center';
        ctx.fillText(`NODE: ${nodeType}`, panelW + mapW / 2, 15);

        if (this.game.turnState === 'idle') {
            const btnW_top = 170;
            const btnH_top = CONFIG.ui.btnH;
            const yPos = 22;
            const midX = panelW + mapW / 2;

            if (this.game.player.currentNode.type === 'database') {
                const btnX = midX - btnW_top / 2;
                ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(btnX, yPos, btnW_top, btnH_top);
                ctx.strokeStyle = CONFIG.colors.database; ctx.strokeRect(btnX, yPos, btnW_top, btnH_top);
                ctx.fillStyle = CONFIG.colors.database; ctx.textAlign = 'center';
                ctx.fillText('EXPLORE DATABASE', midX, 39);
            } else if (this.game.player.currentNode.type === 'dark_net_access' && !this.game.player.currentNode.collected) {
                let node = this.game.player.currentNode;
                if (!node.darkNetFeatures) {
                    node.darkNetFeatures = {
                        shop: Math.random() > 0.3,
                        upgrade: Math.random() > 0.3
                    };
                    if (!node.darkNetFeatures.shop && !node.darkNetFeatures.upgrade) node.darkNetFeatures.shop = true;
                }

                const buttons = [
                    { text: 'OPEN SHOP', id: 'shop', active: node.darkNetFeatures.shop },
                    { text: 'UPGRADE SYSTEM', id: 'upgrade', active: node.darkNetFeatures.upgrade }
                ];

                const gap = 20;
                const btnSmallW = 140;
                const totalW = (btnSmallW * buttons.length) + (gap * (buttons.length - 1));
                let startX = midX - totalW / 2;

                buttons.forEach(btn => {
                    if (btn.active) {
                        ctx.fillStyle = CONFIG.colors.btnBg; 
                        ctx.strokeStyle = CONFIG.colors.gateway; 
                        ctx.fillStyleText = CONFIG.colors.gateway;
                    } else {
                        ctx.fillStyle = CONFIG.colors.btnDisabled; 
                        ctx.strokeStyle = '#555'; 
                        ctx.fillStyleText = CONFIG.colors.textDisabled;
                    }

                    ctx.fillRect(startX, yPos, btnSmallW, btnH_top);
                    ctx.strokeRect(startX, yPos, btnSmallW, btnH_top);
                    ctx.fillStyle = ctx.fillStyleText; 
                    ctx.textAlign = 'center';
                    ctx.fillText(btn.text, startX + btnSmallW/2, 39);
                    
                    if (!node.btnRects) node.btnRects = {};
                    node.btnRects[btn.id] = { x: startX, y: yPos, w: btnSmallW, h: btnH_top, active: btn.active };

                    startX += btnSmallW + gap;
                });
            } else if (this.game.player.currentNode.type === 'gateway') {
                const btnX = midX - btnW_top / 2;
                ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(btnX, yPos, btnW_top, btnH_top);
                ctx.strokeStyle = CONFIG.colors.gateway; ctx.strokeRect(btnX, yPos, btnW_top, btnH_top);
                ctx.fillStyle = CONFIG.colors.gateway; ctx.textAlign = 'center';
                ctx.fillText('ACCESS GATEWAY', midX, 39);
            }
        }

        ctx.textAlign = 'right';
        let traceColor = CONFIG.colors.node; 
        let symbol = '+';
        if (this.game.traceLevel >= 100) { traceColor = CONFIG.colors.hunter; symbol = '!'; } 
        else if (this.game.traceLevel >= 90) { traceColor = CONFIG.colors.enemy; symbol = '!'; }
        else if (this.game.traceLevel >= 50) { traceColor = CONFIG.colors.database; symbol = '?'; }

        let barStr = "";
        for (let i = 0; i < 20; i++) {
            barStr += (i < Math.floor(this.game.traceLevel / 5)) ? "█" : "-";
            if ((i + 1) % 5 === 0 && i !== 19) barStr += "|";
        }
        let fullTraceStr = `|${barStr}| [${symbol}] TRACE LEVEL ${this.game.traceLevel}%`;
        
        ctx.fillStyle = traceColor;
        ctx.fillText(fullTraceStr, canvas.width - 15, 30);
        ctx.textAlign = 'left';
    }

    drawStatusPanel(ctx, width) {
        ctx.fillStyle = CONFIG.colors.uiBg; ctx.fillRect(0, 0, width, canvas.height);
        ctx.beginPath(); ctx.moveTo(width, 0); ctx.lineTo(width, canvas.height); ctx.strokeStyle = CONFIG.colors.node; ctx.stroke();
        
        const pStats = this.game.player.getStats();
        ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(-2);
        ctx.fillText(`CREDITS: ${this.game.player.credits}`, 10, 30);
        ctx.fillText(`NETWORK: ${this.game.networkDepth}`, 10, 50);

        ctx.font = FONT(0, "bold"); ctx.fillText("-- STATS --", 10, 90); ctx.font = FONT(-2);
        ctx.fillText(`INT: ${pStats.hp}/${pStats.maxHp}`, 10, 120); 
        ctx.fillText(`ATK: ${pStats.atk}`, 10, 140);
        ctx.fillText(`BUF: ${pStats.buf}`, 10, 160); 
        ctx.fillText(`SPD: ${pStats.spd}`, 10, 180);

        ctx.font = FONT(0, "bold"); ctx.fillText("-- WEAPON --", 10, 230); ctx.font = FONT(-2);
        ctx.fillText(`[ ${this.game.player.weapon.name} ]`, 10, 260); ctx.fillText(`ATK +${this.game.player.weapon.getDamage()}`, 10, 280);

        ctx.font = FONT(0, "bold"); ctx.fillText(`- SLOTS [${this.game.player.maxSlots}] -`, 10, 320);
        ctx.font = FONT(-4);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 330, width, canvas.height - 330 - 70); 
        ctx.clip();

        const rects = this.game.inputManager.getSlotRects();
        for (let i = 0; i < rects.length; i++) {
            let r = rects[i];
            
            ctx.fillStyle = this.game.player.items[i] ? CONFIG.colors.btnBg : CONFIG.colors.uiBg;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            
            if (this.game.state === 'COMBAT' && this.game.combatManager.activeItemIdx === i) {
                const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
                ctx.save();
                ctx.lineWidth = 3;
                ctx.strokeStyle = CONFIG.colors.player;
                ctx.shadowBlur = 10 + pulse * 10;
                ctx.shadowColor = CONFIG.colors.player;
                ctx.strokeRect(r.x, r.y, r.w, r.h);
                ctx.restore();
            } else {
                ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.strokeStyle = '#555'; ctx.stroke();
            }
            
            if (this.game.dragState.active && this.game.dragState.itemIndex === i) continue; 
            
            ctx.fillStyle = this.game.player.items[i] ? CONFIG.colors.database : '#555';
            ctx.font = FONT(-3, "bold");
            let itemName = this.game.player.items[i] ? this.game.player.items[i].name : "EMPTY";
            let typeStr = this.game.player.items[i] ? (this.game.player.items[i].type === 'function' ? 'FUNC' : 'UTIL') : '----';
            ctx.fillText(`${i + 1}. [${typeStr}] ${itemName}`, r.x + 5, r.y + 18);

            if (this.game.player.items[i]) {
                ctx.fillStyle = CONFIG.colors.textMain;
                ctx.font = FONT(-5);
                ctx.fillText(this.game.player.items[i].getTooltip(), r.x + 5, r.y + 36);
            }
        }
        ctx.restore();

        ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(10, canvas.height - 60, width - 20, 40);
        ctx.strokeStyle = CONFIG.colors.node; ctx.strokeRect(10, canvas.height - 60, width - 20, 40);
        ctx.fillStyle = CONFIG.colors.node; ctx.font = FONT(0, "bold"); ctx.textAlign = "center";
        ctx.fillText("MAIN MENU", width / 2, canvas.height - 35);
        ctx.textAlign = "left";
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.colors.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (this.game.state === 'MENU') {
            ctx.fillStyle = CONFIG.colors.node; ctx.font = FONT(48, "bold"); ctx.textAlign = "center";
            ctx.fillText("TRACE", canvas.width / 2, canvas.height / 2 - 120);
            
            if (this.game.gameInProgress) {
                ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(4); 
                ctx.fillText("> TAP ANYWHERE TO CONTINUE <", canvas.width / 2, canvas.height / 2 - 40);
                
                ctx.fillStyle = CONFIG.colors.enemy;
                ctx.fillRect(canvas.width / 2 - 120, canvas.height / 2 + 10, 240, 50);
                ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(4, "bold");
                ctx.fillText("RESTART SYSTEM", canvas.width / 2, canvas.height / 2 + 42);
            } else {
                ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(4); 
                ctx.fillText("> TAP ANYWHERE TO INITIATE <", canvas.width / 2, canvas.height / 2 + 50);
            }
            ctx.textAlign = "left"; 
        }
        else if (this.game.state === 'LOADOUT_SELECT') {
            ctx.fillStyle = CONFIG.colors.node; ctx.font = FONT(48, "bold"); ctx.textAlign = "center";
            ctx.fillText("TRACE", canvas.width / 2, canvas.height / 2 - 200);

            ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(4, "bold"); 
            ctx.fillText("SELECT INITIAL LOADOUT", canvas.width / 2, canvas.height / 2 - 100);

            const loadouts = ['default', 'dev_loadout'];
            const btnW = 320; const btnH = 80;
            let curY = canvas.height / 2 - 40;

            loadouts.forEach(id => {
                const l = LOADOUT_LIBRARY[id];
                ctx.fillStyle = CONFIG.colors.btnBg;
                ctx.fillRect(canvas.width/2 - btnW/2, curY, btnW, btnH);
                ctx.strokeStyle = CONFIG.colors.node;
                ctx.strokeRect(canvas.width/2 - btnW/2, curY, btnW, btnH);

                ctx.fillStyle = CONFIG.colors.node; ctx.font = FONT(0, "bold");
                ctx.textAlign = "center";
                ctx.fillText(l.name, canvas.width/2, curY + 30);
                
                ctx.fillStyle = CONFIG.colors.textMuted; ctx.font = FONT(-4);
                ctx.textAlign = "left"; 
                wrapText(ctx, l.desc, canvas.width/2 - btnW/2 + 10, curY + 50, btnW - 20, 15);

                this.game.loadoutBtnRects[id] = { x: canvas.width/2 - btnW/2, y: curY, w: btnW, h: btnH };
                curY += btnH + 20;
            });
            ctx.textAlign = "left"; 
        }
        else if (this.game.state === 'GAME_OVER') {
            ctx.fillStyle = CONFIG.colors.enemy; ctx.font = FONT(34, "bold"); ctx.textAlign = "center";
            ctx.fillText("SYSTEM FAILURE", canvas.width / 2, canvas.height / 2 - 50);
            ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(4);
            ctx.fillText(`NETWORKS CLEARED: ${this.game.networkDepth - 1}`, canvas.width / 2, canvas.height / 2);
            ctx.fillText("> TAP ANYWHERE TO REBOOT <", canvas.width / 2, canvas.height / 2 + 80);
            ctx.textAlign = "left"; 
        }
        else if (['EXPLORING', 'REWARD', 'SHOP', 'TERMINAL', 'COMBAT_VICTORY', 'COMBAT'].includes(this.game.state)) {
            const panelW = getPanelWidth();

            ctx.save();
            ctx.translate(panelW, 0); ctx.scale(this.game.camera.zoom, this.game.camera.zoom); ctx.translate(-this.game.camera.x, -this.game.camera.y);
            
            this.game.network.draw(ctx, this.game.player.currentNode); 
            this.game.player.draw(ctx);
            ctx.restore();

            this.drawStatusPanel(ctx, panelW);
            this.drawTopBar(ctx, panelW);

            if (this.game.dragState.active) {
                const rects = this.game.inputManager.getSlotRects();
                const slotW = rects[0].w;
                ctx.fillStyle = "rgba(241, 196, 15, 0.8)"; 
                ctx.fillRect(this.game.dragState.x - slotW/2, this.game.dragState.y - 15, slotW, 30);
                ctx.fillStyle = "#000"; ctx.font = FONT(-4, "bold");
                ctx.fillText(this.game.player.items[this.game.dragState.itemIndex].name, this.game.dragState.x - slotW/2 + 5, this.game.dragState.y + 5);
            }

            if (this.game.inspectedItem) {
                const layout = this.drawTerminalWindow(ctx, this.game.inspectedItem.name, 400, 300, CONFIG.colors.database);
                const cx = canvas.width / 2;
                ctx.font = FONT(0); ctx.fillStyle = CONFIG.colors.textMain;
                
                if (this.game.inspectedItem.type === 'utility') {
                    wrapText(ctx, this.game.inspectedItem.desc, layout.x + 20, layout.bodyY + 30, layout.w - 40, 20);
                    
                    ctx.textAlign = "center"; 
                    ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(cx - 60, layout.bodyY + 150, 120, 30);
                    ctx.strokeStyle = CONFIG.colors.node; ctx.strokeRect(cx - 60, layout.bodyY + 150, 120, 30);
                    ctx.fillStyle = CONFIG.colors.node; ctx.font = FONT(0, "bold");
                    ctx.fillText("EXECUTE", cx, layout.bodyY + 170);
                    this.game.inspectBtnRect = { x: cx - 60, y: layout.bodyY + 150, w: 120, h: 30 };
                    ctx.textAlign = "left";
                } else {
                    wrapText(ctx, this.game.inspectedItem.desc, layout.x + 20, layout.bodyY + 30, layout.w - 40, 20);
                    ctx.fillStyle = CONFIG.colors.node;
                    wrapText(ctx, this.game.inspectedItem.getTooltip(), layout.x + 20, layout.bodyY + 80, layout.w - 40, 20);
                    this.game.inspectBtnRect = null;
                }
            }
            
            if (this.game.turnState === 'gateway_prompt') {
                const pW = CONFIG.ui.panels.promptW; const pH = CONFIG.ui.panels.promptH;
                const layout = this.drawTerminalWindow(ctx, "SUBNET GATEWAY REACHED", pW, pH, CONFIG.colors.gateway);
                const cx = canvas.width / 2;
                ctx.font = FONT(-2); ctx.fillStyle = CONFIG.colors.textMuted; ctx.textAlign = 'center';
                ctx.fillText("Transfer to next subnet or remain?", cx, layout.bodyY + 40);

                const btnW = 160; const btnH = 40;
                const btnTransferX = cx - btnW/2;
                const btnY = layout.bodyY + 90;

                ctx.strokeStyle = CONFIG.colors.gateway; ctx.strokeRect(btnTransferX, btnY, btnW, btnH);
                ctx.fillStyle = CONFIG.colors.gateway; ctx.fillText("TRANSFER", btnTransferX + btnW/2, btnY + 25);
                ctx.textAlign = "left";
            }

            if (this.game.turnState === 'network_select') {
                const pW = 500; const pH = 300;
                const layout = this.drawTerminalWindow(ctx, "SELECT NEXT NETWORK", pW, pH, CONFIG.colors.node, 0, false);
                const cx = canvas.width / 2;

                if (!this.game.networkChoices) {
                    const keys = Object.keys(NETWORK_LIBRARY);
                    this.game.networkChoices = [keys[Math.floor(Math.random()*keys.length)], keys[Math.floor(Math.random()*keys.length)]];
                }

                const btnW = 350; const btnH = 56;
                const btnY1 = layout.bodyY + 50; const btnY2 = layout.bodyY + 125;

                ctx.textAlign = "center"; ctx.font = FONT(8, "bold");
                ctx.strokeStyle = NETWORK_LIBRARY[this.game.networkChoices[0]].color || CONFIG.colors.node; 
                ctx.strokeRect(cx - btnW/2, btnY1, btnW, btnH);
                ctx.fillStyle = ctx.strokeStyle; 
                ctx.fillText(NETWORK_LIBRARY[this.game.networkChoices[0]].name, cx, btnY1 + 35);

                ctx.strokeStyle = NETWORK_LIBRARY[this.game.networkChoices[1]].color || CONFIG.colors.gateway; 
                ctx.strokeRect(cx - btnW/2, btnY2, btnW, btnH);
                ctx.fillStyle = ctx.strokeStyle; 
                ctx.fillText(NETWORK_LIBRARY[this.game.networkChoices[1]].name, cx, btnY2 + 35);
                ctx.textAlign = "left";
            }

            if (this.game.state === 'TERMINAL') {
                const w = Math.min(CONFIG.ui.panels.terminalMaxW, canvas.width - 100);
                const h = Math.min(CONFIG.ui.panels.terminalMaxH, canvas.height - 100);
                const layout = this.drawTerminalWindow(ctx, `DATABASE://${this.game.terminalNode.id}`, w, h, CONFIG.colors.node, 240);

                if (this.game.terminalFiles.length === 0) {
                    ctx.fillStyle = CONFIG.colors.textMuted;
                    ctx.font = FONT(0);
                    ctx.fillText("DIRECTORY EMPTY.", layout.mainX + 20, layout.bodyY + 30);
                } else {
                    ctx.font = FONT(0);
                    this.game.terminalFiles.forEach((f, i) => {
                        if (i === this.game.terminalSelectedFile) {
                            ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(layout.x, layout.bodyY + i*40, layout.sidebarW, 40);
                            ctx.fillStyle = CONFIG.colors.node;
                        } else {
                            ctx.fillStyle = '#aaa';
                        }
                        ctx.fillText(f.name, layout.x + 10, layout.bodyY + 25 + i*40);
                    });

                    const mainPadX = layout.mainX + 15;
                    const mainPadY = layout.bodyY + 20;
                    const mainW = layout.mainW - 30;

                    ctx.fillStyle = CONFIG.colors.textMuted;
                    ctx.font = FONT(-2);
                    ctx.textBaseline = "top";
                    const file = this.game.terminalFiles[this.game.terminalSelectedFile];
                    if (file) {
                        wrapText(ctx, file.content, mainPadX, mainPadY, mainW, 22, 25);
                        ctx.textBaseline = "alphabetic";

                        if (file.hasLoot) {
                            const btnW = 220; const btnH = 36;
                            const btnX = layout.x + layout.w - btnW - 20;
                            const btnY = layout.y + layout.h - btnH - 20;

                            ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(btnX, btnY, btnW, btnH);
                            ctx.strokeStyle = CONFIG.colors.node; ctx.strokeRect(btnX, btnY, btnW, btnH);
                            ctx.fillStyle = CONFIG.colors.node; ctx.textAlign = 'center'; ctx.font = FONT(0, "bold");
                            ctx.fillText('> DOWNLOAD <', btnX + btnW/2, btnY + 24);
                            ctx.textAlign = 'left';
                        }
                    }
                    ctx.textBaseline = "alphabetic";
                }
            }

            if (this.game.state === 'SHOP') {
                const pW = CONFIG.ui.panels.shopW; const pH = CONFIG.ui.panels.shopH;
                const layout = this.drawTerminalWindow(ctx, "DARK NET ACCESS", pW, pH, '#8e44ad');

                const itm1 = this.game.shopItems[0];
                const itm2 = this.game.shopItems[1];

                ctx.strokeStyle = CONFIG.colors.textMain; ctx.strokeRect(layout.x + 20, layout.bodyY + 40, pW - 40, 40);
                if (itm1.sold) {
                    ctx.fillStyle = CONFIG.colors.textDisabled; ctx.textAlign = "left"; ctx.font = FONT(0);
                    ctx.fillText("SOLD OUT", layout.x + 30, layout.bodyY + 65);
                } else {
                    ctx.fillStyle = this.game.player.credits >= itm1.cost ? CONFIG.colors.textMain : CONFIG.colors.textDisabled;
                    ctx.textAlign = "left"; ctx.font = FONT(0);
                    ctx.fillText(`Buy ${itm1.name}`, layout.x + 30, layout.bodyY + 65);
                    ctx.textAlign = "right"; ctx.fillText(`${itm1.cost} c`, layout.x + pW - 30, layout.bodyY + 65);
                }

                ctx.strokeStyle = CONFIG.colors.textMain; ctx.strokeRect(layout.x + 20, layout.bodyY + 100, pW - 40, 40);
                if (itm2.sold) {
                    ctx.fillStyle = CONFIG.colors.textDisabled; ctx.textAlign = "left"; ctx.font = FONT(0);
                    ctx.fillText("SOLD OUT", layout.x + 30, layout.bodyY + 125);
                } else {
                    ctx.fillStyle = this.game.player.credits >= itm2.cost ? CONFIG.colors.textMain : CONFIG.colors.textDisabled;
                    ctx.textAlign = "left"; 
                    ctx.fillText(`Buy ${itm2.name}`, layout.x + 30, layout.bodyY + 125);
                    ctx.textAlign = "right"; ctx.fillText(`${itm2.cost} c`, layout.x + pW - 30, layout.bodyY + 125);
                }
                ctx.textAlign = "left";
            }

            if (this.game.state === 'REWARD') {
                const pW = CONFIG.ui.panels.rewardW; const pH = CONFIG.ui.panels.rewardH;
                const layout = this.drawTerminalWindow(ctx, "NEW DATA DETECTED", pW, pH, CONFIG.colors.node);

                const cx = canvas.width / 2; 
                ctx.fillStyle = CONFIG.colors.database; ctx.textAlign = "center"; ctx.font = FONT(4, "bold");
                ctx.fillText(this.game.rewardItem.name, cx, layout.bodyY + 30);

                ctx.font = FONT(-2); ctx.fillStyle = CONFIG.colors.textMuted;
                ctx.fillText(this.game.rewardItem.getTooltip(), cx, layout.bodyY + 50);

                ctx.textAlign = "left"; ctx.font = FONT(-4);
                const slotW = pW - 40;
                const slotH = CONFIG.ui.slotH;
                
                ctx.save();
                ctx.beginPath();
                ctx.rect(layout.x + 10, layout.bodyY + 60, pW - 20, layout.bodyH - 70);
                ctx.clip();

                for (let i = 0; i < this.game.player.maxSlots; i++) {
                    let bx = layout.x + 20; 
                    let by = layout.bodyY + 70 + i * (slotH + 8) + this.game.uiScrollY;
                    
                    ctx.fillStyle = this.game.player.items[i] ? CONFIG.colors.btnBg : CONFIG.colors.uiBg;
                    ctx.fillRect(bx, by, slotW, slotH);
                    
                    ctx.strokeStyle = CONFIG.colors.textMain; ctx.strokeRect(bx, by, slotW, slotH);
                    
                    ctx.fillStyle = this.game.player.items[i] ? CONFIG.colors.database : CONFIG.colors.textDisabled;
                    ctx.font = FONT(-3, "bold");
                    let itemName = this.game.player.items[i] ? this.game.player.items[i].name : "EMPTY";
                    let typeStr = this.game.player.items[i] ? (this.game.player.items[i].type === 'function' ? 'FUNC' : 'UTIL') : '----';
                    ctx.fillText(`${i + 1}. [${typeStr}] ${itemName}`, bx + 10, by + 18);

                    if (this.game.player.items[i]) {
                        ctx.fillStyle = CONFIG.colors.textMain;
                        ctx.font = FONT(-5);
                        ctx.fillText(this.game.player.items[i].getTooltip(), bx + 10, by + 36);
                    }
                }
                ctx.restore(); 
            }
            
            if (this.game.state === 'COMBAT') { 
                this.game.combatManager.drawOverlay(ctx, panelW); 
            }
            
            // Combat victory terminal
            if (this.game.state === 'COMBAT_VICTORY') {
                const pW = CONFIG.ui.panels.victoryW; const pH = CONFIG.ui.panels.victoryH;
                const layout = this.drawTerminalWindow(ctx, `${this.game.combatResult.enemyName} TERMINATED`, pW, pH, CONFIG.colors.node);

                const cx = canvas.width / 2;
                ctx.font = FONT(2); ctx.textAlign = "center";
                if (this.game.combatResult.credits > 0) {
                    ctx.fillStyle = CONFIG.colors.database;
                    ctx.fillText(`+ ${this.game.combatResult.credits} CREDITS RECOVERED`, cx, layout.bodyY + 40);
                } else {
                    ctx.fillStyle = CONFIG.colors.textDisabled;
                    ctx.fillText(`NO CREDITS RECOVERED`, cx, layout.bodyY + 40);
                }

                if (this.game.combatResult.item) {
                    ctx.fillStyle = CONFIG.colors.textMain; ctx.font = FONT(0, "bold");
                    ctx.fillText("ITEM DROP DETECTED:", cx, layout.bodyY + 90);
                    ctx.fillStyle = CONFIG.colors.database; ctx.font = FONT(0);
                    ctx.fillText(this.game.combatResult.item.name, cx, layout.bodyY + 120);

                    ctx.textAlign = "left"; ctx.font = FONT(-2);
                    const slotW = pW - 40;
                    const slotH = CONFIG.ui.slotH;

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(layout.x + 10, layout.bodyY + 140, pW - 20, layout.bodyH - 150);
                    ctx.clip();

                    for (let i = 0; i < this.game.player.maxSlots; i++) {
                        let bx = layout.x + 20; let by = layout.bodyY + 150 + i * (slotH + 8) + this.game.uiScrollY;
                        ctx.fillStyle = this.game.player.items[i] ? CONFIG.colors.btnBg : CONFIG.colors.uiBg;
                        ctx.fillRect(bx, by, slotW, slotH);
                        ctx.strokeStyle = CONFIG.colors.textMain; ctx.strokeRect(bx, by, slotW, slotH);
                        ctx.fillStyle = this.game.player.items[i] ? CONFIG.colors.database : CONFIG.colors.textDisabled;
                        ctx.font = FONT(-3, "bold");
                        let itemName = this.game.player.items[i] ? this.game.player.items[i].name : "EMPTY";
                        let typeStr = this.game.player.items[i] ? (this.game.player.items[i].type === 'function' ? 'FUNC' : 'UTIL') : '----';
                        ctx.fillText(`${i + 1}. [${typeStr}] ${itemName}`, bx + 10, by + 18);

                        if (this.game.player.items[i]) {
                            ctx.fillStyle = CONFIG.colors.textMain;
                            ctx.font = FONT(-5);
                            ctx.fillText(this.game.player.items[i].getTooltip(), bx + 10, by + 36);
                        }
                    }
                    ctx.restore(); 
                }
                ctx.textAlign = "left";
            }

            if (this.game.pendingSwap) {
                const pw = 400; const ph = 250;
                const layout = this.drawTerminalWindow(ctx, "OVERWRITE DATA?", pw, ph, CONFIG.colors.enemy);
                const cxCenter = canvas.width / 2;
                
                ctx.font = FONT(0); ctx.fillStyle = CONFIG.colors.textMuted; ctx.textAlign = 'center';
                ctx.fillText("Discarding:", cxCenter, layout.bodyY + 50);
                ctx.fillStyle = CONFIG.colors.enemy;
                ctx.fillText(this.game.pendingSwap.oldItem.name, cxCenter, layout.bodyY + 80);

                const btnW = 160; const btnH = 40;
                const btnYesX = cxCenter - btnW/2;
                const btnY = layout.bodyY + 130;

                ctx.fillStyle = CONFIG.colors.btnBg; ctx.fillRect(btnYesX, btnY, btnW, btnH);
                ctx.strokeStyle = CONFIG.colors.enemy; ctx.strokeRect(btnYesX, btnY, btnW, btnH);
                ctx.fillStyle = CONFIG.colors.enemy; ctx.fillText("CONFIRM OVERWRITE", btnYesX + btnW/2, btnY + 25);
                ctx.textAlign = 'left';
            }
        } 
    }
}