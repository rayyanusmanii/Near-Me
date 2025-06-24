import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 MapContainer,
 TileLayer,
 Marker,
 Popup,
 useMap,
} from 'react-leaflet';
import { v4 as uuidv4 } from 'uuid';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { motion, AnimatePresence } from 'framer-motion';
import pinIcon from './assets/pin.png';
import { debounce } from 'lodash';


// --- START: Definitions for Reusable Components and Icons ---



// Custom icon for the user's current location (uses local pin.png)
const userIcon = new L.Icon({
 iconUrl: pinIcon,
 iconSize: [45, 45], // Adjust if needed based on your image size
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', // Optional: keep default shadow
 shadowSize: [41, 41]
});

// Icons URLs for filters
const icons = {
 School: '🏫',
 'Fast Food': '🍔',
 Gym: '🏋️',
 Bank: '🏦',
 'Gas Station': '⛽',
};


function LocateUser({ onLocate, setShowUserPopup }) {
 const map = useMap();

 useEffect(() => {
 if (!map) return;

 map.locate({
 setView: true,
 maxZoom: 16,
 enableHighAccuracy: true
 }).on('locationfound', function (e) {
 // Set user location and show popup
 onLocate(e.latlng);
 setShowUserPopup(true);

 // Hide after 5 seconds
 setTimeout(() => {
 setShowUserPopup(false);
 }, 5000);
 });

 // Optional: Handle location errors
 map.on('locationerror', function(e) {
 console.error("Location error:", e.message);
 alert("Could not retrieve your location.");
 });

 return () => {
 map.off('locationfound');
 map.off('locationerror');
 };
 }, [map, onLocate, setShowUserPopup]);

 return null;
}

// --- END: Definitions for Reusable Components and Icons ---
// Define custom icons for each category
const categoryIcons = {
 School: new L.Icon({
 iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', 
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
 iconSize: [25, 41],
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 }),
 'Fast Food': new L.Icon({
 iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', 
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
 iconSize: [25, 41],
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 }),
 Gym: new L.Icon({
 iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', 
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
 iconSize: [25, 41],
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 }),
 Bank: new L.Icon({
 iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', 
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
 iconSize: [25, 41],
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 }),
 'Gas Station': new L.Icon({
 iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png', 
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
 iconSize: [25, 41],
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 }),
 Work: new L.Icon({
 iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', 
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
 iconSize: [25, 41],
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 }),
 Other: new L.Icon({
 iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', 
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
 iconSize: [25, 41],
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 }),
};

const MapView = () => {
 const [markers, setMarkers] = useState([]); // User-added markers
 const [showForm, setShowForm] = useState(false); // State for showing marker add form
 const [showSidebar, setShowSidebar] = useState(false); // State for showing sidebar
 const [newMarkerPosition, setNewMarkerPosition] = useState(null); // Position for new marker
 const [placeName, setPlaceName] = useState(''); // Name for new marker
 const [category, setCategory] = useState('School'); // Category for new marker
 const [userLocation, setUserLocation] = useState(null); // User's current location
 const [address, setAddress] = useState(''); // Address for new marker
 const [activeFilters, setActiveFilters] = useState([]); // Active filter categories
 const mapRef = useRef(null); // Reference to the Leaflet map instance
 const [routing, setRouting] = useState(null); // State to control routing {from, to}
 const [fetchedMarkers, setFetchedMarkers] = useState([]); // Markers fetched from Overpass API

 // NEW STATES FOR SEARCH FUNCTIONALITY
 const [searchTerm, setSearchTerm] = useState('');
 const [showFilterBar, setShowFilterBar] = useState(false);
 const [, setSearchResults] = useState([]);
 const [savedNotification, setSavedNotification] = useState(null);
 const [showUserPopup, setShowUserPopup] = useState(false);
 const [suggestions, setSuggestions] = useState([]); // Live search suggestions
 const [weatherData, setWeatherData] = useState(null);
 const [, setShowWeatherDetails] = useState(false);
 const routingCleanupRef = useRef(false);


 // Predefined static markers (moved to fix 'used before defined' warning)
 const predefinedMarkers = [
 ];


 console.log("Current state:", {
 userLocation,
 routing,
 markers: markers.length,
 activeFilters: activeFilters.join(','),
 searchTerm,
});

 // Load markers from local storage on component mount
 useEffect(() => {
 const stored = localStorage.getItem('markers');
 if (stored) setMarkers(JSON.parse(stored));
 }, []);

 useEffect(() => {
 const style = document.createElement('style');
 style.innerHTML = `
 @keyframes bounceIn {
 0% {
 opacity: 0;
 transform: translateX(-50%) scale(0.7);
 }
 50% {
 opacity: 1;
 transform: translateX(-50%) scale(1.05);
 }
 70% {
 transform: translateX(-50%) scale(0.95);
 }
 100% {
 transform: translateX(-50%) scale(1);
 }
 }
 `;
 document.head.appendChild(style);

 return () => {
 document.head.removeChild(style);
 };
}, []);

 

 const handleSubmit = (e) => {
 e.preventDefault();
 const newMarker = {
 id: uuidv4(),
 position: newMarkerPosition,
 name: placeName,
 category: category || 'Other',
 address,
 };
 const updated = [...markers, newMarker];
 setMarkers(updated);
 localStorage.setItem('markers', JSON.stringify(updated));
 setShowForm(false);
 setPlaceName('');
 setCategory('School');
 setNewMarkerPosition(null);
 setAddress('');

 // Fetch weather at new marker's location
 fetchWeather(newMarkerPosition.lat, newMarkerPosition.lng);
};

 // Function to clear all user-added markers
 const clearMarkers = () => {
 setMarkers([]);
 localStorage.removeItem('markers');
 setRouting(null); // Clear any active route when clearing markers
 };

const handleGetDirections = (markerPosition) => {
 console.log("handleGetDirections called", { userLocation, markerPosition });
 
 if (!userLocation) {
 alert("Please allow location access to get directions.");
 return;
 }

 if (routingCleanupRef.current) {
 console.log("Still cleaning up previous route...");
 return;
 }

 routingCleanupRef.current = true;
 console.log("Clearing existing route");
 setRouting(null);

 setTimeout(() => {
 const newRoute = { from: userLocation, to: markerPosition };
 console.log("Setting new route:", newRoute);
 setRouting(newRoute);

 setTimeout(() => {
 routingCleanupRef.current = false;
 console.log("Routing cleanup complete");
 }, 300);
 }, 50);


 

 // Prevent duplicate calls during cleanup
 if (routingCleanupRef.current) return;

 // Lock future calls until cleanup completes
 routingCleanupRef.current = true;

 // Clear existing routing state
 setRouting(null);

 // Wait briefly to let cleanup finish
 setTimeout(() => {
 setRouting({
 from: userLocation,
 to: markerPosition
 });

 // Unlock after delay to avoid infinite lock
 setTimeout(() => {
 routingCleanupRef.current = false;
 }, 300); // Adjust based on how long cleanup takes
 }, 50);
};


const fetchOverpassData = useCallback(async (category) => {
 if (!userLocation) return [];

 const overpassTags = {
 School: 'amenity=school',
 'Fast Food': 'amenity=fast_food',
 Gym: 'leisure=fitness_centre',
 Bank: 'amenity=bank',
 'Gas Station': 'amenity=fuel',
 };

 const tag = overpassTags[category];
 if (!tag) return [];

 const radius = 10000;
 const query = `
 [out:json][timeout:25];
 (
 node[${tag}](around:${radius},${userLocation.lat},${userLocation.lng});
 way[${tag}](around:${radius},${userLocation.lat},${userLocation.lng});
 relation[${tag}](around:${radius},${userLocation.lat},${userLocation.lng});
 );
 out center;
 `;

 try {
 const response = await fetch('https://overpass-api.de/api/interpreter', {
 method: 'POST',
 body: query,
 });
 const data = await response.json();

 return data.elements.map((el) => ({
 id: `osm-${el.id}`,
 position: {
 lat: el.lat || el.center?.lat,
 lng: el.lon || el.center?.lon,
 },
 name: el.tags?.name || category,
 address: el.tags?.addr ? Object.values(el.tags.addr).join(', ') : 'OpenStreetMap POI',
 category: category,
 })).filter((m) => m.position.lat && m.position.lng);
 } catch (err) {
 console.error('Error fetching Overpass data:', err);
 return [];
 }
}, [userLocation]); // ✅ Dependency added here

useEffect(() => {
 const fetchAllActiveCategories = async () => {
 if (!userLocation) {
 setFetchedMarkers([]);
 return;
 }

 const allFetched = [];
 for (const cat of activeFilters) {
 const results = await fetchOverpassData(cat);

 const uniqueResults = results.filter(
 (newMarker) => !allFetched.some((existingMarker) => existingMarker.id === newMarker.id)
 );

 allFetched.push(...uniqueResults);
 }

 setFetchedMarkers(allFetched);
 };

 fetchAllActiveCategories();
}, [fetchOverpassData, activeFilters, userLocation]); // ✅ Safe now!



 // Function to toggle filters (simplified)
 const toggleFilter = (cat) => {
 setActiveFilters((prevFilters) => {
 if (prevFilters.includes(cat)) {
 // Remove filter
 return prevFilters.filter((c) => c !== cat);
 } else {
 // Add filter
 return [...prevFilters, cat];
 }
 });
 setRouting(null); // Clear route when filters change
 };

 // --- NEW: handleSearch function for geocoding ---
 const handleSearch = async () => {
 if (!searchTerm.trim()) {
 alert("Please enter a place or address to search.");
 return;
 }

 try {
 // Use Nominatim's search endpoint
 const response = await fetch(
 `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&addressdetails=1` // Added addressdetails for better address parsing
 );
 const data = await response.json();

 if (data && data.length > 0) {
 setSearchResults(data); // Store results
 // Optionally, center the map on the first result
 if (mapRef.current) {
 mapRef.current.setView([data[0].lat, data[0].lon], 14); // Zoom to 14
 }
 } else {
 setSearchResults([]);
 alert("No results found for your search.");
 }
 } catch (error) {
 console.error("Error during geocoding search:", error);
 alert("Error searching for place. Please try again.");
 }
 };
 // --- END: handleSearch function for geocoding ---


 // Normalize active filters for case-insensitive comparison
 const normalizedActiveFilters = activeFilters
 .filter(Boolean)
 .map((f) => (f || '').trim().toLowerCase());

 // Helper function to calculate distance between two lat/lon points
 function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
 const R = 6371; // Radius of the earth in km
 const dLat = deg2rad(lat2 - lat1);
 const dLon = deg2rad(lon2 - lon1); // Corrected: Should be deg2rad(lon2 - lon1)
 const a =
 Math.sin(dLat / 2) * Math.sin(dLat / 2) +
 Math.cos(deg2rad(lat1)) *
 Math.cos(deg2rad(lat2)) *
 Math.sin(dLon / 2) *
 Math.sin(dLon / 2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 const d = R * c; // Distance in km
 return d;
 }

// Debounce hook
function useDebounce(value, delay) {
 const [debouncedValue, setDebouncedValue] = useState(value);

 useEffect(() => {
 const handler = setTimeout(() => {
 setDebouncedValue(value);
 }, delay);

 return () => {
 clearTimeout(handler);
 };
 }, [value, delay]);

 return debouncedValue;
}

// Live search suggestions
const debouncedSearchTerm = useDebounce(searchTerm, 300); // Wait 300ms after typing

useEffect(() => {
 if (!debouncedSearchTerm.trim()) {
 setSuggestions([]);
 return;
 }

 const fetchSuggestions = async () => {
 try {
 const response = await fetch(
 `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedSearchTerm)}&limit=5`
 );
 const data = await response.json();
 if (data && data.length > 0) {
 setSuggestions(data);
 } else {
 setSuggestions([]);
 }
 } catch (error) {
 console.error("Error fetching suggestions:", error);
 setSuggestions([]);
 }
 };

 fetchSuggestions();
}, [debouncedSearchTerm]);

 // Helper function to convert degrees to radians
 function deg2rad(deg) {
 return deg * (Math.PI / 180);
 }

 // Filter markers based on active filters and user location (within 10km radius)
 const filteredMarkers =
 activeFilters.length === 0 || !userLocation
 ? [...markers, ...predefinedMarkers] // Only show user-added and predefined if no filters are active
 : [
 ...markers.filter(
 (marker) =>
 marker.category &&
 normalizedActiveFilters.includes(
 marker.category.trim().toLowerCase()
 ) &&
 getDistanceFromLatLonInKm(
 userLocation.lat,
 userLocation.lng,
 marker.position.lat,
 marker.position.lng
 ) <= 10
 ),
 ...predefinedMarkers.filter(
 (marker) =>
 marker.category &&
 normalizedActiveFilters.includes(
 marker.category.trim().toLowerCase()
 ) &&
 getDistanceFromLatLonInKm(
 userLocation.lat,
 userLocation.lng,
 marker.position.lat,
 marker.position.lng
 ) <= 10
 ),
 // Fetched markers are now already filtered by category due to the new useEffect
 // We still need to filter by distance here
 ...fetchedMarkers.filter(
 (marker) =>
 getDistanceFromLatLonInKm(
 userLocation.lat,
 userLocation.lng,
 marker.position.lat,
 marker.position.lng
 ) <= 10
 ),
 ];


 const fetchWeather = async (lat = userLocation?.lat, lng = userLocation?.lng) => {
 const apiKey = '21fc67147755e1e200b36618e837e9e3'; // ← Replace this with real key or use env var
 if (!lat || !lng) {
 console.warn("Latitude or longitude missing");
 return;
 }


 const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
 try {
 const response = await fetch(url);
 if (!response.ok) {
 throw new Error(`HTTP error! Status: ${response.status}`);
 }
 const data = await response.json();
 setWeatherData(data);
 } catch (error) {
 console.error('Error fetching weather:', error);
 setWeatherData(null);
 }
};

const WeatherOnMove = () => {
 const map = useMap();

 useEffect(() => {
 if (!map) return;

 const handleMoveEnd = () => {
 const center = map.getCenter();
 fetchWeather(center.lat, center.lng);
 };

 map.on('moveend', handleMoveEnd);

 return () => {
 map.off('moveend', handleMoveEnd);
 };
 }, [map]);

 return null;
};


const debouncedFetchWeather = useRef(
 debounce((lat, lng) => {
 fetchWeather(lat, lng);
 }, 500)
).current;

useEffect(() => {
 if (userLocation) {
 debouncedFetchWeather(userLocation.lat, userLocation.lng);
 }
}, [userLocation, debouncedFetchWeather]);



console.log("MapView rendering");

 return (
 // Wrap everything in a React Fragment to satisfy JSX single root element requirement
 <>

 <style>
 {`
 body, html, input, button, select, div {
 font-family: 'Arial', 'Helvetica', sans-serif;
 font-size: 16px;
 color: #333;
 }

 /* Optional: Make sure leaflet map text also uses the same font */
 .leaflet-container {
 font-family: 'Arial', 'Helvetica', sans-serif;
 }
 `}
</style>
 <style>
 {`
 .filter-button {
 transition: all 0.2s ease;
 }

 .filter-button:hover {
 background-color: #cfe8fc; /* Light blue (lighter than active color) */
 border-color: #0056b3; /* Darker blue border */
 transform: scale(1.05);
 }

 .filter-button.active {
 background-color: #d0e6ff !important;
 border-color: #007bff !important;
 }
 `}
 </style>


 <style>
 {`
 @keyframes fadeSlideUp {
 0% {
 opacity: 0;
 transform: translateY(20px);
 }
 10% {
 opacity: 1;
 transform: translateY(0);
 }
 90% {
 opacity: 1;
 transform: translateY(0);
 }
 100% {
 opacity: 0;
 transform: translateY(-20px);
 }
 }
 `}
 </style>
 <style>
 {`
 .leaflet-control-zoom {
 display: none !important;
 }
 `}
</style>


{/* Saved Notification */}
{savedNotification && (
 <div
 style={{
 position: 'fixed',
 bottom: '20px',
 right: '20px',
 background: '#28a745',
 color: 'white',
 padding: '0.6rem 1rem',
 borderRadius: '5px',
 boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
 zIndex: 1001,
 animation: 'fadeSlideUp 2s ease forwards',
 }}
 >
 Place saved!
 </div>
)}
 <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
{/* Animated Filter Bar */}
<AnimatePresence>
 {showFilterBar && (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.3 }}
 style={{
 position: 'absolute',
 top: '28px',
 left: '23%',
 transform: 'translateX(-50%)',
 zIndex: 1000,
 background: 'transparent',
 padding: '0.5rem 1rem',
 borderRadius: '8px',
 display: 'flex',
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: '0.5rem',
}}
 >
 <span style={{ fontWeight: 'bold', alignSelf: 'center' }}></span>

 {Object.entries(icons).map(([cat, icon], i) => (
 <motion.button
 className={`filter-button ${activeFilters.includes(cat) ? 'active' : ''}`}
 key={cat}
 initial={{ opacity: 0, scale: 0.7 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.7 }}
 transition={{
 type: 'spring',
 stiffness: 500,
 damping: 20,
 delay: i * 0.05,
 }}
 onClick={() => toggleFilter(cat)}
 style={{
 cursor: 'pointer',
 padding: '0.5rem 0.7rem',
 borderRadius: '20px',
 border: activeFilters.includes(cat)
 ? '2px solid #007bff'
 : '1px solid #ccc',
 background: activeFilters.includes(cat) ? '#d0e6ff' : 'white',
 fontSize: '1.05rem',
 display: 'flex',
 alignItems: 'center',
 gap: '0.3rem',
 }}
 title={cat}
 aria-pressed={activeFilters.includes(cat)}
>
 {icon} {cat}
</motion.button>
 ))}

 <motion.button
 initial={{ opacity: 0, scale: 0.7 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.7 }}
 transition={{
 type: 'spring',
 stiffness: 500,
 damping: 20,
 delay: Object.keys(icons).length * 0.05,
 }}
 onClick={clearMarkers}
 style={{
 marginLeft: 'auto',
 padding: '0.3rem 0.6rem',
 borderRadius: '20px',
 border: '1px solid #ccc',
 background: 'transparent',
 cursor: 'pointer',
 }}
 title="Clear all markers"
 >
 
 </motion.button>

 
 </motion.div>
 )}
</AnimatePresence>


 
{/* --- START: New Search Bar Section --- */}

<div
 style={{
 display: 'flex',
 alignItems: 'center',
 padding: '0.5rem 1rem',
 background: 'transparent',
 borderBottom: 'none',
 gap: '10px',
 flexWrap: 'wrap',
 position: 'absolute',
 top: '20px', // Distance from top
 left: '20px', // Distance from left
 zIndex: 1000,
 width: '350px', // Fixed width for consistency
 maxWidth: '90%', // Optional: prevent overflow on small screens
 }}
>
 {/* Search Bar Wrapper with Icon Inside */}
 <div
 style={{
 position: 'relative',
 width: '350px',
 maxWidth: '90%',
 }}
 >
 <input
 type="text"
 placeholder="Search Near Me"
 value={searchTerm}
 onChange={(e) => {
 setSearchTerm(e.target.value);
 setShowFilterBar(true);
 }}
 onFocus={() => setShowFilterBar(true)}
 onBlur={() => setTimeout(() => setShowFilterBar(false), 150)}
 onKeyPress={(e) => {
 if (e.key === 'Enter') {
 handleSearch();
 setShowFilterBar(false);
 setSuggestions([]);
 }
 }}
 style={{
 width: '100%',
 padding: '17px 45px 17px 15px', // Add padding on both sides
 borderRadius: '25px',
 border: '1px solid #ccc',
 fontSize: '0.9em',
 boxSizing: 'border-box',
 whiteSpace: 'nowrap',
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 cursor: 'text',
 }}
 />

 {/* Search Button / Icon - Positioned Absolutely */}
 <button
 onClick={handleSearch}
 style={{
 position: 'absolute',
 right: '15px',
 top: '50%',
 transform: 'translateY(-50%)',
 background: 'transparent',
 border: 'none',
 color: '#888',
 fontSize: '1.4em',
 cursor: 'pointer',
 zIndex: 1,
 transition: 'transform 0.2s ease, box-shadow 0.2s ease', // Smooth transition
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.transform = 'translateY(-50%) scale(1.15)';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.transform = 'translateY(-50%)';
 e.currentTarget.style.boxShadow = 'none';
 }}
 aria-label="Search"
 >
 🔍
 </button>
 </div>

 {/* Autocomplete Suggestions */}
 {suggestions.length > 0 && (
 <div
 style={{
 position: 'absolute',
 top: '60px',
 left: '45%',
 transform: 'translateX(-50%)',
 width: '300px',
 background: '#fff',
 border: '1px solid #ddd',
 borderTop: 'none',
 maxHeight: '200px',
 overflowY: 'auto',
 boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
 zIndex: 999,
 borderRadius: '8px',
 }}
 >
 {suggestions.map((result) => {
 const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
 return (
 <div
 key={result.place_id}
 style={{
 display: 'flex',
 justifyContent: 'space-between',
 alignItems: 'center',
 padding: '10px',
 borderBottom: '1px solid #eee',
 }}
 >
 <div
 onClick={() => {
 setNewMarkerPosition(latlng);
 setPlaceName(result.name || result.display_name.split(',')[0]);
 setCategory('Other');
 setAddress(result.display_name);
 setShowForm(false);
 setSearchTerm('');
 setSuggestions([]);
 if (mapRef.current) {
 mapRef.current.setView(latlng, 16);
 }
 }}
 style={{
 flex: 1,
 cursor: 'pointer',
 }}
 >
 <strong>{result.name || result.display_name.split(',')[0]}</strong>
 <br />
 <div
 style={{
 fontSize: '0.85em',
 color: '#555',
 maxHeight: '3em',
 overflowY: 'auto',
 marginTop: '4px',
 paddingRight: '10px',
 whiteSpace: 'normal',
 wordBreak: 'break-word',
 }}
 >
 {result.display_name}
 </div>
 </div>

 {/* Save Button */}
 <button
 onClick={(e) => {
 e.stopPropagation();
 setNewMarkerPosition(latlng);
 setPlaceName(result.name || result.display_name.split(',')[0]);
 setCategory('Other');
 setShowForm(true);
 setSearchTerm('');
 setSuggestions([]);
 }}
 style={{
 marginLeft: '10px',
 padding: '5px 10px',
 background: '#007bff',
 color: 'white',
 border: 'none',
 borderRadius: '5px',
 fontSize: '0.8em',
 cursor: 'pointer',
 }}
 >
 Save Place
 </button>
 </div>
 );
 })}
 </div>
 )}
</div>
{/* --- END: New Search Bar Section --- */}




 

<AnimatePresence>
 {showSidebar && (
 <motion.div
 key="sidebar"
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
 style={{
 width: '300px',
 height: '100%',
 position: 'fixed',
 right: 0,
 top: 0,
 zIndex: 999,
 background: 'white',
 boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
 padding: '1rem',
 overflowY: 'auto',
 }}
 >
 {/* Back Arrow */}
 <div style={{
 marginBottom: '1rem',
 textAlign: 'left'
 }}>
 <span
 onClick={() => setShowSidebar(false)}
 style={{
 fontSize: '1.5rem',
 cursor: 'pointer',
 color: '#007bff',
 fontWeight: 'bold',
 borderRadius: "20px",
 transition: 'all 0.2s ease',
 display: 'inline-block', // Allows transform effects
 padding: '5px 10px',
 boxShadow: '0 2px 4px rgba(0, 0, 0, 0)' // Default no shadow
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.transform = 'scale(1.1)';
 e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
 e.currentTarget.style.backgroundColor = '#f0f8ff';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.transform = 'scale(1)';
 e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0)';
 e.currentTarget.style.backgroundColor = 'transparent';
 }}
 aria-label="Close sidebar"
>
 ←
</span>
</div>

 {/* Heading */}
 <h3
 style={{
 fontSize: '1.5rem',
 textAlign: 'center',
 fontWeight: 'bold',
 marginBottom: '1rem',
 borderBottom: '1px solid #ddd',
 paddingBottom: '0.5rem',
 color: '#333'
 }}
 >
 Saved Places
 </h3>

 {/* Saved Markers list */}
{markers.length === 0 ? (
 <p style={{ fontSize: '0.9rem', color: '#666' }}>
 No custom markers added yet.
 </p>
) : (
 markers.map((marker) => (
 <div
 key={marker.id}
 style={{
 marginBottom: '1rem',
 padding: '0.5rem',
 borderBottom: '1px dashed #eee',
 fontSize: '0.95rem',
 }}
 >
 <strong>{marker.name}</strong>
 <br />
 Category: {marker.category}
 <br />
 {marker.address !== 'OpenStreetMap POI' && (
 <em style={{ fontSize: '0.85em', color: '#555' }}>{marker.address}</em>
 )}
 </div>
 ))
)}

 <button
 onClick={clearMarkers}
 style={{
 marginTop: '1rem',
 padding: '0.4rem 0.8rem',
 background: '#dc3545',
 color: 'white',
 border: 'none',
 borderRadius: '5px',
 cursor: 'pointer',
 width: '100%',
 fontSize: '0.9rem',
 transition: 'background 0.3s ease, transform 0.2s ease',
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.background = '#c82333'; // Darker red
 e.currentTarget.style.transform = 'scale(1.02)';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.background = '#dc3545';
 e.currentTarget.style.transform = 'scale(1)';
 }}
>
 Clear All Saved Markers
</button>

 {/* Back Arrow + Heading */}
<div style={{
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'flex-start',
 marginBottom: '1rem'
}}>
 
</div>
 </motion.div>
 )}
</AnimatePresence>

 <div style={{ flex: 1, position: 'relative' }}>
 {showForm && newMarkerPosition && (
 <div
 style={{
 position: 'absolute',
 top: '20%',
 left: '50%',
 transform: 'translateX(-50%)',
 zIndex: 1000,
 background: 'white',
 padding: '1.5rem',
 border: '1px solid black',
 borderRadius: '8px',
 maxWidth: '350px',
 boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
 }}
 >
 <button
 onClick={() => {
 setShowForm(false);
 setNewMarkerPosition(null);
 setPlaceName('');
 setCategory('School');
 setAddress('');
 }}
 style={{
 position: 'absolute',
 top: '10px',
 right: '15px',
 background: 'transparent',
 border: 'none',
 fontSize: '1.5rem',
 cursor: 'pointer',
 color: '#333',
 }}
 aria-label="Close form"
 >
 ×
 </button>

 <h3 style={{ marginTop: '0', marginBottom: '1rem', textAlign: 'center' }}>Add New Place</h3>
 <form onSubmit={handleSubmit}>
 <label style={{ display: 'block', marginBottom: '0.8rem' }}>
 Place Name:
 <input
 type="text"
 value={placeName}
 onChange={(e) => setPlaceName(e.target.value)}
 required
 style={{ width: 'calc(100% - 10px)', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
 />
 </label>
 <label style={{ display: 'block', marginBottom: '0.8rem' }}>
 Category:
 <select
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
 >
 <option value="School">School</option>
 <option value="Fast Food">Fast Food</option>
 <option value="Gym">Gym</option>
 <option value="Work">Work</option>
 <option value="Other">Other</option>
 <option value="Bank">Bank</option>
 <option value="Gas Station">Gas Station</option>
 </select>
 </label>
 <div>
 
 
 {address}
 </div>
 <button
 type="submit"
 style={{
 width: '100%',
 padding: '10px',
 background: '#007bff',
 color: 'white',
 border: 'none',
 borderRadius: '5px',
 cursor: 'pointer',
 fontSize: '1rem'
 }}
 >
 Add Marker
 </button>
 </form>
 </div>
 )}

 {userLocation && newMarkerPosition && showForm && (
 <button
 onClick={() => handleGetDirections(newMarkerPosition)}
 style={{
 position: 'absolute',
 bottom: '10px',
 left: '10px',
 zIndex: 1000,
 padding: '0.5rem 1rem',
 background: '#007bff',
 color: 'white',
 border: 'none',
 borderRadius: '5px',
 cursor: 'pointer',
 boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
 }}
 >
 
 </button>
 )}


 {/* Sidebar Toggle Button - Always Visible in Top Right */}
<div style={{
 position: 'absolute',
 top: '21px',
 right: '-10px',
 zIndex: 1000,
}}>
 {!showSidebar && (
 <button
 onClick={() => setShowSidebar(true)}
 style={{
 padding: '10px 12px',
 borderRadius: '20px 0 0 20px',
 border: '1px solid #ccc',
 background: 'white',
 fontSize: '1rem',
 fontWeight: 'bold',
 cursor: 'pointer',
 boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
 transition: 'background 0.3s ease',
 }}
 onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
 onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
 aria-label="Open Sidebar"
 >
 ☰ Saved Places
 </button>
 )}
</div><MapContainer
 center={[43.68, -79.76]}
 zoom={12}
 style={{ width: '100%', height: '100%' }}
 whenCreated={(mapInstance) => {
 mapRef.current = mapInstance;
 }}
 className="leaflet-container"
 >
 <TileLayer
 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
 />
 
 <LocateUser 
 onLocate={setUserLocation} 
 setUserLocation={setUserLocation} 
 setShowUserPopup={setShowUserPopup} 
/>


 {filteredMarkers.map((marker) => {
 const isFetched = marker.id.startsWith('osm-');
 

 const distance = userLocation
 ? getDistanceFromLatLonInKm(
 userLocation.lat,
 userLocation.lng,
 marker.position.lat,
 marker.position.lng
 ).toFixed(2)
 : null;

 // New function to handle marker deletion
 const handleDeleteMarker = (markerId) => {
 const updatedMarkers = markers.filter((m) => m.id !== markerId);
 setMarkers(updatedMarkers);
 localStorage.setItem('markers', JSON.stringify(updatedMarkers));
 };

 
const alreadySaved = markers.some((m) => m.id === marker.id);

return (
 <Marker key={marker.id} position={marker.position} icon={categoryIcons[marker.category] || categoryIcons.Other}>
 <Popup>
 <strong>{marker.name}</strong>
 <br />
 Category: {marker.category}
 <br />
 <em>{marker.address}</em>
 {distance && (
 <>
 <br />
 <strong>Distance:</strong> {distance} km from your location
 </>
 )}

 {/* Show Save button only if fetched and not already saved */}
 {isFetched && !alreadySaved && (
 <button
 onClick={(e) => {
 e.stopPropagation();

 const newSaved = {
 // If marker doesn't have an ID or it's from Overpass, use a UUID
 id: marker.id ? `${marker.id}-${uuidv4()}` : uuidv4(),
 position: marker.position,
 name: marker.name,
 category: marker.category,
 address: marker.address,
};

 const updated = [...markers, newSaved];
 setMarkers(updated);
 localStorage.setItem('markers', JSON.stringify(updated));

 setNewMarkerPosition(null);
 setShowForm(false);

 // ✅ Show notification
 setSavedNotification("Place saved!");

 // ✅ Hide after 2 seconds
 setTimeout(() => {
 setSavedNotification(null);
 }, 2000);
 }}
 style={{
 marginTop: '0.5rem',
 padding: '0.3rem 0.6rem',
 background: '#007bff',
 color: 'white',
 border: 'none',
 borderRadius: '5px',
 cursor: 'pointer',
 fontSize: '0.9em'
 }}
 >
 Save Place
 </button>
 )}

 {/* Show Delete button if already saved */}
 {alreadySaved && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteMarker(marker.id);
 }}
 style={{
 marginTop: '0.5rem',
 marginLeft: '',
 padding: '0.3rem 0.6rem',
 background: '#dc3545',
 color: 'white',
 border: 'none',
 borderRadius: '5px',
 cursor: 'pointer',
 fontSize: '0.9em'
 }}
 >
 Delete
 </button>
 )}
 
 </Popup>
 </Marker>
 );
 })}



 {userLocation && (
 <Marker
 position={userLocation}
 icon={userIcon}
 eventHandlers={{
 click: () => {
 setShowUserPopup(true);

 }
 }}
 >
 {showUserPopup && (
 <Popup>
 <strong>You are here</strong>
 </Popup>
 )}
 </Marker>
)}




{weatherData?.main?.temp && weatherData.name && (
 <div
 style={{
 position: 'absolute',
 bottom: '60px',
 left: '30px',
 zIndex: 1000,
 background: 'rgba(255, 255, 255, 0.9)',
 padding: '8px 12px',
 borderRadius: '20px',
 boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
 cursor: 'pointer',
 display: 'flex',
 alignItems: 'center',
 gap: '8px',
 transition: 'background 0.3s ease',
 }}
 onClick={() => setShowWeatherDetails(true)}
 onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 1)'}
 onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'}
 >
 <img
 src={`http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`}
 alt={weatherData.weather[0].description}
 style={{ height: '30px' }}
 />
 <strong>{Math.round(weatherData.main.temp)}°C</strong>
 <span>{weatherData.name}</span>
 </div>
)}

 <WeatherOnMove /> {/* ← Add this line */}
 </MapContainer>
 </div> {/* Closing div for flex: 1 map content */}
 </div> {/* Closing div for display: flex, flex: 1 body below filter bar */}
 {/* Closing div for display: flex, flexDirection: column, height: 100vh */}
 </> // Closing the React Fragment
 );
};

export default MapView;