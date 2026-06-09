// =====================================================
// PetrolSA – Main Application Logic
// =====================================================

let priceData = [];
let currentRegion = "inland";
let priceChart = null;

// Month name helpers
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// =====================================================
// 1. Load JSON Data & Initialise
// =====================================================
async function loadPrices() {
    try {
        const response = await fetch("data/petrol-prices.json");
        priceData = await response.json();

        renderHeroPrices();
        renderChart();
        updateCountdown();
    } catch (error) {
        console.error("Error loading JSON:", error);
    }
}

loadPrices();

// =====================================================
// 2. Render Hero Section Prices
// =====================================================
function getLatestEntries(region) {
    // Filter entries for the given region, sort descending by date
    const regionEntries = priceData.filter((e) => e.region === region).sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
        current: regionEntries[0] || null,
        previous: regionEntries[1] || null,
    };
}

function renderHeroPrices() {
    const { current, previous } = getLatestEntries(currentRegion);
    if (!current) return;

    const priceCards = document.querySelectorAll(".price-card");

    // Map: card index → { key, label }
    const cardMap = [
        { key: "petrol95", label: "Petrol 95" },
        { key: "petrol93", label: "Petrol 93" },
        { key: "diesel50", label: "Diesel 50ppm" },
        { key: "diesel500", label: "Diesel 500ppm" },
    ];

    cardMap.forEach((item, i) => {
        if (!priceCards[i]) return;

        const card = priceCards[i];
        const price = current.prices[item.key];
        const prevPrice = previous ? previous.prices[item.key] : null;
        const diff = prevPrice !== null ? price - prevPrice : 0;
        const absDiff = Math.abs(diff).toFixed(2);

        // Get previous month name
        const prevMonthName = previous ? MONTH_NAMES[new Date(previous.date).getMonth()] : "";

        // Update caption
        card.querySelector(".price-caption").textContent = item.label;

        // Update price heading
        card.querySelector(".price-heading").innerHTML = `R${price.toFixed(2)} <span class="price-per-litre">/litre</span>`;

        // Update price change badge
        const existingBadge = card.querySelector(".price-change-up, .price-change-down");
        if (existingBadge) {
            if (diff > 0) {
                existingBadge.className = "price-change-up";
                existingBadge.textContent = `↑ R${absDiff} from ${prevMonthName}`;
            } else if (diff < 0) {
                existingBadge.className = "price-change-down";
                existingBadge.textContent = `↓ R${absDiff} from ${prevMonthName}`;
            } else {
                existingBadge.className = "price-change-down";
                existingBadge.textContent = `No change from ${prevMonthName}`;
            }
        }
    });

    // Update the "Effective" date text (first Wednesday of the month)
    const heroText = document.querySelector(".hero-text");
    if (heroText && current.date) {
        const d = new Date(current.date);
        const firstWed = getFirstWednesday(d.getFullYear(), d.getMonth());
        heroText.textContent = `Effective ${firstWed.getDate()} ${MONTH_NAMES[firstWed.getMonth()]} ${firstWed.getFullYear()}`;
    }
}

// =====================================================
// 3. Region Toggle (Inland / Coastal)
// =====================================================
const regionBtns = document.querySelectorAll(".region-btn");

regionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        // Don't do anything if already active
        if (btn.classList.contains("active")) return;

        // Swap active class
        regionBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Update current region
        currentRegion = btn.textContent.trim().toLowerCase();

        // Re-render prices & chart
        renderHeroPrices();
        renderChart();
    });
});

// =====================================================
// 4. Price Trend Chart (Chart.js)
// =====================================================
function getChartData(fuelKey) {
    // Get the last 12 months of data for both regions
    const inlandEntries = priceData
        .filter((e) => e.region === "inland")
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-12);

    const coastalEntries = priceData
        .filter((e) => e.region === "coastal")
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-12);

    const labels = inlandEntries.map((e) => {
        const d = new Date(e.date);
        return `${MONTH_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    });

    const inlandPrices = inlandEntries.map((e) => e.prices[fuelKey]);
    const coastalPrices = coastalEntries.map((e) => e.prices[fuelKey]);

    return { labels, inlandPrices, coastalPrices };
}

function renderChart() {
    const canvas = document.getElementById("price-trend-canvas");
    if (!canvas) return;

    const fuelSelect = document.getElementById("fuel");
    const fuelKey = fuelSelectValueToKey(fuelSelect.value);
    const { labels, inlandPrices, coastalPrices } = getChartData(fuelKey);

    // Destroy old chart if it exists
    if (priceChart) {
        priceChart.destroy();
    }

    const ctx = canvas.getContext("2d");

    priceChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Inland",
                    data: inlandPrices,
                    borderColor: "#FF4D00",
                    backgroundColor: "rgba(255, 77, 0, 0.1)",
                    borderWidth: 2.5,
                    pointBackgroundColor: "#FF4D00",
                    pointBorderColor: "#FF4D00",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    fill: true,
                },
                {
                    label: "Coastal",
                    data: coastalPrices,
                    borderColor: "rgba(255, 77, 0, 0.5)",
                    backgroundColor: "rgba(255, 77, 0, 0.03)",
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointBackgroundColor: "rgba(255, 77, 0, 0.5)",
                    pointBorderColor: "rgba(255, 77, 0, 0.5)",
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.3,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: "index",
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    align: "end",
                    labels: {
                        color: "rgba(255, 255, 255, 0.75)",
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 20,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12,
                        },
                    },
                },
                tooltip: {
                    backgroundColor: "rgba(13, 13, 13, 0.95)",
                    titleColor: "#ffffff",
                    bodyColor: "rgba(255, 255, 255, 0.75)",
                    borderColor: "rgba(255, 77, 0, 0.3)",
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        family: "'Inter', sans-serif",
                        weight: "600",
                    },
                    bodyFont: {
                        family: "'Inter', sans-serif",
                    },
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: R${context.parsed.y.toFixed(2)}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: "rgba(255, 255, 255, 0.5)",
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11,
                        },
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.05)",
                    },
                },
                y: {
                    ticks: {
                        color: "rgba(255, 255, 255, 0.5)",
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11,
                        },
                        callback: function (value) {
                            return "R" + value.toFixed(0);
                        },
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.05)",
                    },
                },
            },
        },
    });
}

// Fuel select value → JSON key mapping
function fuelSelectValueToKey(value) {
    const map = {
        "petrol-95": "petrol95",
        "petrol-93": "petrol93",
        "diesel-50ppm": "diesel50",
        "diesel-500ppm": "diesel500",
    };
    return map[value] || "petrol95";
}

// Listen for fuel type change on chart dropdown
const fuelSelect = document.getElementById("fuel");
if (fuelSelect) {
    fuelSelect.addEventListener("change", () => {
        renderChart();
    });
}

// =====================================================
// 5. Calculator
// =====================================================
const calculatorForm = document.getElementById("calculator-form");

if (calculatorForm) {
    calculatorForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const fuelType = document.getElementById("fuel-type").value;
        const region = document.getElementById("region").value;
        const distance = parseFloat(document.getElementById("distance").value);
        const consumption = parseFloat(document.getElementById("consumption").value);

        if (isNaN(distance) || isNaN(consumption) || distance <= 0 || consumption <= 0) {
            return;
        }

        const fuelKey = fuelSelectValueToKey(fuelType);
        const { current, previous } = getLatestEntries(region);

        if (!current) return;

        const currentPrice = current.prices[fuelKey];
        const litresNeeded = distance * (consumption / 100);
        const currentCost = litresNeeded * currentPrice;

        // Calculate previous month cost for comparison
        let diffAmount = 0;
        let diffText = "";

        if (previous) {
            const prevPrice = previous.prices[fuelKey];
            const prevCost = litresNeeded * prevPrice;
            diffAmount = currentCost - prevCost;

            const absDiff = Math.abs(diffAmount).toFixed(2);
            if (diffAmount > 0) {
                diffText = `R${absDiff} more than last month`;
            } else if (diffAmount < 0) {
                diffText = `R${absDiff} less than last month`;
            } else {
                diffText = "Same as last month";
            }
        }

        // Format cost with commas
        const formattedCost =
            "R" +
            currentCost.toLocaleString("en-ZA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

        // Update the results display
        const costContainer = document.querySelector(".calculated-cost");
        const costAmount = document.querySelector(".calculated-cost-amount");
        const costDifference = document.querySelector(".calculated-cost-difference");

        if (costContainer && costAmount) {
            costAmount.textContent = formattedCost;
            if (costDifference) {
                costDifference.textContent = diffText;
            }
            costContainer.style.display = "flex";
        }
    });
}

// =====================================================
// 6. Countdown to Next Price Change
// =====================================================
function getFirstWednesday(year, month) {
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const daysUntilWed = (3 - dayOfWeek + 7) % 7;
    return new Date(year, month, 1 + daysUntilWed);
}

function updateCountdown() {
    const countdownSpan = document.querySelector(".price-countdown-number");
    if (!countdownSpan) return;

    const now = new Date();
    // Next price change is the 1st Wednesday of the next month
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() + 1;

    if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
    }

    const firstWednesday = getFirstWednesday(targetYear, targetMonth);

    // Normalise to midnight for accurate day difference
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = firstWednesday.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    countdownSpan.textContent = `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}

// =====================================================
// 7. Alerts Form Validation
// =====================================================

const alertsForm = document.getElementById("alerts-form");
const alertsSubmitBtn = document.getElementById("alerts-submit-btn");
const formSuccess = document.getElementById("form-success");

// Regex patterns
const EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
// SA phone: 10 digits starting with 0, or 11 digits starting with 27, with optional + prefix. Allows spaces, hyphens, parentheses.
const SA_PHONE_REGEX = /^(?:\+?27|0)\d{9}$/;

// Validation config
const NAME_MIN = 2;
const NAME_MAX = 50;

// Track submission state
let isSubmitting = false;

/**
 * Sanitise input — trim whitespace and strip HTML tags
 */
function sanitise(str) {
    return str.trim().replace(/<[^>]*>/g, "");
}

/**
 * Strip all non-digit characters from a string
 */
function stripNonDigits(str) {
    return str.replace(/[^\d]/g, "");
}

/**
 * Convert any SA phone number format to international: +27XXXXXXXXX
 * Accepts: 082 123 4567, 0821234567, +27821234567, 27821234567, 082-123-4567, (082) 123 4567
 * Returns the formatted number or null if invalid
 */
function formatSAPhone(raw) {
    // Strip everything except digits and leading +
    let cleaned = raw.trim();
    const hasPlus = cleaned.startsWith("+");
    cleaned = stripNonDigits(cleaned);

    // Handle different prefixes
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        // Local format: 0821234567 → +27821234567
        return "+27" + cleaned.substring(1);
    } else if (cleaned.startsWith("27") && cleaned.length === 11) {
        // International without +: 27821234567 → +27821234567
        return "+" + cleaned;
    } else if (hasPlus && cleaned.startsWith("27") && cleaned.length === 11) {
        // International with +: +27821234567
        return "+" + cleaned;
    }

    return null; // Invalid format
}

/**
 * Show an error for a specific field
 */
function showFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.add("input-error");
    if (error) {
        error.textContent = message;
        error.classList.add("visible");
    }
}

/**
 * Clear the error for a specific field
 */
function clearFieldError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.remove("input-error");
    if (error) {
        error.textContent = "";
        error.classList.remove("visible");
    }
}

/**
 * Clear all form errors
 */
function clearAllErrors() {
    clearFieldError("name", "name-error");
    clearFieldError("email", "email-error");
    clearFieldError("whatsapp", "whatsapp-error");
}

/**
 * Validate the full form — returns true if valid
 */
function validateAlertsForm() {
    let isValid = true;
    clearAllErrors();

    // --- Honeypot check ---
    const honeypot = document.getElementById("website");
    if (honeypot && honeypot.value.trim() !== "") {
        // Silently reject — don't give bots feedback
        return false;
    }

    // --- Name validation ---
    const nameInput = document.getElementById("name");
    const nameValue = sanitise(nameInput.value);

    if (!nameValue) {
        showFieldError("name", "name-error", "Full name is required.");
        isValid = false;
    } else if (nameValue.length < NAME_MIN) {
        showFieldError("name", "name-error", `Name must be at least ${NAME_MIN} characters.`);
        isValid = false;
    } else if (nameValue.length > NAME_MAX) {
        showFieldError("name", "name-error", `Name must be ${NAME_MAX} characters or fewer.`);
        isValid = false;
    }

    // --- Email validation ---
    const emailInput = document.getElementById("email");
    const emailValue = sanitise(emailInput.value);

    if (!emailValue) {
        showFieldError("email", "email-error", "Email address is required.");
        isValid = false;
    } else if (!EMAIL_REGEX.test(emailValue)) {
        showFieldError("email", "email-error", "Please enter a valid email address.");
        isValid = false;
    }

    // --- WhatsApp validation (optional) ---
    const whatsappInput = document.getElementById("whatsapp");
    const whatsappRaw = sanitise(whatsappInput.value);

    if (whatsappRaw) {
        const formatted = formatSAPhone(whatsappRaw);
        if (!formatted) {
            showFieldError("whatsapp", "whatsapp-error", "Please enter a valid SA phone number (e.g. 082 123 4567).");
            isValid = false;
        } else {
            // Replace the input value with the formatted international number
            whatsappInput.value = formatted;
        }
    }

    // Focus the first field with an error
    if (!isValid) {
        const firstError = document.querySelector(".alerts-container .input-error");
        if (firstError) firstError.focus();
    }

    return isValid;
}

// --- Form submission ---
if (alertsForm) {
    alertsForm.addEventListener("submit", function (e) {
        e.preventDefault();

        // Prevent double submission
        if (isSubmitting) return;

        const isValid = validateAlertsForm();
        if (!isValid) return;

        // Disable button and mark as submitting
        isSubmitting = true;
        if (alertsSubmitBtn) {
            alertsSubmitBtn.disabled = true;
            alertsSubmitBtn.textContent = "Submitting...";
        }

        // --------------------------------------------------
        // Submit to Google Apps Script → Google Sheets
        // --------------------------------------------------
        const SCRIPT_URL =
            "https://script.google.com/macros/s/AKfycbz9xsc1f8Wh7kOGpnwVchkM5ylmtRmCHAzeZFjtDFsuzjBpalmj2czhzezBAfDYYcYadw/exec";

        const payload = JSON.stringify({
            name: sanitise(document.getElementById("name").value),
            email: sanitise(document.getElementById("email").value),
            whatsapp: document.getElementById("whatsapp").value.trim(),
        });

        fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: payload,
        })
            .then(() => {
                // no-cors gives an opaque response (can't read body),
                // but if fetch resolves the data was sent successfully
                handleSuccess();
            })
            .catch((err) => {
                handleFailure(err.message || "Something went wrong. Please try again.");
            });
    });

    // Clear individual field errors when the user starts correcting
    ["name", "email", "whatsapp"].forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", () => {
                clearFieldError(id, `${id}-error`);
            });
        }
    });
}

/**
 * Handle successful form submission
 */
function handleSuccess() {
    isSubmitting = false;

    // Hide the form, show success message
    if (alertsForm) alertsForm.style.display = "none";
    if (formSuccess) formSuccess.classList.add("visible");
}

/**
 * Handle failed form submission
 */
function handleFailure(message) {
    isSubmitting = false;

    if (alertsSubmitBtn) {
        alertsSubmitBtn.disabled = false;
        alertsSubmitBtn.textContent = "Sign Up For Alerts";
    }

    // Show a generic error under the submit button
    showFieldError("whatsapp", "whatsapp-error", message);
}
