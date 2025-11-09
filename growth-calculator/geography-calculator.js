// geography-calculator.js

/**
 * Calculates population density and provides an interpretation.
 * @param {number} population - The total population of the area.
 * @param {number} area_sq_km - The area in square kilometers.
 * @returns {object} An object containing the density and its interpretation.
 */
function calculatePopulationDensity(population, area_sq_km) {
    if (area_sq_km <= 0) {
        return {
            density: 0,
            interpretation: "Area must be greater than zero."
        };
    }

    const density = population / area_sq_km;
    let interpretation = "";

    if (density < 10) {
        interpretation = "Very low population density. This area is sparsely populated, suggesting vast open spaces, rural environments, or protected natural areas. It might indicate challenges in accessing services or a focus on agriculture/conservation.";
    } else if (density >= 10 && density < 50) {
        interpretation = "Low population density. This area is likely rural or suburban with a moderate amount of open land. It could support agricultural activities or offer a quieter lifestyle with more personal space.";
    } else if (density >= 50 && density < 200) {
        interpretation = "Moderate population density. This is typical for many suburban areas or smaller towns. There's a balance between developed areas and green spaces, with reasonable access to amenities.";
    } else if (density >= 200 && density < 1000) {
        interpretation = "High population density. This indicates an urban or densely populated suburban environment. Expect more infrastructure, services, and commercial activity, but also potentially higher living costs and less green space.";
    } else {
        interpretation = "Very high population density. This is characteristic of major cities or metropolitan centers. Such areas have extensive infrastructure, diverse economic opportunities, and a vibrant cultural scene, but also face challenges like congestion, pollution, and high demand for resources.";
    }

    return {
        density: density.toFixed(2),
        interpretation: interpretation
    };
}