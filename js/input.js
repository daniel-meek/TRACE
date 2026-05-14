// input.js
class InputManager {
    constructor(game) {
        this.game = game;
        this.initialPinchDistance = null;
        this.isPointerDown = false;
        this.pointerStartX = 0;
        this.pointerStartY = 0;
        this.isScrollingUI = false;
        this.lastTouchY = 0;
        this.pointerDownState = null;
        this.initListeners();

        this.audioManager = new AudioManager();
    }
    
    getPinchDistance(e) { 
        return Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); 
    }
    
    getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;

        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX || 0;
            clientY = e.clientY || 0;
        }

        return { cx: clientX - rect.left, cy: clientY - rect.top };
    }

    getSlotRects() {
        const panelW = getPanelWidth();
        const slotW = panelW - 20;
        const slotH = CONFIG.ui.slotH;
        const rects = [];
        for (let i = 0; i < this.game.player.maxSlots; i++) {
            rects.push({ x: 10, y: 330 + i * (slotH + 8) + this.game.statusScrollY, w: slotW, h: slotH });
        }
        return rects;
    }

    initListeners() {
        const down = this.pointerDown.bind(this); const move = this.pointerMove.bind(this); const up = this.pointerUp.bind(this);
        canvas.addEventListener('mousedown', down); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        canvas.addEventListener('touchstart', down, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
        
        window.addEventListener('wheel', (e) => {
            e.preventDefault(); 
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left; 
            const cy = e.clientY - rect.top;
            const panelW = getPanelWidth();

            if (this.game.state === 'REWARD' || this.game.state === 'COMBAT_VICTORY') {
                const maxSlots = this.game.player.maxSlots;
                const totalSlotH = maxSlots * (CONFIG.ui.slotH + 8);
                
                let layout;
                if (this.game.state === 'REWARD') layout = this.game.uiManager.getTerminalLayout(CONFIG.ui.panels.rewardW, CONFIG.ui.panels.rewardH);
                else layout = this.game.uiManager.getTerminalLayout(CONFIG.ui.panels.victoryW, CONFIG.ui.panels.victoryH);
                
                const clipH = this.game.state === 'REWARD' ? layout.bodyH - 70 : layout.bodyH - 150;
                const minScroll = Math.min(0, clipH - totalSlotH);

                this.game.uiScrollY += e.deltaY > 0 ? -30 : 30;
                this.game.uiScrollY = Math.max(minScroll, Math.min(0, this.game.uiScrollY)); 
                return;
            }

            if (this.game.state === 'EXPLORING' && cx <= panelW) {
                const maxSlots = this.game.player.maxSlots;
                const totalSlotH = maxSlots * (CONFIG.ui.slotH + 8);
                const visibleH = canvas.height - 330 - 70; 
                const minScroll = Math.min(0, visibleH - totalSlotH);

                this.game.statusScrollY += e.deltaY > 0 ? -30 : 30;
                this.game.statusScrollY = Math.max(minScroll, Math.min(0, this.game.statusScrollY));
                return;
            }

            if (this.game.state !== 'EXPLORING') return; 
            if (cx > panelW && cy > CONFIG.ui.topBarHeight) this.game.camera.zoomToPoint(cx - panelW, cy, e.deltaY > 0 ? -0.1 : 0.1);
        }, { passive: false });
    }

    pointerDown(e) {
        e.preventDefault();
        const { cx, cy } = this.getCoords(e);
        this.isPointerDown = true;
        this.pointerStartX = cx;
        this.pointerStartY = cy;
        this.isScrollingUI = false;
        this.lastTouchY = cy;
        this.pointerDownState = this.game.state;
        
        const panelW = getPanelWidth();

        if (this.game.pendingSwap) {
            const layout = this.game.uiManager.getTerminalLayout(400, 250);
            
            if (cx >= layout.exitRect.x && cx <= layout.exitRect.x + layout.exitRect.w && cy >= layout.exitRect.y && cy <= layout.exitRect.y + layout.exitRect.h) {
                this.game.pendingSwap = null;
                return;
            }
            
            const btnW = 160; const btnH = 40;
            const btnYesX = (canvas.width/2) - btnW/2;
            const btnY = layout.bodyY + 130;

            if (cx >= btnYesX && cx <= btnYesX + btnW && cy >= btnY && cy <= btnY + btnH) {
                this.game.player.items[this.game.pendingSwap.index] = this.game.pendingSwap.newItem;
                if (this.game.state === 'COMBAT_VICTORY') this.game.player.credits += this.game.combatResult.credits;
                this.game.state = this.game.prevState || 'EXPLORING';
                if (this.game.state === 'EXPLORING') this.game.turnState = 'evaluating_interactions';
                this.game.pendingSwap = null;
            }
            return; 
        }

        if (this.game.state === 'MENU') { 
            if (this.game.gameInProgress) {
                const btnX = canvas.width / 2 - 120;
                const btnY = canvas.height / 2 + 10;
                if (cx >= btnX && cx <= btnX + 240 && cy >= btnY && cy <= btnY + 50) {
                    this.game.state = 'LOADOUT_SELECT';
                } else {
                    this.game.state = 'EXPLORING';
                }
            } else {
                this.game.state = 'LOADOUT_SELECT'; 
            }
            return; 
        }

        if (this.game.state === 'LOADOUT_SELECT') {
            for (let id in this.game.loadoutBtnRects) {
                let r = this.game.loadoutBtnRects[id];
                if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                    this.game.startNewGame(id);
                    return;
                }
            }
            return;
        }

        if (this.game.state === 'GAME_OVER') {
            this.game.state = 'LOADOUT_SELECT';
            this.game.gameInProgress = false;
            return;
        }

        if (this.game.state === 'COMBAT') {
            if (this.game.combatBtnRects) {
                for (let key in this.game.combatBtnRects) {
                    let r = this.game.combatBtnRects[key];
                    if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                        this.game.combatSpeed = key;
                        return;
                    }
                }
            }
            return; 
        }

        if (this.game.state === 'TERMINAL') {
            const w = Math.min(CONFIG.ui.panels.terminalMaxW, canvas.width - 100);
            const h = Math.min(CONFIG.ui.panels.terminalMaxH, canvas.height - 100);
            const layout = this.game.uiManager.getTerminalLayout(w, h, 240);

            if (cx >= layout.exitRect.x && cx <= layout.exitRect.x + layout.exitRect.w && cy >= layout.exitRect.y && cy <= layout.exitRect.y + layout.exitRect.h) {
                this.game.state = 'EXPLORING';
                this.game.turnState = 'idle';
                return;
            }

            if (cx >= layout.x && cx <= layout.x + layout.sidebarW && cy >= layout.bodyY && cy <= layout.bodyY + layout.bodyH) {
                let idx = Math.floor((cy - layout.bodyY) / 40);
                if (idx >= 0 && idx < this.game.terminalFiles.length) {
                    this.game.terminalSelectedFile = idx;
                }
                return;
            }

            if (this.game.terminalFiles.length > 0) {
                const file = this.game.terminalFiles[this.game.terminalSelectedFile];
                if (file && file.hasLoot) {
                    const btnW = 220; const btnH = 36;
                    const btnX = layout.x + layout.w - btnW - 20;
                    const btnY = layout.y + layout.h - btnH - 20;
                    
                    if (cx >= btnX && cx <= btnX + btnW && cy >= btnY && cy <= btnY + btnH) {
                        file.downloaded = true;
                        
                        if (file.item) {
                            this.game.enterItemReward(file.item, this.game.terminalNode);
                        } else {
                            this.game.player.credits += file.credits;
                        }

                        this.game.terminalFiles.splice(this.game.terminalSelectedFile, 1);
                        if (this.game.terminalSelectedFile >= this.game.terminalFiles.length) {
                            this.game.terminalSelectedFile = Math.max(0, this.game.terminalFiles.length - 1);
                        }

                        if (!this.game.terminalFiles.some(f => f.hasLoot)) {
                            this.game.terminalNode.collected = true; 
                        }

                        if (!file.item) {
                            this.game.state = 'TERMINAL';
                        }
                    }
                }
            }
            return;
        }

        if (this.game.state === 'SHOP') {
            const pW = CONFIG.ui.panels.shopW; const pH = CONFIG.ui.panels.shopH;
            const layout = this.game.uiManager.getTerminalLayout(pW, pH);
            
            if (cx >= layout.exitRect.x && cx <= layout.exitRect.x + layout.exitRect.w && cy >= layout.exitRect.y && cy <= layout.exitRect.y + layout.exitRect.h) {
                if (this.game.shopItems.every(i => i.sold)) this.game.player.currentNode.collected = true;
                this.game.state = 'EXPLORING';
                this.game.turnState = 'idle';
                return;
            }

            let itm1 = this.game.shopItems[0];
            if (cx >= layout.x + 20 && cx <= layout.x + pW - 20 && cy >= layout.bodyY + 40 && cy <= layout.bodyY + 80 && !itm1.sold) {
                if (this.game.player.credits >= itm1.cost) {
                    this.game.player.credits -= itm1.cost;
                    itm1.sold = true;
                    if (this.game.shopItems.every(i => i.sold)) this.game.player.currentNode.collected = true;
                    this.game.enterItemReward(itm1, this.game.player.currentNode);
                }
                return;
            }
            let itm2 = this.game.shopItems[1];
            if (cx >= layout.x + 20 && cx <= layout.x + pW - 20 && cy >= layout.bodyY + 100 && cy <= layout.bodyY + 140 && !itm2.sold) {
                if (this.game.player.credits >= itm2.cost) {
                    this.game.player.credits -= itm2.cost;
                    itm2.sold = true;
                    if (this.game.shopItems.every(i => i.sold)) this.game.player.currentNode.collected = true;
                    this.game.enterItemReward(itm2, this.game.player.currentNode);
                }
                return;
            }
            return;
        }
        
        // Subnet gateway promt
        if (this.game.state === 'EXPLORING' && this.game.turnState === 'gateway_prompt') {
            const pW = CONFIG.ui.panels.promptW; const pH = CONFIG.ui.panels.promptH;
            const layout = this.game.uiManager.getTerminalLayout(pW, pH);

            if (cx >= layout.exitRect.x && cx <= layout.exitRect.x + layout.exitRect.w && cy >= layout.exitRect.y && cy <= layout.exitRect.y + layout.exitRect.h) {
                this.game.player.currentNode.prompted = true;
                this.game.startEnemyTurn();
                return;
            }
            
            const btnW = 160; const btnH = 40;
            const btnTransferX = (canvas.width/2) - btnW/2;
            const btnY = layout.bodyY + 90;

            if (cx >= btnTransferX && cx <= btnTransferX + btnW && cy >= btnY && cy <= btnY + btnH) {
                if (this.game.subnetDepth >= (this.game.networkConfig.maxSubnets || 3)) {
                    this.game.turnState = 'network_select';
                } else {
                    this.game.startNewSubnet();
                }
            }
            return;
        }

        if (this.game.state === 'EXPLORING' && this.game.turnState === 'network_select') {
            const pW = 500; const pH = 300;
            const layout = this.game.uiManager.getTerminalLayout(pW, pH);

            const btnW = 350; const btnH = 56;
            const btnY1 = layout.bodyY + 50; const btnY2 = layout.bodyY + 125;
            const cxCenter = canvas.width / 2;

            if (cx >= cxCenter - btnW/2 && cx <= cxCenter + btnW/2) {
                if (cy >= btnY1 && cy <= btnY1 + btnH) {
                    if (this.game.player.maxSlots < 12) this.game.player.maxSlots++; 
                    this.game.currentNetworkKey = this.game.networkChoices[0];
                    this.game.startNewNetwork();
                } else if (cy >= btnY2 && cy <= btnY2 + btnH) {
                    if (this.game.player.maxSlots < 12) this.game.player.maxSlots++; 
                    this.game.currentNetworkKey = this.game.networkChoices[1];
                    this.game.startNewNetwork();
                }
            }
            return;
        }

        if (this.game.state === 'EXPLORING') {
            if (cx >= 10 && cx <= panelW - 10 && cy >= canvas.height - 60 && cy <= canvas.height - 20) {
                this.game.state = 'MENU';
                return;
            }

            if (this.game.turnState !== 'idle') return; 

            if (cx > panelW && cy <= CONFIG.ui.topBarHeight) {
                const mapW = canvas.width - panelW;
                const node = this.game.player.currentNode;
                
                if (node.type === 'database') {
                    const btnW_top = 170;
                    const btnX = panelW + mapW / 2 - btnW_top / 2;
                    if (cx >= btnX && cx <= btnX + btnW_top && cy >= 22 && cy <= 56) {
                        this.game.openTerminal(node);
                        return;
                    }
                } else if (node.type === 'dark_net_access' && !node.collected && node.btnRects) {
                    if (node.btnRects['shop'] && node.btnRects['shop'].active &&
                        cx >= node.btnRects['shop'].x && cx <= node.btnRects['shop'].x + node.btnRects['shop'].w && 
                        cy >= node.btnRects['shop'].y && cy <= node.btnRects['shop'].y + node.btnRects['shop'].h) {
                        this.game.openShop(node);
                        return;
                    }
                } else if (node.type === 'gateway') {
                    const btnW_top = 170;
                    const btnX = panelW + mapW / 2 - btnW_top / 2;
                    if (cx >= btnX && cx <= btnX + btnW_top && cy >= 22 && cy <= 56) {
                        this.game.turnState = 'gateway_prompt';
                        return;
                    }
                }
                return; 
            }

            if (this.game.inspectedItem) {
                const layout = this.game.uiManager.getTerminalLayout(400, 300);
                if (cx >= layout.exitRect.x && cx <= layout.exitRect.x + layout.exitRect.w && cy >= layout.exitRect.y && cy <= layout.exitRect.y + layout.exitRect.h) {
                    this.game.inspectedItem = null;
                    this.game.inspectedItemIndex = -1;
                    return;
                }
                if (this.game.inspectBtnRect) {
                    let r = this.game.inspectBtnRect;
                    if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                        this.game.consumeUtility(this.game.inspectedItemIndex);
                        return;
                    }
                }
                return; 
            }

            if (cx <= panelW) {
                if (cy >= 330 && cy <= canvas.height - 70) {
                    const rects = this.getSlotRects();
                    for(let i=0; i<rects.length; i++) {
                        let r = rects[i];
                        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h && this.game.player.items[i]) {
                            this.game.dragState = { pending: true, active: false, itemIndex: i, x: cx, y: cy, startX: cx, startY: cy };
                            return;
                        }
                    }
                }
                return; 
            }

            const mapX = cx - panelW;
            if (e.touches && e.touches.length === 2) { this.initialPinchDistance = this.getPinchDistance(e); this.game.dragState.active = false; return; }
            this.isDragging = true; this.lastMouse = { x: mapX, y: cy };
            
            const worldPos = this.game.camera.screenToWorld(mapX, cy);
            let validMoveMade = false;

            this.game.network.nodes.forEach(node => {
                if (Math.hypot(node.x - worldPos.x, node.y - worldPos.y) < CONFIG.nodeRadius * 2) {
                    if (this.game.player.currentNode.connections.includes(node)) {
                        this.audioManager.playCustomNote(300, 2, 'sawtooth', 0.001);    // Player node

                        this.game.player.move(node); 
                        validMoveMade = true;
                    }
                }
            });

            if (validMoveMade) {
                this.isDragging = false;
                this.game.turnState = 'player_moving'; 
            }
        }
    }

    pointerMove(e) {
        e.preventDefault(); 
        const { cx, cy } = this.getCoords(e);
        const panelW = getPanelWidth(); const mapX = cx - panelW; 

        if (this.isPointerDown) {
            let dist = Math.hypot(cx - this.pointerStartX, cy - this.pointerStartY);
            if (dist > 5) this.isScrollingUI = true;

            let deltaY = cy - this.lastTouchY;

            if (this.game.state === 'REWARD' || this.game.state === 'COMBAT_VICTORY') {
                const maxSlots = this.game.player.maxSlots;
                const totalSlotH = maxSlots * (CONFIG.ui.slotH + 8);
                
                let layout;
                if (this.game.state === 'REWARD') layout = this.game.uiManager.getTerminalLayout(CONFIG.ui.panels.rewardW, CONFIG.ui.panels.rewardH);
                else layout = this.game.uiManager.getTerminalLayout(CONFIG.ui.panels.victoryW, CONFIG.ui.panels.victoryH);
                
                const clipH = this.game.state === 'REWARD' ? layout.bodyH - 70 : layout.bodyH - 150;
                const minScroll = Math.min(0, clipH - totalSlotH);

                this.game.uiScrollY += deltaY;
                this.game.uiScrollY = Math.max(minScroll, Math.min(0, this.game.uiScrollY)); 
            } 
            else if (this.game.state === 'EXPLORING' && cx <= panelW) {
                const maxSlots = this.game.player.maxSlots;
                const totalSlotH = maxSlots * (CONFIG.ui.slotH + 8);
                const visibleH = canvas.height - 330 - 70; 
                const minScroll = Math.min(0, visibleH - totalSlotH);

                this.game.statusScrollY += deltaY;
                this.game.statusScrollY = Math.max(minScroll, Math.min(0, this.game.statusScrollY));

                if (this.game.dragState.pending && this.isScrollingUI) {
                    this.game.dragState.pending = false;
                }
            }
        }
        
        this.lastTouchY = cy; 

        if (this.game.state !== 'EXPLORING') return;

        if (this.game.dragState.pending) {
            const dist = Math.hypot(cx - this.game.dragState.startX, cy - this.game.dragState.startY);
            if (dist > 5) {
                this.game.dragState.pending = false;
                this.game.dragState.active = true;
            }
        }

        if (this.game.dragState.active) { this.game.dragState.x = cx; this.game.dragState.y = cy; return; }

        if (e.touches && e.touches.length === 2) {
            const currentDist = this.getPinchDistance(e);
            if (this.initialPinchDistance) {
                const zoomDelta = (currentDist - this.initialPinchDistance) * 0.005;
                const pinchCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                this.game.camera.zoomToPoint(pinchCX - panelW, (e.touches[0].clientY + e.touches[1].clientY) / 2, zoomDelta);
            }
            this.initialPinchDistance = currentDist; return;
        }
        if (this.isDragging) {
            this.game.camera.x -= (mapX - this.lastMouse.x) / this.game.camera.zoom; 
            this.game.camera.y -= (cy - this.lastMouse.y) / this.game.camera.zoom; 
            this.game.camera.clamp(); this.lastMouse = { x: mapX, y: cy };
        }
    }

    pointerUp(e) { 
        if (!this.isPointerDown) return;
        this.isPointerDown = false;

        if (this.pointerDownState !== this.game.state) {
            this.pointerDownState = null;
            this.game.dragState = { pending: false, active: false };
            this.isScrollingUI = false;
            this.isDragging = false;
            this.initialPinchDistance = null;
            return;
        }
        
        this.pointerDownState = null;

        if (this.isScrollingUI) {
            this.game.dragState = { pending: false, active: false };
            this.isScrollingUI = false;
            this.isDragging = false;
            this.initialPinchDistance = null;
            return;
        }

        const { cx, cy } = this.getCoords(e);

        if (this.game.state === 'COMBAT_VICTORY' && !this.game.pendingSwap) {
            const pW = CONFIG.ui.panels.victoryW; const pH = CONFIG.ui.panels.victoryH;
            const layout = this.game.uiManager.getTerminalLayout(pW, pH);

            if (cx >= layout.exitRect.x && cx <= layout.exitRect.x + layout.exitRect.w && cy >= layout.exitRect.y && cy <= layout.exitRect.y + layout.exitRect.h) {
                this.game.player.credits += this.game.combatResult.credits;
                this.game.state = 'EXPLORING';
                this.game.turnState = 'evaluating_interactions';
                return;
            }

            if (this.game.combatResult.item) {
                const slotW = pW - 40;
                const slotH = CONFIG.ui.slotH;
                for (let i = 0; i < this.game.player.maxSlots; i++) {
                    let bx = layout.x + 20; let by = layout.bodyY + 150 + i * (slotH + 8) + this.game.uiScrollY;

                    if (cy >= layout.bodyY + 140 && cy <= layout.bodyY + layout.bodyH - 10) {
                        if (cx >= bx && cx <= bx + slotW && cy >= by && cy <= by + slotH) {
                            let existingItem = this.game.player.items[i];
                            if (existingItem) {
                                this.game.pendingSwap = { index: i, oldItem: existingItem, newItem: this.game.combatResult.item };
                            } else {
                                this.game.player.items[i] = this.game.combatResult.item;
                                this.game.player.credits += this.game.combatResult.credits;
                                this.game.state = 'EXPLORING';
                                this.game.turnState = 'evaluating_interactions';
                            }
                            return;
                        }
                    }
                }
            }
            return;
        }

        if (this.game.state === 'REWARD' && !this.game.pendingSwap) {
            const pW = CONFIG.ui.panels.rewardW; const pH = CONFIG.ui.panels.rewardH;
            const layout = this.game.uiManager.getTerminalLayout(pW, pH);

            if (cx >= layout.exitRect.x && cx <= layout.exitRect.x + layout.exitRect.w && cy >= layout.exitRect.y && cy <= layout.exitRect.y + layout.exitRect.h) {
                this.game.state = this.game.prevState || 'EXPLORING'; 
                if (this.game.state === 'EXPLORING') this.game.turnState = 'idle';
                return;
            }
            
            const slotW = pW - 40;
            const slotH = CONFIG.ui.slotH;
            
            for (let i = 0; i < this.game.player.maxSlots; i++) {
                let bx = layout.x + 20; 
                let by = layout.bodyY + 70 + i * (slotH + 8) + this.game.uiScrollY;
                
                if (cy >= layout.bodyY + 60 && cy <= layout.bodyY + layout.bodyH - 10) {
                    if (cx >= bx && cx <= bx + slotW && cy >= by && cy <= by + slotH) {
                        let existingItem = this.game.player.items[i];
                        if (existingItem) {
                            this.game.pendingSwap = { index: i, oldItem: existingItem, newItem: this.game.rewardItem };
                        } else {
                            this.game.player.items[i] = this.game.rewardItem; 
                            this.game.state = this.game.prevState || 'EXPLORING';
                            if (this.game.state === 'EXPLORING') this.game.turnState = 'idle';
                        }
                        return;
                    }
                }
            }
            return;
        }

        if (this.game.dragState.pending) {
            this.game.inspectedItem = this.game.player.items[this.game.dragState.itemIndex];
            this.game.inspectedItemIndex = this.game.dragState.itemIndex;
            this.game.dragState = { pending: false, active: false };
        } else if (this.game.dragState.active) {
            const dropX = this.game.dragState.x; const dropY = this.game.dragState.y;
            const panelW = getPanelWidth();
            
            if (dropX <= panelW && dropY >= 330 && dropY <= canvas.height - 70) {
                const rects = this.getSlotRects();
                for(let i=0; i<rects.length; i++) {
                    let r = rects[i];
                    if (dropX >= r.x && dropX <= r.x + r.w && dropY >= r.y && dropY <= r.y + r.h) {
                        if (i !== this.game.dragState.itemIndex) {
                            const temp = this.game.player.items[this.game.dragState.itemIndex];
                            this.game.player.items[this.game.dragState.itemIndex] = this.game.player.items[i];
                            this.game.player.items[i] = temp;
                        }
                        break;
                    }
                }
            }
            this.game.dragState.active = false;
        }
        
        this.isDragging = false; this.initialPinchDistance = null; 
    }
}