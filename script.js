// ===== GAME STATE =====
const gameState = {
    gold: 50,
    creatures: [],
    creatureCount: 1,
    passiveGoldPerTick: 1,
    passiveGoldInterval: 10, // seconds
    passiveGoldTimer: 10,
    goldPerFeed: 8,
    activeFoods: [],
    placementMode: { active: false, creatureType: null }
};

// ===== CREATURE TYPES =====
const creatureTypes = {
    fish: { emoji: '🐠', speed: 1.5, size: 3, hungerTime: 15000, price: 30 },
    jellyfish: { emoji: '🎐', speed: 0.8, size: 3, hungerTime: 12000, price: 50 },
    octopus: { emoji: '🐙', speed: 1.2, size: 3.5, hungerTime: 10000, price: 80 },
    turtle: { emoji: '🐢', speed: 0.6, size: 4, hungerTime: 8000, price: 100 },
    crab: { emoji: '🦀', speed: 1.0, size: 2.5, hungerTime: 13000, price: 40 },
    dolphin: { emoji: '🐬', speed: 2.0, size: 4, hungerTime: 5000, price: 150 }
};

// ===== DOM ELEMENTS =====
const elements = {
    aquarium: document.getElementById('aquarium'),
    creaturesContainer: document.getElementById('creatures'),
    foodContainer: document.getElementById('food-container'),
    bubblesContainer: document.getElementById('bubbles'),
    goldAmount: document.getElementById('gold-amount'),
    creatureCount: document.getElementById('creature-count'),
    passiveGold: document.getElementById('passive-gold'),
    passiveTimer: document.getElementById('passive-timer'),
    shopBtn: document.getElementById('shop-btn-menu'),
    shopModal: document.getElementById('shop-modal'),
    closeShop: document.getElementById('close-shop'),
    notifications: document.getElementById('notifications'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    sideMenu: document.getElementById('side-menu'),
    closeMenu: document.getElementById('close-menu')
};

// ===== DRAG AND DROP STATE =====
let draggedCreature = null;
let dragOffset = { x: 0, y: 0 };

// ===== CREATURE CLASS =====
class Creature {
    constructor(type, x, y) {
        this.type = type;
        this.config = creatureTypes[type];
        this.x = x;
        this.y = y;
        this.velocityX = (Math.random() - 0.5) * this.config.speed;
        this.velocityY = (Math.random() - 0.5) * this.config.speed;
        this.hungry = true;
        this.targetFood = null;

        // Growth tracking
        this.growthLevel = 0;
        this.feedCount = 0;

        // Time tracking
        this.createdAt = Date.now();

        // Base size logic
        this.baseSize = this.config.size;
        this.currentSize = this.baseSize;

        this.element = this.createElement();
    }

    createElement() {
        const creature = document.createElement('div');
        creature.className = 'creature';
        creature.textContent = this.config.emoji;

        // Set initial size
        creature.style.fontSize = `${this.currentSize}rem`;

        creature.style.left = `${this.x}px`;
        creature.style.top = `${this.y}px`;

        // Create hunger bar
        const hungerBar = document.createElement('div');
        hungerBar.className = 'hunger-bar';
        const hungerFill = document.createElement('div');
        hungerFill.className = 'hunger-fill';
        hungerFill.style.width = '100%';
        hungerBar.appendChild(hungerFill);
        creature.appendChild(hungerBar);

        this.hungerBar = hungerFill;
        this.hungerTime = this.config.hungerTime;
        this.hungerElapsed = this.config.hungerTime;

        // Add drag functionality (ONLY left click)
        creature.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                startDrag(this, event);
            }
        });

        // Add touch support for mobile
        creature.addEventListener('touchstart', (event) => {
            startDrag(this, event);
        }, { passive: false });

        // Add right click to sell (optional, but we have drag-to-sell now)
        creature.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        elements.creaturesContainer.appendChild(creature);
        return creature;
    }

    update() {
        if (draggedCreature === this) return;

        // Movement logic
        if (this.hungry && !this.targetFood) {
            // Find nearest food
            let nearestFood = null;
            let minDist = Infinity;

            for (let food of gameState.activeFoods) {
                if (!food.eaten) {
                    const dx = food.x - this.x;
                    const dy = food.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestFood = food;
                    }
                }
            }

            if (nearestFood) {
                this.targetFood = nearestFood;
            }
        }

        if (this.targetFood && !this.targetFood.eaten) {
            const dx = this.targetFood.x - this.x;
            const dy = this.targetFood.y - this.y;
            const angle = Math.atan2(dy, dx);

            this.velocityX += Math.cos(angle) * 0.2;
            this.velocityY += Math.sin(angle) * 0.2;
        } else {
            // Random movement
            this.velocityX += (Math.random() - 0.5) * 0.2;
            this.velocityY += (Math.random() - 0.5) * 0.2;
            this.targetFood = null;
        }

        // Apply friction
        this.velocityX *= 0.95;
        this.velocityY *= 0.95;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Bounce off walls with padding to prevent getting stuck
        const bounds = elements.aquarium.getBoundingClientRect();
        const creatureBounds = this.element.getBoundingClientRect();
        const padding = 10;

        if (this.x < padding) {
            this.velocityX = Math.abs(this.velocityX);
            this.x = padding;
        } else if (this.x > bounds.width - creatureBounds.width - padding) {
            this.velocityX = -Math.abs(this.velocityX);
            this.x = bounds.width - creatureBounds.width - padding;
        }

        if (this.y < padding) {
            this.velocityY = Math.abs(this.velocityY);
            this.y = padding;
        } else if (this.y > bounds.height - creatureBounds.height - padding) {
            this.velocityY = -Math.abs(this.velocityY);
            this.y = bounds.height - creatureBounds.height - padding;
        }

        // Limit speed
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const maxSpeed = this.config.speed * (this.hungry ? 1.5 : 1);

        if (speed > maxSpeed) {
            this.velocityX = (this.velocityX / speed) * maxSpeed;
            this.velocityY = (this.velocityY / speed) * maxSpeed;
        }

        // Flip sprite based on direction
        if (this.velocityX > 0) {
            this.element.style.transform = 'scaleX(-1)';
        } else {
            this.element.style.transform = 'scaleX(1)';
        }

        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;

        // Hunger logic
        if (!this.hungry) {
            this.hungerElapsed += 16.67; // approx 60fps
            const hungerPercent = Math.min((this.hungerElapsed / this.hungerTime) * 100, 100);
            this.hungerBar.style.width = `${hungerPercent}%`;

            if (this.hungerElapsed >= this.hungerTime) {
                this.hungry = true;
            }
        }
    }

    checkFoodCollision(food) {
        const creatureBounds = this.element.getBoundingClientRect();
        const foodBounds = food.element.getBoundingClientRect();

        return !(creatureBounds.right < foodBounds.left ||
            creatureBounds.left > foodBounds.right ||
            creatureBounds.bottom < foodBounds.top ||
            creatureBounds.top > foodBounds.bottom);
    }

    feed() {
        if (this.hungry) {
            this.hungry = false;
            this.hungerElapsed = 0;
            this.hungerBar.style.width = '0%';
            this.targetFood = null;

            this.feedCount++;

            // Growth Logic: Requires both food AND time
            // Needs 3 feeds per level
            const feedsPerLevel = 3;
            // Needs 30 seconds in tank per level
            const timePerLevel = 30000;

            const potentialLevel = Math.floor(this.feedCount / feedsPerLevel);

            if (potentialLevel > this.growthLevel && this.growthLevel < 5) {
                const timeSinceCreation = Date.now() - this.createdAt;
                const timeRequired = (this.growthLevel + 1) * timePerLevel;

                if (timeSinceCreation >= timeRequired) {
                    this.growthLevel++;
                    this.currentSize = this.baseSize * (1 + this.growthLevel * 0.2);
                    this.element.style.fontSize = `${this.currentSize}rem`;
                    showNotification(`${this.type} grew bigger! 🌟 (Lv.${this.growthLevel})`, 'success');
                }
            }

            const happyBubble = document.createElement('div');
            happyBubble.className = 'happy-bubble';
            happyBubble.textContent = '😊';
            this.element.appendChild(happyBubble);

            setTimeout(() => {
                happyBubble.remove();
            }, 1000);

            // Temporary expansion effect
            this.element.style.fontSize = `${this.currentSize * 1.2}rem`;
            setTimeout(() => {
                this.element.style.fontSize = `${this.currentSize}rem`;
            }, 300);

            return true;
        }
        return false;
    }

    getSellValue() {
        const totalValue = this.config.price + (this.growthLevel * 50);
        return Math.floor(totalValue * 0.5);
    }

    getTimeInTank() {
        const timeInMs = Date.now() - this.createdAt;
        const seconds = Math.floor(timeInMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    }
}

// ===== FOOD CLASS =====
class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.maxFallDistance = 200;
        this.element = this.createElement();
        this.eaten = false;
    }

    createElement() {
        const food = document.createElement('div');
        food.className = 'food';
        food.textContent = '🍖';
        food.style.left = `${this.x}px`;
        food.style.top = `${this.y}px`;
        elements.foodContainer.appendChild(food);
        return food;
    }

    update() {
        if (this.eaten) return false;

        this.y += 1;
        this.element.style.top = `${this.y}px`;

        // Check if food has fallen too far
        const distanceFallen = this.y - this.startY;
        if (distanceFallen > this.maxFallDistance) {
            this.element.remove();
            const index = gameState.activeFoods.indexOf(this);
            if (index > -1) {
                gameState.activeFoods.splice(index, 1);
            }
            return false;
        }

        for (let creature of gameState.creatures) {
            if (creature.checkFoodCollision(this)) {
                if (creature.feed()) {
                    this.eaten = true;
                    this.element.remove();
                    gameState.gold += gameState.goldPerFeed;
                    updateUI();
                    showNotification(`+${gameState.goldPerFeed} Gold!`, 'success');

                    const index = gameState.activeFoods.indexOf(this);
                    if (index > -1) {
                        gameState.activeFoods.splice(index, 1);
                    }
                    return false;
                }
            }
        }

        if (this.y > elements.aquarium.offsetHeight) {
            this.element.remove();
            const index = gameState.activeFoods.indexOf(this);
            if (index > -1) {
                gameState.activeFoods.splice(index, 1);
            }
            return false;
        }

        return true;
    }
}

// ===== DRAG AND DROP FUNCTIONS =====
function startDrag(creature, event) {
    event.preventDefault();
    event.stopPropagation();

    draggedCreature = creature;

    const rect = elements.aquarium.getBoundingClientRect();

    // Handle both mouse and touch events
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    dragOffset.x = clientX - rect.left - creature.x;
    dragOffset.y = clientY - rect.top - creature.y;

    elements.aquarium.style.cursor = 'grabbing';
    creature.element.style.zIndex = '100';

    const sellZone = document.getElementById('sell-zone');
    sellZone.classList.add('active');

    createStatSheet(creature);

    showNotification(`Dragging ${creature.type}... Drop on sell zone to sell!`, 'info');
}

function createStatSheet(creature) {
    const existingSheet = document.getElementById('creature-stat-sheet');
    if (existingSheet) {
        existingSheet.remove();
    }

    const statSheet = document.createElement('div');
    statSheet.id = 'creature-stat-sheet';
    statSheet.className = 'creature-stat-sheet';

    const sellValue = creature.getSellValue();
    const timeInTank = creature.getTimeInTank();

    statSheet.innerHTML = `
        <div class="stat-sheet-header" style="display:flex; align-items:center; justify-content:center; gap:5px;">
            <div style="font-size: 1.5rem;">${creature.config.emoji}</div> 
            ${creature.type.charAt(0).toUpperCase() + creature.type.slice(1)}
        </div>
        <div class="stat-sheet-row">
            <span class="stat-label">⏱️ Time:</span>
            <span class="stat-value-text">${timeInTank}</span>
        </div>
        <div class="stat-sheet-row">
            <span class="stat-label">🍖 Fed:</span>
            <span class="stat-value-text">${creature.feedCount}x</span>
        </div>
        <div class="stat-sheet-row">
            <span class="stat-label">⭐ Level:</span>
            <span class="stat-value-text">${creature.growthLevel}</span>
        </div>
        <div class="stat-sheet-row highlight">
            <span class="stat-label">💰 Worth:</span>
            <span class="stat-value-text">${sellValue} gold</span>
        </div>
    `;

    document.body.appendChild(statSheet);
    updateStatSheetPosition(creature);
}

function updateStatSheetPosition(creature) {
    const statSheet = document.getElementById('creature-stat-sheet');
    if (!statSheet || !creature) return;

    const creatureBounds = creature.element.getBoundingClientRect();

    const sheetX = creatureBounds.left - 180;
    const sheetY = creatureBounds.top;

    statSheet.style.left = `${Math.max(10, sheetX)}px`;
    statSheet.style.top = `${sheetY}px`;
}

function onMouseMove(event) {
    if (!draggedCreature) return;

    const rect = elements.aquarium.getBoundingClientRect();

    // Handle both mouse and touch events
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const newX = clientX - rect.left - dragOffset.x;
    const newY = clientY - rect.top - dragOffset.y;

    const bounds = elements.aquarium.getBoundingClientRect();
    const creatureBounds = draggedCreature.element.getBoundingClientRect();

    draggedCreature.x = Math.max(0, Math.min(newX, bounds.width - creatureBounds.width));
    draggedCreature.y = Math.max(0, Math.min(newY, bounds.height - creatureBounds.height));

    draggedCreature.element.style.left = `${draggedCreature.x}px`;
    draggedCreature.element.style.top = `${draggedCreature.y}px`;

    updateStatSheetPosition(draggedCreature);

    const sellZone = document.getElementById('sell-zone');
    const sellZoneRect = sellZone.getBoundingClientRect();

    const isOverSellZone = (
        event.clientX >= sellZoneRect.left &&
        event.clientX <= sellZoneRect.right &&
        event.clientY >= sellZoneRect.top &&
        event.clientY <= sellZoneRect.bottom
    );

    if (isOverSellZone) {
        sellZone.classList.add('hover');
    } else {
        sellZone.classList.remove('hover');
    }
}

function endDrag(event) {
    if (draggedCreature) {
        const sellZone = document.getElementById('sell-zone');
        const sellZoneRect = sellZone.getBoundingClientRect();

        const isOverSellZone = (
            event.clientX >= sellZoneRect.left &&
            event.clientX <= sellZoneRect.right &&
            event.clientY >= sellZoneRect.top &&
            event.clientY <= sellZoneRect.bottom
        );

        if (isOverSellZone) {
            const sellValue = draggedCreature.getSellValue();
            const growthInfo = draggedCreature.growthLevel > 0 ? ` (Lv.${draggedCreature.growthLevel})` : '';

            const index = gameState.creatures.indexOf(draggedCreature);
            if (index > -1) {
                gameState.creatures.splice(index, 1);
            }

            draggedCreature.element.remove();

            gameState.gold += sellValue;
            gameState.creatureCount = gameState.creatures.length;

            updateUI();
            updatePassiveGoldDisplay();

            showNotification(`Sold ${draggedCreature.type}${growthInfo} for ${sellValue} gold! 💰`, 'success');
        } else {
            draggedCreature.element.style.zIndex = '';
            showNotification(`${draggedCreature.type} placed!`, 'success');
        }

        sellZone.classList.remove('active', 'hover');

        const statSheet = document.getElementById('creature-stat-sheet');
        if (statSheet) {
            statSheet.remove();
        }

        draggedCreature = null;
    }

    elements.aquarium.style.cursor = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">🍖</text></svg>\') 16 16, pointer';
}

// ===== BUBBLE SYSTEM =====
function createBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const size = Math.random() * 15 + 5;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;

    const duration = Math.random() * 4 + 3;
    bubble.style.animationDuration = `${duration}s`;

    elements.bubblesContainer.appendChild(bubble);

    setTimeout(() => {
        bubble.remove();
    }, duration * 1000);
}

// ===== PASSIVE GOLD SYSTEM =====
function updatePassiveGold() {
    gameState.passiveGoldTimer--;
    elements.passiveTimer.textContent = gameState.passiveGoldTimer;

    if (gameState.passiveGoldTimer <= 0) {
        const goldEarned = gameState.passiveGoldPerTick * gameState.creatureCount;
        gameState.gold += goldEarned;
        gameState.passiveGoldTimer = gameState.passiveGoldInterval;
        updateUI();
        showNotification(`+${goldEarned} Passive Gold!`, 'info');
    }
}

function updatePassiveGoldDisplay() {
    const passiveGoldAmount = gameState.passiveGoldPerTick * gameState.creatureCount;
    elements.passiveGold.textContent = `+${passiveGoldAmount}`;
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    const existingNotification = elements.notifications.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    elements.notifications.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'notification-slide-in 0.3s reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===== GAME FUNCTIONS =====
function addCreature(type) {
    const bounds = elements.aquarium.getBoundingClientRect();
    let x, y;
    let attempts = 0;
    const maxAttempts = 50;
    const minDistance = 150;

    do {
        x = Math.random() * (bounds.width - 100) + 50;
        y = Math.random() * (bounds.height * 0.5) + 50;
        attempts++;

        let tooClose = false;
        for (let creature of gameState.creatures) {
            const dx = creature.x - x;
            const dy = creature.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose || attempts >= maxAttempts) {
            break;
        }
    } while (attempts < maxAttempts);

    const creature = new Creature(type, x, y);
    gameState.creatures.push(creature);
    gameState.creatureCount = gameState.creatures.length;

    updateUI();
    updatePassiveGoldDisplay();
}

function updateUI() {
    elements.goldAmount.textContent = gameState.gold;
    elements.creatureCount.textContent = gameState.creatureCount;
}

function buyCreature(type) {
    const config = creatureTypes[type];
    if (gameState.gold >= config.price) {
        // Enter placement mode
        gameState.placementMode.active = true;
        gameState.placementMode.creatureType = type;

        // Close shop and menu
        closeShop();
        closeMenu();

        // Change cursor to creature emoji
        const creatureEmoji = creatureTypes[type].emoji;
        elements.aquarium.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><text y="36" font-size="36">${creatureEmoji}</text></svg>') 24 24, pointer`;

        showNotification(`Click anywhere to place your ${type}!`, 'info');
    } else {
        showNotification('Not enough gold!', 'error');
    }
}

function handleAquariumClick(event) {
    // Handle both mouse and touch events
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    // If in placement mode
    if (gameState.placementMode.active) {
        const rect = elements.aquarium.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const type = gameState.placementMode.creatureType;
        const config = creatureTypes[type];

        // Deduct gold
        gameState.gold -= config.price;

        // Add creature at clicked location
        const creature = new Creature(type, x - 30, y - 30); // Center on click
        gameState.creatures.push(creature);
        gameState.creatureCount = gameState.creatures.length;

        updateUI();
        updatePassiveGoldDisplay();

        showNotification(`Bought a ${type}!`, 'success');

        // Reset placement mode
        gameState.placementMode.active = false;
        gameState.placementMode.creatureType = null;
        elements.aquarium.style.cursor = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">🍖</text></svg>\') 16 16, pointer';

        return;
    }

    // Normal food spawning logic
    // Allow click anywhere as long as it's not a button, menu, UI element, or creature
    if (!event.target.closest('button') &&
        !event.target.closest('.side-menu') &&
        !event.target.closest('.modal') &&
        !event.target.closest('.stats-overlay') &&
        !event.target.closest('.sell-zone') &&
        !event.target.closest('.creature')) {

        if (gameState.gold >= 1) {
            gameState.gold -= 1;
            updateUI();

            const rect = elements.aquarium.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const food = new Food(x, y);
            gameState.activeFoods.push(food);
        } else {
            showNotification('Not enough gold to feed!', 'error');
        }
    }
}

// ===== SHOP FUNCTIONS =====
function openShop() {
    elements.shopModal.classList.add('active');
    const modalContent = elements.shopModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}

function closeShop() {
    elements.shopModal.classList.remove('active');
}

// ===== MENU FUNCTIONS =====
function openMenu() {
    elements.sideMenu.classList.add('active');
}

function closeMenu() {
    elements.sideMenu.classList.remove('active');
}

// ===== GAME LOOP =====
function gameLoop() {
    // Update creatures
    for (let creature of gameState.creatures) {
        creature.update();
    }

    // Update food
    for (let i = gameState.activeFoods.length - 1; i >= 0; i--) {
        const food = gameState.activeFoods[i];
        if (!food.update()) {
            // Food was eaten or removed
        }
    }

    requestAnimationFrame(gameLoop);
}

// ===== AUDIO SYSTEM =====
function initAudio() {
    const volumeSlider = document.getElementById('music-volume');

    if (!volumeSlider) return;

    // Set initial volume
    if (window.audioEngine) {
        window.audioEngine.setVolume(volumeSlider.value);
    }

    // Volume slider listener
    volumeSlider.addEventListener('input', (e) => {
        if (window.audioEngine) {
            window.audioEngine.setVolume(e.target.value);
        }
    });

    // Start music on first interaction
    const startMusic = () => {
        if (window.audioEngine) {
            // Resume audio context if suspended (required by browsers)
            if (window.audioEngine.context && window.audioEngine.context.state === 'suspended') {
                window.audioEngine.context.resume().then(() => {
                    console.log("Audio context resumed");
                    if (!window.audioEngine.isPlaying) {
                        window.audioEngine.start();
                    }
                });
            } else if (!window.audioEngine.isPlaying) {
                window.audioEngine.start();
            }
        }
        document.removeEventListener('click', startMusic);
        document.removeEventListener('keydown', startMusic);
    };

    // Attach listeners for first interaction
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('keydown', startMusic, { once: true });
}

// ===== INITIALIZATION =====
function init() {
    initAudio();

    // Add initial creature
    addCreature('fish');

    // Start game loop
    requestAnimationFrame(gameLoop);

    // Start passive gold timer
    setInterval(updatePassiveGold, 1000);

    // Start bubble system
    setInterval(createBubble, 2000);

    // Event Listeners
    elements.aquarium.addEventListener('click', handleAquariumClick);
    elements.aquarium.addEventListener('touchend', handleAquariumClick, { passive: false });

    // Drag and Drop - Mouse
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', endDrag);

    // Drag and Drop - Touch
    document.addEventListener('touchmove', onMouseMove, { passive: false });
    document.addEventListener('touchend', endDrag);

    // Shop
    elements.shopBtn.addEventListener('click', openShop);
    elements.closeShop.addEventListener('click', closeShop);

    // Shop items
    const shopItems = document.querySelectorAll('.shop-item');
    shopItems.forEach(item => {
        const buyBtn = item.querySelector('.buy-button');
        buyBtn.addEventListener('click', () => {
            const type = item.dataset.creature;
            buyCreature(type);
        });
    });

    // Menu
    elements.hamburgerBtn.addEventListener('click', openMenu);
    elements.closeMenu.addEventListener('click', closeMenu);
}

// Start the game
init();
