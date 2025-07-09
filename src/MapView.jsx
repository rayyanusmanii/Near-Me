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
import pinIcon from './assets/pin.png'; // Ensure this path is correct
import { debounce } from 'lodash';

// MapPanner Component: Responsible for panning the map when targetPosition changes
function MapPanner({ targetPosition }) {
  const map = useMap();

  useEffect(() => {
    if (targetPosition) {
      const currentCenter = map.getCenter();
      const distance = currentCenter.distanceTo(targetPosition);

      // Only pan if the distance is significant or zoom level is different
      // This prevents constant re-panning for tiny shifts
      if (distance > 10 || map.getZoom() !== 12) { // You can adjust the '10' for sensitivity
        map.setView(targetPosition, 12);
      }
    }
  }, [targetPosition, map]);

  return null;
}

// Custom icon for the user's current location
const userIcon = new L.Icon({
  iconUrl: pinIcon,
  iconSize: [45, 45],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

// Custom icon for the trip destination - NEW UNIQUE ICON
const uniqueTripDestinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png', // Example: a black marker
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icons for different categories displayed in the filter bar
const icons = {
  School: '🏫',
  'Fast Food': '🍔',
  Gym: '🏋️',
  Bank: '🏦',
  'Gas Station': '⛽',
};

// Component to locate the user's current position on the map
// Modified to accept setMapCenter
function LocateUser({ onLocate, setShowUserPopup, setMapCenter }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: true
    }).on('locationfound', function (e) {
      onLocate(e.latlng); // This sets userLocation
      setMapCenter(e.latlng); // <--- ADDED: Set mapCenter to user's location
      setShowUserPopup(true);

      setTimeout(() => {
        setShowUserPopup(false);
      }, 5000);
    });

    map.on('locationerror', function (e) {
      console.error("Location error:", e.message);
      alert("Could not retrieve your location. Please ensure location services are enabled.");
    });

    return () => {
      map.off('locationfound');
      map.off('locationerror');
    };
  }, [map, onLocate, setShowUserPopup, setMapCenter]);
  // Added setMapCenter to dependency array
  return null;
}

// Custom icons for different marker categories
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

// RoutingMachine component to display directions between two points
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

  // RENAMED searchTerm to nearMeSearchTerm
  const [nearMeSearchTerm, setNearMeSearchTerm] = useState('');
  // MODIFIED: Initial state of showFilterBar is now false
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [, setSearchResults] = useState([]);
  const [savedNotification,] = useState(null);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [,] = useState(false);
  const [, setIsRoutingActive] = useState(false);
  const [showWeatherDetailsHover, setShowWeatherDetailsHover] = useState(false);

  const [tripDestination, setTripDestination] = useState(null);
  const [destinationSearchTerm, setDestinationSearchTerm] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  // NEW STATES FOR SEARCH BAR BEHAVIOR
  const [currentSearchType, setCurrentSearchType] = useState('nearMe'); // 'nearMe' or 'destination'
  const [showSearchOptions, setShowSearchOptions] = useState(false); // Controls visibility of the switch button
  const searchContainerRef = useRef(null); // Ref for the main search bar container

  // NEW STATE: Controls where the map should pan to
  const [mapCenter, setMapCenter] = useState(null);

  // NEW STATE: For custom notifications (replacing alerts)
  const [customNotification, setCustomNotification] = useState(null);
  const predefinedMarkers = []; // Your predefined markers if any

  // At the top of your MapView component, with other useRefs
  const sidebarRef = useRef(null);

  console.log("Current state:", {
    userLocation,
    routing,
    markers: markers.length,
    activeFilters: activeFilters.join(','),
    nearMeSearchTerm, // Use new state name
    tripDestination,
    currentSearchType, // New state
    showSearchOptions, // New state
    mapCenter, // New state
    customNotification, // New state
    showFilterBar // Diagnostic for filter bar visibility
  });

  // Diagnostic useEffect for sidebarRef.current and showSidebar state
  useEffect(() => {
    console.log("showSidebar state changed to:", showSidebar);
    if (showSidebar) {
      // Small delay to allow DOM to update before checking ref
      setTimeout(() => {
        console.log("Sidebar is supposed to be visible. sidebarRef.current:", sidebarRef.current);
      }, 50);
    }
  }, [showSidebar]);


  useEffect(() => {
    const stored = localStorage.getItem('markers');
    if (stored) setMarkers(JSON.parse(stored));
    const storedDestination = localStorage.getItem('tripDestination');
    if (storedDestination) {
      setTripDestination(JSON.parse(storedDestination));
      // REMOVED: setShowFilterBar(true) from here. Filters should only show on search bar click.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tripDestination', JSON.stringify(tripDestination));
    // When tripDestination changes, update filter bar visibility
    // If tripDestination is set, keep filter bar visible
    // If tripDestination is cleared, hide filter bar unless a search input is focused
    // This logic is now primarily handled by the onBlur of the search container
  }, [tripDestination]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes bounceIn {
        0% { opacity: 0; transform: translateX(-50%) scale(0.7); }
        50% { opacity: 1; transform: translateX(-50%) scale(1.05); }
        70% { transform: translateX(-50%) scale(0.95); }
        100% { opacity: 0; transform: translateX(-50%) scale(1); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // --- MOVED handleDeleteMarker HERE ---
  const handleDeleteMarker = useCallback((markerId) => {
    console.log("CLICKED: Delete Marker Button (from Popup or Sidebar) -", markerId); // Diagnostic log
    const updatedMarkers = markers.filter((m) => m.id !== markerId);
    setMarkers(updatedMarkers);
    localStorage.setItem('markers', JSON.stringify(updatedMarkers));
    setRouting(null); // Clear routing if a deleted marker was part of a route
    setCustomNotification({ message: "Place deleted!", type: 'success' }); // ADDED CUSTOM NOTIFICATION
  }, [markers]); // Add markers to dependency array

  // At the top of your MapView component, with other useRefs
  const handleSearchContainerBlur = useCallback((event) => {
    // Give a small delay to allow click events on buttons/suggestions/sidebar to register
    setTimeout(() => {
      const focusedElement = document.activeElement; // The element that currently has focus

      // Check if the element that gained focus is within the search container itself,
      // or within the sidebar (if it exists).
      const isFocusInsideSearch = searchContainerRef.current && searchContainerRef.current.contains(focusedElement);
      const isFocusInsideSidebar = sidebarRef.current && sidebarRef.current.contains(focusedElement);
      const isFocusOnSidebarToggle = document.getElementById('sidebar-toggle-button')?.contains(focusedElement);


      // If focus is truly outside BOTH the search container and the sidebar, then hide search options.
      // We also ensure it's not moving onto the sidebar toggle button itself.
      if (
        !isFocusInsideSearch &&
        !isFocusInsideSidebar &&
        !isFocusOnSidebarToggle
      ) {
        console.log("BLUR: Hiding search options and/or filter bar."); // Diagnostic log
        setShowSearchOptions(false);
        // MODIFIED: Set showFilterBar based solely on tripDestination after blur
        setShowFilterBar(!!tripDestination); // True if tripDestination exists, false otherwise
      } else {
        console.log("BLUR: Focus moved inside search/sidebar, not hiding options."); // Diagnostic log
      }
    }, 100); // Small delay
  }, [tripDestination]); // Dependencies

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
    console.log("CLICKED: Clear All Markers Button"); // Diagnostic log
    setMarkers([]);
    localStorage.removeItem('markers');
    setRouting(null);
    setCustomNotification({ message: "All saved places cleared!", type: 'success' }); // ADDED CUSTOM NOTIFICATION
  };

  // --- MODIFIED handleGetDirections to accept origin and destination ---
  const handleGetDirections = useCallback((origin, destination, type) => {
    console.log(`CLICKED: Get Directions Button from ${type} -`, { origin, destination });

    if (!origin) {
      setCustomNotification({ message: "Origin location is not available to get directions.", type: 'error' });
      return;
    }

    setRouting({
      from: origin,
      to: destination
    });
    setIsRoutingActive(true);
  }, []);

  const fetchOverpassData = useCallback(async (category) => {
    // Determine the relevant location for the Overpass API query
    const locationForSearch = tripDestination || userLocation;
    if (!locationForSearch) return [];

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
        node[${tag}](around:${radius},${locationForSearch.lat},${locationForSearch.lng});
        way[${tag}](around:${radius},${locationForSearch.lat},${locationForSearch.lng});
        relation[${tag}](around:${radius},${locationForSearch.lat},${locationForSearch.lng});
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
        address: el.tags?.addr ? Object.values(el.tags.addr).join(', ') : '',
        category: category,
      })).filter((m) => m.position.lat && m.position.lng);
    } catch (err) {
      console.error('Error fetching Overpass data:', err);
      return [];
    }
  }, [userLocation, tripDestination]); // Added tripDestination as a dependency

  useEffect(() => {
    const fetchAllActiveCategories = async () => {
      const locationForFilter = tripDestination || userLocation; // Prioritize tripDestination
      if (!locationForFilter) {
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
  }, [fetchOverpassData, activeFilters, userLocation, tripDestination]);

  const toggleFilter = (cat) => {
    console.log("CLICKED: Filter Button -", cat); // Diagnostic log
    setActiveFilters((prevFilters) => {
      if (prevFilters.includes(cat)) {
        return prevFilters.filter((c) => c !== cat);
      } else {
        return [...prevFilters, cat];
      }
    });
    setRouting(null);
  };

  // handleSearch function now uses nearMeSearchTerm
  const handleSearch = async () => {
    console.log("CLICKED: Near Me Search Button"); // Diagnostic log
    if (!nearMeSearchTerm.trim()) {
      setCustomNotification({ message: "Please enter a place or address to search.", type: 'error' });
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nearMeSearchTerm)}&limit=5&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResults(data);
        // Removed direct mapRef.current.setView here, MapPanner will handle via mapCenter
        setMapCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }); // <--- Set mapCenter on search
      } else {
        setSearchResults([]);
        setCustomNotification({ message: "No results found for your search.", type: 'error' });
      }
      // MODIFIED: Hide filter bar after search is executed
      setShowFilterBar(false);
    } catch (error) {
      console.error("Error during geocoding search:", error);
      setCustomNotification({ message: "Error searching for place. Please try again.", type: 'error' });
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

  // Debounced search term for general search suggestions (using nearMeSearchTerm)
  const debouncedNearMeSearchTerm = useDebounce(nearMeSearchTerm, 300);

  useEffect(() => {
    if (!debouncedNearMeSearchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedNearMeSearchTerm)}&limit=5`
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
  }, [debouncedNearMeSearchTerm]);

  const debouncedDestinationSearchTerm = useDebounce(destinationSearchTerm, 300);

  useEffect(() => {
    if (!debouncedDestinationSearchTerm.trim()) {
      setDestinationSuggestions([]);
      return;
    }

    const fetchDestinationSuggestions = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedDestinationSearchTerm)}&limit=5`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          setDestinationSuggestions(data);
        } else {
          setDestinationSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching destination suggestions:", error);
        setDestinationSuggestions([]);
      }
    };

    fetchDestinationSuggestions();
  }, [debouncedDestinationSearchTerm]);

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  const filteredMarkers = (() => {
    // *** FIX: Prioritize tripDestination for filtering and distance calculation ***
    const locationToFilterBy = tripDestination || userLocation;

    if (activeFilters.length === 0 || !locationToFilterBy) {
      return [...markers, ...predefinedMarkers];
    }

    const filterAndMapMarkers = (markerArray) => {
      return markerArray.filter(
        (marker) =>
          marker.category &&
          normalizedActiveFilters.includes(marker.category.trim().toLowerCase()) &&
          getDistanceFromLatLonInKm(
            locationToFilterBy.lat,
            locationToFilterBy.lng,
            marker.position.lat,
            marker.position.lng
          ) <= 10
      );
    };

    return [
      ...filterAndMapMarkers(markers),
      ...filterAndMapMarkers(predefinedMarkers),
      ...fetchedMarkers.filter(
        (marker) =>
          getDistanceFromLatLonInKm(
            locationToFilterBy.lat,
            locationToFilterBy.lng,
            marker.position.lat,
            marker.position.lng
          ) <= 10
      ),
    ];
  })();

  const fetchWeather = async (lat, lng) => {
    const apiKey = '21fc67147755e1e200b36618e837e9e3'; // Replace with your actual OpenWeatherMap API Key
    // Use the explicitly passed lat/lng first, then tripDestination, then userLocation
    const fetchLat = lat || tripDestination?.lat || userLocation?.lat;
    const fetchLng = lng || tripDestination?.lng || userLocation?.lng;

    if (!fetchLat || !fetchLng) {
      console.warn("Latitude or longitude missing for weather fetch.");
      return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${fetchLat}&lon=${fetchLng}&appid=${apiKey}&units=metric`;
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
        debouncedFetchWeather(center.lat, center.lng);
      };

      map.on('moveend', handleMoveEnd);

      const initialLocationForWeatherUpdate = tripDestination || userLocation;
      if (initialLocationForWeatherUpdate) {
        debouncedFetchWeather(initialLocationForWeatherUpdate.lat, initialLocationForWeatherUpdate.lng);
      }

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
    const locationForWeatherUpdate = tripDestination || userLocation; // Prioritize tripDestination
    if (locationForWeatherUpdate) {
      debouncedFetchWeather(locationForWeatherUpdate.lat, locationForWeatherUpdate.lng);
    }
  }, [userLocation, tripDestination, debouncedFetchWeather]);

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

  // Effect to automatically clear the custom notification
  useEffect(() => {
    if (customNotification) {
      const timer = setTimeout(() => {
        setCustomNotification(null);
      }, 3000); // Notification disappears after 3 seconds

      return () => clearTimeout(timer); // Clean up the timer
    }
  }, [customNotification]);

  console.log("MapView rendering");

  return (


    
    <>

<style>
  
  
         {/* Existing styles for font-family */}
         {`
           body, html, input, button, select, div {
             font-family: 'Arial', 'Helvetica', sans-serif;
             font-size: 16px;
             color: #333;
           }

           /* --- ADD THIS UNIVERSAL RESET --- */
           body, html, #root {
             margin: 0;
             padding: 0;
             width: 100%;
             height: 100%;
             overflow: hidden; /* Prevent scrollbars from appearing due to tiny overflows */
           }
           /* -------------------------------- */

           .leaflet-container {
             font-family: 'Arial', 'Helvetica', sans-serif;
           }
         `}
       </style>
       
      <style>
        {`
          body, html, input, button, select, div {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 16px;
            color: #333;
          }

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
            background-color: #cfe8fc;
            border-color: #0056b3;
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
          .leaflet-routing-container {
            background-color: #ffffff !important;
            border-radius: 20px !important;
            top: 50px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            font-family: Arial, sans-serif !important;
            overflow: hidden !important;
          }

          .leaflet-routing-summary {
            background-color: #e9ecef !important;
            color: #333 !important;
            font-weight: bold !important;
            text-align: center !important;
            padding: 10px !important;
          }

          .leaflet-routing-itinerary {
            background-color: #f9f9f9 !important;
            margin-bottom: 10px !important;
            border-radius: 8px !important;
            padding: 10px !important;
          }

          .leaflet-routing-waypoint-indicator {
            background-color: #007bff !important;
            border-color: #0056b3 !important;
          }

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
            0% { opacity: 0; transform: translateY(20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
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

      {/* NEW: Custom Notification Display */}
      {customNotification && (
        <div
          style={{
            position: 'fixed',
            top: '20px', // Adjust as needed
            left: '50%',
            transform: 'translateX(-50%)',
            background: customNotification.type === 'success' ? '#28a745' : '#dc3545', // Green for success, red for error/clear
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 2000, // Make sure it's above other elements
            animation: 'fadeInOut 3s forwards', // Use the custom animation
            textAlign: 'center',
            minWidth: '250px',
          }}
        >
          {customNotification.message}
        </div>
      )}

      {/* NEW: CSS for fadeInOut animation */}
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -20px); }
            10% { opacity: 1; transform: translate(-50%, 0); }
            90% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -20px); }
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
          {/* MODIFIED: Filter bar now only shows if showFilterBar is true */}
          {showFilterBar && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                top: showSearchOptions ? '60px' : '60px',
                left: '25%',
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
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from propagating up
                    toggleFilter(cat);
                  }}
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
                  type="button" // Ensure it's a button type
                >
                  {icon} {cat}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- DYNAMIC SEARCH BAR CONTAINER --- */}
        <div
          ref={searchContainerRef}
          onBlur={handleSearchContainerBlur} 
          style={{
            position: 'absolute',
            top: '60px', // MODIFIED: Moved the entire search bar container down
            left: '30px',
            zIndex: 1000,
            width: '350px',
            maxWidth: '90%',
            background: 'transparent',
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
            // gap: '10px', // Removed container gap, managing spacing inside

          }}
        >
          {/* Toggle Buttons - ABSOLUTELY POSITIONED */}
          <AnimatePresence>
            {showSearchOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute', // MODIFIED: Absolute positioning
                  top: '-60px', // MODIFIED: Positioned above the search input (estimate 50px for toggles + 10px gap)
                  left: '0px',
                  right: '0px',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center', // Center buttons horizontally
                  background: 'transparent', // MODIFIED: Give it a background for visual separation
                  padding: '10px 15px', // MODIFIED: Padding for buttons within this bar
                  borderRadius: '25px', // MODIFIED: Fully rounded corners for consistency
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // MODIFIED: Consistent shadow
                  boxSizing: 'border-box', // Ensure padding is included in width
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from propagating up
                    console.log("CLICKED: Search Near Me Toggle"); // Diagnostic log
                    setCurrentSearchType('nearMe');
                    setDestinationSearchTerm('');
                    setDestinationSuggestions([]);
                    setShowFilterBar(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    borderRadius: '25px',
                    border: currentSearchType === 'nearMe' ? '2px solid #007bff' : '1px solid #ccc',
                    background: currentSearchType === 'nearMe' ? '#e0f0ff' : 'white',
                    cursor: 'pointer',
                    fontWeight: currentSearchType === 'nearMe' ? 'bold' : 'normal',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                  type="button" // Ensure it's a button type
                >
                  Search Near Me
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from propagating up
                    console.log("CLICKED: Trip Destination Toggle"); // Diagnostic log
                    setCurrentSearchType('destination');
                    setNearMeSearchTerm('');
                    setSuggestions([]);
                    setShowFilterBar(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    borderRadius: '25px',
                    border: currentSearchType === 'destination' ? '2px solid #6f42c1' : '1px solid #ccc',
                    background: currentSearchType === 'destination' ? '#efebf8' : 'white',
                    cursor: 'pointer',
                    fontWeight: currentSearchType === 'destination' ? 'bold' : 'normal',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                  type="button" // Ensure it's a button type
                >
                  Trip Destination
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Near Me Input & Suggestions */}
          {currentSearchType === 'nearMe' && (
            <div style={{ position: 'relative', width: '100%', marginTop: '0px' }}> {/* MODIFIED: Removed margin-top */}
              <input
                type="text"
                placeholder="Search Near Me"
                value={nearMeSearchTerm}
                onChange={(e) => {
                  setNearMeSearchTerm(e.target.value);
                }}
                onFocus={() => {
                  console.log("FOCUS: Near Me Search Input"); // Diagnostic log
                  setShowSearchOptions(true); // Show options when this input is focused
                  setShowFilterBar(true);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    console.log("KEYPRESS ENTER: Near Me Search Input"); // Diagnostic log
                    handleSearch();
                    setShowFilterBar(false);
                    setSuggestions([]);
                    setShowSearchOptions(false);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '17px 45px 17px 15px',
                  borderRadius: '25px', // MODIFIED: Always fully rounded
                  border: '1px solid #ccc',
                  fontSize: '0.9em',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'text',
                  background: 'white', // MODIFIED: Ensure input has a background
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // MODIFIED: Consistent shadow
                  
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Stop click from propagating up
                  console.log("CLICKED: Near Me Search Magnifying Glass"); // Diagnostic log
                  handleSearch();
                  setShowFilterBar(false);
                  setSuggestions([]);
                  setShowSearchOptions(false);
                }}
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
                  display: 'flex', // Ensures content is centered
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Search"
                type="button" // Ensure it's a button type
              >
                🔍
              </button>

              {suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%', // MODIFIED: Position immediately below the input
                    left: '0%',
                    width: '100%',
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderTop: 'none',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    zIndex: 999,
                    borderRadius: '0 0 8px 8px',
                  }}
                >
                  {suggestions.map((result) => {
                    const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
                    return (
                      <div
                        key={result.place_id}
                        onClick={(e) => {
                          e.stopPropagation(); // VERY IMPORTANT: Stop click from bubbling up to parent div
                          console.log("CLICKED: Near Me Suggestion Item -", result.display_name); // Diagnostic log
                          // This click should still center the map on the suggestion
                          setMapCenter(latlng);
                          setNearMeSearchTerm(result.name || result.display_name.split(',')[0]); // Fill input with selected suggestion
                          setSuggestions([]); // Clear suggestions
                          setShowSearchOptions(false); // Hide the search options dropdown
                          setShowFilterBar(false);
                        }}
                        style={{
                          padding: '10px',
                          borderBottom: '1px solid #eee',
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
                        {/* REPLACE THE EXISTING BUTTON HERE WITH THE FOLLOWING */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // VERY IMPORTANT: Stop click from bubbling up to parent div
                            console.log("CLICKED: Save Place from Near Me Suggestion"); // Diagnostic log
                            const newSavedMarker = {
                              id: uuidv4(), // Generate a new unique ID for this saved place
                              position: latlng,
                              name: result.name || result.display_name.split(',')[0],
                              category: 'Other', // Default category for user-saved places
                              address: result.display_name,
                            };

                            const updatedMarkers = [...markers, newSavedMarker];
                            setMarkers(updatedMarkers);
                            localStorage.setItem('markers', JSON.stringify(updatedMarkers));

                            // Show a custom notification that the place was saved
                            setCustomNotification({ message: `Saved: ${newSavedMarker.name}`, type: 'success' });

                            // Clear the search input and suggestions after saving
                            setNearMeSearchTerm('');
                            setSuggestions([]);
                            setShowSearchOptions(false);
                            setShowFilterBar(false);
                          }}
                          style={{
                            marginTop: '5px',
                            padding: '5px 10px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '0.8em',
                            cursor: 'pointer',
                          }}
                          type="button" // Ensure it's a button type
                        >
                          Save Place
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Trip Destination Input & Suggestions */}
          {currentSearchType === 'destination' && (
            <div style={{ position: 'relative', width: '100%', marginTop: '0px' }}> {/* MODIFIED: Removed margin-top */}
              <input
                type="text"
                placeholder="Search for Trip Destination"
                value={destinationSearchTerm}
                onChange={(e) => setDestinationSearchTerm(e.target.value)}
                onFocus={() => {
                  console.log("FOCUS: Trip Destination Search Input"); // Diagnostic log
                  setShowSearchOptions(true);
                  setShowFilterBar(true);
                }} // Show options on focus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && destinationSuggestions.length > 0) {
                    console.log("KEYPRESS ENTER: Trip Destination Search Input"); // Diagnostic log
                    const firstResult = destinationSuggestions[0];
                    const latlng = { lat: parseFloat(firstResult.lat), lng: parseFloat(firstResult.lon) };
                    setTripDestination(latlng);
                    setDestinationSearchTerm('');
                    setDestinationSuggestions([]);
                    setCustomNotification({ message: `Trip destination set to: ${firstResult.name || firstResult.display_name.split(',')[0]}`, type: 'success' });
                    setMapCenter(latlng);
                    setShowSearchOptions(false);
                    setShowFilterBar(true);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '17px 45px 17px 15px',
                  borderRadius: '25px', // MODIFIED: Always fully rounded
                  border: '1px solid #6f42c1',
                  fontSize: '0.9em',
                  boxSizing: 'border-box',
                  background: 'white', // MODIFIED: Ensure input has a background
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // MODIFIED: Consistent shadow
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Stop click from propagating up
                  console.log("CLICKED: Trip Destination Search Magnifying Glass"); // Diagnostic log
                  if (destinationSuggestions.length > 0) {
                    const firstResult = destinationSuggestions[0];
                    const latlng = { lat: parseFloat(firstResult.lat), lng: parseFloat(firstResult.lon) };
                    setTripDestination(latlng);
                    setDestinationSearchTerm('');
                    setDestinationSuggestions([]);
                    setCustomNotification({ message: `Trip destination set to: ${firstResult.name || firstResult.display_name.split(',')[0]}`, type: 'success' });
                    setMapCenter(latlng);
                    setShowSearchOptions(false);
                    setShowFilterBar(true);
                  }
                }}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '11.5px',
                  background: 'transparent',
                  border: 'none',
                  color: '#6f42c1',
                  fontSize: '1.4em',
                  cursor: 'pointer',
                  zIndex: 1,
                  display: 'flex', // Ensures content is centered
                  alignItems: 'center',
                  
                  justifyContent: 'center',
                }}
                aria-label="Search Destination"
                type="button" // Ensure it's a button type
              >
                🔍
              </button>

              {destinationSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%', // MODIFIED: Position immediately below the input
                    left: '0%',
                    width: '100%',
                    background: '#fff',
                    border: '1px solid #6f42c1',
                    borderTop: 'none',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    zIndex: 999,
                    borderRadius: '0 0 8px 8px',
                  }}
                >
                  {destinationSuggestions.map((result) => {
                    const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
                    return (
                      <div
                        key={result.place_id}
                        onClick={(e) => {
                          e.stopPropagation(); // Stop click from propagating up
                          setTripDestination(latlng);
                          setDestinationSearchTerm('');
                          setDestinationSuggestions([]);
                          setCustomNotification({ message: `Trip destination set to: ${result.name || result.display_name.split(',')[0]}`, type: 'success' });
                          setMapCenter(latlng);
                          setShowSearchOptions(false);
                          setShowFilterBar(true);
                        }}
                        style={{
                          padding: '10px',
                          borderBottom: '1px solid #eee',
                          cursor: 'pointer',
                        }}
                      >
                        <strong>{result.name || result.display_name.split(',')[0]}</strong>
                        <br />
                        <span style={{ fontSize: '0.85em', color: '#555' }}>{result.display_name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {tripDestination && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from propagating up
                    console.log("CLICKED: Clear Trip Destination Button"); // Diagnostic log
                    setTripDestination(null);
                    setFetchedMarkers([]);
                    setRouting(null);
                    setCustomNotification({ message: "Trip destination cleared!", type: 'success' });
                    setShowSearchOptions(false);
                    // --- MODIFIED LOGIC HERE ---
                    if (userLocation) {
                      setMapCenter(userLocation); // Set map center back to user's location
                      setShowFilterBar(false);
                    } else {
                      setCustomNotification({ message: "Your location is not available to pan back to.", type: 'error' });
                      setShowFilterBar(false);
                    }
                    // --- END MODIFICATION ---
                  }}
                  style={{
                    marginTop: '10px',
                    padding: '10px 15px',
                    borderRadius: '25px',
                    border: '1px solid #ccc',
                    background: 'white',
                    color: '#dc3545',
                    fontSize: '0.9em',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                  title="Clear the current trip destination"
                  type="button" // Ensure it's a button type
                >
                  Clear Trip Destination
                </button>
              )}
            </div>
          )}
        </div>


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
                onClick={(e) => {
                  e.stopPropagation(); // Diagnostic log
                  console.log("CLICKED: Close Add New Place Form Button");
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
                type="button" // Ensure it's a button type
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
            top: '60px',
            right: '-10px',
            zIndex: 1000,
          }}>
            {!showSidebar && (
              <button

                onClick={(e) => { // Ensure this is a block with curly braces if you're adding more than one statement
                  e.stopPropagation(); // <--- ADD THIS LINE
                  console.log("Sidebar button clicked! Setting showSidebar to true."); // <-- ADD THIS LINE
                  setShowSidebar(true);
                  // MODIFIED: Hide filter bar if sidebar is opened and no search input is focused
                  // The blur handler would normally handle this, but an explicit click on sidebar toggle
                  // implies disengaging with search
                  if (!searchContainerRef.current.contains(document.activeElement)) {
                    setShowFilterBar(!!tripDestination); // Maintain filter visibility if tripDestination is set
                  }
                }}
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
                id="sidebar-toggle-button" // <--- ADD THIS ID
                type="button" // Ensure it's a button type
              >
                ☰ Saved Places
              </button>
            )}
          </div>


          {/* THE ACTUAL SIDEBAR COMPONENT (WAS showFilterBar, NOW showSidebar) */}
          <AnimatePresence>
            {showSidebar && (
              // --- START MODIFICATION (Sidebar motion.div style) ---
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
              {/* --- END MODIFICATION (Sidebar motion.div style) --- */}
                {/* --- START MODIFICATION (Sidebar Close Button) --- */}
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
                {/* --- END MODIFICATION (Sidebar Close Button) --- */}
                {/* Saved Markers List */}
                {/* --- START MODIFICATION (Saved Places Title) --- */}
<h3
  style={{
    marginTop: '20px',
    marginBottom: '15px',
    fontSize: '1.8rem', /* Larger font size */
    textAlign: 'center', /* Centered text */
    borderBottom: '1px solid #ccc', /* Thin horizontal line */
    paddingBottom: '10px', /* Space between text and line */
  }}
>
  Saved Places
</h3>
{/* --- END MODIFICATION (Saved Places Title) --- */}
                {markers.length === 0 ? (
                  <p>No saved places yet. Add some from the map!</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {markers.map((marker) => (
                      <li key={marker.id} style={{ marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '5px' }}>
  <div> {/* Wrap name, category, and address in a div for better layout */}
    <strong style={{ display: 'block', marginBottom: '5px' }}>{marker.name}</strong>
    {/* --- START MODIFICATION (Add Category Display) --- */}
    {marker.category && (
      <span style={{ fontSize: '0.9em', color: '#black', display: 'block', marginTop: '3px' }}>
        Category: {marker.category}
      </span>
    )}
    {/* --- END MODIFICATION (Add Category Display) --- */}
    <span style={{ fontSize: '0.85em', color: '#666' }}>{marker.address}</span>
  </div>
  <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
    <button
      onClick={(e) => {
        e.stopPropagation(); // Stop click from propagating up
        console.log("CLICKED: Sidebar Delete Marker Button -", marker.name); // Diagnostic log
        handleDeleteMarker(marker.id);
      }}
      style={{
        padding: '5px 10px',
        fontSize: '0.8em',
        background: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, transform 0.2s ease', // Add transition for smooth hover
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#c82333';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#dc3545';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      type="button" // Ensure it's a button type
    >
      Delete
    </button>
  </div>
</li>
                    ))}
                  </ul>
                )}
                {/* Clear All Markers button inside sidebar */}
                {markers.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Stop click from propagating up
                      clearMarkers(); // Calls the function that clears markers and logs
                    }}
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
                    
                    type="button" // Ensure it's a button type
                    
                  >
                    Clear All Saved Places
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          <MapContainer
            center={[43.68, -79.76]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            whenCreated={(mapInstance) => {
              mapRef.current = mapInstance;
              // Add a click handler to the map container itself for general debugging
              mapInstance.on('click', (e) => {
                console.log("CLICKED: Map Background (Lat:", e.latlng.lat.toFixed(4), "Lng:", e.latlng.lng.toFixed(4), ")");
                setShowFilterBar(!!tripDestination);
                setShowSearchOptions(false);
              });
            }}
            className="leaflet-container"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <LocateUser
              onLocate={setUserLocation}
              setShowUserPopup={setShowUserPopup}
              setMapCenter={setMapCenter}
            />

            <MapPanner targetPosition={mapCenter} />

            {routing && <RoutingMachine from={routing.from} to={routing.to} routingStateSetter={setIsRoutingActive} />}


            {filteredMarkers.map((marker) => {
              const isFetched = marker.id.startsWith('osm-');

              // *** FIX: Prioritize tripDestination for distance calculation in Popups ***
              const locationForDistance = tripDestination || userLocation;

              const distance = locationForDistance
                ? getDistanceFromLatLonInKm(
                  locationForDistance.lat,
                  locationForDistance.lng,
                  marker.position.lat,
                  marker.position.lng
                ).toFixed(2)
                : null;


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
                        {/* *** FIX: Dynamically show "from your location" or "from trip destination" *** */}
                        <strong>Distance:</strong> {distance} km from {tripDestination ? 'your trip destination' : 'your current location'}
                      </>
                    )}


                    {userLocation && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Stop click from propagating up
                          handleGetDirections(userLocation, marker.position, "Your Location"); // Pass userLocation as origin
                        }}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.3rem 0.6rem',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          marginRight: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#0056b3';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#007bff';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        type="button" // Ensure it's a button type
                      >
                        Get Directions From My Location
                      </button>
                    )}

                    {/* NEW BUTTON: Get Directions From Trip Destination */}
                    {tripDestination && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetDirections(tripDestination, marker.position, "Trip Destination"); // *** NEW CALL ***
                        }}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.3rem 0.6rem',
                          background: '#6f42c1', // A distinct color for trip destination directions
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          marginRight: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#5a349c';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#6f42c1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        type="button"
                      >
                        Get Directions From Trip Destination
                      </button>
                    )}


                    {isFetched && !alreadySaved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("CLICKED: Save Place from Fetched Marker Popup"); // Diagnostic log

                          const newSaved = {
                            // Ensure unique ID if original marker.id is not unique enough
                            id: marker.id ? `${marker.id}-${uuidv4()}` : uuidv4(),
                            position: marker.position,
                            name: marker.name,
                            category: marker.category,
                            address: marker.address,
                          };

                          const updated = [...markers, newSaved];
                          setMarkers(updated);
                          localStorage.setItem('markers', JSON.stringify(updated));

                          // Show a custom notification that the place was saved
                          setCustomNotification({ message: `Saved: ${newSaved.name}`, type: 'success' });

                          // Clear the search input and suggestions after saving
                          setNearMeSearchTerm('');
                          setSuggestions([]);
                          setShowSearchOptions(false);
                          setShowFilterBar(false);
                        }}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.3rem 0.6rem',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          transition: 'all 0.2s ease'
                        }}

                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#218838';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#28a745';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        type="button" // Ensure it's a button type
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
                          fontSize: '0.9em',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#bd2130';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#dc3545';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        type="button" // Ensure it's a button type
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
                  click: (e) => { // Added e here
                    console.log("CLICKED: User Location Marker"); // Diagnostic log
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

            {/* TRIP DESTINATION MARKER - NOW USING uniqueTripDestinationIcon */}
            {tripDestination && (
              <Marker position={tripDestination} icon={uniqueTripDestinationIcon}>
                <Popup>
                  <strong>Your Trip Destination</strong>
                  
                </Popup>
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
                onClick={() => console.log("CLICKED: Weather Info Bar")} // Diagnostic log
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