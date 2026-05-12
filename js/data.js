// data.js

const CONFIG = {
    DEV_MODE: true, // true to enable all dev featres
    baseFontSize: 16, 
    mapWidth: 3000,
    mapHeight: 3000,
    mapPadding: 150,
    playerSpeed: 0.1,
    enemySpeed: 0.08, 
    nodeRadius: 12,
    colors: {
        bg: '#050a05',
        uiBg: '#0a140a',
        node: '#00ff30',
        connection: 'rgba(0, 255, 65, 0.2)',
        player: '#ffffff',
        database: '#f1c40f',
        gateway: '#9b59b6', 
        enemy: '#e74c3c',
        shop: '#8e44ad',
        router: '#e67e22',
        hunter: '#ff00ff',
        boss: '#c0392b',
        panel: '#112211',
        btnBg: '#1a261a',
        btnDisabled: '#1a1a1a',
        textMain: '#ffffff',
        textMuted: '#cccccc',
        textDisabled: '#888888',
        overlay: 'rgba(0, 0, 0, 0.85)'
    },
    ui: {
        topBarHeight: 60,
        slotH: 48,
        btnH: 34,
        packetSpeed: 25,
        panels: {
            shopW: 400, shopH: 300,
            rewardW: 400, rewardH: 500,
            victoryW: 450, victoryH: 500,
            promptW: 400, promptH: 200,
            terminalMaxW: 800, terminalMaxH: 600
        }
    },
    mechanics: {
        traceIncrement: 5,
        maxTrace: 100,
        combatDelay: 1500,
        gameOverDelay: 2000,
        visionBonusSwitch: 2,
        maxGenAttempts: 100,
        combatSpeeds: {
            play: 180,          // 120 = 2 sec 
            fast: 20            // 20 = 0.333... sec
        }
    }
};

const FUNCTION_LIBRARY = {
    'overclock_mod': { name: 'OVERCLOCK_MOD', desc: 'Increases processing speed at the cost of stability.', modifiers: { spd: 2, maxHp: -2 }, cost: 100 },
    'firewall_patch': { name: 'FW_PATCH_v2', desc: 'Reinforces baseline security protocols. Active immediately.', modifiers: { maxHp: 2, buf: 2 }, cost: 120 },
    'auto_repair': { name: 'AUTO_REPAIR', desc: 'Restores integrity upon system engagement.', combatTriggers: { onCombatStart: { heal: 3 } }, cost: 150 },
    'brute_forcer': { name: 'BRUTE_FORCER', desc: 'Heavy offensive payload, slows down execution.', modifiers: { atk: 2, spd: -1 }, cost: 150 },
    'root_access': { name: 'ROOT_ACCESS', desc: 'Maximum attack power, compromises personal buffer.', modifiers: { atk: 3, buf: -1 }, cost: 250 },
    'ghost_protocol': { name: 'GHOST_PROTO', desc: 'Extreme evasion and minor system defense.', modifiers: { spd: 3, buf: 1 }, cost: 200 },
    'momentum_script': { name: 'MOMENTUM_SCR', desc: 'Capitalizes on massive speed advantages to deal extra damage.', combatTriggers: { onAttack: { spdDoubleBonus: 4 } }, cost: 200 },
    'vampiric_script': { name: 'VAMPIRIC_SCR', desc: 'Assimilates target integrity on successful hits.', combatTriggers: { onHit: { lifesteal: 2 } }, cost: 220 },
    'execution_proto': { name: 'EXEC_PROTO', desc: 'Deals massive damage to severely compromised targets.', combatTriggers: { onHit: { executeThreshold: 4, bonusAtk: 3 } }, cost: 250 }
};

const UTILITY_LIBRARY = {
    'mem_expansion': { name: 'MEM_EXPANSION', desc: 'Permanently adds a new memory slot.', cost: 500 },
    'file_repair': { name: 'FILE_REPAIR', desc: 'Restores up to 4 file integrity (HP).', cost: 150 },
    'ping_sweep': { name: 'PING_SWEEP', desc: 'Locates nearby routers and switches.', cost: 200 }
};

// LOOT TABLES
const LOOT_TABLE = {
    'full_pool': [...Object.keys(FUNCTION_LIBRARY), ...Object.keys(UTILITY_LIBRARY)].filter(k => k !== 'mem_expansion')
};

const LOADOUT_LIBRARY = {
    'default': {
        name: 'STANDARD_LOADOUT',
        desc: 'Baseline infiltration setup. Balanced and reliable.',
        stats: { hp: 10, maxHp: 10, atk: 0, buf: 0, spd: 2 },
        visionRange: 1,
        weapon: 'sys_strike',
        maxSlots: 2,
        startingItems: [],
        startingCredits: 20
    },

    'dev_loadout': {
        devTool: true,
        name: 'DEBUG_PROTOCOL',
        desc: 'Elevated system privileges. All modules active.',
        stats: { hp: 50, maxHp: 50, atk: 0, buf: 0, spd: 2 },
        visionRange: 4,
        weapon: 'ping_flood',
        maxSlots: 12,
        startingItems: ['overclock_mod', 'firewall_patch', 'auto_repair', 'brute_forcer', 'root_access', 'ghost_protocol', 'momentum_script', 'vampiric_script', 'execution_proto', 'file_repair'],
        startingCredits: 5000
    }
};

const WEAPON_LIBRARY = {
    'sys_strike': { name: 'SYS.STRIKE', desc: 'Standard issue system attack.', baseDamage: 2, modifiers: [] },
    'root_kit': { name: 'ROOT_KIT.exe', desc: 'Advanced persistent threat weapon.', baseDamage: 4, modifiers: [] },
    'ping_flood': { name: 'PING_FLOOD', desc: 'Low damage, reliable flat packet stream.', baseDamage: 1, modifiers: [{ type: 'flat_damage', value: 1 }] }
};

const NODE_LIBRARY = {
    'data': { iconType: 'default', color: CONFIG.colors.node },
    'gateway': { iconType: 'gateway', color: CONFIG.colors.gateway }, 
    'router': { iconType: 'router', color: CONFIG.colors.router },
    'switch': { iconType: 'switch', color: CONFIG.colors.router },
    'database': { iconType: 'database', color: CONFIG.colors.database },
    'dark_net_access': { iconType: 'shop', color: CONFIG.colors.shop },
    'spawner': {iconType: 'defautl', color: CONFIG.colors.enemy}
};

const ENEMY_LIBRARY = {
    // ENEMIES
    'virus_v0.1': { 
        name: 'virus_v0.1', 
        desc: "[A basic self-replicating malware script. Slow but persistent.]", 
        behavior: 'roam',
        activity: 0.8,
        icon: { color: CONFIG.colors.enemy },
        stats: { hp: 4, maxHp: 4, atk: 1, buf: 0, spd: -1 },
        drops: [
            { type: 'credits', min: 5, max: 15, chance: 1.0 }
        ]
    },
    'trojan_dropper': { 
        name: 'Trojan.Dropper', 
        desc: "[Disguised as benign data. Heavy armor, strikes hard.]", 
        behavior: 'stationary',
        activity: 1.0,
        icon: { color: CONFIG.colors.router },
        stats: { hp: 8, maxHp: 8, atk: 3, buf: 2, spd: -2 },
        drops: [
            { type: 'credits', min: 10, max: 20, chance: 1.0 },
            { type: 'item', pool: LOOT_TABLE.full_pool, chance: 0.2 }
        ]
    },
    'worm_crawler': { 
        name: 'Net_Worm', 
        desc: "[Highly evasive and lightning fast. Hard to pin down.]", 
        behavior: 'roam',
        activity: 0.6,
        icon: { color: CONFIG.colors.enemy },
        stats: { hp: 3, maxHp: 3, atk: 2, buf: 0, spd: 4 },
        drops: [
            { type: 'credits', min: 5, max: 10, chance: 1.0 },
            { type: 'item', pool: LOOT_TABLE.full_pool, chance: 0.3 }
        ]
    }, 

    // HUNTERS
    'system_hunter': { 
        name: 'SYSTEM_HUNTER', 
        desc: "[An aggressive countermeasures program. Relentlessly pursues intruders.]", 
        behavior: 'chase',
        activity: 1.0,
        icon: { color: CONFIG.colors.hunter },
        stats: { hp: 10, maxHp: 10, atk: 3, buf: 1, spd: 3 },
        networkMoves: 2,
        drops: [
            { type: 'credits', min: 15, max: 30, chance: 1.0 },
            { type: 'item', pool: LOOT_TABLE.full_pool, chance: 0.5 }
        ]
    },

    // BOSSES
    'boss_anomaly': {
        name: 'SYSTEM_ANOMALY',
        desc: "[A massive corruption in the system. Extremely dangerous.]",
        behavior: 'chase',
        activity: 1.0,
        icon: { color: CONFIG.colors.boss },
        stats: { hp: 5, maxHp: 5, atk: 1, buf: 0, spd: 1 },
        isBoss: true,
        drops: [
            { type: 'credits', min: 100, max: 200, chance: 1.0 },
            { type: 'item', pool: LOOT_TABLE.full_pool, chance: 1.0 }
        ]
    },

    // Template Enemy
    'template_enemy': {
        name: 'TEMPLATE',
        desc: "[A template enemy for testing]",
        behavior: 'chase',
        activity: 1.0,
        icon: { color: CONFIG.colors.boss },
        stats: { hp: 5, maxHp: 5, atk: 1, buf: 0, spd: 1 },
        isBoss: true,
        drops: [
            { type: 'credits', min: 100, max: 200, chance: 1.0 },
            { type: 'item', pool: LOOT_TABLE.full_pool, chance: 1.0 }
        ]
    }
};

const NETWORK_LIBRARY = {
    'retail_net': {
        name: 'Retail Network',
        desc: 'Low security, high adware traffic.',
        color: '#1abc9c',
        baseNodeCount: 25,
        subnetCount: 1,
        connectionDistance: 300,
        minNodeDistance: 80,
        maxNodeDistance: 220,
        dataSpeed: 20,
        enemyChance: 0.20,
        lootChance: 0.25,
        darkNetNodeChance: 0.10,
        lootTable: { itemDropChance: 0.30, itemPool: LOOT_TABLE.full_pool, creditMin: 10, creditMax: 40 },
        enemyTypes: ['virus_v0.1'],
        bossType: 'boss_anomaly'
    },
    'university_net': {
        name: 'University Network',
        desc: 'Experimental tech. Unpredictable nodes.',
        color: '#3498db',
        baseNodeCount: 35,
        subnetCount: 5,
        connectionDistance: 400,
        minNodeDistance: 90,
        maxNodeDistance: 260,
        enemyChance: 0.15,
        lootChance: 0.40,
        darkNetNodeChance: 0.15,
        lootTable: { itemDropChance: 0.45, itemPool: LOOT_TABLE.full_pool, creditMin: 20, creditMax: 80 },
        enemyTypes: ['virus_v0.1', 'worm_crawler'],
        bossType: 'boss_anomaly'
    },
    'datacenter_net': {
        name: 'Core Datacenter',
        desc: 'Heavily fortified. High value assets.',
        color: '#e74c3c',
        baseNodeCount: 40,
        subnetCount: 5,
        connectionDistance: 300,
        minNodeDistance: 100,
        maxNodeDistance: 250,
        enemyChance: 0.30,
        lootChance: 0.20,
        darkNetNodeChance: 0.05,
        lootTable: { itemDropChance: 0.60, itemPool: LOOT_TABLE.full_pool, creditMin: 50, creditMax: 150 },
        enemyTypes: ['trojan_dropper', 'worm_crawler'],
        bossType: 'boss_anomaly'
    },

    // Template network with all values set to default
    'template_net': {
        name: 'Network',                // Name visible to the player
        desc: 'Template network for testing', // Description visible to the player
        color: CONFIG.colors.node,      // Colour theme for the network
        baseNodeCount: 25, 
        subnetCount: 5,                 // How many subnets before the boss
        subnetLayout: "mesh",           // The type of network topology (mesh, star, tree, buss, ring, hybrid)
        connectionDistance: 300,        // The distance to other nodes that automatically gets connected
        minNodeDistance: 80,            // How close nodes can spawn
        maxNodeDistance: 220,           // How far away nodes can spawn
        dataSpeed: 20,                  // The speed of dataflow beteen nodes adjecent to the player
        enemyChance: 0.20,              // Chanse for nodes to spawn with enemies (NEEDS TO BE REWORKED)
        lootChance: 0.25,               // Chanse for a node to become a database
        darkNetNodeChance: 0.10,        // Chanse for a node to become a darknet access node
        lootTable: { 
            itemDropChance: 0.30,       // % of loot that is items
            itemPool: LOOT_TABLE.full_pool, // List of items that spawn using LOOT_TABLE._pool
            creditMin: 10,              // Min credit amount
            creditMax: 40               // Max credit amount
        },  
        enemyTypes: ['virus_v0.1'],     // List of enemies that can spawn
        bossType: ['boss_anomaly']      // List of bosses that can spawn at the end
    }
};
