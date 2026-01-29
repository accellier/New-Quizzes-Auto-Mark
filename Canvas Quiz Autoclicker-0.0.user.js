// ==UserScript==
// @name         Canvas Quiz Autoclicker
// @match        https://*.instructure.com/courses/*/gradebook/speed_grader*
// @match        https://*.quiz-lti-syd-prod.instructure.com/*
// @grant        none
// @allFrames    true
// ==/UserScript==

(function() {
    'use strict';

    let isAutoMarking = false;
    let markCount = 0;
    let idleChecks = 0; // Track how many times we found nothing
    const IDLE_LIMIT = 3; // Stop after x failed attempts to find a button
    const CLICK_DELAY = 50;
    const TARGET_TEXT = "toggle correct on";

    function updateButtonUI() {
        const btn = document.getElementById('auto-mark-btn');
        if (!btn) return;

        if (isAutoMarking) {
            btn.innerHTML = `🛑 Stop (${markCount} Ticked)`;
            btn.style.backgroundColor = '#E62429';
        } else {
            btn.innerHTML = markCount > 0 ? `🚀 Start (Ticked: ${markCount})` : '🚀 Start Auto-Tick';
            btn.style.backgroundColor = '#03893d';
        }
    }

    function createUI() {
        if (window.self === window.top || document.getElementById('auto-mark-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'auto-mark-btn';
        btn.style = `
            position: fixed; bottom: 20px; right: 20px; z-index: 999999;
            color: white; padding: 12px 24px; border: 2px solid white;
            border-radius: 50px; cursor: pointer; font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4); font-family: sans-serif;
            transition: background-color 0.3s;
        `;

        btn.onclick = () => {
            isAutoMarking = !isAutoMarking;
            if (isAutoMarking) {
                idleChecks = 0; // Reset idle when starting
                attemptMarking();
            }
            updateButtonUI();
        };

        document.body.appendChild(btn);
        updateButtonUI();
    }

    function stopProcess() {
        console.log("Coding Partner: No more questions found. Auto-stopping.");
        isAutoMarking = false;
        updateButtonUI();
    }

    function attemptMarking() {
        if (!isAutoMarking) return;

        const xpath = `//span[text()='${TARGET_TEXT}']/ancestor::button`;
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const button = result.singleNodeValue;

        if (button) {
            const style = window.getComputedStyle(button);
            const isGreen = style.backgroundColor.includes('3, 137, 61') ||
                            style.backgroundColor.includes('rgb(0, 128, 0)');

            if (!isGreen && !button.dataset.processing) {
                idleChecks = 0; // We found something, reset idle count
                button.dataset.processing = "true";

                setTimeout(() => {
                    console.log(`Coding Partner: Marking #${markCount + 1}`);
                    ['mousedown', 'mouseup', 'click'].forEach(type => {
                        button.dispatchEvent(new MouseEvent(type, { bubbles: true, view: window }));
                    });

                    markCount++;
                    updateButtonUI();

                    setTimeout(() => { delete button.dataset.processing; }, 1000);
                }, CLICK_DELAY);
            }
        } else {
            // No button found on this scan
            idleChecks++;
            if (idleChecks >= IDLE_LIMIT) {
                stopProcess();
            }
        }
    }

    createUI();

    const observer = new MutationObserver(() => {
        if (isAutoMarking) {
            clearTimeout(window.markingDebounce);
            window.markingDebounce = setTimeout(attemptMarking, 200);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();