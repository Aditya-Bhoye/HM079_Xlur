
export const fetchRoute = async (start: [number, number], end: [number, number]) => {
    const apiKey = import.meta.env.VITE_ORS_API_KEY;
    if (!apiKey) {
        console.error("OpenRouteService API key is missing");
        return null;
    }

    try {
        const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`);

        if (!response.ok) {
            throw new Error(`OpenRouteService error: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching route:", error);
        return null;
    }
};

export const fetchMatrix = async (start: [number, number], destinations: [number, number][]) => {
    const apiKey = import.meta.env.VITE_ORS_API_KEY;
    if (!apiKey) {
        console.error("OpenRouteService API key is missing");
        return null;
    }

    try {
        // Prepare locations array: [start, ...destinations]
        // Note: ORS expects [longitude, latitude]
        const locations = [
            [start[1], start[0]], // User Location (0)
            ...destinations.map(d => [d[1], d[0]]) // Destinations (1..N)
        ];

        const body = {
            locations: locations,
            metrics: ["distance"],
            units: "km",
            sources: [0], // Calculate from start (index 0)
            destinations: Array.from({ length: destinations.length }, (_, i) => i + 1) // To all others
        };

        const response = await fetch(`https://api.openrouteservice.org/v2/matrix/driving-car`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.warn(`ORS Matrix API error: ${response.statusText}`);
            // Fallback or just return null
            return null;
        }

        const data = await response.json();
        // data.distances is a 2D array: [[0, d1, d2, ...]]
        // We want the first row (distances from source 0)
        return data.distances[0];
    } catch (error) {
        console.error("Error fetching matrix:", error);
        return null;
    }
};
