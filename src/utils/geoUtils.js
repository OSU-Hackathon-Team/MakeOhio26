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
