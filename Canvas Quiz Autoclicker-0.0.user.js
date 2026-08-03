// ==UserScript==
// @name         Canvas Quiz – Award Full Credit Autoclicker
// @namespace    https://tampermonkey.net/
// @version      2.0
// @description  Automatically clicks each visible "Award full credit" button in Canvas New Quizzes.
// @match        https://*.instructure.com/courses/*/gradebook/speed_grader*
// @match        https://*.quiz-lti-*-prod.instructure.com/*
// @match        https://*.quiz-lti-syd-prod.instructure.com/*
// @grant        none
// @allFrames    true
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const TARGET_TEXT = 'award full credit';

    // Time between scans.
    const SCAN_DELAY = 100;

    // Stop after this many scans without finding another button.
    // At 350 ms per scan, 15 checks is approximately 5 seconds.
    const IDLE_LIMIT = 30;

    let isAutoMarking = false;
    let markCount = 0;
    let idleChecks = 0;
    let scanTimer = null;

    // Prevent the same unchanged button element being clicked repeatedly.
    let processedButtons = new WeakSet();
    let resetOnNextStart = true;

    function normaliseText(text) {
        return String(text || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function isVisible(element) {
        if (!element || element.getClientRects().length === 0) {
            return false;
        }

        const style = window.getComputedStyle(element);

        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
        );
    }

    function isEnabled(button) {
        return (
            !button.disabled &&
            button.getAttribute('aria-disabled') !== 'true'
        );
    }

    function getAwardCreditButton() {
        const buttons = document.querySelectorAll('button');

        for (const button of buttons) {
            const buttonText = normaliseText(button.textContent);

            if (
                buttonText === TARGET_TEXT &&
                isVisible(button) &&
                isEnabled(button) &&
                !processedButtons.has(button)
            ) {
                return button;
            }
        }

        return null;
    }

    function updateButtonUI() {
        const controlButton = document.getElementById('auto-mark-btn');

        if (!controlButton) {
            return;
        }

        if (isAutoMarking) {
            controlButton.textContent = `■ Stop — ${markCount} processed`;
            controlButton.style.backgroundColor = '#e62429';
        } else if (markCount > 0) {
            controlButton.textContent = `▶ Start again — ${markCount} processed`;
            controlButton.style.backgroundColor = '#03893d';
        } else {
            controlButton.textContent = '▶ Check all';
            controlButton.style.backgroundColor = '#03893d';
        }
    }

    function scheduleNextScan(delay = SCAN_DELAY) {
        clearTimeout(scanTimer);

        if (isAutoMarking) {
            scanTimer = setTimeout(attemptMarking, delay);
        }
    }

    function stopProcess(message, completed = false) {
        isAutoMarking = false;
        clearTimeout(scanTimer);

        if (completed) {
            resetOnNextStart = true;
        }

        console.log(
            `Canvas Award Full Credit Autoclicker: ${message}`
        );

        updateButtonUI();
    }

    function attemptMarking() {
        if (!isAutoMarking) {
            return;
        }

        const button = getAwardCreditButton();

        if (!button) {
            idleChecks++;

            if (idleChecks >= IDLE_LIMIT) {
                stopProcess(
                    'No more Award full credit buttons were found.',
                    true
                );
            }

            scheduleNextScan();
            return;
        }

        idleChecks = 0;
        processedButtons.add(button);

        console.log(
            `Canvas Award Full Credit Autoclicker: Processing button ${markCount + 1}.`,
            button
        );

        try {
            // Canvas/React responds to the native button click.
            button.click();

            markCount++;
            updateButtonUI();
        } catch (error) {
            console.error(
                'Canvas Award Full Credit Autoclicker: The button could not be clicked.',
                error
            );
        }

        scheduleNextScan();
    }

    function startProcess() {
        if (resetOnNextStart) {
            markCount = 0;
            processedButtons = new WeakSet();
            resetOnNextStart = false;
        }

        isAutoMarking = true;
        idleChecks = 0;

        updateButtonUI();
        attemptMarking();
    }

    function createUI() {
        if (document.getElementById('auto-mark-btn')) {
            return;
        }

        /*
         * Do not put the control on the outer SpeedGrader page because
         * it cannot access the cross-origin quiz iframe.
         *
         * Unlike the old script, this still allows the control when the
         * quiz-lti page itself is the top-level page.
         */
        const isQuizLtiPage = location.hostname.includes('quiz-lti');

        if (window.self === window.top && !isQuizLtiPage) {
            return;
        }

        const controlButton = document.createElement('button');

        controlButton.id = 'auto-mark-btn';
        controlButton.type = 'button';

        controlButton.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 2147483647;
            min-width: 190px;
            padding: 12px 22px;
            border: 2px solid white;
            border-radius: 50px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.3;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            transition:
                background-color 0.2s ease,
                transform 0.1s ease;
        `;

        controlButton.addEventListener('mouseenter', () => {
            controlButton.style.transform = 'scale(1.03)';
        });

        controlButton.addEventListener('mouseleave', () => {
            controlButton.style.transform = 'scale(1)';
        });

        controlButton.addEventListener('click', () => {
            if (isAutoMarking) {
                stopProcess('Stopped manually.');
            } else {
                startProcess();
            }
        });

        document.body.appendChild(controlButton);
        updateButtonUI();
    }

    function initialise() {
        if (!document.body) {
            setTimeout(initialise, 100);
            return;
        }

        createUI();
    }

    initialise();
})();
