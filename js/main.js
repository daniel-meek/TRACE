// main.js
class Game {
    constructor() {
        this.state = 'MENU'; 
        this.prevState = 'EXPLORING';
        this.turnState = 'idle'; 
        this.inputManager = new InputManager(this);
        this.uiManager = new UIManager(this); 
        this.dragState = { pending: false, active: false, itemIndex: -1, x: 0, y: 0, startX: 0, startY: 0 };
        this.inspectedItem = null;
        this.inspectedItemIndex = -1;
        this.inspectBtnRect = null;
        this.pendingSwap = null; 
        this.gameInProgress = false;
        this.networkDepth = 1;
        this.subnetDepth = 1;
        this.traceLevel = 0;
        this.hunterWave = 1;
        this.huntersActive = 0;
        this.combatResult = null;
        this.combatSpeed = 'play'; 
        this.uiScrollY = 0; 
        this.statusScrollY = 0; 
        this.combatBtnRects = {}; 
        this.loadoutBtnRects = {}; 
    }

    consumeUtility(index) {
        let item = this.player.items[index];
        if (!item || item.type !== 'utility') return;

        if (item.id === 'mem_expansion') {
            this.player.maxSlots++;
        } else if (item.id === 'file_repair') {
            this.player.baseStats.hp = Math.min(this.player.baseStats.hp + 4, this.player.getStats().maxHp);
        } else if (item.id === 'ping_sweep') {
            this.network.nodes.forEach(n => {
                if (n.type === 'router' || n.type === 'switch') {
                    n.visible = true;
                    n.explored = true;
                    n.revealedEdges = true;
                }
            });
        }
        
        this.player.items[index] = null; 
        this.inspectedItem = null;
        this.inspectedItemIndex = -1;
    }

    calculateVision() {
        this.network.nodes.forEach(n => n.visible = false);
        let maxDist = this.player.visionRange;
        if (this.player.currentNode.type === 'router') maxDist = Infinity;
        else if (this.player.currentNode.type === 'switch' || this.player.currentNode.type === 'gateway') maxDist = this.player.visionRange + CONFIG.mechanics.visionBonusSwitch;

        let queue = [{node: this.player.currentNode, dist: 0}];
        let visited = new Set();
        visited.add(this.player.currentNode.id);

        let revealEdges = (this.player.currentNode.type === 'router' || this.player.currentNode.type === 'switch' || this.player.currentNode.type === 'gateway');

        while(queue.length > 0) {
            let {node, dist} = queue.shift();
            node.visible = true;
            node.explored = true;
            if (revealEdges) node.revealedEdges = true;

            if (dist < maxDist) {
                node.connections.forEach(conn => {
                    if (!visited.has(conn.id)) {
                        visited.add(conn.id);
                        queue.push({node: conn, dist: dist + 1});
                    }
                });
            }
        }
    }

    startNewGame(loadoutId = 'default') {
        this.networkDepth = 1;
        this.subnetDepth = 1;
        this.traceLevel = 0;
        this.hunterWave = 1;
        this.huntersActive = 0;
        this.currentNetworkKey = 'retail_net'; 
        this.networkConfig = NETWORK_LIBRARY[this.currentNetworkKey];
        
        this.currentNodeCount = this.networkConfig.baseNodeCount || 30;
        this.camera = new Camera(); 
        this.network = new Network(this.networkConfig, false);
        this.player = new Player(this.network.nodes[0], loadoutId);
        this.player.currentNode.visited = true; 
        this.combatManager = new CombatManager(this);
        this.camera.centerOn(this.player.x, this.player.y);
        this.rewardItem = null; this.rewardNode = null; this.inspectedItem = null;
        this.shopItems = [];
        this.pendingSwap = null;
        this.gameInProgress = true;
        this.state = 'EXPLORING';
        this.turnState = 'idle';
        this.uiScrollY = 0;
        this.statusScrollY = 0;
        this.calculateVision();
    }

    startNewLevel() {
        this.player.baseStats.hp = this.player.getStats().maxHp; 
        this.subnetDepth++; 
        this.traceLevel = 0;
        this.hunterWave = 1;
        this.huntersActive = 0;
        this.currentNodeCount += 5; 
        let isBoss = this.subnetDepth >= (this.networkConfig.maxSubnets || 3);
        this.network = new Network(this.networkConfig, isBoss);
        this.player.reset(this.network.nodes[0]); 
        this.player.currentNode.visited = true; 
        this.camera.centerOn(this.player.x, this.player.y);
        this.turnState = 'idle';
        this.uiScrollY = 0;
        this.statusScrollY = 0;
        this.calculateVision();
    }

    startNewNetwork() {
        this.player.baseStats.hp = this.player.getStats().maxHp; 
        this.networkDepth++;
        this.subnetDepth = 1;
        this.traceLevel = 0;
        this.hunterWave = 1;
        this.huntersActive = 0;
        this.networkConfig = NETWORK_LIBRARY[this.currentNetworkKey];
        this.currentNodeCount = this.networkConfig.baseNodeCount || 30;
        this.network = new Network(this.networkConfig, false);
        this.player.reset(this.network.nodes[0]);
        this.player.currentNode.visited = true; 
        this.camera.centerOn(this.player.x, this.player.y);
        this.state = 'EXPLORING';
        this.turnState = 'idle';
        this.uiScrollY = 0;
        this.statusScrollY = 0;
        this.calculateVision();
    }

    spawnHunters() {
        for(let i = 0; i < this.hunterWave; i++) {
            let validNodes = this.network.nodes.filter(n => {
                if (n === this.player.currentNode || n === this.player.targetNode) return false;
                if (this.network.enemies.some(e => e.currentNode === n || e.targetNode === n)) return false;
                return true;
            });
            
            if (validNodes.length === 0) validNodes = this.network.nodes; 
            
            let startNode = validNodes[Math.floor(Math.random() * validNodes.length)];
            let hunter = new Enemy('system_hunter', startNode);
            this.network.enemies.push(hunter);
            this.huntersActive++;
        }
    }

    enterCombat(enemy, idx) {
        this.state = 'COMBAT';
        this.combatManager.start(enemy, idx);
    }

    enterItemReward(item, node) {
        this.prevState = this.state;
        this.state = 'REWARD';
        this.rewardItem = item;
        this.rewardNode = node;
        this.uiScrollY = 0;
        this.pendingSwap = null;
    }

    openShop(node) {
        this.state = 'SHOP';
        if (!node.shopItems) {
            let items = [];
            
            items.push(new Item(LOOT_TABLE.full_pool[Math.floor(Math.random() * LOOT_TABLE.full_pool.length)]));
            
            if (this.player.maxSlots < 12 && Math.random() > 0.5) {
                items.push(new Item('mem_expansion'));
            } else {
                items.push(new Item(LOOT_TABLE.full_pool[Math.floor(Math.random() * LOOT_TABLE.full_pool.length)]));
            }

            node.shopItems = items;
        }
        this.shopItems = node.shopItems;
    }

    openTerminal(node) {
        this.state = 'TERMINAL';
        this.terminalNode = node;
        
        if (!node.terminalFiles) {
            let files = [];

            let numLoot = Math.floor(Math.random() * 3); 
            if (node.item) numLoot = Math.max(1, numLoot);

            let hasAddedItem = false;
            for(let i=0; i<numLoot; i++) {
                if (node.item && !hasAddedItem) {
                    let fname = node.item.id + '.dat';
                    files.push({
                        name: fname,
                        item: node.item,
                        content: `---\nFILENAME: ${fname}\nTYPE: SOFTWARE_ARCHIVE\nSTATUS: ACCESSIBLE\n---\n\nA readable software package containing the ${node.item.name} program. Ready for installation.`,
                        hasLoot: true
                    });
                    hasAddedItem = true;
                } else {
                    let minC = node.lootTable ? node.lootTable.creditMin : 20;
                    let maxC = node.lootTable ? node.lootTable.creditMax : 100;
                    let creds = minC + Math.floor(Math.random() * (maxC - minC + 1));
                    let fname = 'credit_token_' + Math.floor(Math.random()*9000 + 1000) + '.dat';
                    files.push({
                        name: fname,
                        credits: creds,
                        content: `---\nFILENAME: ${fname}\nTYPE: FINANCIAL_TOKEN\nSTATUS: ACCESSIBLE\n---\n\nA verified credit token containing ${creds} credits. Funds can be extracted immediately.`,
                        hasLoot: true
                    });
                }
            }

            let numJunk = Math.floor(Math.random() * 7); 
            for(let i=0; i<numJunk; i++) {
                let jType = Math.random();
                let fName = jType > 0.5 ? `sys_log_${Math.floor(Math.random()*999)}.log` : `corrupt_${Math.floor(Math.random()*999)}.tmp`;
                files.push({
                    name: fName,
                    content: `---\nFILENAME: ${fName}\nTYPE: UNKNOWN\nSTATUS: CORRUPTED\n---\n\n` + generateCorruptedText(150),
                    hasLoot: false
                });
            }

            files.sort(() => Math.random() - 0.5);
            node.terminalFiles = files;
        }
        
        if (!node.terminalFiles.some(f => f.hasLoot)) {
            node.collected = true; 
        }

        this.terminalFiles = node.terminalFiles;
        this.terminalSelectedFile = 0;
    }

    startEnemyTurn() {
        this.turnState = 'enemies_moving';
        let movingEnemies = 0;
        
        this.network.enemies.forEach(enemy => {
            enemy.movesRemaining = enemy.movesPerTurn || 1;
            enemy.calculateNextMove(this);
            if (enemy.currentNode !== enemy.targetNode) {
                movingEnemies++;
            } else {
                enemy.movesRemaining = 0;
            }
        });

        if (movingEnemies === 0) {
            this.turnState = 'evaluating_interactions';
        }
    }

    update() {
        if (this.state === 'EXPLORING') {
            
            if (this.turnState === 'player_moving') {
                this.player.update();
                if (this.player.currentNode === this.player.targetNode) {
                    this.calculateVision();
                    
                    if (this.traceLevel < CONFIG.mechanics.maxTrace) {
                        this.traceLevel = Math.min(CONFIG.mechanics.maxTrace, this.traceLevel + CONFIG.mechanics.traceIncrement);
                        if (this.traceLevel >= CONFIG.mechanics.maxTrace) {
                            this.spawnHunters();
                        }
                    }

                    if (this.player.currentNode.type === 'gateway' && !this.player.currentNode.prompted) {
                        this.turnState = 'gateway_prompt';
                    } else {
                        this.startEnemyTurn();
                    }
                }
            } 
            else if (this.turnState === 'enemies_moving') {
                let allArrived = true;
                this.network.enemies.forEach((enemy) => {
                    if (enemy.currentNode !== enemy.targetNode) {
                        enemy.update();
                        if (enemy.currentNode === enemy.targetNode) {
                            enemy.movesRemaining--;
                            if (enemy.movesRemaining > 0) {
                                enemy.calculateNextMove(this);
                                if (enemy.currentNode !== enemy.targetNode) {
                                    allArrived = false;
                                }
                            }
                        } else {
                            allArrived = false;
                        }
                    } else if (enemy.movesRemaining > 0) {
                        enemy.calculateNextMove(this);
                        if (enemy.currentNode !== enemy.targetNode) {
                            allArrived = false;
                        } else {
                            enemy.movesRemaining = 0;
                        }
                    }
                });

                if (allArrived) {
                    this.turnState = 'evaluating_interactions'; 
                }
            }
            else if (this.turnState === 'evaluating_interactions') {
                for (let i = 0; i < this.network.enemies.length; i++) {
                    let enemy = this.network.enemies[i];
                    if (enemy.currentNode === this.player.currentNode) {
                        this.enterCombat(enemy, i);
                        return; 
                    }
                }
                this.turnState = 'idle';
            }
        }
        else if (this.state === 'COMBAT') { 
            this.combatManager.update(); 
        }
    }

    loop() { 
        this.update(); 
        this.uiManager.draw(ctx); 
        requestAnimationFrame(() => this.loop()); 
    }
}

const game = new Game();
game.loop();