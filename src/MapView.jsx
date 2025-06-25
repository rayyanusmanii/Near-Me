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
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'; 
import 'leaflet-control-geocoder'; 
import { motion, AnimatePresence } from 'framer-motion';
import pinIcon from './assets/pin.png';
import { debounce } from 'lodash';






const userIcon = new L.Icon({
 iconUrl: pinIcon,
 iconSize: [45, 45], 
 iconAnchor: [12, 41],
 popupAnchor: [1, -34],
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
 shadowSize: [41, 41]
});


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

 onLocate(e.latlng);
 setShowUserPopup(true);

 setTimeout(() => {
 setShowUserPopup(false);
 }, 5000);
 });

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

const RoutingMachine = ({ from, to, routingStateSetter }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !from || !to) {
      routingStateSetter(false);
      return;
    }
const createPlan = L.Routing.Plan.extend({
  createGeocoders: function () {
    const container = L.DomUtil.create('div', 'leaflet-routing-plan');
    L.DomEvent.disableClickPropagation(container);

    
    const closeBtn = L.DomUtil.create('button', '', container);
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background-color: transparent;
      color: red;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      line-height: 20px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      float: right;
      margin: 8px;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;

    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.transform = 'scale(1.2)';
      closeBtn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.transform = 'scale(1)';
      closeBtn.style.boxShadow = 'none';
    });

    
    L.DomEvent.on(closeBtn, 'click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (routingControlRef.current && routingControlRef.current._map) {
        routingControlRef.current.remove();
        routingStateSetter(false);
        routingControlRef.current = null;
      }
    });

    return container;
  }
});


    const plan = new createPlan([
      L.latLng(from.lat, from.lng),
      L.latLng(to.lat, to.lng)
    ], {
      geocoder: L.Control.Geocoder.nominatim(),
      routeWhileDragging: true,
      createMarker: () => null
    });

    const routingControl = L.Routing.control({
  plan: plan,
  lineOptions: {
    styles: [{ color: 'blue', weight: 6, opacity: 0.7 }]
  },
  showAlternatives: false,
  addWaypoints: false,
  routeWhileDragging: true,
  waypoints: []
});


    routingControl.addTo(map);
    routingControlRef.current = routingControl;
    routingStateSetter(true);

   
setTimeout(() => {
  const closeBtn = document.querySelector('.leaflet-routing-collapse-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (routingControlRef.current && routingControlRef.current._map) {
        routingControlRef.current.remove();
        routingStateSetter(false);
        routingControlRef.current = null;
      }
    });
  }
}, 0); 
    const onCollapsed = () => {
      if (routingControlRef.current && routingControlRef.current._map) {
        routingControlRef.current.remove(); 
      }
      routingStateSetter(false); 
      routingControlRef.current = null;
    };

    routingControl.on('collapsed', onCollapsed);


  
    return () => {
      if (routingControlRef.current && routingControlRef.current._map) {
        routingControlRef.current.off('collapsed', onCollapsed);
        routingControlRef.current.remove();
      }
      routingStateSetter(false);
    };
  }, [map, from, to, routingStateSetter]);

  return null;
};





const MapView = () => {
 const [markers, setMarkers] = useState([]); 
 const [showForm, setShowForm] = useState(false); 
 const [showSidebar, setShowSidebar] = useState(false); 
 const [newMarkerPosition, setNewMarkerPosition] = useState(null); 
 const [placeName, setPlaceName] = useState(''); 
 const [category, setCategory] = useState('School'); 
 const [userLocation, setUserLocation] = useState(null); 
 const [address, setAddress] = useState(''); 
 const [activeFilters, setActiveFilters] = useState([]); 
 const mapRef = useRef(null); 
 const [routing, setRouting] = useState(null); 
 const [fetchedMarkers, setFetchedMarkers] = useState([]); 


 const [searchTerm, setSearchTerm] = useState('');
 const [showFilterBar, setShowFilterBar] = useState(false);
 const [, setSearchResults] = useState([]);
 const [savedNotification, setSavedNotification] = useState(null);
 const [showUserPopup, setShowUserPopup] = useState(false);
 const [suggestions, setSuggestions] = useState([]); 
 const [weatherData, setWeatherData] = useState(null);
 const [, setShowWeatherDetails] = useState(false);
 const [, setIsRoutingActive] = useState(false); 
 const [showWeatherDetailsHover, setShowWeatherDetailsHover] = useState(false);



 const predefinedMarkers = [
 ];


 console.log("Current state:", {
 userLocation,
 routing,
 markers: markers.length,
 activeFilters: activeFilters.join(','),
 searchTerm,
});




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
 opacity: 0;
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


 fetchWeather(newMarkerPosition.lat, newMarkerPosition.lng);
};


 const clearMarkers = () => {
 setMarkers([]);
 localStorage.removeItem('markers');
 setRouting(null); 
 };

const handleGetDirections = useCallback((markerPosition) => {
    console.log("handleGetDirections called", { userLocation, markerPosition });

    if (!userLocation) {
        alert("Please allow location access to get directions.");
        return;
    }

   
    setRouting({
        from: userLocation,
        to: markerPosition
    });
    setIsRoutingActive(true);

}, [userLocation]);


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
}, [userLocation]); 

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
}, [fetchOverpassData, activeFilters, userLocation]);




 const toggleFilter = (cat) => {
 setActiveFilters((prevFilters) => {
 if (prevFilters.includes(cat)) {

 return prevFilters.filter((c) => c !== cat);
 } else {

 return [...prevFilters, cat];
 }
 });
 setRouting(null); 
 };


 const handleSearch = async () => {
 if (!searchTerm.trim()) {
 alert("Please enter a place or address to search.");
 return;
 }

 try {

 const response = await fetch(
 `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&addressdetails=1` // 
 );
 const data = await response.json();

 if (data && data.length > 0) {
 setSearchResults(data); 
 if (mapRef.current) {
 mapRef.current.setView([data[0].lat, data[0].lon], 14); 
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
 const normalizedActiveFilters = activeFilters
 .filter(Boolean)
 .map((f) => (f || '').trim().toLowerCase());


 function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
 const R = 6371; 
 const dLat = deg2rad(lat2 - lat1);
 const dLon = deg2rad(lon2 - lon1); 
 const a =
 Math.sin(dLat / 2) * Math.sin(dLat / 2) +
 Math.cos(deg2rad(lat1)) *
 Math.cos(deg2rad(lat2)) *
 Math.sin(dLon / 2) *
 Math.sin(dLon / 2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 const d = R * c; 
 return d;
 }


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


const debouncedSearchTerm = useDebounce(searchTerm, 300); 

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


 function deg2rad(deg) {
 return deg * (Math.PI / 180);
 }

 const filteredMarkers =
 activeFilters.length === 0 || !userLocation
 ? [...markers, ...predefinedMarkers]
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
 const apiKey = '21fc67147755e1e200b36618e837e9e3'; 
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

useEffect(() => {
  const originalClearLines = L.Routing.Control.prototype._clearLines;

  L.Routing.Control.prototype._clearLines = function () {
    try {
      if (this._map && this._lineLayers) {
        this._lineLayers.forEach((layer) => {
          try {
            this._map.removeLayer(layer);
          } catch (err) {
            console.warn("Error removing layer:", err);
          }
        });
      }
    } catch (e) {
      console.warn("Safe _clearLines error:", e);
    }

    
    try {
      return originalClearLines.call(this);
    } catch (err) {
      console.warn("Calling original _clearLines failed:", err);
    }
  };

  return () => {
    L.Routing.Control.prototype._clearLines = originalClearLines;
  };
}, []);



console.log("MapView rendering");

 return (

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
    /* Customize the main directions panel */
    .leaflet-routing-container {
      background-color: #ffffff !important;
      border-radius: 20px !important;
      top: 50px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      font-family: Arial, sans-serif !important;
      overflow: hidden !important;
    }

    /* Customize the summary row at the top */
    .leaflet-routing-summary {
      background-color: #e9ecef !important;
      color: #333 !important;
      font-weight: bold !important;
      text-align: center !important;
      padding: 10px !important;
    }

    /* Customize each step in the itinerary */
    .leaflet-routing-itinerary {
      background-color: #f9f9f9 !important;
      margin-bottom: 10px !important;
      border-radius: 8px !important;
      padding: 10px !important;
    }

    /* Customize waypoint markers */
    .leaflet-routing-waypoint-indicator {
      background-color: #007bff !important;
      border-color: #0056b3 !important;
    }

    /* Optional: Style the close button */
    .leaflet-routing-collapse-btn {
      background-color: #dc3545 !important;
      color: white !important;
      border-radius: 50% !important;
      width: 24px !important;
      height: 24px !important;
      line-height: 20px !important;
      text-align: center !important;
      font-size: 18px !important;
      font-weight: bold !important;
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
 top: '20px', 
 left: '20px', 
 zIndex: 1000,
 width: '350px', 
 maxWidth: '90%', 
 }}
>

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
 padding: '17px 45px 17px 15px', 
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
 transition: 'transform 0.2s ease, box-shadow 0.2s ease', 
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
 display: 'inline-block', 
 padding: '5px 10px',
 boxShadow: '0 2px 4px rgba(0, 0, 0, 0)' 
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
 padding: '0.5rem 0.8rem',
 background: '#dc3545',
 color: 'white',
 border: 'none',
 borderRadius: '20px',
 cursor: 'pointer',
 width: '100%',
 fontSize: '0.9rem',
 transition: 'background 0.3s ease, transform 0.2s ease',
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.background = '#c82333'; 
 e.currentTarget.style.transform = 'scale(1.02)';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.background = '#dc3545';
 e.currentTarget.style.transform = 'scale(1)';
 }}
>
 Clear All Saved Markers
</button>


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


 {routing && <RoutingMachine from={routing.from} to={routing.to} routingStateSetter={setIsRoutingActive} />}


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


 const handleDeleteMarker = (markerId) => {
 const updatedMarkers = markers.filter((m) => m.id !== markerId);
 setMarkers(updatedMarkers);
 localStorage.setItem('markers', JSON.stringify(updatedMarkers));
 setRouting(null); 
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


 {userLocation && ( 
 <button
 onClick={() => handleGetDirections(marker.position)}
 style={{
 marginTop: '0.5rem',
 padding: '0.3rem 0.6rem',
 background: '#007bff',
 color: 'white',
 border: 'none',
 borderRadius: '5px',
 cursor: 'pointer',
 fontSize: '0.9em',
 marginRight: '0.5rem'
 }}
 >
 Get Directions From Your Location 
 </button>
 )}


 {isFetched && !alreadySaved && (
 <button
 onClick={(e) => {
 e.stopPropagation();

 const newSaved = {

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


 setSavedNotification("Place saved!");


 setTimeout(() => {
 setSavedNotification(null);
 }, 2000);
 }}
 style={{
 marginTop: '0.5rem',
 padding: '0.3rem 0.6rem',
 background: '#28a745',
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
      background: 'rgba(195, 189, 189, 0.9)',
      padding: '8px 12px',
      borderRadius: '20px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}
    onMouseEnter={() => setShowWeatherDetailsHover(true)}
    onMouseLeave={() => setShowWeatherDetailsHover(false)}
    onClick={() => setShowWeatherDetails(true)} 
  >
    <img
      src={`http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`}
      alt={weatherData.weather[0].description}
      style={{ height: '30px' }}
    />
    <strong>{Math.round(weatherData.main.temp)}°C</strong>
    <span>{weatherData.name}</span>

    {showWeatherDetailsHover && (
      <div
        style={{
          position: 'absolute',
          bottom: '50px',
          left: '0%',
          background: '#ffffff',
          padding: '10px 15px',
          borderRadius: '10px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
          fontSize: '0.85rem',
          color: '#333',
          minWidth: '160px',
        }}
      >
        <div><strong>Feels Like:</strong> {Math.round(weatherData.main.feels_like)}°C</div>
        <div><strong>Wind:</strong> {(weatherData.wind.speed * 3.6).toFixed(1)} km/h</div>
        <div><strong>Humidity:</strong> {weatherData.main.humidity}%</div>
        <div><strong>Condition:</strong> {weatherData.weather[0].description}</div>
      </div>
    )}
  </div>
)}


 <WeatherOnMove /> 
 </MapContainer>
 </div> 
 </div> 
 
 </> 
 );
};

export default MapView;