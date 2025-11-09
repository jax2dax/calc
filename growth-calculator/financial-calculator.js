// financial-calculator.js

/**
 * Calculates compound interest.
 * @param {number} principal - Initial deposit (principal amount).
 * @param {number} annualRate - Annual interest rate (as a decimal, e.g., 0.05 for 5%).
 * @param {number} compoundingFrequency - Number of times interest is compounded per year (e.g., 1 for annually, 12 for monthly, 365 for daily).
 * @param {number} timePeriod - Time period in years.
 * @returns {number} The future value of the investment.
 */
function calculateCompoundInterest(principal, annualRate, compoundingFrequency, timePeriod) {
    if (principal < 0 || annualRate < 0 || compoundingFrequency <= 0 || timePeriod < 0) {
        throw new Error("All inputs must be non-negative, and compounding frequency must be positive.");
    }
    const amount = principal * Math.pow((1 + annualRate / compoundingFrequency), compoundingFrequency * timePeriod);
    return amount;
}

/**
 * Calculates the monthly payment for a loan/mortgage.
 * @param {number} principal - The loan principal amount.
 * @param {number} annualRate - The annual interest rate (as a decimal, e.g., 0.05 for 5%).
 * @param {number} loanTermYears - The loan term in years.
 * @returns {number} The periodic (monthly) payment.
 */
function calculateLoanPayment(principal, annualRate, loanTermYears) {
    if (principal <= 0 || annualRate < 0 || loanTermYears <= 0) {
        throw new Error("Loan principal, annual rate, and loan term must be positive.");
    }

    const monthlyRate = annualRate / 12;
    const numberOfPayments = loanTermYears * 12;

    if (monthlyRate === 0) {
        return principal / numberOfPayments; // Simple division if interest rate is 0
    }

    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    return payment;
}

/**
 * Generates an amortization schedule for a loan.
 * @param {number} principal - The loan principal amount.
 * @param {number} annualRate - The annual interest rate (as a decimal, e.g., 0.05 for 5%).
 * @param {number} loanTermYears - The loan term in years.
 * @returns {Array<object>} An array of objects, each representing a payment period.
 */
function generateAmortizationSchedule(principal, annualRate, loanTermYears) {
    if (principal <= 0 || annualRate < 0 || loanTermYears <= 0) {
        throw new Error("Loan principal, annual rate, and loan term must be positive.");
    }

    const monthlyRate = annualRate / 12;
    const numberOfPayments = loanTermYears * 12;
    const monthlyPayment = calculateLoanPayment(principal, annualRate, loanTermYears);

    let balance = principal;
    const schedule = [];

    for (let i = 1; i <= numberOfPayments; i++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        balance -= principalPayment;

        schedule.push({
            period: i,
            payment: monthlyPayment,
            principalPaid: principalPayment,
            interestPaid: interestPayment,
            remainingBalance: balance > 0 ? balance : 0 // Ensure balance doesn't go negative due to rounding
        });
    }
    return schedule;
}

// Export functions for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateCompoundInterest,
        calculateLoanPayment,
        generateAmortizationSchedule
    };
}