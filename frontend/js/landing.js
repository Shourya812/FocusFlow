
/* =========================================================
   FOCUSFLOW LANDING PAGE JAVASCRIPT
   ========================================================= */


/* =========================================================
   1. SMOOTH SCROLLING
   ========================================================= */

const scrollLinks = document.querySelectorAll(
    'a[href^="#"]'
);


scrollLinks.forEach(function (link) {

    link.addEventListener("click", function (event) {

        const targetId =
            link.getAttribute("href");


        if (targetId === "#") {
            return;
        }


        const targetSection =
            document.querySelector(targetId);


        if (!targetSection) {
            return;
        }


        event.preventDefault();


        targetSection.scrollIntoView({
            behavior: "smooth"
        });

    });

});


/* =========================================================
   2. SCROLL REVEAL
   ========================================================= */

const revealElements = document.querySelectorAll(
    ".value-card, " +
    ".product-feature, " +
    ".step, " +
    ".feedback-section, " +
    ".final-cta"
);


revealElements.forEach(function (element) {

    element.classList.add("reveal");

});


const revealObserver =
    new IntersectionObserver(
        function (entries, observer) {

            entries.forEach(function (entry) {

                if (!entry.isIntersecting) {
                    return;
                }


                entry.target.classList.add("show");


                observer.unobserve(
                    entry.target
                );

            });

        },
        {
            threshold: 0.12
        }
    );


revealElements.forEach(function (element) {

    revealObserver.observe(element);

});


/* =========================================================
   3. HERO PRODUCT SCROLL MOVEMENT
   ========================================================= */

const heroProduct =
    document.querySelector(".hero-product");


if (heroProduct) {

    window.addEventListener(
        "scroll",
        function () {

            const scrollAmount =
                window.scrollY;


            if (scrollAmount > 500) {
                return;
            }


            const movement =
                scrollAmount * 0.025;


            heroProduct.style.transform =
                "translateY(" +
                movement +
                "px)";

        }
    );

}


/* =========================================================
   4. HERO PRODUCT MOUSE EFFECT
   ========================================================= */

const productWindow =
    document.querySelector(".product-window");


if (productWindow) {

    productWindow.addEventListener(
        "mousemove",
        function (event) {

            const rectangle =
                productWindow.getBoundingClientRect();


            const mouseX =
                event.clientX -
                rectangle.left;


            const mouseY =
                event.clientY -
                rectangle.top;


            const centerX =
                rectangle.width / 2;


            const centerY =
                rectangle.height / 2;


            const rotateY =
                ((mouseX - centerX) / centerX) * 2;


            const rotateX =
                ((mouseY - centerY) / centerY) * -2;


            productWindow.style.transform =
                "perspective(1000px) " +
                "rotateY(" +
                rotateY +
                "deg) " +
                "rotateX(" +
                rotateX +
                "deg)";

        }
    );


    productWindow.addEventListener(
        "mouseleave",
        function () {

            productWindow.style.transform =
                "perspective(1000px) " +
                "rotateY(-3deg) " +
                "rotateX(2deg)";

        }
    );

}


/* =========================================================
   5. HERO TASK INTERACTION
   ========================================================= */

const previewTasks =
    document.querySelectorAll(
        ".preview-task"
    );


previewTasks.forEach(function (task) {

    task.addEventListener(
        "click",
        function () {

            const circle =
                task.querySelector(
                    ".task-circle"
                );


            if (!circle) {
                return;
            }


            task.classList.toggle(
                "completed"
            );


            if (
                task.classList.contains(
                    "completed"
                )
            ) {

                circle.classList.remove(
                    "task-circle"
                );

                circle.classList.add(
                    "task-check"
                );

                circle.textContent = "✓";

            } else {

                circle.classList.remove(
                    "task-check"
                );

                circle.classList.add(
                    "task-circle"
                );

                circle.textContent = "";

            }

        }
    );

});


/* =========================================================
   6. MINI TASK INTERACTION
   ========================================================= */

const miniTasks =
    document.querySelectorAll(
        ".mini-task"
    );


miniTasks.forEach(function (task) {

    task.addEventListener(
        "click",
        function () {

            const circle =
                task.querySelector(
                    ".mini-circle"
                );


            if (!circle) {
                return;
            }


            task.classList.toggle(
                "done"
            );


            if (
                task.classList.contains(
                    "done"
                )
            ) {

                circle.classList.remove(
                    "mini-circle"
                );

                circle.classList.add(
                    "mini-check"
                );

                circle.textContent = "✓";

            } else {

                circle.classList.remove(
                    "mini-check"
                );

                circle.classList.add(
                    "mini-circle"
                );

                circle.textContent = "";

            }

        }
    );

});


/* =========================================================
   7. PRODUCTIVITY GRAPH
   ========================================================= */

const chartBars =
    document.querySelectorAll(
        ".chart-bar"
    );


chartBars.forEach(function (bar) {

    const value =
        bar.getAttribute("data-value");


    const barValue =
        bar.querySelector("span");


    if (!barValue) {
        return;
    }


    barValue.style.setProperty(
        "--bar-height",
        value
    );

});


/* =========================================================
   8. FOCUS TIMER DEMO
   ========================================================= */

const timerPauseButton =
    document.querySelector(
        '[data-timer-action="pause"]'
    );


const timerResetButton =
    document.querySelector(
        '[data-timer-action="reset"]'
    );


const timerDisplay =
    document.querySelector(
        ".timer-inner strong"
    );


let timerSeconds = 24 * 60 + 32;

let timerRunning = true;

let timerInterval = null;


/* Format seconds as MM:SS */

function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);


    const remainingSeconds =
        seconds % 60;


    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );

}


/* Update timer text */

function updateTimerDisplay() {

    if (!timerDisplay) {
        return;
    }


    timerDisplay.textContent =
        formatTime(timerSeconds);

}


/* Start timer */

function startTimer() {

    if (timerInterval) {
        return;
    }


    timerRunning = true;


    timerInterval =
        setInterval(
            function () {

                if (timerSeconds <= 0) {

                    clearInterval(
                        timerInterval
                    );

                    timerInterval = null;

                    timerRunning = false;

                    return;

                }


                timerSeconds--;

                updateTimerDisplay();

            },
            1000
        );

}


/* Pause / resume */

if (timerPauseButton) {

    timerPauseButton.addEventListener(
        "click",
        function () {

            if (timerRunning) {

                clearInterval(
                    timerInterval
                );

                timerInterval = null;

                timerRunning = false;

                timerPauseButton.textContent =
                    "▶";

            } else {

                startTimer();

                timerPauseButton.textContent =
                    "II";

            }

        }
    );

}


/* Reset timer */

if (timerResetButton) {

    timerResetButton.addEventListener(
        "click",
        function () {

            clearInterval(
                timerInterval
            );

            timerInterval = null;

            timerSeconds =
                24 * 60 + 32;

            timerRunning = true;

            updateTimerDisplay();

            timerPauseButton.textContent =
                "II";

            startTimer();

        }
    );

}


updateTimerDisplay();

startTimer();


/* =========================================================
   9. ACTIVE NAVIGATION
   ========================================================= */

const pageSections =
    document.querySelectorAll(
        "#product, #how-it-works, #feedback"
    );


const navigationLinks =
    document.querySelectorAll(
        ".landing-nav a"
    );


const navigationObserver =
    new IntersectionObserver(
        function (entries) {

            entries.forEach(function (entry) {

                if (!entry.isIntersecting) {
                    return;
                }


                navigationLinks.forEach(
                    function (link) {

                        link.classList.remove(
                            "active"
                        );

                    }
                );


                const activeLink =
                    document.querySelector(
                        '.landing-nav a[href="#' +
                        entry.target.id +
                        '"]'
                    );


                if (activeLink) {

                    activeLink.classList.add(
                        "active"
                    );

                }

            });

        },
        {
            threshold: 0.45
        }
    );


pageSections.forEach(function (section) {

    navigationObserver.observe(
        section
    );

});


/* =========================================================
   10. BUTTON PRESS EFFECT
   ========================================================= */

const buttons =
    document.querySelectorAll(
        ".hero-primary-button, " +
        ".hero-secondary-button, " +
        ".signup-button, " +
        ".feedback-button"
    );


buttons.forEach(function (button) {

    button.addEventListener(
        "mousedown",
        function () {

            button.style.transform =
                "scale(0.97)";

        }
    );


    button.addEventListener(
        "mouseup",
        function () {

            button.style.transform = "";

        }
    );


    button.addEventListener(
        "mouseleave",
        function () {

            button.style.transform = "";

        }
    );

});


/* =========================================================
   11. FEEDBACK BUTTON
   ========================================================= */

const feedbackButton =
    document.querySelector(
        ".feedback-button"
    );


if (feedbackButton) {

    feedbackButton.addEventListener(
        "click",
        function () {

            const originalText =
                feedbackButton.innerHTML;


            feedbackButton.innerHTML =
                "Opening email...";


            setTimeout(
                function () {

                    feedbackButton.innerHTML =
                        originalText;

                },
                1800
            );

        }
    );

}


/* =========================================================
   12. PAGE LOADED
   ========================================================= */

window.addEventListener(
    "load",
    function () {

        document.body.classList.add(
            "page-loaded"
        );

    }
);
