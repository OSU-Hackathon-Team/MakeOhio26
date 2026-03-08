/**
 * Trilateration Utility
 * Calculates the (x, y) coordinates of a device based on its distance from 3 known points.
 * 
 * Formula:
 * (x - x1)^2 + (y - y1)^2 = d1^2
 * (x - x2)^2 + (y - y2)^2 = d2^2
 * (x - x3)^2 + (y - y3)^2 = d3^2
 */

export function trilaterate(p1, p2, p3, d1, d2, d3) {
    // p1, p2, p3 are {x, y} or {lng, lat}
    // d1, d2, d3 are distances in meters

    const x1 = p1[0];
    const y1 = p1[1];
    const x2 = p2[0];
    const y2 = p2[1];
    const x3 = p3[0];
    const y3 = p3[1];

    // Unit conversion: If using Lat/Lng, we need to be careful.
    // For local distances (OSU Campus), we can treat degree differences as linear.
    // 1 degree lat approx 111,000 meters.
    // 1 degree lng approx 111,000 * cos(lat) meters.

    // A = 2x2 - 2x1
    // B = 2y2 - 2y1
    // C = d1^2 - d2^2 - x1^2 + x2^2 - y1^2 + y2^2
    // D = 2x3 - 2x2
    // E = 2y3 - 2y2
    // F = d2^2 - d3^2 - x2^2 + x3^2 - y2^2 + y3^2

    const A = 2 * x2 - 2 * x1;
    const B = 2 * y2 - 2 * y1;
    const C = Math.pow(d1, 2) - Math.pow(d2, 2) - Math.pow(x1, 2) + Math.pow(x2, 2) - Math.pow(y1, 2) + Math.pow(y2, 2);
    const D = 2 * x3 - 2 * x2;
    const E = 2 * y3 - 2 * y2;
    const F = Math.pow(d2, 2) - Math.pow(d3, 2) - Math.pow(x2, 2) + Math.pow(x3, 2) - Math.pow(y2, 2) + Math.pow(y3, 2);

    const x = (C * E - F * B) / (E * A - B * D);
    const y = (C * D - A * F) / (B * D - A * E);

    return [x, y];
}

/**
 * RSSI to Distance Formula
 * d = 10 ^ ((Ptx - RSSI) / (10 * n))
 */
export function rssiToDistance(rssi, ptx = -59, n = 2.0) {
    // ptx is measured power (RSSI at 1m)
    // n is path loss exponent (2.0 for open space)
    return Math.pow(10, (ptx - rssi) / (10 * n));
}

/**
 * Calculate intersection of two circles (2-node fallback)
 * 
 * @param {Array} signals - Array of 2 {pos: [lng, lat], dist: meters}
 * @returns {Array} - Array of candidate points [[lng, lat]]
 */
export function calculateCircleIntersection(signals) {
    if (signals.length < 2) return signals.map(s => s.pos);

    const [p0, p1] = [signals[0].pos, signals[1].pos];
    // Convert distances from meters to approximate degrees
    const r0 = signals[0].dist / 111320;
    const r1 = signals[1].dist / 111320;

    const dLng = p1[0] - p0[0];
    const dLat = p1[1] - p0[1];
    const d = Math.sqrt(dLng * dLng + dLat * dLat);

    // Case 1: Too far apart
    if (d > r0 + r1) {
        const weight = r1 / (r0 + r1);
        return [[p0[0] + dLng * weight, p0[1] + dLat * weight]];
    }

    // Case 2: One inside another
    if (d < Math.abs(r0 - r1)) {
        const weight = r1 / (r0 + r1);
        return [[p0[0] + dLng * weight, p0[1] + dLat * weight]];
    }

    // Case 3: Intersect at 2 points
    const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));

    const x2 = p0[0] + a * dLng / d;
    const y2 = p0[1] + a * dLat / d;

    const rx = -dLat * (h / d);
    const ry = dLng * (h / d);

    return [
        [x2 + rx, y2 + ry],
        [x2 - rx, y2 - ry]
    ];
}
