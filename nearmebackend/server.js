require('dotenv').config(); 

const express = require('express'); 
const cors = require('cors'); 
const axios = require('axios'); 

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3000',
  'https://nrme.site',
];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (e.g. curl, Postman) and any allowed origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
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


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
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
    "work": "office", 
    "bakery": "shop=bakery", 
    "fire station": "amenity=fire_station", 
    "library": "amenity=library", 
    "pharmacy": "amenity=pharmacy", 
    "supermarket": "shop=supermarket", 
    "grocery store": "shop=supermarket", 
    "hospital": "amenity=hospital", 
    "clinic": "amenity=clinic", 
    "hotel": "tourism=hotel", 
    "motel": "tourism=motel", 
    "museum": "tourism=museum", 
    "art gallery": "tourism=art_gallery", 
    "cinema": "amenity=cinema", 
    "theatre": "amenity=theatre", 
    "post office": "amenity=post_office", 
    "police station": "amenity=police", 
    "fire station": "amenity=fire_station", 
    "bus stop": "highway=bus_stop", 
    "train station": "railway=station", 
    "subway station": "railway=subway_station", 
    "shopping mall": "shop=mall", 
    "bookstore": "shop=books", 
    "clothing store": "shop=clothes", 
    "electronics store": "shop=electronics", 
    "hardware store": "shop=hardware", 
    "car repair": "shop=car_repair", 
    "car wash": "amenity=car_wash", 
    "parking": "amenity=parking", 
    "public toilet": "amenity=toilets", 
    "atm": "amenity=atm", 
    "veterinarian": "amenity=veterinary", 
    "dentist": "amenity=dentist", 
    "doctor": "amenity=doctors", 
    "bar": "amenity=bar", 
    "pub": "amenity=pub", 
    "nightclub": "amenity=nightclub", 
    "cafe": "amenity=cafe", 
    "bakery": "shop=bakery", 
    "florist": "shop=florist", 
    "hairdresser": "shop=hairdresser", 
    "beauty salon": "shop=beauty", 
    "laundry": "shop=laundry", 
    "dry cleaning": "shop=dry_cleaning", 
    "shoe store": "shop=shoes", 
    "jewelry store": "shop=jewelry", 
    "toy store": "shop=toys", 
    "pet store": "shop=pet", 
    "sports store": "shop=sports", 
    "outdoor store": "shop=outdoor", 
    "bicycle store": "shop=bicycle", 
    "pharmacy": "amenity=pharmacy", 
    "convenience store": "shop=convenience", 
    "kiosk": "amenity=kiosk", 
    "fast food": "amenity=fast_food", 
    "restaurant": "amenity=restaurant", 
    "cafe": "amenity=cafe", 
    "pub": "amenity=pub", 
    "bar": "amenity=bar", 
    "park": "leisure=park", 
    "beach": "natural=beach", 
    "gym": "leisure=fitness_centre", 
    "bank": "amenity=bank", 
    "gas station": "amenity=fuel", 
    "school": "amenity=school", 
};


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
            return "Ice Cream"; 
        case "beach":
            return "Beach"; 
        case "park":
            return "Park";
        case "restaurant":
            return "Restaurant";
        case "bakery":
            return "Bakery"; 
        case "fire station":
            return "Fire Station"; 
        case "library":
            return "Library"; 
        case "pharmacy":
            return "Pharmacy"; 
        case "supermarket":
        case "grocery store":
            return "Supermarket"; 
        case "hospital":
            return "Hospital"; 
        case "clinic":
            return "Clinic"; 
        case "hotel":
        case "motel":
            return "Hotel"; 
        case "museum":
            return "Museum"; 
        case "art gallery":
            return "Art Gallery"; 
        case "cinema":
            return "Cinema"; 
        case "theatre":
            return "Theatre"; 
        case "post office":
            return "Post Office";
        case "police station":
            return "Police Station"; 
        case "bus stop":
            return "Bus Stop"; 
        case "train station":
            return "Train Station"; 
        case "subway station":
            return "Subway Station"; 
        case "shopping mall":
            return "Shopping Mall"; 
        case "bookstore":
            return "Bookstore"; 
        case "clothing store":
            return "Clothing Store"; 
        case "electronics store":
            return "Electronics Store";
        case "hardware store":
            return "Hardware Store";
        case "car repair":
            return "Car Repair"; 
        case "car wash":
            return "Car Wash"; 
        case "parking":
            return "Parking"; 
        case "public toilet":
            return "Public Toilet";
        case "atm":
            return "ATM";
        case "veterinarian":
            return "Veterinarian";
        case "dentist":
            return "Dentist"; 
        case "doctor":
            return "Doctor"; 
        case "bar":
            return "Bar"; 
            return "Pub"; 
            return "Nightclub"; 
        case "cafe":
            return "Cafe"; 
            return "Florist"; 
        case "hairdresser":
            return "Hairdresser"; 
        case "beauty salon":
            return "Beauty Salon"; 
        case "laundry":
            return "Laundry"; 
        case "dry cleaning":
            return "Dry Cleaning"; 
        case "shoe store":
            return "Shoe Store"; 
        case "jewelry store":
            return "Jewelry Store"; 
        case "toy store":
            return "Toy Store"; 
        case "pet store":
            return "Pet Store"; 
        case "sports store":
            return "Sports Store"; 
        case "outdoor store":
            return "Outdoor Store"; 
        case "bicycle store":
            return "Bicycle Store"; 
        case "convenience store":
            return "Convenience Store"; 
        case "kiosk":
            return "Kiosk"; 
        case "work":
            return "Work"; 
        default:
           
            return "Other"; 
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

   
    try {
        const allowedPlaceTypes = Object.keys(overpassTagMap).join(', ');
        const geminiPrompt = `
        Analyze the following user request for a sequence of places of interest. Extract an ordered list of distinct place types the user wants to visit.

        You MUST only return place types from this exact approved list:
        ${allowedPlaceTypes}

        If the user implies a place type (e.g. "get food" implies "restaurant", "work out" implies "gym", "grab a coffee" implies "cafe"), map it to the closest term in the approved list.
        If a place type cannot be reasonably matched to any term in the approved list, omit it.

        User request: "${userQuery}"

        Provide the response in JSON format with a single field 'orderedPlaces', which is an array of strings from the approved list only.
        Example 1: {"orderedPlaces": ["beach", "ice cream shop"]}
        Example 2: {"orderedPlaces": ["restaurant", "gym"]}
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

        // ✅ Fix
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`;
        
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

   
    try {
        await sleep(1000); 
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


   
    for (const queryTerm of orderedPlaceTypes) {
        try {
            await sleep(1000); 

            const overpassTag = overpassTagMap[queryTerm.toLowerCase()];
            if (!overpassTag) {
                console.log(`No Overpass tag mapping found for '${queryTerm}'. Skipping.`);
                continue;
            }

            const radius = 50000; 
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
                   
                    category: mapQueryTermToFrontendCategory(queryTerm), 
                    type: queryTerm 
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
})