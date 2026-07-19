// Item Response Theory (IRT) 2PL/3PL Mathematical Engine

const D = 1.702; // Scaling factor to align logistic and normal metric

/**
 * Calculates the probability of a correct response for a given theta (ability) and item parameters.
 * P(theta) = c + (1 - c) / (1 + exp(-1.702 * a * (theta - b)))
 * 
 * @param {number} theta - User's ability estimate
 * @param {number} a - Discrimination parameter
 * @param {number} b - Difficulty parameter
 * @param {number} c - Guessing parameter (0 for 2PL)
 * @returns {number} Probability of correct response [0, 1]
 */
export const getProbabilityOfCorrect = (theta, a, b, c) => {
  const pStar = 1.0 / (1.0 + Math.exp(-D * a * (theta - b)));
  return c + (1.0 - c) * pStar;
};

/**
 * Calculates the Item Information Function (IIF) for a question at a given theta.
 * Used to select the next item that maximizes information at the user's current ability.
 * 
 * @param {number} theta - User's ability estimate
 * @param {number} a - Discrimination parameter
 * @param {number} b - Difficulty parameter
 * @param {number} c - Guessing parameter
 * @returns {number} Information value
 */
export const getItemInformation = (theta, a, b, c) => {
  const P = getProbabilityOfCorrect(theta, a, b, c);
  const pStar = 1.0 / (1.0 + Math.exp(-D * a * (theta - b)));
  
  // Derivative of P with respect to theta
  const dP = (1.0 - c) * D * a * pStar * (1.0 - pStar);
  
  if (P <= 0 || P >= 1) return 0;
  
  return (dP * dP) / (P * (1.0 - P));
};

/**
 * Updates the user's ability estimate (theta) and Standard Error (SE) using Expected A Posteriori (EAP).
 * Uses a standard normal prior distribution N(0, 1).
 * 
 * @param {Array<{isCorrect: boolean, a: number, b: number, c: number}>} responses - History of user responses with item parameters
 * @returns {{theta: number, standardError: number}} Updated theta and Standard Error
 */
export const estimateThetaEAP = (responses) => {
  // Define grid points from -4.0 to +4.0 with step 0.05 (161 points)
  const numPoints = 161;
  const minTheta = -4.0;
  const step = 0.05;
  
  const thetaGrid = [];
  const prior = [];
  
  // Initialize grid and standard normal prior N(0, 1)
  for (let i = 0; i < numPoints; i++) {
    const thetaVal = minTheta + i * step;
    thetaGrid.push(thetaVal);
    // Standard normal density function: (1 / sqrt(2*pi)) * exp(-x^2 / 2)
    const density = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-(thetaVal * thetaVal) / 2.0);
    prior.push(density);
  }
  
  // Calculate log-likelihood for each grid point
  const logLikelihoods = new Array(numPoints).fill(0.0);
  
  for (let k = 0; k < numPoints; k++) {
    const thetaK = thetaGrid[k];
    let logL = 0.0;
    
    for (const res of responses) {
      const P = getProbabilityOfCorrect(thetaK, res.a, res.b, res.c);
      const safeP = Math.max(0.0001, Math.min(0.9999, P));
      
      if (res.isCorrect) {
        logL += Math.log(safeP);
      } else {
        logL += Math.log(1.0 - safeP);
      }
    }
    logLikelihoods[k] = logL;
  }
  
  // Calculate posterior probability distribution
  // Posterior ~ Likelihood * Prior
  // To avoid numeric underflow, compute log(Posterior) = logL + logPrior
  const w = [];
  let maxW = -Infinity;
  
  for (let k = 0; k < numPoints; k++) {
    const logPriorK = Math.log(prior[k]);
    const val = logLikelihoods[k] + logPriorK;
    w.push(val);
    if (val > maxW) {
      maxW = val;
    }
  }
  
  // Exponentiate and normalize
  const posterior = [];
  let sumPosterior = 0.0;
  
  for (let k = 0; k < numPoints; k++) {
    const pVal = Math.exp(w[k] - maxW); // Shift by maxW for numerical stability
    posterior.push(pVal);
    sumPosterior += pVal;
  }
  
  for (let k = 0; k < numPoints; k++) {
    posterior[k] /= sumPosterior;
  }
  
  // Expected value of theta (EAP estimate)
  let updatedTheta = 0.0;
  for (let k = 0; k < numPoints; k++) {
    updatedTheta += thetaGrid[k] * posterior[k];
  }
  
  // Posterior variance
  let variance = 0.0;
  for (let k = 0; k < numPoints; k++) {
    const diff = thetaGrid[k] - updatedTheta;
    variance += diff * diff * posterior[k];
  }
  
  const standardError = Math.sqrt(variance);
  
  return {
    theta: parseFloat(updatedTheta.toFixed(3)),
    standardError: parseFloat(standardError.toFixed(3))
  };
};

/**
 * Re-calibrates item parameters based on new user responses.
 * Simple online calibration placeholder for adaptive engine.
 * 
 * @param {number} currentB - Current difficulty (b) parameter
 * @param {number} userTheta - User's ability estimate
 * @param {boolean} isCorrect - Whether user got the question correct
 * @param {number} learningRate - Rate of calibration adjustment
 * @returns {number} Calibrated difficulty (b) parameter
 */
export const calibrateDifficulty = (currentB, userTheta, isCorrect, learningRate = 0.05) => {
  // If user gets it correct, difficulty was slightly too low relative to user's ability.
  // If user gets it incorrect, difficulty was slightly too high relative to user's ability.
  // Formula: b_new = b_old + learningRate * (P(theta) - isCorrect)
  // This pushes difficulty up if user got it wrong when they shouldn't, or down if correct.
  const P = getProbabilityOfCorrect(userTheta, 1.0, currentB, 0.0);
  const outcome = isCorrect ? 1.0 : 0.0;
  const delta = learningRate * (P - outcome);
  return parseFloat((currentB + delta).toFixed(3));
};
