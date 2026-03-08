/**
 * Generates a stable, deterministic pseudorandom number between 0 and 1 based on a string seed.
 */
const cyrb128 = (str) => {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

const sfc32 = (a, b, c, d) => {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

/**
 * Returns a stable occupancy count for a building based on its ID and capacity.
 * Ranges between 15% and 85% of capacity.
 */
export const getHardcodedOccupancy = (buildingId, capacity) => {
    if (!buildingId) return 0;

    // Check for specific overrides first (optional, but good for anchors)
    if (buildingId === 'traditions_scott') return 465;
    if (buildingId === 'traditions_kennedy') return 20;

    const seed = cyrb128(buildingId);
    const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

    // Constant percentage (e.g. 15% to 85%)
    const percentage = 0.15 + (rand() * 0.7);
    return Math.floor(capacity * percentage);
}
