/*
 * CSC 4370 - Fifteen Puzzle JavaScript
 * Enhanced UI with consistent sizing and improved user experience
 * Features: Fixed puzzle area size, start button functionality, early tile interaction
 */

"use strict";

// Global constants - Clean and simple
const ANIMATION_DURATION = 300;

// Global variables
let puzzleSize = 4;
let tiles = [];
let emptyPosition = { row: 0, col: 0 };
let gameStartTime = null;
let gameTimer = null;
let moveCount = 0;
let gameStarted = false;
let isAnimating = false;
let currentBackground = "resources/background1.png";
let currentUser = null;
let backgroundImageId = 1;

/**
 * Get puzzle container size from CSS (fixed size)
 */
function getContainerSize() {
    const screenWidth = window.innerWidth;
    
    if (screenWidth <= 768) {
        return 340; // Mobile
    } else if (screenWidth <= 1200) {
        return 440; // Tablet
    } else {
        return 480; // Desktop
    }
}

/**
 * Calculate tile size - slightly smaller to avoid cutoff
 */
function getTileSize() {
    const containerSize = getContainerSize();
    // Make tiles 98% of the calculated size to just avoid cutoff
    return Math.floor((containerSize * 0.98) / puzzleSize);
}

/**
 * Get tile position in pixels - no gaps, just smaller tiles
 */
function getTilePosition(row, col) {
    const tileSize = getTileSize();
    return {
        left: col * tileSize,
        top: row * tileSize
    };
}

// Best scores (stored in localStorage)
function getBestTime() {
    return localStorage.getItem(`bestTime_${puzzleSize}`) || null;
}

function getBestMoves() {
    return localStorage.getItem(`bestMoves_${puzzleSize}`) || null;
}

/**
 * Initialize the game when the page loads
 */
window.addEventListener('load', async function() {
    initializeGame();
    setupEventListeners();  // Set up event listeners first
    await checkUserAuthentication();  // Then check authentication
    updateBestStats();
    updateGameStatus('ready');
    preloadAudio();
    
    // Only load leaderboards if elements exist
    if (document.getElementById('leaderboardPuzzleSize') && document.getElementById('leaderboardType')) {
        loadLeaderboards();
    }
    
    loadBackgroundOptions();
    
    // Listen for background changes from admin panel
    setupBackgroundChangeListener();
    
    // Load and apply system configuration
    loadSystemConfiguration();
    
    // Puzzle starts in solved position - user clicks "New Game" to start
});

/**
 * Set up listener for background changes from admin panel
 */
function setupBackgroundChangeListener() {
    // Listen for storage changes (when admin panel updates backgrounds)
    window.addEventListener('storage', function(e) {
        if (e.key === 'fifteenPuzzleBackgroundImages' || e.key === 'fifteenPuzzleBackgroundsLastUpdate') {
            console.log('Background images updated, reloading options...');
            loadBackgroundOptions();
        }
    });
    
    // Listen for postMessage from admin panel (if in same window)
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'backgroundsUpdated') {
            console.log('Received background update notification, reloading options...');
            loadBackgroundOptions();
        }
    });
}

/**
 * Preload audio files to fix first-play issues
 */
function preloadAudio() {
    const audio = ['gameMusic', 'moveSound', 'winSound'];
    audio.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.load();
            // Set volume for background music
            if (id === 'gameMusic') {
                element.volume = 0.15;
            }
        }
    });
}

/**
 * Set up all event listeners for the game controls
 */
function setupEventListeners() {
    // Game control listeners with null checks
    const startButton = document.getElementById('startButton');
    const shuffleButton = document.getElementById('shuffleButton');
    const resetButton = document.getElementById('resetButton');
    const cheatButton = document.getElementById('cheatButton');
    const backgroundSelect = document.getElementById('backgroundSelect');
    const musicOffButton = document.getElementById('musicOffButton');
    
    if (startButton) startButton.addEventListener('click', startGame);
    if (shuffleButton) shuffleButton.addEventListener('click', shufflePuzzle);
    if (resetButton) resetButton.addEventListener('click', resetPuzzle);
    if (cheatButton) cheatButton.addEventListener('click', solvePuzzle);
    if (backgroundSelect) backgroundSelect.addEventListener('change', changeBackground);
    if (musicOffButton) musicOffButton.addEventListener('click', toggleBackgroundMusic);
    
    // Puzzle size change listeners
    document.querySelectorAll('input[name="puzzleSize"]').forEach(radio => {
        radio.addEventListener('change', changePuzzleSize);
    });
    
    const playAgainButton = document.getElementById('playAgainButton');
    if (playAgainButton) {
        playAgainButton.addEventListener('click', function() {
            hideWinMessage();
            startGame();
        });
    }
    
    // User authentication event listeners - check if elements exist
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const logoutButton = document.getElementById('logoutButton');
    const preferencesButton = document.getElementById('preferencesButton');
    const adminButton = document.getElementById('adminButton');
    const dashboardButton = document.getElementById('dashboardButton');
    
    if (loginButton) {
        loginButton.addEventListener('click', () => window.location.href = 'login.html');
    }
    if (registerButton) {
        registerButton.addEventListener('click', () => window.location.href = 'register.html');
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    if (preferencesButton) {
        preferencesButton.addEventListener('click', showPreferences);
    }
    if (adminButton) {
        adminButton.addEventListener('click', () => window.location.href = 'admin.html');
    }
    if (dashboardButton) {
        dashboardButton.addEventListener('click', handleDashboardClick);
    }
    
    // Set up remaining event listeners
    continueSetupEventListeners();
}

/**
 * Set up user dropdown functionality
 */
function setupUserDropdown() {
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuToggle && userDropdown) {
        // Clear any existing listeners by cloning the element
        const newToggle = userMenuToggle.cloneNode(true);
        userMenuToggle.parentNode.replaceChild(newToggle, userMenuToggle);
        
        newToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const currentToggle = document.getElementById('userMenuToggle');
            if (currentToggle && !currentToggle.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
        
        // Close dropdown when clicking on dropdown items
        userDropdown.addEventListener('click', function(e) {
            // Don't close dropdown if clicking on dividers
            if (e.target.classList.contains('dropdown-divider')) {
                return;
            }
            userDropdown.classList.remove('show');
        });
        
        // Set up dropdown item functionality
        const statsButton = document.getElementById('statsButton');
        const leaderboardButton = document.getElementById('leaderboardButton');
        
        if (statsButton) {
            statsButton.addEventListener('click', function() {
                const userStatsPanel = document.getElementById('userStatsPanel');
                if (userStatsPanel) {
                    userStatsPanel.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        if (leaderboardButton) {
            leaderboardButton.addEventListener('click', function() {
                const leaderboard = document.getElementById('leaderboard');
                if (leaderboard) {
                    leaderboard.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        // Admin Dashboard navigation
        const adminDashboardItem = document.getElementById('adminDashboardItem');
        if (adminDashboardItem) {
            adminDashboardItem.addEventListener('click', function() {
                window.location.href = 'admin.html';
            });
        }
    }
}

/**
 * Set up user dropdown functionality
 */
function setupUserDropdown() {
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuToggle && userDropdown) {
        // Clear any existing listeners by cloning the element
        const newToggle = userMenuToggle.cloneNode(true);
        userMenuToggle.parentNode.replaceChild(newToggle, userMenuToggle);
        
        newToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const currentToggle = document.getElementById('userMenuToggle');
            if (currentToggle && !currentToggle.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
        
        // Close dropdown when clicking on dropdown items
        userDropdown.addEventListener('click', function(e) {
            // Don't close dropdown if clicking on dividers
            if (e.target.classList.contains('dropdown-divider')) {
                return;
            }
            userDropdown.classList.remove('show');
        });
        
        // Set up dropdown item functionality
        const statsButton = document.getElementById('statsButton');
        const leaderboardButton = document.getElementById('leaderboardButton');
        
        if (statsButton) {
            statsButton.addEventListener('click', function() {
                const userStatsPanel = document.getElementById('userStatsPanel');
                if (userStatsPanel) {
                    userStatsPanel.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        if (leaderboardButton) {
            leaderboardButton.addEventListener('click', function() {
                const leaderboard = document.getElementById('leaderboard');
                if (leaderboard) {
                    leaderboard.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        // Admin Dashboard navigation
        const adminDashboardItem = document.getElementById('adminDashboardItem');
        if (adminDashboardItem) {
            adminDashboardItem.addEventListener('click', function() {
                window.location.href = 'admin.html';
            });
        }
    }
}

// Continue with the rest of setupEventListeners
function continueSetupEventListeners() {
    // Leaderboard event listeners
    const refreshLeaderboard = document.getElementById('refreshLeaderboard');
    const leaderboardPuzzleSize = document.getElementById('leaderboardPuzzleSize');
    const leaderboardType = document.getElementById('leaderboardType');
    
    if (refreshLeaderboard) refreshLeaderboard.addEventListener('click', loadLeaderboards);
    if (leaderboardPuzzleSize) leaderboardPuzzleSize.addEventListener('change', loadLeaderboards);
    if (leaderboardType) leaderboardType.addEventListener('change', loadLeaderboards);
    
    // Preferences form
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) preferencesForm.addEventListener('submit', savePreferences);
    
    // Modal close functionality
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Handle window resize for responsive puzzle sizing
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            updateAllTiles();
        }, 250); // Debounce resize events
    });
}

/**
 * Update game status indicator
 */
function updateGameStatus(status) {
    const statusElement = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-indicator span');
    
    if (!statusElement || !statusText) return;
    
    // Remove all status classes
    statusElement.classList.remove('ready', 'playing', 'won');
    
    switch(status) {
        case 'ready':
            statusElement.classList.add('ready');
            statusText.textContent = 'Ready to Play';
            break;
        case 'playing':
            statusElement.classList.add('playing');
            statusText.textContent = 'Game in Progress';
            break;
        case 'won':
            statusElement.classList.add('won');
            statusText.textContent = 'Congratulations!';
            break;
    }
}

/**
 * Start the game - shuffle and begin timer
 */
function startGame() {
    // End tracking for any previous game (as abandoned)
    endGameTracking(false);
    
    shufflePuzzle();
    gameStarted = true;
    
    // Start tracking this new game
    startGameTracking();
    
    // Update button states
    document.getElementById('startButton').textContent = 'Restart';
    document.getElementById('shuffleButton').disabled = false;
    document.getElementById('cheatButton').disabled = false;
    
    updateGameStatus('playing');
}

/**
 * Initialize the puzzle game with clean setup
 */
function initializeGame() {
    const puzzleArea = document.getElementById('puzzleArea');
    puzzleArea.innerHTML = '';
    
    // Add hover handlers to puzzle area to clear previews when mouse leaves
    puzzleArea.addEventListener('mouseleave', function() {
        clearMovePreview();
    });
    
    // Get current background from selector
    const backgroundSelect = document.getElementById('backgroundSelect');
    if (backgroundSelect && backgroundSelect.value) {
        currentBackground = backgroundSelect.value;
    }
    
    // Container size is now fixed in CSS - no need to set it here
    
    // Initialize tiles array
    tiles = [];
    for (let row = 0; row < puzzleSize; row++) {
        tiles[row] = [];
        for (let col = 0; col < puzzleSize; col++) {
            if (row === puzzleSize - 1 && col === puzzleSize - 1) {
                // Empty position
                tiles[row][col] = null;
                emptyPosition = { row: row, col: col };
            } else {
                const tileNumber = row * puzzleSize + col + 1;
                const tile = createTile(tileNumber, row, col);
                tiles[row][col] = tile;
                puzzleArea.appendChild(tile);
            }
        }
    }
    
    // Reset game state
    resetGameStats();
    updateBestStats();
    enableTileInteraction();
}

/**
 * Enable tile interaction (allows movement before game starts)
 */
function enableTileInteraction() {
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (tiles[row][col]) {
                updateTileMovability(tiles[row][col], row, col);
            }
        }
    }
}

/**
 * Update tile movability visual indicator
 */
function updateTileMovability(tile, row, col) {
    if (canMoveTileMulti(row, col)) {
        tile.classList.add('movable');
    } else {
        tile.classList.remove('movable');
    }
}

/**
 * Show preview of tiles that will move when hovering over a movable tile
 */
function showMovePreview(hoveredRow, hoveredCol) {
    // Clear any existing preview
    clearMovePreview();
    
    if (!canMoveTileMulti(hoveredRow, hoveredCol)) return;
    
    const tilesToMove = getTilesToMove(hoveredRow, hoveredCol);
    
    // Add preview class to all tiles that will move
    tilesToMove.forEach(moveInfo => {
        if (moveInfo.tile) {
            moveInfo.tile.classList.add('move-preview');
        }
    });
}

/**
 * Clear all move preview highlighting
 */
function clearMovePreview() {
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (tiles[row][col]) {
                tiles[row][col].classList.remove('move-preview');
            }
        }
    }
}

/**
 * Create a tile element with proper sizing
 */
function createTile(number, row, col) {
    const tile = document.createElement('div');
    tile.className = 'puzzle-tile';
    tile.textContent = number;
    tile.id = `tile_${number}`;
    
    // Get sizes
    const tileSize = getTileSize();
    const position = getTilePosition(row, col);
    
    // Set position and size
    tile.style.left = position.left + 'px';
    tile.style.top = position.top + 'px';
    tile.style.width = tileSize + 'px';
    tile.style.height = tileSize + 'px';
    
    // Set font size proportional to tile size
    const fontSize = Math.max(14, Math.floor(tileSize * 0.3));
    tile.style.fontSize = fontSize + 'px';
    tile.style.lineHeight = tileSize + 'px';
    
    // Set background image
    setTileBackground(tile, number);
    
    // Add click handler
    tile.addEventListener('click', function() {
        if (!isAnimating) {
            const currentPos = findTilePosition(tile);
            if (currentPos) {
                // Try multi-tile move first
                if (moveMultipleTiles(currentPos.row, currentPos.col)) {
                    if (!gameStartTime && gameStarted) {
                        startTimer();
                    }
                }
                // Single tile move as fallback (for adjacent tiles)
                else if (canMoveTile(currentPos.row, currentPos.col)) {
                    moveTile(currentPos.row, currentPos.col);
                    
                    if (!gameStartTime && gameStarted) {
                        startTimer();
                    }
                }
            }
        }
    });
    
    // Add hover handlers for move preview
    tile.addEventListener('mouseenter', function() {
        if (!isAnimating) {
            const currentPos = findTilePosition(tile);
            if (currentPos && canMoveTileMulti(currentPos.row, currentPos.col)) {
                showMovePreview(currentPos.row, currentPos.col);
            }
        }
    });
    
    tile.addEventListener('mouseleave', function() {
        clearMovePreview();
    });
    
    return tile;
}

/**
 * Set background image for tile
 */
function setTileBackground(tile, number) {
    // Calculate which part of the image this tile should show
    // For a 4x4 puzzle, number 1 should show the top-left part, number 2 the second part in top row, etc.
    const row = Math.floor((number - 1) / puzzleSize);
    const col = (number - 1) % puzzleSize;
    
    const tileSize = getTileSize();
    const containerSize = getContainerSize();
    
    // Clear any existing background
    tile.style.background = '';
    tile.style.backgroundImage = '';
    tile.style.backgroundSize = '';
    tile.style.backgroundPosition = '';
    tile.style.backgroundRepeat = '';
    
    // If no custom background is set, use default tile styling
    if (!currentBackground || currentBackground === 'Default' || currentBackground === '') {
        tile.style.removeProperty('background');
        tile.style.removeProperty('background-image');
        return;
    }
    
    // Position the background to show the correct portion for this tile
    const backgroundX = -(col * tileSize);
    const backgroundY = -(row * tileSize);
    
    // Set the background image with proper overlay for number visibility
    tile.style.background = `
        linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25)), 
        url('${currentBackground}')
    `;
    tile.style.backgroundSize = `auto, ${containerSize}px ${containerSize}px`;
    tile.style.backgroundPosition = `center, ${backgroundX}px ${backgroundY}px`;
    tile.style.backgroundRepeat = 'no-repeat, no-repeat';
}

/**
 * Find the current position of a tile in the grid
 */
function findTilePosition(tile) {
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (tiles[row][col] === tile) {
                return { row: row, col: col };
            }
        }
    }
    return null;
}

/**
 * Check if a tile can be moved (is adjacent to empty space)
 */
function canMoveTile(row, col) {
    const rowDiff = Math.abs(row - emptyPosition.row);
    const colDiff = Math.abs(col - emptyPosition.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Check if a tile can be moved including multi-tile sliding
 * (same row or column as empty space)
 */
function canMoveTileMulti(row, col) {
    // Must be in same row or column as empty space
    return (row === emptyPosition.row) || (col === emptyPosition.col);
}

/**
 * Get all tiles that need to move when clicking on a specific tile
 */
function getTilesToMove(clickedRow, clickedCol) {
    const tilesToMove = [];
    
    // Check if tile is in same row or column as empty space
    if (!canMoveTileMulti(clickedRow, clickedCol)) {
        return tilesToMove;
    }
    
    if (clickedRow === emptyPosition.row) {
        // Same row - slide horizontally
        const startCol = Math.min(clickedCol, emptyPosition.col);
        const endCol = Math.max(clickedCol, emptyPosition.col);
        
        for (let col = startCol; col <= endCol; col++) {
            if (col !== emptyPosition.col && tiles[clickedRow][col]) {
                tilesToMove.push({
                    tile: tiles[clickedRow][col],
                    fromRow: clickedRow,
                    fromCol: col,
                    toRow: clickedRow,
                    toCol: col + (clickedCol < emptyPosition.col ? 1 : -1)
                });
            }
        }
    } else if (clickedCol === emptyPosition.col) {
        // Same column - slide vertically
        const startRow = Math.min(clickedRow, emptyPosition.row);
        const endRow = Math.max(clickedRow, emptyPosition.row);
        
        for (let row = startRow; row <= endRow; row++) {
            if (row !== emptyPosition.row && tiles[row][clickedCol]) {
                tilesToMove.push({
                    tile: tiles[row][clickedCol],
                    fromRow: row,
                    fromCol: clickedCol,
                    toRow: row + (clickedRow < emptyPosition.row ? 1 : -1),
                    toCol: clickedCol
                });
            }
        }
    }
    
    return tilesToMove;
}

/**
 * Move multiple tiles when clicking on a tile in the same row/column as empty space
 */
function moveMultipleTiles(clickedRow, clickedCol) {
    if (isAnimating) return false;
    
    const tilesToMove = getTilesToMove(clickedRow, clickedCol);
    if (tilesToMove.length === 0) return false;
    
    isAnimating = true;
    
    // Update the tiles array first
    const newEmptyRow = clickedRow;
    const newEmptyCol = clickedCol;
    
    // Move all tiles to their new positions in the array
    tilesToMove.forEach(moveInfo => {
        tiles[moveInfo.fromRow][moveInfo.fromCol] = null;
        tiles[moveInfo.toRow][moveInfo.toCol] = moveInfo.tile;
    });
    
    // Set the new empty position
    tiles[newEmptyRow][newEmptyCol] = null;
    emptyPosition = { row: newEmptyRow, col: newEmptyCol };
    
    // Animate all tiles
    let animationsCompleted = 0;
    const totalAnimations = tilesToMove.length;
    
    tilesToMove.forEach(moveInfo => {
        const newPosition = getTilePosition(moveInfo.toRow, moveInfo.toCol);
        
        moveInfo.tile.classList.add('sliding');
        moveInfo.tile.style.left = newPosition.left + 'px';
        moveInfo.tile.style.top = newPosition.top + 'px';
        
        setTimeout(() => {
            moveInfo.tile.classList.remove('sliding');
            animationsCompleted++;
            
            if (animationsCompleted === totalAnimations) {
                isAnimating = false;
                enableTileInteraction();
                
                // Only check for win if game has started
                if (gameStarted && isPuzzleSolved()) {
                    endGame();
                }
            }
        }, getTileAnimationSpeed());
    });
    
    // Play sound and update count
    playMoveSound();
    incrementMoveCount();
    
    return true;
}

/**
 * Move a tile to the empty position (single tile move)
 */
function moveTile(row, col) {
    if (!canMoveTile(row, col) || isAnimating) return;
    
    isAnimating = true;
    const tile = tiles[row][col];
    
    // Update positions in array
    tiles[emptyPosition.row][emptyPosition.col] = tile;
    tiles[row][col] = null;
    
    // Animate tile movement with fixed tile size
    const newPosition = getTilePosition(emptyPosition.row, emptyPosition.col);
    
    tile.classList.add('sliding');
    tile.style.left = newPosition.left + 'px';
    tile.style.top = newPosition.top + 'px';
    
    // Update empty position
    emptyPosition = { row: row, col: col };
    
    // Play sound and update count
    playMoveSound();
    incrementMoveCount();
    
    // Update movability for all tiles
    setTimeout(() => {
        tile.classList.remove('sliding');
        isAnimating = false;
        enableTileInteraction();
        
        // Only check for win if game has started
        if (gameStarted && isPuzzleSolved()) {
            endGame();
        }
    }, getTileAnimationSpeed());
}

/**
 * Check if the puzzle is solved
 */
function isPuzzleSolved() {
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (row === puzzleSize - 1 && col === puzzleSize - 1) {
                // Last position should be empty
                if (tiles[row][col] !== null) return false;
            } else {
                const expectedNumber = row * puzzleSize + col + 1;
                const tile = tiles[row][col];
                if (!tile || parseInt(tile.textContent) !== expectedNumber) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * Update all tile positions and sizes
 */
function updateAllTiles() {
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            const tile = tiles[row][col];
            if (tile) {
                const tileSize = getTileSize();
                const position = getTilePosition(row, col);
                
                tile.style.left = position.left + 'px';
                tile.style.top = position.top + 'px';
                tile.style.width = tileSize + 'px';
                tile.style.height = tileSize + 'px';
                
                const fontSize = Math.max(14, Math.floor(tileSize * 0.3));
                tile.style.fontSize = fontSize + 'px';
                tile.style.lineHeight = tileSize + 'px';
                
                setTileBackground(tile, parseInt(tile.textContent));
            }
        }
    }
}

/**
 * Shuffle the puzzle - Milestone 2 compliant
 * Generates a solvable state by repeatedly moving random neighbors of the empty space
 */
function shufflePuzzle() {
    // Reset timer and stats
    resetGameStats();
    
    // Use configured shuffle complexity or fallback
    const shuffleMoves = gameConfig.shuffleComplexity || Math.max(200, puzzleSize * puzzleSize * 10);
    
    for (let i = 0; i < shuffleMoves; i++) {
        // Find neighbors of empty space directly (more efficient)
        const neighbors = [];
        const directions = [
            { row: -1, col: 0 }, { row: 1, col: 0 },
            { row: 0, col: -1 }, { row: 0, col: 1 }
        ];
        
        for (const dir of directions) {
            const newRow = emptyPosition.row + dir.row;
            const newCol = emptyPosition.col + dir.col;
            
            if (newRow >= 0 && newRow < puzzleSize && newCol >= 0 && newCol < puzzleSize) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }
        
        // Move a random neighbor into empty space
        if (neighbors.length > 0) {
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // Swap tiles in array only (no DOM updates during shuffle for efficiency)
            const tile = tiles[randomNeighbor.row][randomNeighbor.col];
            tiles[emptyPosition.row][emptyPosition.col] = tile;
            tiles[randomNeighbor.row][randomNeighbor.col] = null;
            
            // Update empty position
            emptyPosition = randomNeighbor;
        }
    }
    
    // Reposition all tiles after shuffle is complete
    updateAllTiles();
    
    // Reset move count after shuffle
    moveCount = 0;
    updateMoveCount();
    enableTileInteraction();
}

/**
 * Solve the puzzle automatically using A* algorithm
 */
function solvePuzzle() {
    if (isAnimating) return; // Prevent multiple solve attempts
    
    // If already solved, just trigger win if game started
    if (isPuzzleSolved()) {
        if (gameStarted) {
            endGame();
        }
        return;
    }
    
    // Clear any existing timer
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    // Disable solve button during solving
    document.getElementById('cheatButton').disabled = true;
    document.getElementById('cheatButton').textContent = 'Solving...';
    
    // Find optimal solution using A* algorithm
    const solutionMoves = findOptimalSolution();
    
    if (solutionMoves.length === 0) {
        // No solution found or already solved
        document.getElementById('cheatButton').disabled = false;
        document.getElementById('cheatButton').textContent = 'Solve';
        return;
    }
    
    // Execute the solution moves
    executeSolutionMoves(solutionMoves, 0);
}

/**
 * Find optimal solution using A* search algorithm
 */
function findOptimalSolution() {
    const startState = getCurrentState();
    const goalState = getGoalState();
    
    if (statesEqual(startState, goalState)) {
        return []; // Already solved
    }
    
    const openSet = [{ state: startState, g: 0, h: manhattanDistance(startState), f: manhattanDistance(startState), path: [] }];
    const closedSet = new Set();
    
    while (openSet.length > 0) {
        // Find node with lowest f score
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        
        const stateKey = stateToString(current.state);
        if (closedSet.has(stateKey)) continue;
        closedSet.add(stateKey);
        
        // Check if we reached the goal
        if (statesEqual(current.state, goalState)) {
            return current.path;
        }
        
        // Limit search depth to prevent infinite loops
        if (current.g > 50) continue;
        
        // Generate all possible moves
        const neighbors = generateMoves(current.state);
        
        for (const neighbor of neighbors) {
            const neighborKey = stateToString(neighbor.state);
            if (closedSet.has(neighborKey)) continue;
            
            const g = current.g + 1;
            const h = manhattanDistance(neighbor.state);
            const f = g + h;
            
            const newPath = [...current.path, neighbor.move];
            
            // Check if this path to neighbor is better
            const existingIndex = openSet.findIndex(node => statesEqual(node.state, neighbor.state));
            if (existingIndex === -1 || g < openSet[existingIndex].g) {
                if (existingIndex !== -1) {
                    openSet.splice(existingIndex, 1);
                }
                openSet.push({ state: neighbor.state, g, h, f, path: newPath });
            }
        }
    }
    
    return []; // No solution found
}

/**
 * Get current puzzle state
 */
function getCurrentState() {
    const state = {
        tiles: Array(puzzleSize).fill().map(() => Array(puzzleSize).fill(0)),
        empty: { ...emptyPosition }
    };
    
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (tiles[row][col] === null) {
                state.tiles[row][col] = 0; // Empty space
            } else {
                state.tiles[row][col] = parseInt(tiles[row][col].textContent);
            }
        }
    }
    
    return state;
}

/**
 * Get goal state (solved puzzle)
 */
function getGoalState() {
    const state = {
        tiles: Array(puzzleSize).fill().map(() => Array(puzzleSize).fill(0)),
        empty: { row: puzzleSize - 1, col: puzzleSize - 1 }
    };
    
    let num = 1;
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (row === puzzleSize - 1 && col === puzzleSize - 1) {
                state.tiles[row][col] = 0; // Empty space
            } else {
                state.tiles[row][col] = num++;
            }
        }
    }
    
    return state;
}

/**
 * Calculate Manhattan distance heuristic
 */
function manhattanDistance(state) {
    let distance = 0;
    
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            const value = state.tiles[row][col];
            if (value !== 0) { // Not empty space
                const targetRow = Math.floor((value - 1) / puzzleSize);
                const targetCol = (value - 1) % puzzleSize;
                distance += Math.abs(row - targetRow) + Math.abs(col - targetCol);
            }
        }
    }
    
    return distance;
}

/**
 * Generate all possible moves from current state
 */
function generateMoves(state) {
    const moves = [];
    const directions = [
        { row: -1, col: 0, name: 'up' },
        { row: 1, col: 0, name: 'down' },
        { row: 0, col: -1, name: 'left' },
        { row: 0, col: 1, name: 'right' }
    ];
    
    for (const dir of directions) {
        const newRow = state.empty.row + dir.row;
        const newCol = state.empty.col + dir.col;
        
        if (newRow >= 0 && newRow < puzzleSize && newCol >= 0 && newCol < puzzleSize) {
            // Create new state
            const newState = {
                tiles: state.tiles.map(row => [...row]),
                empty: { row: newRow, col: newCol }
            };
            
            // Swap empty space with tile
            newState.tiles[state.empty.row][state.empty.col] = newState.tiles[newRow][newCol];
            newState.tiles[newRow][newCol] = 0;
            
            moves.push({
                state: newState,
                move: { row: newRow, col: newCol } // Position of tile to move
            });
        }
    }
    
    return moves;
}

/**
 * Check if two states are equal
 */
function statesEqual(state1, state2) {
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (state1.tiles[row][col] !== state2.tiles[row][col]) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Convert state to string for hashing
 */
function stateToString(state) {
    return state.tiles.flat().join(',');
}

/**
 * Execute solution moves one by one
 */
function executeSolutionMoves(moves, index) {
    if (index >= moves.length) {
        // Finished solving
        document.getElementById('cheatButton').disabled = false;
        document.getElementById('cheatButton').textContent = 'Solve';
        
        if (gameStarted && isPuzzleSolved()) {
            setTimeout(() => endGame(), 100);
        }
        return;
    }
    
    const move = moves[index];
    
    // Check if this move is valid
    if (canMoveTile(move.row, move.col)) {
        // Execute the move
        moveTile(move.row, move.col);
        
        // Schedule next move
        setTimeout(() => {
            executeSolutionMoves(moves, index + 1);
        }, getTileAnimationSpeed() + 50);
    } else {
        // Skip invalid move and continue
        executeSolutionMoves(moves, index + 1);
    }
}

/**
 * Reset puzzle to solved state without triggering win
 */
function resetPuzzle() {
    // Clear any existing timer
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    // Reset game state
    gameStarted = false;
    gameStartTime = null;
    moveCount = 0;
    
    // Update UI
    updateMoveCount();
    updateTimer();
    updateGameStatus('ready');
    
    // Reset button states
    document.getElementById('startButton').textContent = 'Start Game';
    document.getElementById('shuffleButton').disabled = true;
    document.getElementById('cheatButton').disabled = true;
    
    // Create a clean tiles array in solved order
    const newTiles = [];
    for (let row = 0; row < puzzleSize; row++) {
        newTiles[row] = [];
        for (let col = 0; col < puzzleSize; col++) {
            newTiles[row][col] = null; // Initialize as empty
        }
    }
    
    // Place each tile in its correct position
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (row === puzzleSize - 1 && col === puzzleSize - 1) {
                // Last position should be empty
                newTiles[row][col] = null;
            } else {
                const correctNumber = row * puzzleSize + col + 1;
                let tile = findTileByNumber(correctNumber);
                if (tile) {
                    newTiles[row][col] = tile;
                }
            }
        }
    }
    
    // Replace the tiles array with the clean one
    tiles = newTiles;
    
    // Update empty position
    emptyPosition = { row: puzzleSize - 1, col: puzzleSize - 1 };
    
    // Reposition all tiles
    updateAllTiles();
    
    // Enable tile interaction for fun playing
    enableTileInteraction();
    
    // Hide win message if showing
    hideWinMessage();
}

/**
 * Find a tile by its number
 */
function findTileByNumber(number) {
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            const tile = tiles[row][col];
            if (tile && parseInt(tile.textContent) === number) {
                return tile;
            }
        }
    }
    return null;
}

/**
 * Change puzzle size
 */
function changePuzzleSize() {
    const selectedRadio = document.querySelector('input[name="puzzleSize"]:checked');
    puzzleSize = parseInt(selectedRadio.value);
    gameStarted = false;
    
    // Reset button states
    document.getElementById('startButton').textContent = 'New Game';
    document.getElementById('shuffleButton').disabled = true;
    document.getElementById('cheatButton').disabled = true;
    
    initializeGame();
    updateGameStatus('ready');
}

/**
 * Change background image
 */
function changeBackground() {
    currentBackground = document.getElementById('backgroundSelect').value;
    
    // Update all existing tiles
    for (let row = 0; row < puzzleSize; row++) {
        for (let col = 0; col < puzzleSize; col++) {
            if (tiles[row][col]) {
                const number = parseInt(tiles[row][col].textContent);
                setTileBackground(tiles[row][col], number);
            }
        }
    }
    
    console.log('Background changed to:', currentBackground);
}

/**
 * Start the game timer
 */
function startTimer() {
    gameStartTime = Date.now();
    gameTimer = setInterval(updateTimer, 100);
}

/**
 * Update the timer display
 */
function updateTimer() {
    if (gameStartTime) {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timeDisplay').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

/**
 * Increment move counter
 */
function incrementMoveCount() {
    if (gameStarted) {
        moveCount++;
        updateMoveCount();
    }
}

/**
 * Update move count display
 */
function updateMoveCount() {
    document.getElementById('moveCount').textContent = moveCount;
}

/**
 * Reset game statistics
 */
function resetGameStats() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    gameStartTime = null;
    moveCount = 0;
    updateMoveCount();
    document.getElementById('timeDisplay').textContent = '0:00';
}

/**
 * End the game
 */
function endGame() {
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    
    const finalTime = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
    
    // Update best scores
    const currentBest = getBestTime();
    if (!currentBest || finalTime < parseInt(currentBest)) {
        localStorage.setItem(`bestTime_${puzzleSize}`, finalTime);
    }
    
    const currentBestMoves = getBestMoves();
    if (!currentBestMoves || moveCount < parseInt(currentBestMoves)) {
        localStorage.setItem(`bestMoves_${puzzleSize}`, moveCount);
    }
    
    updateBestStats();
    updateGameStatus('won');
    showWinMessage(finalTime, moveCount);
    
    // Check for achievements
    checkAchievements(finalTime, moveCount, puzzleSize);
    
    // Save game statistics for logged-in users
    if (currentUser) {
        saveGameStats(finalTime, moveCount, puzzleSize);
    }
    
    playWinSound();
}

/**
 * Update best statistics display
 */
function updateBestStats() {
    const bestTime = getBestTime();
    const bestMoves = getBestMoves();
    
    if (bestTime) {
        const minutes = Math.floor(bestTime / 60);
        const seconds = bestTime % 60;
        document.getElementById('bestTime').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        document.getElementById('bestTime').textContent = '--';
    }
    
    document.getElementById('bestMoves').textContent = bestMoves || '--';
}

/**
 * Show win message
 */
function showWinMessage(time, moves) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('finalStats').innerHTML = 
        `Time: ${timeText}<br>Moves: ${moves}`;
    document.getElementById('winMessage').classList.remove('hidden');
    
    // Record game statistics for admin dashboard
    recordGameStatistics(time, moves, true);
    
    // End game tracking (completed)
    endGameTracking(true);
}

/**
 * Hide win message
 */
function hideWinMessage() {
    document.getElementById('winMessage').classList.add('hidden');
}

/**
 * Audio functions
 */
let musicPlaying = false; // Start with music off
let musicStarted = false;

function startBackgroundMusic() {
    const music = document.getElementById('gameMusic');
    if (music && musicPlaying && !musicStarted) {
        music.volume = 0.15; // Lower volume
        music.loop = true;
        music.play().then(() => {
            musicStarted = true;
        }).catch(() => {
            // Auto-play blocked, will try again on first user interaction
        });
    }
}

function toggleBackgroundMusic() {
    const music = document.getElementById('gameMusic');
    const button = document.getElementById('musicOffButton');
    
    if (musicPlaying) {
        music.pause();
        musicPlaying = false;
        button.textContent = 'Turn Music On';
        button.classList.remove('btn-secondary');
        button.classList.add('btn-primary');
    } else {
        music.volume = 0.15; // Lower volume
        music.loop = true;
        music.play().then(() => {
            musicStarted = true;
        }).catch(() => {
            // Play blocked, ignore
        });
        musicPlaying = true;
        button.textContent = 'Turn Music Off';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
    }
}

function playMoveSound() {
    // Check both user preference and system configuration
    const soundToggle = document.getElementById('soundToggle');
    const userPreference = !soundToggle || soundToggle.checked;
    
    // If system config is set to false, don't play sound regardless of user preference
    if (gameConfig.enableSounds === false) return;
    
    // If system config is set to true, always play sound
    // If system config is 'user' (default), respect user preference
    if (gameConfig.enableSounds !== true && !userPreference) return;
    
    const sound = document.getElementById('moveSound');
    if (sound) {
        // Load the sound if it hasn't been loaded yet
        if (sound.readyState < 2) {
            sound.load();
        }
        sound.currentTime = 0;
        sound.play().catch(() => {
            // Play blocked, ignore
        });
    }
}

function playWinSound() {
    // Check both user preference and system configuration
    const soundToggle = document.getElementById('soundToggle');
    const userPreference = !soundToggle || soundToggle.checked;
    
    // If system config is set to false, don't play sound regardless of user preference
    if (gameConfig.enableSounds === false) return;
    
    // If system config is set to true, always play sound
    // If system config is 'user' (default), respect user preference
    if (gameConfig.enableSounds !== true && !userPreference) return;
    
    const sound = document.getElementById('winSound');
    if (sound) {
        sound.play().catch(() => {
            // Play blocked, ignore
        });
    }
}

/**
 * Check if user is authenticated and update UI accordingly
 */
async function checkUserAuthentication() {
    try {
        const currentUserData = localStorage.getItem('fifteenPuzzleCurrentUser');
        if (currentUserData) {
            currentUser = JSON.parse(currentUserData);
            setupUserInterface();
            loadUserPreferences();
        } else {
            setupGuestInterface();
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        setupGuestInterface();
    }
}

/**
 * Set up interface for authenticated users
 */
function setupUserInterface() {
    // Update user panel
    const guestPanel = document.getElementById('guestPanel');
    const userPanel = document.getElementById('userPanel');
    
    if (guestPanel) guestPanel.style.display = 'none';
    if (userPanel) userPanel.style.display = 'block';
    
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userInitialsEl = document.getElementById('userInitials');
    
    if (userNameEl) userNameEl.textContent = currentUser.username;
    if (userRoleEl) userRoleEl.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    
    // Update user initials
    const initials = currentUser.username.charAt(0).toUpperCase();
    if (userInitialsEl) userInitialsEl.textContent = initials;
    
    // Apply role-based menu visibility
    const userRole = currentUser.role || 'Player';
    if (userRole.toLowerCase() !== 'administrator' && userRole.toLowerCase() !== 'admin') {
        document.body.classList.add('user-role-player');
    }
    
    // Setup dropdown functionality after UI is ready
    setupUserDropdown();
    
    loadUserStats();
}

/**
 * Set up interface for guest users
 */
function setupGuestInterface() {
    const guestPanel = document.getElementById('guestPanel');
    const userPanel = document.getElementById('userPanel');
    const leaderboard = document.getElementById('leaderboard');
    const userStatsPanel = document.getElementById('userStatsPanel');
    const adminButton = document.getElementById('adminButton');
    
    if (guestPanel) guestPanel.style.display = 'block';
    if (userPanel) userPanel.style.display = 'none';
    if (leaderboard) leaderboard.style.display = 'none';
    if (userStatsPanel) userStatsPanel.style.display = 'none';
    if (adminButton) adminButton.style.display = 'none';
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        localStorage.removeItem('fifteenPuzzleCurrentUser');
        currentUser = null;
        backgroundImageId = null;
        setupGuestInterface();
        alert('Logged out successfully!');
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
    }
}

/**
 * Handle dashboard navigation based on user role
 */
function handleDashboardClick() {
    if (!currentUser) {
        alert('Please log in to access the dashboard.');
        return;
    }
    
    // Navigate to appropriate dashboard based on user role
    if (currentUser.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

/**
 * Load user preferences
 */
async function loadUserPreferences() {
    if (!currentUser) return;
    
    try {
        // Load preferences from localStorage instead of API
        const prefsKey = `fifteenPuzzlePreferences_${currentUser.username}`;
        const userPrefs = JSON.parse(localStorage.getItem(prefsKey) || '{}');
        
        // Apply puzzle size preference
        const puzzleSizeEl = document.getElementById('puzzleSize');
        if (userPrefs.puzzleSize && puzzleSizeEl) {
            puzzleSizeEl.value = userPrefs.puzzleSize;
            changePuzzleSize();
        }
        
        // Apply background preference
        if (userPrefs.backgroundImageId) {
            backgroundImageId = userPrefs.backgroundImageId;
        }
        
        // Apply other preferences
        if (userPrefs.currentBackground) {
            currentBackground = userPrefs.currentBackground;
        }
        
        console.log('User preferences loaded from localStorage:', userPrefs);
    } catch (error) {
        console.error('Error loading user preferences:', error);
    }
}

/**
 * Load user statistics
 */
async function loadUserStats() {
    if (!currentUser) return;
    
    try {
        // Load stats from localStorage instead of API
        const playerStatsKey = `fifteenPuzzlePlayerStats_${currentUser.username}`;
        const playerStats = JSON.parse(localStorage.getItem(playerStatsKey) || '{}');
        
        // Update stats display if elements exist
        const totalGamesEl = document.getElementById('totalGames');
        const gamesWonEl = document.getElementById('gamesWon');
        const averageTimeEl = document.getElementById('averageTime');
        const bestTimeEl = document.getElementById('bestTime');
        
        if (totalGamesEl) totalGamesEl.textContent = playerStats.totalGames || 0;
        if (gamesWonEl) gamesWonEl.textContent = playerStats.gamesWon || 0;
        if (averageTimeEl) {
            averageTimeEl.textContent = playerStats.averageTime ? 
                Math.round(playerStats.averageTime) + 's' : 'N/A';
        }
        if (bestTimeEl) {
            bestTimeEl.textContent = playerStats.bestTime ? 
                playerStats.bestTime + 's' : 'N/A';
        }
        
        console.log('User stats loaded from localStorage:', playerStats);
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

/**
 * Show preferences modal
 */
function showPreferences() {
    if (!currentUser) return;
    
    // Pre-fill form with current preferences
    loadCurrentPreferences();
    document.getElementById('preferencesModal').style.display = 'block';
}

/**
 * Load current preferences into form
 */
async function loadCurrentPreferences() {
    try {
        const response = await fetch(`api.php?action=get_preferences&user_id=${currentUser.id}`);
        const result = await response.json();
        
        if (result.success && result.preferences) {
            const prefs = result.preferences;
            document.getElementById('prefPuzzleSize').value = prefs.puzzle_size || '4';
            document.getElementById('prefBackgroundImage').value = prefs.background_image_id || '1';
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

/**
 * Save user preferences
 */
async function savePreferences(event) {
    event.preventDefault();
    
    if (!currentUser) return;
    
    try {
        // Get form values
        const prefPuzzleSizeEl = document.getElementById('prefPuzzleSize');
        const prefBackgroundImageEl = document.getElementById('prefBackgroundImage');
        
        const preferences = {
            puzzleSize: prefPuzzleSizeEl ? prefPuzzleSizeEl.value : puzzleSize,
            backgroundImageId: prefBackgroundImageEl ? prefBackgroundImageEl.value : backgroundImageId,
            currentBackground: currentBackground,
            savedAt: new Date().toISOString()
        };
        
        // Save to localStorage
        const prefsKey = `fifteenPuzzlePreferences_${currentUser.username}`;
        localStorage.setItem(prefsKey, JSON.stringify(preferences));
        
        alert('Preferences saved successfully!');
        
        // Close modal if it exists
        const preferencesModal = document.getElementById('preferencesModal');
        if (preferencesModal) {
            preferencesModal.style.display = 'none';
        }
        
        // Reload and apply preferences
        loadUserPreferences();
        
        console.log('Preferences saved to localStorage:', preferences);
    } catch (error) {
        console.error('Error saving preferences:', error);
        alert('Error saving preferences. Please try again.');
    }
}

/**
 * Load leaderboards
 */
async function loadLeaderboards() {
    try {
        const puzzleSizeEl = document.getElementById('leaderboardPuzzleSize');
        const typeEl = document.getElementById('leaderboardType');
        
        // Check if leaderboard elements exist (they might not be on all pages)
        if (!puzzleSizeEl || !typeEl) {
            return; // Silently return if elements don't exist
        }
        
        const puzzleSize = puzzleSizeEl.value;
        const type = typeEl.value;
        
        const response = await fetch(`api.php?action=get_leaderboard&puzzle_size=${puzzleSize}&type=${type}`);
        const result = await response.json();
        
        if (result.success) {
            updateLeaderboardDisplay(result.leaderboard, type);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

/**
 * Update leaderboard display
 */
function updateLeaderboardDisplay(leaderboard, type) {
    const tbody = document.querySelector('#leaderboardTable tbody');
    tbody.innerHTML = '';
    
    leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.username}</td>
            <td>${type === 'time' ? entry.completion_time + 's' : entry.moves}</td>
            <td>${new Date(entry.date_played).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Load background options
 */
async function loadBackgroundOptions() {
    try {
        // Load from localStorage (admin panel manages these)
        const backgroundImages = JSON.parse(localStorage.getItem('fifteenPuzzleBackgroundImages') || '[]');
        
        // Filter only active images
        const activeImages = backgroundImages.filter(image => image.isActive);
        
        // Update the main background selector
        const backgroundSelect = document.getElementById('backgroundSelect');
        if (backgroundSelect) {
            backgroundSelect.innerHTML = '';
            
            if (activeImages.length === 0) {
                // Fallback to default if no active images
                const defaultBackgrounds = [
                    { value: "resources/background1.png", text: "Nature Scene" },
                    { value: "resources/background2.png", text: "City View" },
                    { value: "resources/background3.png", text: "Abstract Art" },
                    { value: "resources/background4.png", text: "Ocean Blue" }
                ];
                
                // Select random background from defaults
                const randomIndex = Math.floor(Math.random() * defaultBackgrounds.length);
                
                defaultBackgrounds.forEach((bg, index) => {
                    const option = document.createElement('option');
                    option.value = bg.value;
                    option.textContent = bg.text;
                    option.selected = (index === randomIndex);
                    backgroundSelect.appendChild(option);
                });
            } else {
                // Select random background from active images
                const randomIndex = Math.floor(Math.random() * activeImages.length);
                
                activeImages.forEach((image, index) => {
                    const option = document.createElement('option');
                    option.value = image.url;
                    option.textContent = image.name;
                    option.selected = (index === randomIndex);
                    backgroundSelect.appendChild(option);
                });
            }
            
            // Set the current background to the selected value and apply it
            currentBackground = backgroundSelect.value;
            changeBackground();
        }
        
        // Update preferences background selector
        const prefBackgroundSelect = document.getElementById('prefBackground');
        if (prefBackgroundSelect) {
            prefBackgroundSelect.innerHTML = '';
            
            if (activeImages.length === 0) {
                // Fallback options
                prefBackgroundSelect.innerHTML = `
                    <option value="resources/background1.png">Nature Scene</option>
                    <option value="resources/background2.png">City View</option>
                    <option value="resources/background3.png">Abstract Art</option>
                    <option value="resources/background4.png">Ocean Blue</option>
                `;
            } else {
                activeImages.forEach(image => {
                    const option = document.createElement('option');
                    option.value = image.url;
                    option.textContent = image.name;
                    prefBackgroundSelect.appendChild(option);
                });
            }
        }
        
        console.log('Background options loaded:', activeImages.length, 'active images');
        
    } catch (error) {
        console.error('Error loading background options:', error);
        // Fallback to hardcoded options
        const backgroundSelect = document.getElementById('backgroundSelect');
        if (backgroundSelect && backgroundSelect.children.length === 0) {
            backgroundSelect.innerHTML = `
                <option value="resources/background1.png" selected>Nature Scene</option>
                <option value="resources/background2.png">City View</option>
                <option value="resources/background3.png">Abstract Art</option>
                <option value="resources/background4.png">Ocean Blue</option>
            `;
        }
    }
}

/**
 * Save game statistics when game is completed
 */
async function saveGameStats(completionTime, moves, puzzleSize) {
    if (!currentUser) return;
    
    const formData = new FormData();
    formData.append('action', 'save_game_stats');
    formData.append('user_id', currentUser.id);
    formData.append('puzzle_size', puzzleSize);
    formData.append('completion_time', completionTime);
    formData.append('moves', moves);
    formData.append('background_image_id', backgroundImageId || 1);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.success) {
            // Refresh user stats and leaderboard
            loadUserStats();
            loadLeaderboards();
        }
    } catch (error) {
        console.error('Error saving game stats:', error);
    }
}

/**
 * Achievements System
 */
const ACHIEVEMENTS = {
    FIRST_WIN: {
        id: 'first_win',
        name: 'First Victory!',
        description: 'Complete your first puzzle',
        icon: '🏆',
        condition: (stats) => stats.totalGames >= 1
    },
    SPEED_DEMON_3X3: {
        id: 'speed_demon_3x3',
        name: 'Speed Demon',
        description: 'Solve a 3x3 puzzle in under 30 seconds',
        icon: '⚡',
        condition: (stats, time, moves, size) => size === 3 && time < 30
    },
    SPEED_DEMON_4X4: {
        id: 'speed_demon_4x4',
        name: 'Lightning Fast',
        description: 'Solve a 4x4 puzzle in under 60 seconds',
        icon: '⚡',
        condition: (stats, time, moves, size) => size === 4 && time < 60
    },
    EFFICIENCY_MASTER: {
        id: 'efficiency_master',
        name: 'Efficiency Master',
        description: 'Solve a 4x4 puzzle in under 100 moves',
        icon: '🎯',
        condition: (stats, time, moves, size) => size === 4 && moves < 100
    },
    PUZZLE_VETERAN: {
        id: 'puzzle_veteran',
        name: 'Puzzle Veteran',
        description: 'Complete 10 puzzles',
        icon: '🎖️',
        condition: (stats) => stats.totalGames >= 10
    },
    PUZZLE_MASTER: {
        id: 'puzzle_master',
        name: 'Puzzle Master',
        description: 'Complete 50 puzzles',
        icon: '👑',
        condition: (stats) => stats.totalGames >= 50
    },
    PERFECTIONIST: {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Solve a 3x3 puzzle in optimal moves (22 or fewer)',
        icon: '💎',
        condition: (stats, time, moves, size) => size === 3 && moves <= 22
    },
    BIG_PUZZLE_SOLVER: {
        id: 'big_puzzle_solver',
        name: 'Big Puzzle Solver',
        description: 'Complete a 5x5 puzzle',
        icon: '🧩',
        condition: (stats, time, moves, size) => size === 5
    }
};

/**
 * Check for new achievements after game completion
 */
async function checkAchievements(completionTime, moves, puzzleSize) {
    if (!currentUser) return;
    
    try {
        // Get current user stats
        const statsResponse = await fetch(`api.php?action=get_user_stats&user_id=${currentUser.id}`);
        const statsResult = await statsResponse.json();
        
        if (!statsResult.success) return;
        
        // Calculate total games from all puzzle sizes
        const userStatsArray = statsResult.stats || [];
        let totalGames = 0;
        for (const stat of userStatsArray) {
            totalGames += parseInt(stat.games_played || 0);
        }
        
        const userStats = { totalGames: totalGames };
        
        // Get user's current achievements
        const achievementsResponse = await fetch(`api.php?action=get_user_achievements&user_id=${currentUser.id}`);
        const achievementsResult = await achievementsResponse.json();
        
        const userAchievements = achievementsResult.success ? 
            achievementsResult.achievements.map(a => a.achievement_id) : [];
        
        // Check each achievement
        const newAchievements = [];
        
        for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
            // Skip if user already has this achievement
            if (userAchievements.includes(achievement.id)) continue;
            
            // Check if achievement condition is met
            if (achievement.condition(userStats, completionTime, moves, puzzleSize)) {
                newAchievements.push(achievement);
                
                // Save achievement to database
                await saveAchievement(achievement.id);
            }
        }
        
        // Display new achievements
        if (newAchievements.length > 0) {
            displayAchievements(newAchievements);
        }
        
    } catch (error) {
        console.error('Error checking achievements:', error);
    }
}

/**
 * Save achievement to database
 */
async function saveAchievement(achievementId) {
    if (!currentUser) return;
    
    const formData = new FormData();
    formData.append('action', 'save_achievement');
    formData.append('user_id', currentUser.id);
    formData.append('achievement_id', achievementId);
    
    try {
        await fetch('api.php', {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.error('Error saving achievement:', error);
    }
}

/**
 * Display achievement notifications
 */
function displayAchievements(achievements) {
    achievements.forEach((achievement, index) => {
        setTimeout(() => {
            showAchievementNotification(achievement);
        }, index * 1000); // Stagger notifications by 1 second
    });
}

/**
 * Show individual achievement notification
 */
function showAchievementNotification(achievement) {
    // Create achievement notification element
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-content">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-text">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

/**
 * Record game statistics for admin dashboard
 */
function recordGameStatistics(timeInSeconds, moves, completed) {
    const currentUserData = localStorage.getItem('fifteenPuzzleCurrentUser');
    if (!currentUserData) return; // Only record for logged-in users
    
    // Parse the current user data to get the username
    const currentUser = JSON.parse(currentUserData);
    const playerName = currentUser.username || 'Guest';
    
    const currentBackground = document.getElementById('backgroundSelect').value || 'Default';
    
    const gameData = {
        id: 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        player: playerName,
        date: new Date().toISOString(),
        timeInSeconds: Math.round(timeInSeconds),
        moves: moves,
        completed: completed,
        background: currentBackground,
        puzzleSize: puzzleSize
    };
    
    // Get existing game statistics
    const existingStats = JSON.parse(localStorage.getItem('fifteenPuzzleGameStats') || '[]');
    existingStats.push(gameData);
    
    // Keep only the most recent 1000 games to prevent localStorage from getting too large
    if (existingStats.length > 1000) {
        existingStats.splice(0, existingStats.length - 1000);
    }
    
    localStorage.setItem('fifteenPuzzleGameStats', JSON.stringify(existingStats));
    
    console.log('Game statistics recorded:', gameData);
}

/**
 * Record when a game is started (for tracking abandoned games)
 */
let currentGameStartTime = null;
let currentGameStartMoves = 0;

function startGameTracking() {
    currentGameStartTime = Date.now();
    currentGameStartMoves = moveCount;
}

function endGameTracking(completed = false) {
    if (currentGameStartTime && !completed) {
        // Record abandoned game
        const timeInSeconds = (Date.now() - currentGameStartTime) / 1000;
        const moves = moveCount - currentGameStartMoves;
        recordGameStatistics(timeInSeconds, moves, false);
    }
    currentGameStartTime = null;
    currentGameStartMoves = 0;
}

/**
 * System Configuration Integration
 */
let gameConfig = {
    maxMovesForWin: 100,
    timeLimit: 0,
    animationSpeed: 250,
    showMoveCounter: true,
    showTimer: true,
    enableSounds: true,
    shuffleComplexity: 100,
    defaultPuzzleSize: 4
};

function loadSystemConfiguration() {
    try {
        const configData = localStorage.getItem('fifteenPuzzleSystemConfig');
        if (configData) {
            const config = JSON.parse(configData);
            
            // Apply configuration
            gameConfig.maxMovesForWin = config.maxMovesForWin || 100;
            gameConfig.timeLimit = config.timeLimit || 0;
            gameConfig.showMoveCounter = config.showMoveCounter !== 'false';
            gameConfig.showTimer = config.showTimer !== 'false';
            
            // Apply default puzzle size only if no radio button is currently checked
            if (config.defaultPuzzleSize && [3, 4, 5].includes(config.defaultPuzzleSize)) {
                const currentChecked = document.querySelector('input[name="puzzleSize"]:checked');
                if (!currentChecked) {
                    puzzleSize = config.defaultPuzzleSize;
                    // Update the radio button selection
                    const sizeRadio = document.querySelector(`input[name="puzzleSize"][value="${puzzleSize}"]`);
                    if (sizeRadio) {
                        sizeRadio.checked = true;
                    }
                } else {
                    // Use the currently checked radio button value
                    puzzleSize = parseInt(currentChecked.value);
                }
            }
            
            // Apply animation speed
            const speeds = { slow: 400, normal: 250, fast: 150, instant: 0 };
            gameConfig.animationSpeed = speeds[config.animationSpeed] || 250;
            
            // Apply sound settings
            if (config.enableSounds === 'false') {
                gameConfig.enableSounds = false;
            } else if (config.enableSounds === 'true') {
                gameConfig.enableSounds = true;
            }
            // If 'user', keep default/user preference
            
            // Apply background music settings
            if (config.enableBackgroundMusic === 'false') {
                const music = document.getElementById('gameMusic');
                if (music) music.volume = 0;
            } else if (config.enableBackgroundMusic === 'true') {
                const music = document.getElementById('gameMusic');
                if (music) music.volume = 0.3; // Default volume
            }
            
            // Apply shuffle complexity for new games
            if (config.shuffleComplexity) {
                const complexityMap = { easy: 50, medium: 100, hard: 200, expert: 500 };
                gameConfig.shuffleComplexity = complexityMap[config.shuffleComplexity] || 100;
            }
            
            // Apply available puzzle sizes restrictions
            if (config.availableSizes) {
                const sizeRadios = document.querySelectorAll('input[name="puzzleSize"]');
                sizeRadios.forEach(radio => {
                    const size = radio.value;
                    const isEnabled = config.availableSizes[`size${size}x${size}`];
                    radio.disabled = !isEnabled;
                    if (!isEnabled && radio.checked) {
                        // If current selection is disabled, find first enabled option
                        const enabledRadio = Array.from(sizeRadios).find(r => !r.disabled);
                        if (enabledRadio) {
                            radio.checked = false;
                            enabledRadio.checked = true;
                            puzzleSize = parseInt(enabledRadio.value);
                        }
                    }
                });
            }
            
            // Apply UI visibility settings
            applyUIConfiguration();
            
            // Apply time limit if set
            if (gameConfig.timeLimit > 0) {
                setupTimeLimit();
            }
            
            console.log('System configuration loaded:', gameConfig);
        }
    } catch (error) {
        console.error('Error loading system configuration:', error);
    }
    
    // Listen for configuration changes
    setupConfigurationChangeListener();
}

function applyUIConfiguration() {
    const moveCounterElement = document.getElementById('moveCounter');
    const timerElement = document.getElementById('timer');
    
    if (moveCounterElement) {
        moveCounterElement.style.display = gameConfig.showMoveCounter ? 'block' : 'none';
    }
    
    if (timerElement) {
        timerElement.style.display = gameConfig.showTimer ? 'block' : 'none';
    }
}

function setupTimeLimit() {
    if (gameConfig.timeLimit <= 0) return;
    
    const timeLimit = gameConfig.timeLimit * 60; // Convert minutes to seconds
    let timeRemaining = timeLimit;
    let timeLimitInterval;
    
    // Start time limit when game starts
    const originalStartGame = window.startGame;
    window.startGame = function() {
        originalStartGame();
        
        timeRemaining = timeLimit;
        clearInterval(timeLimitInterval);
        
        timeLimitInterval = setInterval(() => {
            timeRemaining--;
            
            // Update timer display to show remaining time
            const timerElement = document.getElementById('timer');
            if (timerElement && gameConfig.showTimer) {
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                timerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
                
                // Change color when time is running out
                if (timeRemaining <= 30) {
                    timerElement.style.color = '#ef4444'; // Red
                } else if (timeRemaining <= 60) {
                    timerElement.style.color = '#f59e0b'; // Orange
                }
            }
            
            if (timeRemaining <= 0) {
                clearInterval(timeLimitInterval);
                handleTimeUp();
            }
        }, 1000);
    };
}

function handleTimeUp() {
    alert('Time\'s up! Game over.');
    
    // Record as incomplete game
    const currentTime = (Date.now() - gameStartTime) / 1000;
    recordGameStatistics(currentTime, moveCount, false);
    
    // Stop the game
    gameStarted = false;
    updateGameStatus('timeup');
}

function setupConfigurationChangeListener() {
    // Listen for configuration changes from admin panel
    window.addEventListener('storage', function(e) {
        if (e.key === 'fifteenPuzzleSystemConfig' || e.key === 'fifteenPuzzleConfigLastUpdate') {
            console.log('System configuration updated, reloading...');
            loadSystemConfiguration();
        }
    });
    
    // Listen for postMessage from admin panel
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'configurationUpdated') {
            console.log('Received configuration update notification, reloading...');
            loadSystemConfiguration();
        }
    });
}

// Override animation speed based on configuration
function getTileAnimationSpeed() {
    return gameConfig.animationSpeed;
}

// Check if current game meets optimal win criteria
function isOptimalWin(moves, timeInSeconds) {
    return moves <= gameConfig.maxMovesForWin;
}
