 // Growth Rate Calculator Functions 
function calculateSimpleGrowthRate(oldValue, newValue) { 
if (oldValue === 0) { 
throw new Error("Old value cannot be zero for growth rate calculation"); 
} 
return ((newValue - oldValue) / oldValue) * 100; 
} 

function calculateCAGR(beginningValue, endingValue, years) { 
if (beginningValue <= 0) { 
throw new Error("Beginning value must be greater than zero"); 
} 
if (years <= 0) { 
throw new Error("Number of years must be greater than zero"); 
} 
return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100; 
} 

// Utility Functions 
function formatNumber(num, symbol = '', decimals = 2) { 
return num.toFixed(decimals) + symbol; 
} 

function validateNumberInput(value) { 
return !isNaN(parseFloat(value)) && isFinite(value); 
} 

// Environmental Footprint Calculator 
function calculateEnvironmentalFootprint(energy, water, food, waste) { 
const energyE = 0.3 * energy; 
const waterW = 0.2 * water; 
const foodF = 0.4 * food; 
const wasteX = 0.1 * waste; 
return parseFloat((energyE + waterW + foodF + wasteX).toFixed(2)).toFixed(2); 
} 

// Result Display Handler 
function updateResultDisplay(result, sectionId) { 
const requiredSection = document.getElementById(sectionId); 
if (!requiredSection) { 
console.error(`No element found with ID ${sectionId}`); 
return; 
} 

const resultElement = requiredSection.querySelector('.result strong'); 
const statusElement = requiredSection.closest('.calculator-section').querySelector('button'); 

// Add loading state 
statusElement.classList.add('loading'); 

// Format and display result 
const ecoeco = formatNumber(parseFloat(result), ' kg CO₂e/year'); 
resultElement.textContent = ecoeco; 

// Add success classes 
requiredSection.classList.remove('error', 'success'); 
requiredSection.classList.add('success'); 
resultElement.style.display = 'block'; 

// Animation and cleanup 
void document.getElementById(sectionId).offsetWidth; 
setTimeout(() => { 
statusElement.classList.remove('loading'); 
}, 500); 
} 

// Browser Compatibility 
window.calculateSimpleGrowthRate = calculateSimpleGrowthRate; 
window.calculateCAGR = calculateCAGR; 
window.formatNumber = formatNumber; 
window.validateNumberInput = validateNumberInput; 
window.calculateEnvironmentalFootprint = calculateEnvironmentalFootprint; 
window.updateResultDisplay = updateResultDisplay; 

// End of file 