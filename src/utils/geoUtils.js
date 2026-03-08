/**
 * Point in Polygon Utility (Ray Casting Algorithm)
 * 
 * @param {Array} point - [longitude, latitude]
 * @param {Array} polygon - Array of vertices [[lng, lat], [lng, lat], ...]
 * @returns {boolean} - True if point is inside
 */
export function isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;

    // Most GeoJSON polygons are arrays of rings: [[p1, p2, ...]]
    // We handle the first ring (outer boundary)
    const vs = Array.isArray(polygon[0][0]) ? polygon[0] : polygon;

    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Calculates the bounding box center of a polygon
 * 
 * @param {Array} polygon - GeoJSON Polygon coordinates [[lng, lat], ...]
 * @returns {Array} - [longitude, latitude] center
 */
export function getPolygonCenter(polygon) {
    const vs = Array.isArray(polygon[0][0]) ? polygon[0] : polygon;
    let minX = vs[0][0], maxX = vs[0][0];
    let minY = vs[0][1], maxY = vs[0][1];

    for (let i = 1; i < vs.length; i++) {
        const x = vs[i][0], y = vs[i][1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    return [(minX + maxX) / 2, (minY + maxY) / 2];
}
