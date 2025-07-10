// server.js - Express.js Backend for AI Search (Expanded Overpass Tag Map)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set in your .env file. AI search will not function.");
}

// Helper function for a small delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate distance between two lat/lng points
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

// UPDATED: Mapping for common place types to Overpass API tags
const overpassTagMap = {
    "fast food restaurant": "amenity=fast_food",
    "fast food": "amenity=fast_food",
    "gym": "leisure=fitness_centre",
    "fitness centre": "leisure=fitness_centre",
    "ice cream shop": "amenity=ice_cream",
    "ice cream": "amenity=ice_cream",
    "beach": "natural=beach",
    "park": "leisure=park",
    "coffee shop": "amenity=cafe",
    "restaurant": "amenity=restaurant",
    "bank": "amenity=bank",
    "gas station": "amenity=fuel",
    "school": "amenity=school",
    "work": "office", // This one is tricky, 'office' is a tag, but broad. May need refinement.
    "bakery": "shop=bakery", // Example: New entry for bakeries
    "fire station": "amenity=fire_station", // Example: New entry for fire stations
    "library": "amenity=library", // NEW
    "pharmacy": "amenity=pharmacy", // NEW
    "supermarket": "shop=supermarket", // NEW
    "grocery store": "shop=supermarket", // NEW
    "hospital": "amenity=hospital", // NEW
    "clinic": "amenity=clinic", // NEW
    "hotel": "tourism=hotel", // NEW
    "motel": "tourism=motel", // NEW
    "museum": "tourism=museum", // NEW
    "art gallery": "tourism=art_gallery", // NEW
    "cinema": "amenity=cinema", // NEW
    "theatre": "amenity=theatre", // NEW
    "post office": "amenity=post_office", // NEW
    "police station": "amenity=police", // NEW
    "fire station": "amenity=fire_station", // NEW
    "bus stop": "highway=bus_stop", // NEW
    "train station": "railway=station", // NEW
    "subway station": "railway=subway_station", // NEW
    "shopping mall": "shop=mall", // NEW
    "bookstore": "shop=books", // NEW
    "clothing store": "shop=clothes", // NEW
    "electronics store": "shop=electronics", // NEW
    "hardware store": "shop=hardware", // NEW
    "car repair": "shop=car_repair", // NEW
    "car wash": "amenity=car_wash", // NEW
    "parking": "amenity=parking", // NEW
    "public toilet": "amenity=toilets", // NEW
    "atm": "amenity=atm", // NEW
    "veterinarian": "amenity=veterinary", // NEW
    "dentist": "amenity=dentist", // NEW
    "doctor": "amenity=doctors", // NEW
    "bar": "amenity=bar", // NEW
    "pub": "amenity=pub", // NEW
    "nightclub": "amenity=nightclub", // NEW
    "cafe": "amenity=cafe", // Duplicate of coffee shop, but good to have
    "bakery": "shop=bakery", // Duplicate, but good for robustness
    "florist": "shop=florist", // NEW
    "hairdresser": "shop=hairdresser", // NEW
    "beauty salon": "shop=beauty", // NEW
    "laundry": "shop=laundry", // NEW
    "dry cleaning": "shop=dry_cleaning", // NEW
    "shoe store": "shop=shoes", // NEW
    "jewelry store": "shop=jewelry", // NEW
    "toy store": "shop=toys", // NEW
    "pet store": "shop=pet", // NEW
    "sports store": "shop=sports", // NEW
    "outdoor store": "shop=outdoor", // NEW
    "bicycle store": "shop=bicycle", // NEW
    "pharmacy": "amenity=pharmacy", // Duplicate, but good for robustness
    "convenience store": "shop=convenience", // NEW
    "kiosk": "amenity=kiosk", // NEW
    "fast food": "amenity=fast_food", // Duplicate, but good for robustness
    "restaurant": "amenity=restaurant", // Duplicate, but good for robustness
    "cafe": "amenity=cafe", // Duplicate, but good for robustness
    "pub": "amenity=pub", // Duplicate, but good for robustness
    "bar": "amenity=bar", // Duplicate, but good for robustness
    "park": "leisure=park", // Duplicate, but good for robustness
    "beach": "natural=beach", // Duplicate, but good for robustness
    "gym": "leisure=fitness_centre", // Duplicate, but good for robustness
    "bank": "amenity=bank", // Duplicate, but good for robustness
    "gas station": "amenity=fuel", // Duplicate, but good for robustness
    "school": "amenity=school", // Duplicate, but good for robustness
};

// NEW: Helper function to map AI query terms to frontend display categories
function mapQueryTermToFrontendCategory(queryTerm) {
    const normalizedTerm = queryTerm.toLowerCase();
    switch (normalizedTerm) {
        case "gym":
        case "fitness centre":
            return "Gym";
        case "fast food restaurant":
        case "fast food":
            return "Fast Food";
        case "school":
            return "School";
        case "bank":
            return "Bank";
        case "gas station":
            return "Gas Station";
        case "ice cream shop":
        case "ice cream":
            return "Ice Cream"; // Assuming you have an 'Ice Cream' icon if you fetch it
        case "beach":
            return "Beach"; // Assuming you have a 'Beach' icon
        case "park":
            return "Park"; // Assuming you have a 'Park' icon
        case "restaurant":
            return "Restaurant"; // Assuming you have a 'Restaurant' icon
        case "bakery":
            return "Bakery"; // Assuming you have a 'Bakery' icon
        case "fire station":
            return "Fire Station"; // Assuming you have a 'Fire Station' icon
        case "library":
            return "Library"; // Assuming you have a 'Library' icon
        case "pharmacy":
            return "Pharmacy"; // Assuming you have a 'Pharmacy' icon
        case "supermarket":
        case "grocery store":
            return "Supermarket"; // Assuming you have a 'Supermarket' icon
        case "hospital":
            return "Hospital"; // Assuming you have a 'Hospital' icon
        case "clinic":
            return "Clinic"; // Assuming you have a 'Clinic' icon
        case "hotel":
        case "motel":
            return "Hotel"; // Assuming you have a 'Hotel' icon
        case "museum":
            return "Museum"; // Assuming you have a 'Museum' icon
        case "art gallery":
            return "Art Gallery"; // Assuming you have an 'Art Gallery' icon
        case "cinema":
            return "Cinema"; // Assuming you have a 'Cinema' icon
        case "theatre":
            return "Theatre"; // Assuming you have a 'Theatre' icon
        case "post office":
            return "Post Office"; // Assuming you have a 'Post Office' icon
        case "police station":
            return "Police Station"; // Assuming you have a 'Police Station' icon
        case "bus stop":
            return "Bus Stop"; // Assuming you have a 'Bus Stop' icon
        case "train station":
            return "Train Station"; // Assuming you have a 'Train Station' icon
        case "subway station":
            return "Subway Station"; // Assuming you have a 'Subway Station' icon
        case "shopping mall":
            return "Shopping Mall"; // Assuming you have a 'Shopping Mall' icon
        case "bookstore":
            return "Bookstore"; // Assuming you have a 'Bookstore' icon
        case "clothing store":
            return "Clothing Store"; // Assuming you have a 'Clothing Store' icon
        case "electronics store":
            return "Electronics Store"; // Assuming you have an 'Electronics Store' icon
        case "hardware store":
            return "Hardware Store"; // Assuming you have a 'Hardware Store' icon
        case "car repair":
            return "Car Repair"; // Assuming you have a 'Car Repair' icon
        case "car wash":
            return "Car Wash"; // Assuming you have a 'Car Wash' icon
        case "parking":
            return "Parking"; // Assuming you have a 'Parking' icon
        case "public toilet":
            return "Public Toilet"; // Assuming you have a 'Public Toilet' icon
        case "atm":
            return "ATM"; // Assuming you have an 'ATM' icon
        case "veterinarian":
            return "Veterinarian"; // Assuming you have a 'Veterinarian' icon
        case "dentist":
            return "Dentist"; // Assuming you have a 'Dentist' icon
        case "doctor":
            return "Doctor"; // Assuming you have a 'Doctor' icon
        case "bar":
            return "Bar"; // Assuming you have a 'Bar' icon
        case "pub":
            return "Pub"; // Assuming you have a 'Pub' icon
        case "nightclub":
            return "Nightclub"; // Assuming you have a 'Nightclub' icon
        case "cafe":
            return "Cafe"; // Assuming you have a 'Cafe' icon
        case "florist":
            return "Florist"; // Assuming you have a 'Florist' icon
        case "hairdresser":
            return "Hairdresser"; // Assuming you have a 'Hairdresser' icon
        case "beauty salon":
            return "Beauty Salon"; // Assuming you have a 'Beauty Salon' icon
        case "laundry":
            return "Laundry"; // Assuming you have a 'Laundry' icon
        case "dry cleaning":
            return "Dry Cleaning"; // Assuming you have a 'Dry Cleaning' icon
        case "shoe store":
            return "Shoe Store"; // Assuming you have a 'Shoe Store' icon
        case "jewelry store":
            return "Jewelry Store"; // Assuming you have a 'Jewelry Store' icon
        case "toy store":
            return "Toy Store"; // Assuming you have a 'Toy Store' icon
        case "pet store":
            return "Pet Store"; // Assuming you have a 'Pet Store' icon
        case "sports store":
            return "Sports Store"; // Assuming you have a 'Sports Store' icon
        case "outdoor store":
            return "Outdoor Store"; // Assuming you have an 'Outdoor Store' icon
        case "bicycle store":
            return "Bicycle Store"; // Assuming you have a 'Bicycle Store' icon
        case "convenience store":
            return "Convenience Store"; // Assuming you have a 'Convenience Store' icon
        case "kiosk":
            return "Kiosk"; // Assuming you have a 'Kiosk' icon
        case "work":
            return "Work"; // This one is tricky, 'office' is a tag, but broad. May need refinement.
        default:
            // Fallback to 'Other' if no specific mapping, or create a new 'Generic AI' category
            return "Other"; // Ensure you have an 'Other' icon in MapView.jsx's categoryIcons
    }
}


app.post('/ai-search', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured on the backend." });
    }

    const { query: userQuery, userLocation } = req.body;

    if (!userQuery) {
        return res.status(400).json({ error: "No query provided." });
    }
    if (!userLocation || typeof userLocation.lat === 'undefined' || typeof userLocation.lng === 'undefined') {
        console.error("User location missing or invalid:", userLocation);
        return res.status(400).json({ error: "User location (latitude and longitude) is required for AI search. Please ensure location services are enabled in your browser." });
    }

    console.log(`Received AI query: '${userQuery}' at location: ${userLocation.lat}, ${userLocation.lng}`);

    let orderedPlaceTypes = [];

    // Step 1: Use Gemini API to extract an ordered list of place types
    try {
        const geminiPrompt = `
        Analyze the following user request for a sequence of places of interest. Extract an ordered list of distinct place types mentioned. If a place type is not explicitly mentioned but implied (e.g., "get ice cream" implies "ice cream shop"), infer it.
        
        User request: "${userQuery}"
        
        Provide the response in JSON format with a single field 'orderedPlaces', which is an array of strings.
        Example 1: {"orderedPlaces": ["beach", "ice cream shop"]}
        Example 2: {"orderedPlaces": ["fast food restaurant", "gym"]}
        Example 3: {"orderedPlaces": ["park"]}
        `;
        
        const geminiPayload = {
            contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        orderedPlaces: { 
                            type: "ARRAY", 
                            items: { "type": "STRING" },
                            description: "An ordered list of place types mentioned in the user's request."
                        }
                    },
                    required: ["orderedPlaces"]
                }
            }
        };

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const geminiResponse = await axios.post(geminiUrl, geminiPayload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (geminiResponse.data && geminiResponse.data.candidates && 
            geminiResponse.data.candidates[0] && geminiResponse.data.candidates[0].content && 
            geminiResponse.data.candidates[0].content.parts && geminiResponse.data.candidates[0].content.parts[0]) {
            const extracted = JSON.parse(geminiResponse.data.candidates[0].content.parts[0].text);
            orderedPlaceTypes = extracted.orderedPlaces || [];
            console.log(`Gemini extracted ordered places: ${JSON.stringify(orderedPlaceTypes)}`);
        } else {
            console.error("Gemini response structure unexpected:", JSON.stringify(geminiResponse.data, null, 2));
            return res.status(500).json({ error: "AI could not understand your request. Please try rephrasing." });
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error.message);
        return res.status(500).json({ error: `Failed to connect to AI service: ${error.message}` });
    }

    const sequentialMarkers = [];
    let currentOrigin = userLocation;
    let userCountryCode = null;
    
    const overpassApiUrl = "https://overpass-api.de/api/interpreter";
    const nominatimBaseUrl = "https://nominatim.openstreetmap.org";
    const nominatimHeaders = {
        'User-Agent': 'NearMeMapApp/1.0 (rayyanusmani@example.com)'
    };

    // Step 2: Determine user's country code using Nominatim Reverse Geocoding (optional for Overpass, but good for logs)
    try {
        await sleep(1000); // Respect Nominatim rate limit
        const reverseGeocodeUrl = `${nominatimBaseUrl}/reverse`;
        const reverseGeocodeParams = {
            format: 'json',
            lat: userLocation.lat,
            lon: userLocation.lng,
            addressdetails: 1
        };
        console.log(`Getting country code for (${userLocation.lat}, ${userLocation.lng})`);
        const reverseGeocodeResponse = await axios.get(reverseGeocodeUrl, {
            params: reverseGeocodeParams,
            headers: nominatimHeaders
        });

        if (reverseGeocodeResponse.data && reverseGeocodeResponse.data.address && reverseGeocodeResponse.data.address.country_code) {
            userCountryCode = reverseGeocodeResponse.data.address.country_code;
            console.log(`User's country code detected: ${userCountryCode}`);
        } else {
            console.log("Could not determine user's country code from Nominatim reverse geocoding.");
        }
    } catch (error) {
        console.error("Error during Nominatim reverse geocoding:", error.message);
    }


    // Step 3: Perform sequential Overpass API searches
    for (const queryTerm of orderedPlaceTypes) {
        try {
            await sleep(1000); // Wait for 1 second between Overpass calls

            const overpassTag = overpassTagMap[queryTerm.toLowerCase()];
            if (!overpassTag) {
                console.log(`No Overpass tag mapping found for '${queryTerm}'. Skipping.`);
                continue;
            }

            const radius = 50000; // Search within 50 km radius (adjust as needed)
            const overpassQuery = `
                [out:json][timeout:25];
                (
                    node[${overpassTag}](around:${radius},${currentOrigin.lat},${currentOrigin.lng});
                    way[${overpassTag}](around:${radius},${currentOrigin.lat},${currentOrigin.lng});
                    relation[${overpassTag}](around:${radius},${currentOrigin.lat},${currentOrigin.lng});
                );
                out center;
            `;

            console.log(`Searching Overpass for '${queryTerm}' (tag: ${overpassTag}) near (${currentOrigin.lat}, ${currentOrigin.lng}) with radius ${radius}m`);

            const overpassResponse = await axios.post(overpassApiUrl, overpassQuery, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': nominatimHeaders['User-Agent']
                }
            });

            if (overpassResponse.data.elements.length === 0) {
                console.log(`Overpass found no results for '${queryTerm}'. (tag: ${overpassTag})`);
                continue;
            }

            let closestResult = null;
            let minDistance = Infinity;

            for (const item of overpassResponse.data.elements) {
                const itemLat = item.lat || item.center?.lat;
                const itemLng = item.lon || item.center?.lon;

                if (itemLat && itemLng) {
                    const distance = getDistanceFromLatLonInKm(currentOrigin.lat, currentOrigin.lng, itemLat, itemLng);

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestResult = item;
                    }
                }
            }

            if (closestResult) {
                const foundMarker = {
                    id: `ai-overpass-${closestResult.id}-${sequentialMarkers.length}`,
                    position: { lat: closestResult.lat || closestResult.center?.lat, lng: closestResult.lon || closestResult.center?.lon },
                    name: closestResult.tags?.name || queryTerm,
                    address: closestResult.tags?.["addr:full"] || closestResult.tags?.["addr:street"] || closestResult.tags?.["addr:housenumber"] || closestResult.tags?.["addr:city"] || closestResult.tags?.["addr:country"] || closestResult.tags?.name || closestResult.type,
                    // ⬇️ THIS IS THE CRUCIAL CHANGE ⬇️
                    category: mapQueryTermToFrontendCategory(queryTerm), // Set category based on the found type
                    type: queryTerm // Keep 'type' if you use it for display in your list
                };
                sequentialMarkers.push(foundMarker);
                currentOrigin = foundMarker.position;
                console.log(`Found closest '${queryTerm}': ${foundMarker.name} at (${foundMarker.position.lat}, ${foundMarker.position.lng})`);
            } else {
                console.log(`No closest result found for '${queryTerm}' despite Overpass returning data.`);
            }

        } catch (error) {
            if (error.response) {
                console.error(`Error calling Overpass API for '${queryTerm}': Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(`Error calling Overpass API for '${queryTerm}':`, error.message);
            }
            break;
        }
    }

    if (sequentialMarkers.length === 0) {
        return res.status(200).json({ message: "AI processed your request, but no relevant places were found for your multi-stop route. Try a different query or a broader search if needed." });
    }

    return res.status(200).json({ markers: sequentialMarkers, isMultiStopRoute: true });
});

app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
});
