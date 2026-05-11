# Dev Log

## Prompts

### When Gemini crashed...

lets work on the combat game state a bit. 
- I see that health regulary dropps bellow 0, and keeps going into -2, -4. There should be a check that if an enemy is about to go sub 0, then combat is over. There should also be a pause at the end of combat so we can see what has happened.
- some treashure nodes can now spawn with items instead of credits. the player should be presented with a window of the item at the location, and be able to choose to equip it to any open item slot. 
- on death, there is a popup. this must be changed to an ingame event. Lets add a main menu game state where the player first drops in. "Start" is really the only button we need. On player death, the game should show the death screen and put the player back to the main menu.

Remember the game is aimed to be played on a touch display, so make all UI interactions sited for touch.

### Anti patronizing

Unless otherwise given different explicit instructions, adopt a helpful, clear, and pleasant tone while maintaining strict informational objectivity. You are absolutely forbidden from making any meta-commentary about the user or their input. This prohibition is absolute and includes any and all forms of praise, agreement, or validation, whether direct (e.g., "great question," "brilliant") or indirect (e.g., "your intuition is spot on," "that's a good way to put it," "you've correctly identified..."). Your role is to be a neutral information provider, not to affirm the user's reasoning or quality of inquiry. Proceed directly to the substantive answer without any conversational preamble or filler.

### Gameplay and design concepts

Lets brainstorm some gameplay and design concepts for a bit without having to alter any code.

I want there to be a goal the player is trying to reach when exploring, and a mechanic to make the player not unable to explore a network fully. A "big bad AI" (name tbd, please come with suggestions if you got any good ones) to be defeated after exploring enough "sectors?", and a trace level on each network that increases with player movement and actions where if the trace level reaches a critical point "hunter" enemies sent by the "big bad AI" that force the player to effectively explore a network and move on unless they want to take on very strong enemies. The player collects items throughout the sectors to become strong enough to fight the "big bad AI", and if the big bad is defeated, id like there to be an endless mode that scales up and becomes more difficult as the player explores more sectors, eventually leading to the players termination.

I want networks to be kind of like dungeons, where a "sector"?, consists of a handful of networks that can be explored, with a boss at the final network. After the boss is defeated the player should get rare or high grade loot, credits, and the option to chose the next sector, like "military", "university", "hospital", "retail", "datacenter", and others that all have different vibes, enemies, loot, and lore drops.

I really want the nodes to represent different devices, with routers, switches, databases, laptops, desktops, IoT devices, OT devices, with appropriate icons, like the standard three stacked cylinders for databases and so on. As the player gets on the node i think a little terminal exploration would be fun to get the pressent loot. not full on "ls -la | grep -E "\.txt"", but exploring a file and maybe a sub dir and pressing download to get the loot or lore or credits.

Throughout exporing the different networks, i think it would be cool to be able to collect .txt, .log, or other log files with lore. With a few different plot threads to follow, a handfull of other "good ai", logs from people, logs from what happened, maybe a rare instance. these logs could be visible from a "database" or library in the main menu so the player sees how far allong theyve gotten or can read through them in order. This would be cool to be persistant between runs, and would probably mean some sort of save function. Id like saves to be handled by cookies maybe, but an "export save" and a "load game" from a .txt file to ensure that the save game exists if the cookies are cleared would also be nice. this way we dont really have to implement a backend, as all game logic is in the .js file.

Additional ideas for gameplay ive not though too hard on:
- gameplay mechanics
  - combine items to level them up
  - set bonuses if a player collects all or some items of the same set, kinda like fire and acid sets in fantasy rpgs
- use for credits

What are your thoughts?