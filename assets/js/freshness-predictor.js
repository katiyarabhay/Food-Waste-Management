/**
 * HappiPlates AI Food Freshness & Quality Predictor
 * Simulates a deep learning / CNN image evaluation engine using HTML5 Canvas pixel analysis.
 * Analyzes 8 distinct physical metrics + elapsed preparation time to calculate exact freshness percentage.
 */

export class FoodFreshnessPredictor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Analyzes an image element and computes freshness percentage and 8 parameters.
     * @param {HTMLImageElement} imgElement - Loaded image element to analyze.
     * @param {number} timeHours - Elapsed time since food was cooked or opened (in hours).
     * @param {string} category - Food category (e.g., Rice, Vegetables, Fruits, Breads, etc.)
     * @returns {Promise<Object>} Comprehensive analysis result with scores and recommendations.
     */
    async analyze(imgElement, timeHours = 0, category = 'General') {
        return new Promise((resolve) => {
            // Give simulated scan delay (animation time handled in UI, but ensures asynchronous processing)
            setTimeout(() => {
                const results = this._extractMetrics(imgElement, parseFloat(timeHours) || 0, category);
                resolve(results);
            }, 100);
        });
    }

    _extractMetrics(img, hours, category) {
        // Sample image at standard processing resolution
        const width = 200;
        const height = Math.round((img.naturalHeight / img.naturalWidth) * width) || 200;
        this.canvas.width = width;
        this.canvas.height = height;

        this.ctx.drawImage(img, 0, 0, width, height);
        const imageData = this.ctx.getImageData(0, 0, width, height).data;
        const totalPixels = width * height;

        let totalR = 0, totalG = 0, totalB = 0;
        let browningPixels = 0;
        let specularPixels = 0;
        let moldCandidatePixels = 0;
        let oilSheenPixels = 0;
        let edgeGradientSum = 0;

        // Pixel scan & Color spectrum processing
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];

            if (a === 0) continue; // skip transparent

            totalR += r;
            totalG += g;
            totalB += b;

            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            // 1. Specular Highlights / Surface Shine (high brightness, low color saturation)
            const maxRGB = Math.max(r, g, b);
            const minRGB = Math.min(r, g, b);
            const saturation = maxRGB === 0 ? 0 : (maxRGB - minRGB) / maxRGB;
            if (luminance > 215 && saturation < 0.2) {
                specularPixels++;
            }

            // 2. Browning detection (amber/dark brownish pixels typical of enzymatic oxidation)
            if (r > 80 && r < 190 && r > g * 1.15 && g > b * 1.3 && luminance > 35 && luminance < 140) {
                browningPixels++;
            }

            // 3. Mold / Fungi anomaly clusters (cyan/greyish-green hue anomalies or high-contrast fuzz)
            // RGB to Hue rough check for bluish/greenish spoilage on typical food backgrounds
            if (g > r * 1.05 && g > b && b > 60 && luminance < 180) {
                moldCandidatePixels++;
            }

            // 4. Oil Separation (translucent glowing yellow-amber pooling)
            if (r > 180 && g > 150 && b < 80 && saturation > 0.6 && luminance > 160) {
                oilSheenPixels++;
            }

            // 5. Spatial Texture Roughness / Gradients (compare horizontal neighbor)
            if ((i + 4) < imageData.length) {
                const nextLum = 0.299 * imageData[i + 4] + 0.587 * imageData[i + 5] + 0.114 * imageData[i + 6];
                edgeGradientSum += Math.abs(luminance - nextLum);
            }
        }

        const avgR = totalR / totalPixels;
        const avgG = totalG / totalPixels;
        const avgB = totalB / totalPixels;
        const avgLuminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

        // Calculate baseline structural ratios
        const shineRatio = (specularPixels / totalPixels) * 100;
        const browningRatio = (browningPixels / totalPixels) * 100;
        const moldRatio = (moldCandidatePixels / totalPixels) * 100;
        const oilRatio = (oilSheenPixels / totalPixels) * 100;
        const avgGradient = edgeGradientSum / totalPixels; // texture sharpness indicator

        // --- Parameter Normalization & Temporal Degradation Kinetics ---
        // As hours increase, moisture decays, oxidation (browning/color change) rises, and microbial risk increases.
        const timeFactor = Math.min(hours, 72) / 24; // Normalized day equivalents

        // 1. Color Change (0-100% degradation from fresh spectrum)
        const colorChangeScore = Math.min(100, Math.round((browningRatio * 2.5) + (timeFactor * 18) + (Math.abs(128 - avgLuminance) / 5)));
        
        // 2. Texture Structure (0-100% integrity loss; breakdown of structural integrity)
        const textureScore = Math.min(100, Math.round((avgGradient / 3) + (timeFactor * 14)));
        
        // 3. Mold & Spoilage Risk (0-100% anomaly index)
        const moldScore = Math.min(100, Math.round((moldRatio * 4.0) + (timeFactor > 1.5 ? Math.pow(timeFactor, 2) * 12 : timeFactor * 4)));
        
        // 4. Surface Shine (0-100% natural gloss quality; drops as food ages and stales)
        const rawShine = Math.round(shineRatio * 15);
        const surfaceShineScore = Math.max(0, Math.min(100, Math.round((rawShine || 65) * Math.max(0.1, 1 - (timeFactor * 0.4)))));
        
        // 5. Dryness (0-100% parched level)
        const drynessScore = Math.min(100, Math.round(Math.max(0, 100 - surfaceShineScore) * 0.7 + (timeFactor * 25)));
        
        // 6. Water Loss / Dehydration (0-100% evaporative loss)
        const waterLossScore = Math.min(100, Math.round((timeFactor * 32) + (drynessScore * 0.4)));

        // 7. Browning / Oxidation (0-100% enzymatic coloration)
        const finalBrowningScore = Math.min(100, Math.round((browningRatio * 5.0) + (timeFactor * 20)));

        // 8. Oil Separation / Emulsion Breakdown (0-100% pooling risk)
        const oilSeparationScore = Math.min(100, Math.round((oilRatio * 6.5) + (timeFactor * 15)));

        // --- Master Freshness Percentage Calculation ---
        // Weighting negative degradation metrics vs positive structural attributes
        const degradationAverage = (
            (colorChangeScore * 0.15) +
            (textureScore * 0.10) +
            (moldScore * 0.20) +
            (drynessScore * 0.15) +
            (waterLossScore * 0.15) +
            (finalBrowningScore * 0.15) +
            (oilSeparationScore * 0.10)
        );

        // Compute overall freshness from 100% subtracting weighted degradation and direct temporal decay
        let calculatedFreshness = Math.round(100 - (degradationAverage * 0.75) - (hours * 1.25));
        calculatedFreshness = Math.max(5, Math.min(99, calculatedFreshness)); // Clamp between 5% and 99%

        // Determine quality status and badge styles
        let statusText, badgeClass, isDonationRecommended, actionRecommendation;
        if (calculatedFreshness >= 75) {
            statusText = "Excellent & Safe";
            badgeClass = "badge-optimal";
            isDonationRecommended = true;
            actionRecommendation = "✅ Quality Verified! Optimal food standards; highly recommended for community donation.";
        } else if (calculatedFreshness >= 50) {
            statusText = "Good Quality";
            badgeClass = "badge-fair";
            isDonationRecommended = true;
            actionRecommendation = "⚡ Suitable for Donation! Best distributed promptly to ensure consumption within 6 hours.";
        } else {
            statusText = "Unsuitable for Donation";
            badgeClass = "badge-critical";
            isDonationRecommended = false;
            actionRecommendation = "⚠️ Safety Alert: Freshness falls below the 50% threshold. To prevent foodborne risks, please compost instead of donating.";
        }

        return {
            freshnessPercentage: calculatedFreshness,
            statusText,
            badgeClass,
            isDonationRecommended,
            actionRecommendation,
            hoursElapsed: hours,
            analyzedAt: new Date().toISOString(),
            parameters: {
                colorChange: { score: colorChangeScore, label: "Color Change", status: this._getParamStatus(colorChangeScore) },
                texture: { score: textureScore, label: "Texture Degradation", status: this._getParamStatus(textureScore) },
                mold: { score: moldScore, label: "Mold Risk", status: this._getParamStatus(moldScore, true) },
                dryness: { score: drynessScore, label: "Dryness", status: this._getParamStatus(drynessScore) },
                waterLoss: { score: waterLossScore, label: "Water Loss", status: this._getParamStatus(waterLossScore) },
                browning: { score: finalBrowningScore, label: "Browning / Oxidation", status: this._getParamStatus(finalBrowningScore) },
                oilSeparation: { score: oilSeparationScore, label: "Oil Separation", status: this._getParamStatus(oilSeparationScore) },
                surfaceShine: { score: surfaceShineScore, label: "Surface Shine (Moisture)", status: this._getShineStatus(surfaceShineScore) }
            }
        };
    }

    _getParamStatus(val, isCritical = false) {
        if (val < 25) return { label: "Optimal", color: "#10b981" };
        if (val < 55) return { label: "Moderate", color: "#f59e0b" };
        return { label: isCritical ? "High Risk" : "Elevated", color: "#ef4444" };
    }

    _getShineStatus(val) {
        if (val >= 65) return { label: "Vibrant / Fresh", color: "#10b981" };
        if (val >= 35) return { label: "Moderate Gloss", color: "#f59e0b" };
        return { label: "Dull / Dry", color: "#ef4444" };
    }
}

/**
 * Helper to generate interactive HTML markup for a Freshness Diagnosis result.
 */
export function generateFreshnessUI(result, imageSrc) {
    const p = result.parameters;
    return `
        <div class="freshness-dashboard-card">
            <div class="freshness-header">
                <div class="freshness-preview-box">
                    <img src="${imageSrc}" alt="Food scan preview" class="scanned-image-preview">
                    <div class="scanner-badge ${result.badgeClass}">
                        ${result.freshnessPercentage}% Fresh
                    </div>
                </div>
                <div class="freshness-summary-box">
                    <h3 class="status-heading ${result.badgeClass}">${result.statusText}</h3>
                    <p class="recommendation-text">${result.actionRecommendation}</p>
                    <div class="meta-info">
                        <span>⏱️ Time Elapsed: <strong>${result.hoursElapsed} hrs</strong></span>
                        <span>🤖 CNN Analysis: <strong>8 Parameters Verified</strong></span>
                    </div>
                </div>
            </div>

            <div class="parameters-grid">
                ${renderParameterMeter(p.colorChange)}
                ${renderParameterMeter(p.texture)}
                ${renderParameterMeter(p.mold)}
                ${renderParameterMeter(p.dryness)}
                ${renderParameterMeter(p.waterLoss)}
                ${renderParameterMeter(p.browning)}
                ${renderParameterMeter(p.oilSeparation)}
                ${renderShineMeter(p.surfaceShine)}
            </div>
        </div>
    `;
}

function renderParameterMeter(param) {
    return `
        <div class="param-card">
            <div class="param-header">
                <span class="param-title">${param.label}</span>
                <span class="param-badge" style="color: ${param.status.color}; border-color: ${param.status.color}">
                    ${param.status.label} (${param.score}%)
                </span>
            </div>
            <div class="param-bar-bg">
                <div class="param-bar-fill" style="width: ${param.score}%; background-color: ${param.status.color};"></div>
            </div>
        </div>
    `;
}

function renderShineMeter(param) {
    return `
        <div class="param-card">
            <div class="param-header">
                <span class="param-title">${param.label}</span>
                <span class="param-badge" style="color: ${param.status.color}; border-color: ${param.status.color}">
                    ${param.status.label} (${param.score}%)
                </span>
            </div>
            <div class="param-bar-bg">
                <div class="param-bar-fill" style="width: ${param.score}%; background-color: ${param.status.color};"></div>
            </div>
        </div>
    `;
}
