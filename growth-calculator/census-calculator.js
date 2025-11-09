// census-calculator.js

/**
 * Calculates population growth over a period.
 * @param {number} initialPopulation - The population at the beginning of the period.
 * @param {number} finalPopulation - The population at the end of the period.
 * @returns {number} Population growth as a percentage.
 */
function calculatePopulationGrowth(initialPopulation, finalPopulation) {
    if (initialPopulation === 0) {
        throw new Error("Initial population cannot be zero for growth calculation.");
    }
    return ((finalPopulation - initialPopulation) / initialPopulation) * 100;
}

/**
 * Calculates birth rate.
 * @param {number} liveBirths - Number of live births in a year.
 * @param {number} midYearPopulation - Mid-year population.
 * @returns {number} Birth rate per 1,000 people.
 */
function calculateBirthRate(liveBirths, midYearPopulation) {
    if (midYearPopulation <= 0) {
        throw new Error("Mid-year population must be greater than zero.");
    }
    return (liveBirths / midYearPopulation) * 1000;
}

/**
 * Calculates death rate.
 * @param {number} deaths - Number of deaths in a year.
 * @param {number} midYearPopulation - Mid-year population.
 * @returns {number} Death rate per 1,000 people.
 */
function calculateDeathRate(deaths, midYearPopulation) {
    if (midYearPopulation <= 0) {
        throw new Error("Mid-year population must be greater than zero.");
    }
    return (deaths / midYearPopulation) * 1000;
}

/**
 * Calculates net migration rate.
 * @param {number} immigrants - Number of immigrants.
 * @param {number} emigrants - Number of emigrants.
 * @param {number} midYearPopulation - Mid-year population.
 * @returns {number} Net migration rate per 1,000 people.
 */
function calculateNetMigrationRate(immigrants, emigrants, midYearPopulation) {
    if (midYearPopulation <= 0) {
        throw new Error("Mid-year population must be greater than zero.");
    }
    return ((immigrants - emigrants) / midYearPopulation) * 1000;
}

/**
 * Calculates dependency ratio.
 * @param {number} dependentPopulation - Population under 15 and over 64.
 * @param {number} workingAgePopulation - Population between 15 and 64.
 * @returns {number} Dependency ratio as a percentage.
 */
function calculateDependencyRatio(dependentPopulation, workingAgePopulation) {
    if (workingAgePopulation <= 0) {
        throw new Error("Working-age population must be greater than zero.");
    }
    return (dependentPopulation / workingAgePopulation) * 100;
}

// Export functions for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculatePopulationGrowth,
        calculateBirthRate,
        calculateDeathRate,
        calculateNetMigrationRate,
        calculateDependencyRatio
    };
}