document.addEventListener('DOMContentLoaded', () => {
    const initialEmojis = ['😀', '😂', '🥳', '🤯', '😎', '🤑', '😱', '😈', '👻', '😊', '🤖', '👾'];
    let players = [];
    let currentPlayerIndex = 0;
    let roundCount = 0;
    let gameNValue = 3;
    let gameStarted = false;
    let targetPlayerForSelection = null;
    let awaitingPlayerClick = false;
    let lastEliminatedPlaceholder = null; // Variable to store the current placeholder element

    const nValueInput = document.getElementById('n_value');
    const startButton = document.getElementById('start_button');
    const circleContainer = document.querySelector('.circle-container');
    const roundCountDisplay = document.getElementById('round_count');
    const currentNValueDisplay = document.getElementById('current_n_value');
    const selectedEmojiDisplay = document.getElementById('selected_emoji');
    const gameStatusMessageDisplay = document.getElementById('game_status_message');
    
    // New DOM elements for animation
    const giantPistolElement = document.getElementById('giant_pistol_emoji');
    const bulletElement = document.getElementById('bullet_emoji');
    const speechBubbleTemplate = document.getElementById('speech_bubble_template');
    let activeSpeechBubble = null; // To manage existing bubble

    // Helper function to yield to the browser's next paint cycle
    function tick() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    function initializeGame() {
        gameNValue = parseInt(nValueInput.value) || 3;
        currentNValueDisplay.textContent = gameNValue;
        players = initialEmojis.map((emoji, index) => ({
            id: index,
            emoji: emoji, // Original emoji
            currentVisualEmoji: emoji, // Emoji currently displayed
            element: null,
            isEliminated: false
        }));
        currentPlayerIndex = 0;
        roundCount = 0;
        updateRoundDisplay();
        selectedEmojiDisplay.textContent = '---';
        gameStatusMessageDisplay.textContent = '设置N值,点击开始游戏!';
        awaitingPlayerClick = false;
        targetPlayerForSelection = null;
        gameStarted = true;
        startButton.textContent = '开始选择';
        startButton.disabled = false;
        giantPistolElement.classList.remove('visible');
        bulletElement.classList.remove('visible');
        if (activeSpeechBubble) {
            activeSpeechBubble.remove();
            activeSpeechBubble = null;
        }
        // Clear previous placeholder if any
        if (lastEliminatedPlaceholder) {
            lastEliminatedPlaceholder.remove();
            lastEliminatedPlaceholder = null;
        }
        renderPlayers();
    }

    function renderPlayers() {
        // Remove only existing emoji player elements, leaving other children (like placeholder) intact
        const existingPlayerElements = circleContainer.querySelectorAll('.emoji-player');
        existingPlayerElements.forEach(el => el.remove());

        const numTotalPlayers = players.length; // Still need this for angle calculation
        const radius = circleContainer.offsetWidth / 2 - 30;

        players.forEach((player, pIndex) => {
            // Calculate position for everyone for consistent circle regardless of elimination
            const angle = (pIndex / numTotalPlayers) * 2 * Math.PI - (Math.PI / 2);
            const x = radius * Math.cos(angle) + (circleContainer.offsetWidth / 2);
            const y = radius * Math.sin(angle) + (circleContainer.offsetHeight / 2);

            if (!player.isEliminated) { // Only create and append non-eliminated players
                const playerDiv = document.createElement('div');
                playerDiv.classList.add('emoji-player');
                playerDiv.textContent = player.currentVisualEmoji; 
                playerDiv.style.left = `${x - 25}px`;
                playerDiv.style.top = `${y - 25}px`;
                player.element = playerDiv; // Store reference to the new element

                // Clear any lingering animation classes from previous states if element is reused (though we recreate here)
                playerDiv.classList.remove('selected', 'hit-effect', 'fly-out', 'wiggle-error', 'shivering');

                if (awaitingPlayerClick) {
                    playerDiv.style.cursor = 'pointer';
                    playerDiv.addEventListener('click', () => handlePlayerClick(player), { once: true });
                } else {
                    playerDiv.style.cursor = 'default';
                }
                circleContainer.appendChild(playerDiv);
            } else {
                player.element = null; // Clear element reference if eliminated and not rendered
            }
        });
    }

    function updateRoundDisplay() {
        roundCountDisplay.textContent = roundCount;
    }

    function startSelectionPhase() {
        if (!gameStarted || awaitingPlayerClick) return;
        if (giantPistolElement.classList.contains('visible')) return; 

        gameNValue = parseInt(nValueInput.value) || 3;
        currentNValueDisplay.textContent = gameNValue;

        const activePlayers = players.filter(p => !p.isEliminated);
        if (activePlayers.length <= 1) {
            endGame(activePlayers.length > 0 ? activePlayers[0] : null);
            return;
        }

        roundCount++;
        updateRoundDisplay();

        players.forEach(p => {
            if (p.element && !p.isEliminated) {
                p.element.classList.remove('selected', 'wiggle-error', 'shivering', 'flipping');
                p.currentVisualEmoji = p.emoji; // Reset to original emoji if changed
                p.element.textContent = p.currentVisualEmoji;
            }
        });

        let currentOverallIndex = -1;
        let activePlayerCounter = 0;
        for (let i = 0; i < players.length; i++) {
            if (!players[i].isEliminated) {
                if (activePlayerCounter === currentPlayerIndex) {
                    currentOverallIndex = i;
                    break;
                }
                activePlayerCounter++;
            }
        }
        if (currentOverallIndex === -1 && activePlayers.length > 0) {
            currentOverallIndex = players.findIndex(p => !p.isEliminated);
            currentPlayerIndex = 0;
        }
        if (currentOverallIndex === -1) { endGame(null); return; }

        let stepsToTake = gameNValue;
        let searchIndex = currentOverallIndex;
        let countedActivePlayers = 0;

        while (countedActivePlayers < stepsToTake) {
            if (!players[searchIndex].isEliminated) {
                countedActivePlayers++;
            }
            if (countedActivePlayers < stepsToTake) {
                searchIndex = (searchIndex + 1) % players.length;
                while(players[searchIndex].isEliminated){
                     searchIndex = (searchIndex + 1) % players.length;
                }
            }
        }
        targetPlayerForSelection = players[searchIndex];

        awaitingPlayerClick = true;
        const startingPlayerEmoji = players[currentOverallIndex].emoji;
        selectedEmojiDisplay.innerHTML = `从 <strong style="color:blue;">${startingPlayerEmoji}</strong> 开始数 ${gameNValue} 个.`;
        gameStatusMessageDisplay.textContent = '请点击你认为会被选中的 Emoji!';
        startButton.disabled = true;
        startButton.textContent = '等待选择...';
        renderPlayers();
    }

    function showSpeechBubble(targetElement, message) {
        if (activeSpeechBubble) {
            activeSpeechBubble.remove(); // Remove previous bubble if any
        }

        activeSpeechBubble = speechBubbleTemplate.cloneNode(true);
        activeSpeechBubble.removeAttribute('id'); // Remove id from clone
        activeSpeechBubble.querySelector('.speech-bubble-text').textContent = message;
        
        document.body.appendChild(activeSpeechBubble); // Append to body to overlay correctly

        const targetRect = targetElement.getBoundingClientRect();
        const bubbleRect = activeSpeechBubble.getBoundingClientRect();

        // Position above the target element, centered
        let top = targetRect.top - bubbleRect.height - 15; // 15px above + tail
        let left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);

        // Adjust if bubble goes off-screen
        if (left < 0) left = 5;
        if (left + bubbleRect.width > window.innerWidth) left = window.innerWidth - bubbleRect.width - 5;
        if (top < 0) { // If not enough space above, position below
            top = targetRect.bottom + 15;
            activeSpeechBubble.classList.add('point-up');
        } else {
            activeSpeechBubble.classList.remove('point-up');
        }

        activeSpeechBubble.style.top = `${top + window.scrollY}px`; // Add scrollY for correct positioning in scrollable page
        activeSpeechBubble.style.left = `${left + window.scrollX}px`; // Add scrollX
        
        activeSpeechBubble.style.visibility = 'visible'; // Make it visible before adding class for transition
        requestAnimationFrame(() => { // Ensure visibility is set before class for transition
            activeSpeechBubble.classList.add('visible');
        });

        // Automatically hide after a few seconds
        setTimeout(() => {
            if (activeSpeechBubble) {
                activeSpeechBubble.classList.remove('visible');
                // Remove from DOM after transition
                setTimeout(() => {
                    if (activeSpeechBubble) activeSpeechBubble.remove();
                    activeSpeechBubble = null;
                }, 300); // Match CSS transition duration
            }
        }, 3000); // Bubble visible for 3 seconds
    }

    async function handlePlayerClick(clickedPlayer) {
        if (!awaitingPlayerClick || clickedPlayer.isEliminated || !clickedPlayer.element) return;

        if (clickedPlayer === targetPlayerForSelection) {
            awaitingPlayerClick = false;
            startButton.disabled = true; 
            
            players.forEach(p => p.element && p.element.classList.remove('selected'));
            clickedPlayer.element.classList.add('selected');

            await animateDetailedElimination(clickedPlayer);

            clickedPlayer.isEliminated = true;
            clickedPlayer.element.classList.add('eliminated'); 

            let nextStartSearchIndex = (players.indexOf(clickedPlayer) + 1) % players.length;
            while (players.filter(p => !p.isEliminated).length > 0 && players[nextStartSearchIndex].isEliminated ) {
                nextStartSearchIndex = (nextStartSearchIndex + 1) % players.length;
            }
            
            currentPlayerIndex = 0;
            let activeCount = 0;
            let foundNextStart = false;
            if (players.filter(p => !p.isEliminated).length > 0) {
                for(let i=0; i < players.length; i++) {
                    if (!players[i].isEliminated) {
                        if (i === nextStartSearchIndex) {
                            currentPlayerIndex = activeCount;
                            foundNextStart = true;
                            break;
                        }
                        activeCount++;
                    }
                }
                if (!foundNextStart) currentPlayerIndex = 0;
            }
            targetPlayerForSelection = null;

            const remainingPlayers = players.filter(p => !p.isEliminated);
            if (remainingPlayers.length <= 1) {
                endGame(remainingPlayers.length > 0 ? remainingPlayers[0] : null);
            } else {
                selectedEmojiDisplay.textContent = `${clickedPlayer.currentVisualEmoji} 已出局!`;
                gameStatusMessageDisplay.textContent = '准备下一轮选择...';
                setTimeout(() => {
                    if(gameStarted) startSelectionPhase(); 
                }, 1500); 
            }
        } else {
            // Incorrect click logic (already handles its own messages via speech bubble and status)
            const originalEmoji = clickedPlayer.emoji;
            clickedPlayer.currentVisualEmoji = '😡'; 
            if(clickedPlayer.element) clickedPlayer.element.textContent = clickedPlayer.currentVisualEmoji;
            showSpeechBubble(clickedPlayer.element, `点错了! 还不该轮到我!`);
            gameStatusMessageDisplay.textContent = '请从指定的起始Emoji再数一次!'; 
            if (clickedPlayer.element) {
                clickedPlayer.element.classList.add('wiggle-error');
                setTimeout(() => {
                    if (clickedPlayer.element) {
                        clickedPlayer.element.classList.remove('wiggle-error');
                        clickedPlayer.currentVisualEmoji = originalEmoji;
                        clickedPlayer.element.textContent = originalEmoji;
                    }
                }, 2800); 
            }
        }
    }

    async function animateDetailedElimination(player) {
        const victimElement = player.element;
        if (!victimElement) return;

        const victimOriginalLeft = victimElement.style.left;
        const victimOriginalTop = victimElement.style.top;

        startButton.disabled = true;
        gameStatusMessageDisplay.textContent = '正在淘汰中...'; 
        selectedEmojiDisplay.textContent = ' '; 

        // Yield to browser to paint the message update
        await tick(); 

        // Now remove the placeholder
        if (lastEliminatedPlaceholder) { 
            lastEliminatedPlaceholder.remove();
            lastEliminatedPlaceholder = null; 
        }

        const playerRect = victimElement.getBoundingClientRect();
        
        let pistolActualWidth = giantPistolElement.offsetWidth;
        let pistolActualHeight = giantPistolElement.offsetHeight;
        if (pistolActualWidth === 0) pistolActualWidth = 96; 
        if (pistolActualHeight === 0) pistolActualHeight = 96; 

        const targetPistolVisualRight_viewport = playerRect.left - 50; 
        const targetPistolStyleLeft_viewport = targetPistolVisualRight_viewport - pistolActualWidth; 
        const targetPistolCenterY_viewport = playerRect.top + playerRect.height / 2;

        giantPistolElement.style.top = `${targetPistolCenterY_viewport}px`;
        giantPistolElement.style.left = `${targetPistolStyleLeft_viewport}px`;
        giantPistolElement.style.transform = 'translateY(-50%) scaleX(-1) rotate(0deg)'; 

        giantPistolElement.classList.add('visible'); 
        victimElement.classList.add('shivering');
        victimElement.classList.add('selected'); 
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        victimElement.classList.remove('shivering');

        const pistolRect = giantPistolElement.getBoundingClientRect();
        giantPistolElement.style.transform = 'translateY(-50%) scaleX(-1) translateX(20px) rotate(5deg)';
        await new Promise(resolve => setTimeout(resolve, 120)); 
        giantPistolElement.style.transform = 'translateY(-50%) scaleX(-1) translateX(0px) rotate(0deg)';
        
        bulletElement.style.top = `${playerRect.top + playerRect.height / 2 - bulletElement.offsetHeight / 2}px`; 
        bulletElement.style.left = `${playerRect.left - bulletElement.offsetWidth - 5}px`;
        bulletElement.classList.add('visible');
        
        const victimTargetCenterX_viewport = playerRect.left + playerRect.width / 2;
        const victimTargetCenterY_viewport = playerRect.top + playerRect.height / 2;
        const bulletCurrentLeft_viewport = parseFloat(bulletElement.style.left);
        const bulletCurrentTop_viewport = parseFloat(bulletElement.style.top);
        const translateX = victimTargetCenterX_viewport - bulletCurrentLeft_viewport - (bulletElement.offsetWidth / 2);
        const translateY = victimTargetCenterY_viewport - bulletCurrentTop_viewport - (bulletElement.offsetHeight / 2);
        bulletElement.style.transform = `translate(${translateX}px, ${translateY}px)`;
        await new Promise(resolve => setTimeout(resolve, 200)); 
        bulletElement.classList.remove('visible');
        bulletElement.style.transform = 'translate(0,0)'; 

        player.currentVisualEmoji = '😫'; // Set to 😫 as per user's preference
        victimElement.textContent = player.currentVisualEmoji;
        victimElement.classList.add('hit-effect'); 
        await new Promise(resolve => setTimeout(resolve, 400)); 
        victimElement.classList.remove('hit-effect');

        // --- 5. Flip Upside Down (REMOVED) ---
        // victimElement.classList.add('flipping');
        // await new Promise(resolve => setTimeout(resolve, 400)); 

        // --- 6. Fly Out --- 
        const flyX = (Math.random() - 0.5) * 2 * 250;
        const flyY = -200 - Math.random() * 150;
        victimElement.style.setProperty('--flyout-x', `${flyX}px`);
        victimElement.style.setProperty('--flyout-y', `${flyY}px`);
        victimElement.classList.add('fly-out');

        // --- Smoke Trail Generation ---
        const smokeInterval = 80; 
        const flyOutDuration = 1000; 
        let smokeTimer = 0;
        const smokePuffParent = circleContainer; 

        const smokeIntervalId = setInterval(() => {
            if (smokeTimer >= flyOutDuration) {
                clearInterval(smokeIntervalId);
                return;
            }
            const puff = document.createElement('div');
            puff.classList.add('smoke-puff');
            const victimRectNow = victimElement.getBoundingClientRect(); 
            const parentRect = smokePuffParent.getBoundingClientRect();
            let puffLeft = victimRectNow.left + (victimRectNow.width / 2) - 10; 
            let puffTop = victimRectNow.top + (victimRectNow.height / 2) - 10; 
            if (smokePuffParent !== document.body) {
                puffLeft -= parentRect.left;
                puffTop -= parentRect.top;
            }
            puff.style.left = `${puffLeft}px`;
            puff.style.top = `${puffTop}px`;
            smokePuffParent.appendChild(puff);
            setTimeout(() => { puff.remove(); }, 800);
            smokeTimer += smokeInterval;
        }, smokeInterval);
        // --- End Smoke Trail Generation ---
        
        await new Promise(resolve => setTimeout(resolve, flyOutDuration)); 
        
        victimElement.style.visibility = 'hidden'; 
        victimElement.classList.remove('flipping', 'fly-out', 'selected');

        giantPistolElement.classList.remove('visible');
        giantPistolElement.style.left = '-150px'; 
        giantPistolElement.style.top = '50%';
        giantPistolElement.style.transform = 'translateY(-50%) scaleX(-1) rotate(0deg)';

        // --- Create NEW placeholder AFTER victim has flown away ---
        lastEliminatedPlaceholder = document.createElement('div');
        lastEliminatedPlaceholder.classList.add('eliminated-player-placeholder');
        lastEliminatedPlaceholder.style.left = victimOriginalLeft; 
        lastEliminatedPlaceholder.style.top = victimOriginalTop;   
        circleContainer.prepend(lastEliminatedPlaceholder); 

        const remainingPlayers = players.filter(p => !p.isEliminated);
        if (remainingPlayers.length > 1) {
            // gameStatusMessageDisplay.textContent will be updated by startSelectionPhase 
            // or by the timeout leading to it in handlePlayerClick
        } else {
            // endGame will set the final status message
        }
    }

    function endGame(winner) {
        awaitingPlayerClick = false;
        gameStarted = false; // Crucial to allow restart
        giantPistolElement.classList.remove('visible');
        bulletElement.classList.remove('visible');

        if (winner && winner.element) {
            gameStatusMessageDisplay.textContent = `游戏结束! 胜利者是: ${winner.emoji}`;
            players.forEach(p => {
                if (p.element) {
                    p.element.classList.remove('selected', 'eliminated', 'shivering', 'flipping', 'hit-effect', 'fly-out');
                    p.currentVisualEmoji = p.emoji; // Reset visual
                    p.element.textContent = p.currentVisualEmoji;
                    p.element.style.visibility = p.isEliminated && p !== winner ? 'hidden' : 'visible';
                }
            });
            winner.element.style.visibility = 'visible';
            winner.element.classList.add('selected');
        } else {
            gameStatusMessageDisplay.textContent = '游戏结束! 没有胜利者。';
        }
        startButton.disabled = false;
        startButton.textContent = '重新开始';
        targetPlayerForSelection = null;
        // renderPlayers(); // Render to clean up states if needed, though endgame might be enough
    }

    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            initializeGame();
            startSelectionPhase(); 
        } else if (!awaitingPlayerClick && !giantPistolElement.classList.contains('visible')) {
            // This condition might be redundant if button is always disabled during animation
            startSelectionPhase();
        }
    });

    nValueInput.addEventListener('change', () => {
        gameNValue = parseInt(nValueInput.value) || 3;
        currentNValueDisplay.textContent = gameNValue;
        if (awaitingPlayerClick) {
            gameStatusMessageDisplay.textContent = `N值将在下次选择时更新为 ${gameNValue}.`;
        } else if (gameStarted) {
            gameStatusMessageDisplay.textContent = `N值已更新为 ${gameNValue} (将在下一轮生效).`;
        }
    });

    initializeGame();
    gameStarted = false; 
    startButton.textContent = '开始游戏';
    selectedEmojiDisplay.textContent = '---';
    gameStatusMessageDisplay.textContent = '设置N值, 点击开始游戏!';
    renderPlayers(); 

    window.addEventListener('resize', () => {
        if (players.length > 0 && !awaitingPlayerClick && !giantPistolElement.classList.contains('visible')) {
             renderPlayers();
        }
    });
}); 