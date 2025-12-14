import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map, Layers, Save, FolderOpen, Plus, ToggleLeft, ToggleRight,
  Mountain, Droplets, Sun, Wind, TreePine, Gauge, Calculator,
  Sparkles, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
  Search, MapPin, Upload, Download, Printer, Share2, Info,
  Navigation, FileText, Image, FileDown, ExternalLink, Trash2
} from 'lucide-react';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ======================================================================
// PERMACULTURE DESIGN INTELLIGENCE PLATFORM
// Single-File React Application with Firebase Integration
// ======================================================================

const App = () => {
  // Production mode - set to false for development debugging
  const PRODUCTION_MODE = true;
  const DEBUG = !PRODUCTION_MODE;
  
  // Helper for production-safe logging
  const log = (...args) => {
    if (DEBUG) console.log(...args);
  };
  const logWarn = (...args) => {
    if (DEBUG) console.warn(...args);
  };
  const logError = (...args) => {
    console.error(...args); // Always log errors
  };
  
  // ========== STATE MANAGEMENT ==========
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Project Management
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  
  // Map & Layers
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [aoi, setAoi] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [analysisLayers, setAnalysisLayers] = useState({
    contours: null,
    hydrology: null,
    sunPath: null,
    winterSunrise: null,
    winterSunset: null,
    summerSunrise: null,
    summerSunset: null,
    windFlow: null,
    primaryWindSector: null,
    secondaryWindSector: null,
    primaryWindArea: null,
    secondaryWindArea: null,
    slope: null,
    aspect: null,
    soil: null,
    vegetation: null,
    swales: null,
    windbreaks: null
  });
  
  // Layer references for map rendering
  const layerRefs = useRef({
    contours: null,
    contourTiles: null, // Pre-generated contour tile overlay
    catchments: null,
    flowAccumulation: null,
    naturalPonds: null,
    slope: null,
    aspect: null,
    soilClassifier: null,
    vegetationDensity: null,
    recommendedSwales: null,
    optimalWindbreaks: null,
    sunPath: null,
    winterSunrise: null,
    winterSunset: null,
    summerSunrise: null,
    summerSunset: null,
    windFlow: null,
    primaryWindSector: null,
    secondaryWindSector: null,
    primaryWindArea: null,
    secondaryWindArea: null
  });
  
  // Backend URL - Explicit configuration
  // Priority: 1. Environment variable, 2. Production URL, 3. Localhost
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000' 
      : 'https://permaculture-backend.onrender.com');
  
  // Log backend URL for debugging (only in development or if explicitly enabled)
  if (import.meta.env.DEV || window.location.search.includes('debug=true')) {
    console.log('🔗 Backend URL configured:', BACKEND_URL);
  }
  
  // Basemap configurations for permaculture/GIS work
  const basemapConfigs = {
    satellite: {
      name: 'Satellite Imagery',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri',
      maxZoom: 19
    },
    terrain: {
      name: 'Terrain Topography',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap',
      maxZoom: 17,
      subdomains: ['a', 'b', 'c']
    },
    osm: {
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    },
    cartoLight: {
      name: 'CartoDB Light',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap © CartoDB',
      maxZoom: 20,
      subdomains: ['a', 'b', 'c', 'd']
    },
    cartoDark: {
      name: 'CartoDB Dark',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap © CartoDB',
      maxZoom: 20,
      subdomains: ['a', 'b', 'c', 'd']
    },
    stamenTerrain: {
      name: 'Stamen Terrain',
      url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
      attribution: '© Stamen Design © OpenStreetMap',
      maxZoom: 18,
      subdomains: ['a', 'b', 'c', 'd']
    },
    stamenWatercolor: {
      name: 'Stamen Watercolor',
      url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
      attribution: '© Stamen Design © OpenStreetMap',
      maxZoom: 18,
      subdomains: ['a', 'b', 'c', 'd']
    },
    esriWorldTopo: {
      name: 'Esri World Topographic',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri',
      maxZoom: 19
    },
    esriWorldStreet: {
      name: 'Esri World Street Map',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri',
      maxZoom: 19
    }
  };
  
  // Layer Visibility Toggles
  const [layerVisibility, setLayerVisibility] = useState({
    basemap: 'satellite', // Default to satellite basemap
    contours: true, // Enabled by default
    catchments: true, // Enable all layers by default
    flowAccumulation: true,
    naturalPonds: true,
    slope: true,
    aspect: true,
    soilClassifier: true,
    vegetationDensity: true,
    recommendedSwales: true,
    optimalWindbreaks: true,
    sunPath: true,
    winterSunrise: true,
    winterSunset: true,
    summerSunrise: true,
    summerSunset: true,
    windFlow: true,
    primaryWindSector: true,
    secondaryWindSector: true,
    primaryWindArea: true,
    secondaryWindArea: true
  });
  
  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState({});
  const [show3D, setShow3D] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Safety: Clear analyzing state on unmount
  useEffect(() => {
    return () => {
      if (isAnalyzing) {
        console.warn('Component unmounting while analyzing - clearing state');
        setIsAnalyzing(false);
      }
    };
  }, [isAnalyzing]);
  const [pondCalc, setPondCalc] = useState({ area: '', depth: '', result: null });
  const [aiGoal, setAiGoal] = useState('');
  const [aiStrategy, setAiStrategy] = useState(null);
  
  // Contour Settings
  const [contourInterval, setContourInterval] = useState(5); // Default 5m interval
  const [contourBoldInterval, setContourBoldInterval] = useState(5); // Every 5th contour is bold
  const [contourShowLabels, setContourShowLabels] = useState(true);
  
  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMode, setSearchMode] = useState('location'); // 'location' or 'coordinates'
  const [coordInput, setCoordInput] = useState({ lat: '', lng: '' });
  const [isSearching, setIsSearching] = useState(false);
  
  // GPX Import
  const [gpxData, setGpxData] = useState(null);
  const gpxLayerRef = useRef(null);
  
  // Search marker reference
  const searchMarkerRef = useRef(null);
  
  // AOI Statistics
  const [aoiStats, setAoiStats] = useState(null);
  
  // Export/Share
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const labelMarkersRef = useRef([]);
  
  // ========== FIREBASE INITIALIZATION ==========
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Check if config exists
        if (!window.__firebase_config) {
          throw new Error('Firebase configuration not found. Please check index.html');
        }
        
        if (!window.__app_id) {
          throw new Error('App ID not found. Please check index.html');
        }
        
        // Validate config has required fields
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missingFields = requiredFields.filter(field => !window.__firebase_config[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Firebase config missing required fields: ${missingFields.join(', ')}`);
        }
        
        log('Initializing Firebase with config:', {
          projectId: window.__firebase_config.projectId,
          authDomain: window.__firebase_config.authDomain
        });
        
        const app = initializeApp(window.__firebase_config);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        
        setAuth(authInstance);
        setDb(dbInstance);
        
        // Authenticate user
        let user = null;
        if (window.__initial_auth_token) {
          try {
            const userCredential = await signInWithCustomToken(authInstance, window.__initial_auth_token);
            user = userCredential.user;
          } catch (err) {
            logWarn('Custom token auth failed, trying anonymous:', err);
            const userCredential = await signInAnonymously(authInstance);
            user = userCredential.user;
          }
        } else {
          const userCredential = await signInAnonymously(authInstance);
          user = userCredential.user;
        }
        
        setUserId(user.uid);
        setLoading(false);
        
        // Load user projects
        await loadProjects(user.uid, dbInstance);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        setAuthError(error.message);
        setLoading(false);
      }
    };
    
    initFirebase();
  }, []);
  
  // ========== MAP INITIALIZATION ==========
  useEffect(() => {
    // Wait for loading to complete
    if (loading) {
      return;
    }
    
    // Prevent multiple initializations
    if (mapInstanceRef.current) {
      return;
    }
    
    // Check if Leaflet is available
    if (!L || typeof L.map !== 'function') {
      console.error('Leaflet not available');
      return;
    }
    
    let map = null;
    let resizeTimer = null;
    let initTimer = null;
    
    // Handle map resize
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    };
    
    // Initialize map with retry logic
    const initMap = () => {
      if (!mapRef.current) {
        log('Map ref not available');
        return false;
      }
      
      if (mapInstanceRef.current) {
        return true;
      }
      
      // Check container dimensions
      const container = mapRef.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        log('Container has no dimensions, will retry');
        return false;
      }
      
      try {
        log('Creating Leaflet map...', {
          width: container.offsetWidth,
          height: container.offsetHeight
        });
        
        map = L.map(container, {
          center: [20.59, 78.96],
          zoom: 5,
          zoomControl: true
        });
        
        // Add basemap
        const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 19
        });
        
        tileLayer.addTo(map);
        basemapLayerRef.current = tileLayer;
        mapInstanceRef.current = map;
        
        log('Map initialized successfully');
        
        // Invalidate size
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
        
        return true;
      } catch (error) {
        console.error('Error initializing map:', error);
        return false;
      }
    };
    
    // Try to initialize immediately
    if (mapRef.current) {
      if (!initMap()) {
        // Retry after a delay
        initTimer = setTimeout(() => {
          if (!mapInstanceRef.current && mapRef.current) {
            initMap();
          }
        }, 500);
      }
    } else {
      // Wait for ref to be set
      initTimer = setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          initMap();
        }
      }, 300);
    }
    
    // Cleanup
    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          logWarn('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [loading]);
  
  // Basemap layer reference
  const basemapLayerRef = useRef(null);
  
  // ========== BASEMAP SWITCHING ==========
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    // Get selected basemap from layerVisibility (default to satellite)
    const selectedBasemap = layerVisibility.basemap || 'satellite';
    const config = basemapConfigs[selectedBasemap] || basemapConfigs.satellite;
    
    // Only update if basemap has changed
    if (basemapLayerRef.current && map.hasLayer(basemapLayerRef.current)) {
      const currentUrl = basemapLayerRef.current._url || '';
      // Check if current basemap matches selected basemap
      const urlMatches = config.url.includes('{z}') 
        ? currentUrl.includes(config.url.split('{z}')[0])
        : currentUrl.includes(config.url.split('/tile/')[0]);
      if (urlMatches) {
        // Already correct basemap, no need to change
        return;
      }
    }
    
    // Remove old basemap
    if (basemapLayerRef.current) {
      map.removeLayer(basemapLayerRef.current);
    }
    
    // Add new basemap
    const tileLayerOptions = {
      attribution: config.attribution,
      maxZoom: config.maxZoom
    };
    
    if (config.subdomains) {
      tileLayerOptions.subdomains = config.subdomains;
    }
    
    basemapLayerRef.current = L.tileLayer(config.url, tileLayerOptions);
    basemapLayerRef.current.addTo(map);
  }, [layerVisibility.basemap]);
  
  // ========== PROJECT MANAGEMENT ==========
  const loadProjects = async (uid, firestore) => {
    try {
      const projectsRef = collection(firestore, `artifacts/${window.__app_id}/users/${uid}/permaculture_projects`);
      const snapshot = await getDocs(projectsRef);
      const projectList = [];
      snapshot.forEach((doc) => {
        projectList.push({ id: doc.id, ...doc.data() });
      });
      setProjects(projectList);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };
  
  // Helper to serialize GeoJSON for Firestore (avoid nested arrays)
  const serializeForFirestore = (data) => {
    if (!data) return null;
    if (typeof data === 'string') return data;
    // Convert GeoJSON to JSON string to avoid nested array issues
    return JSON.stringify(data);
  };
  
  // Helper to deserialize from Firestore
  const deserializeFromFirestore = (data) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    }
    return data;
  };
  
  const saveProject = async () => {
    if (!db || !userId || !projectName.trim()) {
      showToast('Please enter a project name', 'error');
      return;
    }
    
    try {
      // Serialize GeoJSON data to avoid Firestore nested array issues
      const serializedLayers = {};
      Object.keys(analysisLayers).forEach(key => {
        if (analysisLayers[key]) {
          serializedLayers[key] = serializeForFirestore(analysisLayers[key]);
        }
      });
      
      const projectData = {
        name: projectName,
        aoi: serializeForFirestore(aoi),
        analysisLayers: serializedLayers,
        layerVisibility: layerVisibility, // Save layer visibility state
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const projectId = projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const projectRef = doc(db, `artifacts/${window.__app_id}/users/${userId}/permaculture_projects`, projectId);
      await setDoc(projectRef, projectData);
      
      await loadProjects(userId, db);
      showToast('Project saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving project:', error);
      showToast('Failed to save project: ' + error.message, 'error');
    }
  };
  
  const loadProject = async (projectId) => {
    if (!db || !userId) return;
    
    try {
      const projectRef = doc(db, `artifacts/${window.__app_id}/users/${userId}/permaculture_projects`, projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const data = projectSnap.data();
        setCurrentProject(projectId);
        setProjectName(data.name || projectId);
        
        // Deserialize data from Firestore
        const loadedAoi = deserializeFromFirestore(data.aoi);
        const loadedLayers = {};
        if (data.analysisLayers) {
          Object.keys(data.analysisLayers).forEach(key => {
            loadedLayers[key] = deserializeFromFirestore(data.analysisLayers[key]);
          });
        }
        
        setAoi(loadedAoi);
        setAnalysisLayers(loadedLayers);
        
        // Restore layer visibility
        if (data.layerVisibility) {
          setLayerVisibility(data.layerVisibility);
        }
        
        // Render AOI on map
        if (loadedAoi && mapInstanceRef.current) {
          renderAOIOnMap(loadedAoi);
          
          // Fit map to AOI
          const bounds = L.geoJSON(loadedAoi).getBounds();
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
        
        // Re-render all analysis layers
        setTimeout(() => {
          Object.keys(loadedLayers).forEach(layerKey => {
            if (loadedLayers[layerKey]) {
              const style = getDefaultLayerStyle(layerKey);
              renderLayer(layerKey, loadedLayers[layerKey], style);
            }
          });
        }, 500);
        
        showToast('Project loaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error loading project:', error);
        showToast('Failed to load project: ' + error.message, 'error');
    }
  };
  
  // Delete project
  const deleteProject = async (projectId) => {
    if (!db || !userId) return;
    
    if (!confirm(`Are you sure you want to delete project "${projectId}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const projectRef = doc(db, `artifacts/${window.__app_id}/users/${userId}/permaculture_projects`, projectId);
      await deleteDoc(projectRef);
      
      await loadProjects(userId, db);
      showToast('Project deleted successfully', 'success');
      
      // Clear current project if it was deleted
      if (currentProject === projectId) {
        setCurrentProject(null);
        setProjectName('');
        setAoi(null);
        setAnalysisLayers({
          contours: null,
          hydrology: null,
          sunPath: null,
          winterSunrise: null,
          winterSunset: null,
          summerSunrise: null,
          summerSunset: null,
          windFlow: null,
          primaryWindSector: null,
          secondaryWindSector: null,
          primaryWindArea: null,
          secondaryWindArea: null,
          slope: null,
          aspect: null,
          soil: null,
          vegetation: null,
          swales: null,
          windbreaks: null
        });
        
        // Clear map layers
        if (mapInstanceRef.current) {
          Object.keys(layerRefs.current).forEach(key => {
            if (layerRefs.current[key]) {
              mapInstanceRef.current.removeLayer(layerRefs.current[key]);
              layerRefs.current[key] = null;
            }
          });
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Failed to delete project: ' + error.message, 'error');
    }
  };
  
  // Get default style for layer type
  const getDefaultLayerStyle = (layerKey) => {
    const styles = {
      contours: { color: '#1e40af', weight: 1, opacity: 0.7 },
      catchments: { color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.2, weight: 2 },
      flowAccumulation: { color: '#06b6d4', weight: 2, opacity: 0.8 },
      naturalPonds: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, weight: 2 },
      sunPath: { color: '#f59e0b', weight: 4, opacity: 0.9 },
      slope: { color: '#8b5cf6', weight: 2, opacity: 0.7 },
      aspect: { color: '#ec4899', weight: 2, opacity: 0.7 }
    };
    return styles[layerKey] || { color: '#3b82f6', weight: 2, opacity: 0.7 };
  };
  
  const createNewProject = () => {
    setCurrentProject(null);
    setProjectName('');
    setAoi(null);
    setAnalysisLayers({
      contours: null,
      hydrology: null,
      sunPath: null,
      slope: null,
      aspect: null,
      soil: null,
      vegetation: null,
      swales: null,
      windbreaks: null
    });
    
    // Clear map layers
    if (mapInstanceRef.current) {
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON || layer instanceof L.Polygon || layer instanceof L.Polyline) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });
    }
  };
  
  // ========== AOI DRAWING ==========
  const drawingPointsRef = useRef([]);
  const drawingLayerRef = useRef(null);
  const drawingMarkersRef = useRef([]);
  const aoiLayerRef = useRef(null);
  const isDrawingRef = useRef(false);
  
  const startDrawing = useCallback(() => {
    if (!mapInstanceRef.current) {
      showToast('Map not ready. Please wait...', 'error');
      return;
    }
    
    // Clear previous AOI if exists
    if (aoiLayerRef.current) {
      mapInstanceRef.current.removeLayer(aoiLayerRef.current);
      aoiLayerRef.current = null;
    }
    
    setDrawing(true);
    isDrawingRef.current = true;
    drawingPointsRef.current = [];
    
    // Clear previous drawing elements
    if (drawingLayerRef.current) {
      mapInstanceRef.current.removeLayer(drawingLayerRef.current);
      drawingLayerRef.current = null;
    }
    
    drawingMarkersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    drawingMarkersRef.current = [];
    
    // Create event handlers
    const handleClick = (e) => {
      if (!isDrawingRef.current) return;
      
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      const { lat, lng } = e.latlng;
      drawingPointsRef.current.push([lng, lat]);
      
      // Add marker for visual feedback
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'drawing-point',
          html: '<div style="width: 10px; height: 10px; background: #22c55e; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        })
      }).addTo(mapInstanceRef.current);
      
      drawingMarkersRef.current.push(marker);
      
      // Draw polyline if we have multiple points
      if (drawingPointsRef.current.length > 1) {
        if (drawingLayerRef.current) {
          mapInstanceRef.current.removeLayer(drawingLayerRef.current);
        }
        
        const polyline = L.polyline(
          drawingPointsRef.current.map(([lng, lat]) => [lat, lng]),
          { 
            color: '#22c55e', 
            weight: 3, 
            dashArray: '10, 5',
            opacity: 0.8
          }
        ).addTo(mapInstanceRef.current);
        
        drawingLayerRef.current = polyline;
      }
      
      showToast(`Point ${drawingPointsRef.current.length} added. Double-click to finish.`, 'info');
    };
    
    const handleDoubleClick = (e) => {
      if (!isDrawingRef.current) return;
      
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      if (drawingPointsRef.current.length < 3) {
        showToast('Please click at least 3 points to create a polygon', 'error');
        return;
      }
      
      isDrawingRef.current = false;
      setDrawing(false);
      
      // Remove event listeners
      mapInstanceRef.current.off('click', handleClick);
      mapInstanceRef.current.off('dblclick', handleDoubleClick);
      mapInstanceRef.current.getContainer().style.cursor = '';
      
      // Close the polygon
      const closedPoints = [...drawingPointsRef.current, drawingPointsRef.current[0]];
      
      // Create GeoJSON polygon
      const geojson = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [closedPoints]
        },
        properties: {}
      };
      
      setAoi(geojson);
      
      // Remove temporary drawing layer and markers
      if (drawingLayerRef.current) {
        mapInstanceRef.current.removeLayer(drawingLayerRef.current);
        drawingLayerRef.current = null;
      }
      
      drawingMarkersRef.current.forEach(marker => {
        mapInstanceRef.current.removeLayer(marker);
      });
      drawingMarkersRef.current = [];
      
      // Render final AOI
      renderAOIOnMap(geojson);
      
      // Fit map to AOI
      const bounds = L.geoJSON(geojson).getBounds();
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      
      showToast('Area of Interest created! You can now run analysis.', 'success');
    };
    
    // Attach event listeners
    mapInstanceRef.current.on('click', handleClick);
    mapInstanceRef.current.on('dblclick', handleDoubleClick);
    mapInstanceRef.current.getContainer().style.cursor = 'crosshair';
    
    showToast('Click on the map to add points. Double-click to finish.', 'info');
  }, []);
  
  const renderAOIOnMap = useCallback((geojson) => {
    if (!mapInstanceRef.current || !geojson) return;
    
    // Remove existing AOI layer
    if (aoiLayerRef.current) {
      mapInstanceRef.current.removeLayer(aoiLayerRef.current);
    }
    
    // Create new AOI layer with enhanced styling
    aoiLayerRef.current = L.geoJSON(geojson, {
      style: {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.3,
        weight: 3,
        opacity: 0.9
      }
    }).addTo(mapInstanceRef.current);
    
    // Add popup with area info
    if (aoiStats) {
      aoiLayerRef.current.bindPopup(`
        <div style="font-weight: bold; margin-bottom: 5px;">Area of Interest</div>
        <div>Area: ${aoiStats.area.hectares.toFixed(2)} ha</div>
        <div>Perimeter: ${aoiStats.perimeter.kilometers.toFixed(2)} km</div>
      `);
    }
  }, [aoiStats]);
  
  // ========== UTILITY FUNCTIONS ==========
  const getBboxString = (geojson) => {
    if (!geojson || !geojson.geometry) return null;
    const coords = geojson.geometry.coordinates[0];
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    return `${Math.min(...lngs)},${Math.min(...lats)},${Math.max(...lngs)},${Math.max(...lats)}`;
  };
  
  const showToast = (message, type = 'info') => {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
      type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
    } text-white font-medium`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };
  
  // Helper function to calculate color from normalized elevation (0-1)
  const getColorFromNormalized = useCallback((normalized) => {
    // Clamp to 0-1
    normalized = Math.max(0, Math.min(1, normalized));
    
    // Color gradient: Blue -> Cyan -> Green -> Yellow -> Orange -> Red
    let r, g, b;
    if (normalized < 0.2) {
      // Blue to Cyan
      r = 0;
      g = Math.floor(100 + (normalized / 0.2) * 155);
      b = Math.floor(200 + (normalized / 0.2) * 55);
    } else if (normalized < 0.4) {
      // Cyan to Green
      const t = (normalized - 0.2) / 0.2;
      r = 0;
      g = 255;
      b = Math.floor(255 - t * 155);
    } else if (normalized < 0.6) {
      // Green to Yellow
      const t = (normalized - 0.4) / 0.2;
      r = Math.floor(0 + t * 255);
      g = 255;
      b = Math.floor(100 - t * 100);
    } else if (normalized < 0.8) {
      // Yellow to Orange
      const t = (normalized - 0.6) / 0.2;
      r = 255;
      g = Math.floor(255 - t * 100);
      b = 0;
    } else {
      // Orange to Red
      const t = (normalized - 0.8) / 0.2;
      r = 255;
      g = Math.floor(155 - t * 155);
      b = 0;
    }
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);
  
  // NOTE: Real terrain contours are generated from SRTM DEM data on the backend
  // The backend uses SRTM 30m data (AWS Skadi tiles) for accurate terrain contours
  // Client-side contour generation was removed as it creates uniform/unrealistic contours
  
  // ========== SPECIALIZED CONTOUR RENDERING ==========
  const renderContours = useCallback((geojson, forceVisible = null) => {
    if (!mapInstanceRef.current || !geojson || !geojson.features) return;
    
    const map = mapInstanceRef.current;
    
    // Calculate min/max elevation for color normalization if not in properties
    if (!geojson.properties?.min_elevation || !geojson.properties?.max_elevation) {
      const elevations = geojson.features
        .map(f => f.properties?.elevation || f.properties?.ELEV)
        .filter(e => e != null && e !== undefined);
      if (elevations.length > 0) {
        geojson.properties = geojson.properties || {};
        geojson.properties.min_elevation = Math.min(...elevations);
        geojson.properties.max_elevation = Math.max(...elevations);
      }
    }
    
    // Remove existing contour layer and labels
    if (layerRefs.current.contours) {
      try {
        map.removeLayer(layerRefs.current.contours);
      } catch (e) {
        logWarn(`Error removing contours layer:`, e);
      }
      layerRefs.current.contours = null;
    }
    
    // Clear existing label markers
    labelMarkersRef.current.forEach(marker => {
      try {
        map.removeLayer(marker);
      } catch (e) {}
    });
    labelMarkersRef.current = [];
    
    // Create feature groups for regular and bold contours
    const regularContours = L.featureGroup();
    const boldContours = L.featureGroup();
    
    geojson.features.forEach((feature) => {
      if (!feature.geometry || !feature.geometry.coordinates) return;
      
      const props = feature.properties || {};
      const elevation = props.elevation || props.ELEV || 0;
      const isBold = props.bold === true || props.weight > 1;
      
      // Use color from backend (professional gradient) or calculate fallback
      let color = props.color;
      if (!color || color === '#1e40af' || color === '#3b82f6') {
        // Fallback: calculate color based on elevation if not provided or default blue
        const minElev = geojson.properties?.min_elevation || 0;
        const maxElev = geojson.properties?.max_elevation || 2000;
        const normalized = maxElev > minElev ? (elevation - minElev) / (maxElev - minElev) : 0.5;
        color = getColorFromNormalized(normalized);
      }
      
      // Create polyline for contour
      const coords = feature.geometry.coordinates;
      const latlngs = coords.map(coord => [coord[1], coord[0]]); // [lat, lng]
      
      const contourLine = L.polyline(latlngs, {
        color: color,
        weight: isBold ? 4 : 3,  // Thicker lines for better visibility (especially in export)
        opacity: isBold ? 1.0 : 0.9,  // Full opacity for export visibility
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.0,  // Smoother lines
        pane: 'overlayPane', // Ensure contours render above basemap
        interactive: true  // Ensure it's rendered
      });
      
      // Add to appropriate group
      if (isBold) {
        boldContours.addLayer(contourLine);
      } else {
        regularContours.addLayer(contourLine);
      }
      
      // Add elevation label if enabled
      if (contourShowLabels && elevation !== null && elevation !== undefined) {
        // Place label at midpoint of contour line
        const midIndex = Math.floor(latlngs.length / 2);
        const labelPos = latlngs[midIndex];
        
        // Create label with elevation text - improved visibility for satellite basemap
        const labelDiv = L.divIcon({
          className: 'contour-label',
          html: `<div style="
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid ${color};
            border-radius: 4px;
            padding: 3px 8px;
            font-size: ${isBold ? '13px' : '11px'};
            font-weight: ${isBold ? 'bold' : '600'};
            color: ${color};
            white-space: nowrap;
            pointer-events: none;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8), 0 0 4px rgba(255, 255, 255, 0.5);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          ">${elevation}m</div>`,
          iconSize: [60, 24],
          iconAnchor: [30, 12]
        });
        
        const labelMarker = L.marker(labelPos, { icon: labelDiv });
        labelMarkersRef.current.push(labelMarker);
        
        if (forceVisible !== null ? forceVisible : layerVisibility.contours) {
          labelMarker.addTo(map);
        }
      }
      
      // Add popup with elevation info
      contourLine.bindPopup(`
        <div style="font-weight: bold; margin-bottom: 5px;">Contour Line</div>
        <div><strong>Elevation:</strong> ${elevation}m</div>
        ${isBold ? '<div style="color: #1e40af;"><strong>Bold Contour</strong></div>' : ''}
      `);
    });
    
    // Combine into single layer group
    const contourGroup = L.featureGroup([regularContours, boldContours]);
    layerRefs.current.contours = contourGroup;
    
    // CRITICAL: Always add to map if forceVisible is true, or if contours are enabled
    const shouldBeVisible = forceVisible !== null ? forceVisible : (layerVisibility.contours === true);
    
    if (shouldBeVisible) {
      contourGroup.addTo(map);
      log(`✅ Contours added to map: ${geojson.features.length} features (${boldContours.getLayers().length} bold, ${regularContours.getLayers().length} regular)`);
      
      // Also add all label markers
      labelMarkersRef.current.forEach(marker => {
        if (marker && !map.hasLayer(marker)) {
          marker.addTo(map);
        }
      });
      
      // Force map to update
      map.invalidateSize();
    } else {
      logWarn('Contours not added to map - visibility is false');
    }
  }, [layerVisibility.contours, contourShowLabels, log, logWarn, getColorFromNormalized]);
  
  // ========== LAYER RENDERING ==========
  const renderLayer = useCallback((layerKey, geojson, style, forceVisible = null) => {
    // Special handling for contours
    if (layerKey === 'contours') {
      renderContours(geojson, forceVisible);
      return;
    }
    
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    
    // Remove existing layer
    if (layerRefs.current[layerKey]) {
      try {
        map.removeLayer(layerRefs.current[layerKey]);
      } catch (e) {
        console.warn(`Error removing layer ${layerKey}:`, e);
      }
      layerRefs.current[layerKey] = null;
    }
    
    // Add new layer if geojson exists
    if (geojson && geojson.features && geojson.features.length > 0) {
      const defaultStyle = {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        weight: 2
      };
      
      const layer = L.geoJSON(geojson, {
        style: style || defaultStyle,
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            const props = Object.entries(feature.properties)
              .filter(([k, v]) => v !== null && v !== undefined && k !== 'type')
              .slice(0, 5) // Limit to 5 properties
              .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
              .join('<br>');
            if (props) {
              layer.bindPopup(`<div style="max-width: 200px;">${props}</div>`);
            }
          }
        }
      });
      
      layerRefs.current[layerKey] = layer;
      
      // Determine visibility: forceVisible > layerVisibility > false
      const shouldBeVisible = forceVisible !== null ? forceVisible : (layerVisibility[layerKey] === true);
      
      // Always add to map if it should be visible
      if (shouldBeVisible) {
        layer.addTo(map);
        log(`Layer ${layerKey} rendered: ${geojson.features.length} features`);
      } else {
        log(`Layer ${layerKey} rendered but not visible`);
      }
    } else {
      logWarn(`Layer ${layerKey} has no valid features to render`);
    }
  }, [layerVisibility, renderContours]);
  
  // ========== LAYER VISIBILITY TOGGLE ==========
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    const contoursVisible = layerVisibility.contours === true;
    
    // Remove any OpenTopoMap contour tiles - we only want actual contour GeoJSON data
    const contourTilesLayer = layerRefs.current.contourTiles;
    if (contourTilesLayer && map.hasLayer(contourTilesLayer)) {
        map.removeLayer(contourTilesLayer);
      layerRefs.current.contourTiles = null;
      log('Removed OpenTopoMap overlay - using only contour GeoJSON data');
    }
    
    // Toggle other layers - skip contourTiles (handled above)
    Object.keys(layerRefs.current).forEach((layerKey) => {
      if (layerKey === 'contourTiles') return; // Skip - handled separately above
      
      const layer = layerRefs.current[layerKey];
      if (layer) {
        try {
          const isVisible = layerVisibility[layerKey] === true;
          const isOnMap = map.hasLayer(layer);
          
          if (isVisible && !isOnMap) {
            layer.addTo(map);
            log(`Layer ${layerKey} toggled ON`);
            
            // Show contour labels if enabled
            if (layerKey === 'contours' && contourShowLabels) {
              labelMarkersRef.current.forEach(marker => {
                if (marker && !map.hasLayer(marker)) {
                  marker.addTo(map);
                }
              });
            }
          } else if (!isVisible && isOnMap) {
            map.removeLayer(layer);
            log(`Layer ${layerKey} toggled OFF`);
            
            // Hide contour labels
            if (layerKey === 'contours') {
              labelMarkersRef.current.forEach(marker => {
                if (marker && map.hasLayer(marker)) {
                  map.removeLayer(marker);
                }
              });
            }
          }
        } catch (e) {
          logError(`Error toggling layer ${layerKey}:`, e);
        }
      }
    });
  }, [layerVisibility, contourShowLabels, log, logError]);
  
  // ========== ANALYSIS FUNCTIONS ==========
  const runAnalysis = async () => {
    if (!aoi) {
      showToast('Please draw an Area of Interest first', 'error');
      return;
    }
    
    // Ensure we clear any previous analysis state
    setIsAnalyzing(true);
    const bbox = getBboxString(aoi);
    
    if (!bbox) {
      showToast('Invalid AOI geometry', 'error');
      setIsAnalyzing(false);
      return;
    }
    
    // Global timeout for entire analysis (2 minutes max - ensure completion)
    const analysisTimeout = setTimeout(() => {
      logError('Analysis timed out after 2 minutes');
      showToast('Analysis timed out. Try a smaller area or check backend logs.', 'error');
      setIsAnalyzing(false);
    }, 120000); // 2 minutes
    
    try {
      // Test backend health with short timeout (don't block if slow)
      let backendAlive = false;
      try {
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 5000);
        const healthCheck = await fetch(`${BACKEND_URL}/`, { signal: healthController.signal });
        clearTimeout(healthTimeout);
        if (healthCheck.ok) {
          backendAlive = true;
          log('Backend is alive and responding');
        }
      } catch (healthError) {
        logWarn('Backend health check failed or timed out:', healthError);
        // Continue anyway - backend might be slow but still work
        showToast('Backend may be slow. Proceeding with analysis...', 'info');
      }
      
      // NEW APPROACH: Use OpenTopoMap contour tile overlay instead of generating from DEM
      // This provides pre-generated, real terrain contours
      // Build contour URL with proper bold_interval handling (0 means no bold)
      const boldParam = (contourBoldInterval && contourBoldInterval > 0) ? `&bold_interval=${contourBoldInterval}` : '';
      const contourUrl = `${BACKEND_URL}/contours?bbox=${bbox}&interval=${contourInterval}${boldParam}`;
      
      // Helper function to add timeout to fetch - bulletproof version
      const fetchWithTimeout = (url, timeout = 120000) => {
        const controller = new AbortController();
        let timeoutId;
        
        const fetchPromise = fetch(url, { 
          signal: controller.signal,
          mode: 'cors',
          cache: 'no-cache'
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error(`Request timeout after ${timeout}ms`));
          }, timeout);
        });
        
        return Promise.race([fetchPromise, timeoutPromise])
          .finally(() => {
            if (timeoutId) clearTimeout(timeoutId);
          })
          .catch(err => {
            if (err.name === 'AbortError' || err.message?.includes('timeout')) {
              throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw err;
          });
      };
      
      // First, test backend is responsive with a quick health check
      log('Testing backend connectivity...');
      try {
        const healthTest = await fetchWithTimeout(`${BACKEND_URL}/`, 10000); // 10 second timeout for health check
        if (healthTest.ok) {
          log('✅ Backend is responsive');
          showToast('Backend connected. Fetching terrain data...', 'info');
        } else {
          logWarn(`Backend health check returned: ${healthTest.status}`);
        }
      } catch (healthError) {
        logWarn('Backend health check failed (may be spinning up):', healthError);
        showToast('Backend may be slow (free tier). Starting analysis anyway...', 'warning');
      }
      
      // Fetch all layers in parallel with timeouts - with progress tracking
      showToast('Fetching terrain data from backend (should complete in 20-50 seconds)...', 'info');
      log('Starting parallel backend requests...');
      log(`Backend URL: ${BACKEND_URL}`);
      log(`Contour URL: ${contourUrl}`);
      
      // SRTM DEM method - may take 30-90 seconds (downloading tiles, GDAL processing)
      const [contoursRes, hydrologyRes, slopeAspectRes] = await Promise.allSettled([
        fetchWithTimeout(contourUrl, 90000).catch(e => { // 90 seconds for reliable completion
          logWarn('Contours request failed:', e);
          throw e;
        }),
        fetchWithTimeout(`${BACKEND_URL}/hydrology?bbox=${bbox}`, 60000).catch(e => {
          logWarn('Hydrology request failed:', e);
          throw e;
        }),
        fetchWithTimeout(`${BACKEND_URL}/slope-aspect?bbox=${bbox}`, 60000).catch(e => {
          logWarn('Slope/aspect request failed:', e);
          throw e;
        })
      ]);
      
      log('All backend requests completed (some may have failed)');
      
      // Process contours - CRITICAL: This must work!
      log('Processing contours response...');
      const contoursSuccess = contoursRes.status === 'fulfilled' && contoursRes.value && contoursRes.value.ok;
      
      if (contoursSuccess) {
        log('Contours request successful, parsing JSON...');
        let contoursData;
        try {
          contoursData = await contoursRes.value.json();
          log(`Contours data received: ${contoursData.features?.length || 0} features`);
        } catch (jsonError) {
          logError('Failed to parse contours JSON:', jsonError);
          showToast('Failed to parse contours data from backend', 'error');
          throw jsonError;
        }
        
        // Remove any OpenTopoMap overlay tiles - we only want actual contour GeoJSON data
            if (layerRefs.current.contourTiles && mapInstanceRef.current) {
          try {
              mapInstanceRef.current.removeLayer(layerRefs.current.contourTiles);
          } catch (e) {
            logWarn('Error removing contour tiles:', e);
          }
              layerRefs.current.contourTiles = null;
            }
            
        // Validate contours data
        const features = contoursData.features || [];
        log(`Contours validation: ${features.length} features found`);
        
        if (features.length > 0) {
          // CRITICAL: Enable contours layer and render immediately
          log('Rendering contours on map...');
            setAnalysisLayers(prev => ({ ...prev, contours: contoursData }));
          setLayerVisibility(prev => ({ ...prev, contours: true })); // Force enable
          
          // Render contours with forceVisible=true to ensure they appear
            renderContours(contoursData, true);
          
            const count = features.length;
          log(`✅ Contours rendered successfully: ${count} lines`);
          showToast(`✅ Contours loaded: ${count} lines (${contourInterval}m interval)`, 'success');
        } else {
          logWarn('Backend returned empty contours array');
          showToast('⚠️ Backend returned no contours. Check area size or DEM availability.', 'warning');
          // Clear any existing contours
          if (layerRefs.current.contours) {
            try {
              mapInstanceRef.current.removeLayer(layerRefs.current.contours);
            } catch (e) {}
            layerRefs.current.contours = null;
          }
          setAnalysisLayers(prev => ({ ...prev, contours: null }));
        }
      } else {
        // Backend failed - show detailed error
        const errorReason = contoursRes.status === 'rejected' 
          ? contoursRes.reason?.message || 'Network/CORS error'
          : (contoursRes.value?.status ? `HTTP ${contoursRes.value.status}` : 'Unknown error');
        
        logError(`❌ Backend contours failed: ${errorReason}`);
        logError('Contours response details:', {
          status: contoursRes.status,
          value: contoursRes.value,
          reason: contoursRes.reason
        });
        
        showToast(`❌ Contours failed: ${errorReason}. Check backend at ${BACKEND_URL}`, 'error');
        
        // Remove any existing contour tiles or layers
        if (layerRefs.current.contourTiles && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.removeLayer(layerRefs.current.contourTiles);
          } catch (e) {
            logWarn('Error removing contour tiles:', e);
          }
          layerRefs.current.contourTiles = null;
        }
        
        // Clear contour data
        if (layerRefs.current.contours) {
          try {
            mapInstanceRef.current.removeLayer(layerRefs.current.contours);
          } catch (e) {}
          layerRefs.current.contours = null;
        }
        setAnalysisLayers(prev => ({ ...prev, contours: null }));
        // Keep contours enabled in UI so user can see it's supposed to be there
          setLayerVisibility(prev => ({ ...prev, contours: true }));
      }
      
      // Process hydrology
      if (hydrologyRes.status === 'fulfilled' && hydrologyRes.value && hydrologyRes.value.ok) {
        let hydrologyData;
        try {
          hydrologyData = await hydrologyRes.value.json();
        } catch (jsonError) {
          logError('Failed to parse hydrology JSON:', jsonError);
          // Continue - hydrology is not critical
        }
        
        if (!hydrologyData) return; // Skip if JSON parse failed
        setAnalysisLayers(prev => ({ ...prev, hydrology: hydrologyData }));
        
        // Extract different hydrology components
        if (hydrologyData.features) {
          const catchments = {
            type: 'FeatureCollection',
            features: hydrologyData.features.filter(f => f.properties?.type === 'catchment')
          };
          const flowPaths = {
            type: 'FeatureCollection',
            features: hydrologyData.features.filter(f => f.properties?.type === 'flow')
          };
          const ponds = {
            type: 'FeatureCollection',
            features: hydrologyData.features.filter(f => f.properties?.type === 'pond')
          };
          
          // Store all hydrology components in analysisLayers
          setAnalysisLayers(prev => ({
            ...prev,
            catchments: catchments,
            flowAccumulation: flowPaths,
            naturalPonds: ponds
          }));
          
          // Auto-enable layers
          setLayerVisibility(prev => ({
            ...prev,
            catchments: true,
            flowAccumulation: true,
            naturalPonds: true
          }));
          
          // Render catchments immediately
          if (catchments.features && catchments.features.length > 0) {
            renderLayer('catchments', catchments, {
              color: '#0ea5e9',
              fillColor: '#0ea5e9',
              fillOpacity: 0.2,
              weight: 2
            }, true);
          }
          
          // Render flow accumulation using renderLayer for proper tracking
          if (flowPaths.features && flowPaths.features.length > 0) {
            // Create flow layer with animated arrows
            const flowLayer = L.geoJSON(flowPaths, {
              style: (feature) => {
                const flowValue = feature.properties?.flow || 1;
                const width = Math.max(2, Math.min(8, flowValue / 10));
                return {
                  color: '#06b6d4',
                  weight: width,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round'
                };
              },
              onEachFeature: (feature, layer) => {
                // Add popup with flow info
                if (feature.properties?.name) {
                  layer.bindPopup(`<strong>${feature.properties.name}</strong><br>Flow: ${feature.properties.flow || 'N/A'}`);
                }
                
                // Add animated flow direction indicators
                if (feature.geometry.type === 'LineString') {
                  const coords = feature.geometry.coordinates;
                  if (coords.length >= 2) {
                    const midIndex = Math.floor(coords.length / 2);
                    const [lng1, lat1] = coords[midIndex];
                    const [lng2, lat2] = coords[midIndex + 1];
                    
                    // Calculate angle
                    const angle = Math.atan2(lat2 - lat1, lng2 - lng1) * 180 / Math.PI;
                    
                    // Add arrow marker
                    const arrowIcon = L.divIcon({
                      className: 'water-flow-arrow',
                      html: `<div style="
                        transform: rotate(${angle}deg);
                        color: #06b6d4;
                        font-size: 16px;
                        animation: flowAnimation 2s infinite;
                      ">→</div>
                      <style>
                        @keyframes flowAnimation {
                          0%, 100% { opacity: 0.6; }
                          50% { opacity: 1; }
                        }
                      </style>`,
                      iconSize: [20, 20],
                      iconAnchor: [10, 10]
                    });
                    
                    L.marker([lat1, lng1], { icon: arrowIcon })
                      .addTo(mapInstanceRef.current);
                  }
                }
              }
            });
            
            // Store in layerRefs and add to map
            layerRefs.current.flowAccumulation = flowLayer;
            if (mapInstanceRef.current) {
              flowLayer.addTo(mapInstanceRef.current);
              log('Flow accumulation layer added to map');
            }
          }
          
          // Render natural ponds immediately
          if (ponds.features && ponds.features.length > 0) {
            renderLayer('naturalPonds', ponds, {
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.5,
              weight: 2
            }, true);
          }
          
          showToast('Hydrology layers added!', 'success');
        }
      }
      
      // Get center point for sun path
      const centerCoords = aoi.geometry.coordinates[0];
      const centerLng = centerCoords.reduce((sum, c) => sum + c[0], 0) / centerCoords.length;
      const centerLat = centerCoords.reduce((sum, c) => sum + c[1], 0) / centerCoords.length;
      
      // Fetch sun path (with timeout) - non-blocking
      try {
        const sunRes = await fetchWithTimeout(`${BACKEND_URL}/sun?lat=${centerLat}&lon=${centerLng}&date=2025-01-01`, 30000);
        if (sunRes.ok) {
          const sunData = await sunRes.json();
          if (sunData && !sunData.error) {
          setAnalysisLayers(prev => ({ ...prev, sunPath: sunData }));
          } else {
            logWarn('Sun path data has error:', sunData.error);
          }
        } else {
          logWarn(`Sun path request failed: HTTP ${sunRes.status}`);
        }
      } catch (sunError) {
        logWarn('Sun path request failed (non-critical):', sunError);
        // Continue - sun path is not critical for main analysis
      }
      
      // Process slope and aspect
      if (slopeAspectRes.status === 'fulfilled' && slopeAspectRes.value && slopeAspectRes.value.ok) {
        try {
          let slopeAspectData;
          try {
            slopeAspectData = await slopeAspectRes.value.json();
          } catch (jsonError) {
            logError('Failed to parse slope/aspect JSON:', jsonError);
            throw jsonError;
          }
          
          if (!slopeAspectData) return; // Skip if JSON parse failed
          
          if (slopeAspectData.slope && slopeAspectData.slope.features && slopeAspectData.slope.features.length > 0) {
            setAnalysisLayers(prev => ({ ...prev, slope: slopeAspectData.slope }));
            // Render slope as colored circle markers
            const slopeLayer = L.geoJSON(slopeAspectData.slope, {
              pointToLayer: (feature, latlng) => {
                const props = feature.properties || {};
                return L.circleMarker(latlng, {
                  radius: 5,
                  fillColor: props.color || '#90EE90',
                  color: props.color || '#90EE90',
                  weight: 1,
                  opacity: 0.8,
                  fillOpacity: 0.6
                }).bindPopup(`Slope: ${props.slope}°<br>Category: ${props.category}`);
              }
            });
            layerRefs.current.slope = slopeLayer;
            if (layerVisibility.slope && mapInstanceRef.current) {
              slopeLayer.addTo(mapInstanceRef.current);
            }
            showToast(`Slope analysis loaded: ${slopeAspectData.slope.features.length} points`, 'success');
          }
          
          if (slopeAspectData.aspect && slopeAspectData.aspect.features && slopeAspectData.aspect.features.length > 0) {
            setAnalysisLayers(prev => ({ ...prev, aspect: slopeAspectData.aspect }));
            // Render aspect as colored circle markers
            const aspectLayer = L.geoJSON(slopeAspectData.aspect, {
              pointToLayer: (feature, latlng) => {
                const props = feature.properties || {};
                return L.circleMarker(latlng, {
                  radius: 5,
                  fillColor: props.color || '#FF0000',
                  color: props.color || '#FF0000',
                  weight: 1,
                  opacity: 0.8,
                  fillOpacity: 0.6
                }).bindPopup(`Aspect: ${props.aspect}°<br>Direction: ${props.direction}`);
              }
            });
            layerRefs.current.aspect = aspectLayer;
            if (layerVisibility.aspect && mapInstanceRef.current) {
              aspectLayer.addTo(mapInstanceRef.current);
            }
            showToast(`Aspect analysis loaded: ${slopeAspectData.aspect.features.length} points`, 'success');
        }
      } catch (err) {
          logWarn('Slope/aspect processing failed:', err);
        }
      }
      
      // Generate seasonal sun paths (winter/summer sunrise/sunset)
      generateSeasonalSunPaths(centerLat, centerLng);
      
      // Generate wind analysis
      generateWindAnalysis(centerLat, centerLng);
      
      // Check if we got any results
      let hasResults = false;
      let resultCount = 0;
      const resultMessages = [];
      
      if (contoursRes && contoursRes.status === 'fulfilled' && contoursRes.value && contoursRes.value.ok) {
        hasResults = true;
        resultCount++;
        resultMessages.push('Contours');
      }
      if (hydrologyRes && hydrologyRes.status === 'fulfilled' && hydrologyRes.value && hydrologyRes.value.ok) {
        hasResults = true;
        resultCount++;
        resultMessages.push('Hydrology');
      }
      if (slopeAspectRes && slopeAspectRes.status === 'fulfilled' && slopeAspectRes.value && slopeAspectRes.value.ok) {
        hasResults = true;
        resultCount++;
        resultMessages.push('Slope/Aspect');
      }
      
      if (hasResults) {
        showToast(`Analysis complete! ${resultMessages.join(', ')} loaded.`, 'success');
      } else {
        // No results - show helpful error
        const errors = [];
        if (contoursRes.status === 'rejected') {
          errors.push(`Contours: ${contoursRes.reason?.message || 'Request failed'}`);
        } else if (contoursRes.value && !contoursRes.value.ok) {
          errors.push(`Contours: HTTP ${contoursRes.value.status}`);
        }
        
        if (hydrologyRes.status === 'rejected') {
          errors.push(`Hydrology: ${hydrologyRes.reason?.message || 'Request failed'}`);
        } else if (hydrologyRes.value && !hydrologyRes.value.ok) {
          errors.push(`Hydrology: HTTP ${hydrologyRes.value.status}`);
        }
        
        if (slopeAspectRes.status === 'rejected') {
          errors.push(`Slope/Aspect: ${slopeAspectRes.reason?.message || 'Request failed'}`);
        } else if (slopeAspectRes.value && !slopeAspectRes.value.ok) {
          errors.push(`Slope/Aspect: HTTP ${slopeAspectRes.value.status}`);
        }
        
        if (errors.length > 0) {
          logWarn('Backend requests failed:', errors);
          showToast(`Backend processing failed: ${errors[0]}. Try a smaller area or wait for backend to spin up (free tier takes ~50s).`, 'error');
        } else {
          showToast('No data received from backend. Backend may be spinning up (free tier takes ~50s).', 'warning');
        }
      }
    } catch (error) {
      // Handle backend connection errors gracefully
      console.error('Analysis error:', error);
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        showToast('Backend server not responding. Check deployment status.', 'error');
      } else if (error.message?.includes('timeout')) {
        showToast('Analysis timed out. Backend may be slow. Try a smaller area or wait for backend to spin up.', 'error');
      } else {
        showToast('Analysis failed: ' + (error.message || 'Unknown error'), 'error');
      }
    } finally {
      // ALWAYS clear timeout and analysis state
      clearTimeout(analysisTimeout);
      setIsAnalyzing(false);
      log('Analysis completed - isAnalyzing cleared');
    }
  };
  
  // Generate seasonal sun paths (winter/summer sunrise/sunset)
  const generateSeasonalSunPaths = (lat, lng) => {
    if (!mapInstanceRef.current || !aoi) return;
    
    // Calculate sun positions for winter and summer solstices
    const winterSolstice = new Date(2024, 11, 21); // Dec 21
    const summerSolstice = new Date(2024, 5, 21); // Jun 21
    
    // Helper to calculate sun position
    const getSunPosition = (date, hour) => {
      const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
      const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
      const hourAngle = (hour - 12) * 15;
      const elevation = Math.asin(
        Math.sin(lat * Math.PI / 180) * Math.sin(declination * Math.PI / 180) +
        Math.cos(lat * Math.PI / 180) * Math.cos(declination * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
      ) * 180 / Math.PI;
      
      if (elevation < 0) return null; // Sun below horizon
      
      const azimuth = Math.atan2(
        Math.sin(hourAngle * Math.PI / 180),
        Math.cos(lat * Math.PI / 180) * Math.tan(declination * Math.PI / 180) -
        Math.sin(lat * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
      ) * 180 / Math.PI + 180;
      
      const radius = 0.015;
      return [
        lng + Math.sin(azimuth * Math.PI / 180) * radius * Math.cos(elevation * Math.PI / 180),
        lat + Math.cos(azimuth * Math.PI / 180) * radius * Math.cos(elevation * Math.PI / 180)
      ];
    };
    
    // Winter sunrise/sunset
    const winterSunrise = getSunPosition(winterSolstice, 7);
    const winterSunset = getSunPosition(winterSolstice, 17);
    
    // Summer sunrise/sunset
    const summerSunrise = getSunPosition(summerSolstice, 5);
    const summerSunset = getSunPosition(summerSolstice, 19);
    
    // Create markers for seasonal sun positions
    const createSeasonalMarker = (coords, label, color) => {
      if (!coords) return null;
      const [lng, lat] = coords;
      const icon = L.divIcon({
        className: 'seasonal-sun-marker',
        html: `<div style="
          width: 16px;
          height: 16px;
          background: ${color};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 8px ${color}80;
        "></div>
        <div style="
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          color: ${color};
          font-weight: bold;
          white-space: nowrap;
          background: rgba(0,0,0,0.7);
          padding: 2px 4px;
          border-radius: 3px;
        ">${label}</div>`,
        iconSize: [16, 30],
        iconAnchor: [8, 8]
      });
      
      return L.marker([lat, lng], { icon })
        .bindPopup(label)
        .addTo(mapInstanceRef.current);
    };
    
    // Add seasonal markers and add to map
    if (winterSunrise) {
      const marker = createSeasonalMarker(winterSunrise, 'Winter Sunrise', '#4a90e2');
      if (marker) {
        layerRefs.current.winterSunrise = L.layerGroup([marker]);
        if (mapInstanceRef.current) layerRefs.current.winterSunrise.addTo(mapInstanceRef.current);
      }
    }
    if (winterSunset) {
      const marker = createSeasonalMarker(winterSunset, 'Winter Sunset', '#e24a4a');
      if (marker) {
        layerRefs.current.winterSunset = L.layerGroup([marker]);
        if (mapInstanceRef.current) layerRefs.current.winterSunset.addTo(mapInstanceRef.current);
      }
    }
    if (summerSunrise) {
      const marker = createSeasonalMarker(summerSunrise, 'Summer Sunrise', '#f59e0b');
      if (marker) {
        layerRefs.current.summerSunrise = L.layerGroup([marker]);
        if (mapInstanceRef.current) layerRefs.current.summerSunrise.addTo(mapInstanceRef.current);
      }
    }
    if (summerSunset) {
      const marker = createSeasonalMarker(summerSunset, 'Summer Sunset', '#f97316');
      if (marker) {
        layerRefs.current.summerSunset = L.layerGroup([marker]);
        if (mapInstanceRef.current) layerRefs.current.summerSunset.addTo(mapInstanceRef.current);
      }
    }
    
    setAnalysisLayers(prev => ({
      ...prev,
      winterSunrise: { type: 'Feature', geometry: { type: 'Point', coordinates: winterSunrise || [] } },
      winterSunset: { type: 'Feature', geometry: { type: 'Point', coordinates: winterSunset || [] } },
      summerSunrise: { type: 'Feature', geometry: { type: 'Point', coordinates: summerSunrise || [] } },
      summerSunset: { type: 'Feature', geometry: { type: 'Point', coordinates: summerSunset || [] } }
    }));
  };
  
  // Generate wind analysis (wind flow, sectors, areas)
  const generateWindAnalysis = (lat, lng) => {
    if (!mapInstanceRef.current || !aoi) return;
    
    const coords = aoi.geometry.coordinates[0];
    const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    
    // Create wind flow visualization (prevailing wind direction - typically NW in Northern Hemisphere)
    const windDirection = 315; // Northwest (degrees)
    const windSpeed = 15; // km/h
    
    // Primary wind sector (NW to N, 45 degrees)
    const primarySectorStart = 315;
    const primarySectorEnd = 360;
    const primarySector = createWindSector(centerLat, centerLng, primarySectorStart, primarySectorEnd, '#3b82f6', 'Primary Wind Sector');
    
    // Secondary wind sector (W to NW, 45 degrees)
    const secondarySectorStart = 270;
    const secondarySectorEnd = 315;
    const secondarySector = createWindSector(centerLat, centerLng, secondarySectorStart, secondarySectorEnd, '#06b6d4', 'Secondary Wind Sector');
    
    // Wind flow arrows
    const windFlow = createWindFlowArrows(centerLat, centerLng, windDirection, windSpeed);
    
    // Primary wind area (larger area affected by primary wind)
    const primaryWindArea = createWindArea(centerLat, centerLng, primarySectorStart, primarySectorEnd, 0.02, '#3b82f6', 0.2);
    
    // Secondary wind area
    const secondaryWindArea = createWindArea(centerLat, centerLng, secondarySectorStart, secondarySectorEnd, 0.015, '#06b6d4', 0.15);
    
    // Store and render - auto-enable wind layers
    setLayerVisibility(prev => ({
      ...prev,
      windFlow: true,
      primaryWindSector: true,
      secondaryWindSector: true,
      primaryWindArea: true,
      secondaryWindArea: true
    }));
    
    if (primarySector) {
      layerRefs.current.primaryWindSector = primarySector;
      primarySector.addTo(mapInstanceRef.current);
      setAnalysisLayers(prev => ({ ...prev, primaryWindSector: { type: 'Feature', properties: { name: 'Primary Wind Sector' } } }));
    }
    if (secondarySector) {
      layerRefs.current.secondaryWindSector = secondarySector;
      secondarySector.addTo(mapInstanceRef.current);
      setAnalysisLayers(prev => ({ ...prev, secondaryWindSector: { type: 'Feature', properties: { name: 'Secondary Wind Sector' } } }));
    }
    if (windFlow) {
      layerRefs.current.windFlow = windFlow;
      windFlow.addTo(mapInstanceRef.current);
      setAnalysisLayers(prev => ({ ...prev, windFlow: { type: 'Feature', properties: { name: 'Wind Flow' } } }));
    }
    if (primaryWindArea) {
      layerRefs.current.primaryWindArea = primaryWindArea;
      primaryWindArea.addTo(mapInstanceRef.current);
      setAnalysisLayers(prev => ({ ...prev, primaryWindArea: { type: 'Feature', properties: { name: 'Primary Wind Area' } } }));
    }
    if (secondaryWindArea) {
      layerRefs.current.secondaryWindArea = secondaryWindArea;
      secondaryWindArea.addTo(mapInstanceRef.current);
      setAnalysisLayers(prev => ({ ...prev, secondaryWindArea: { type: 'Feature', properties: { name: 'Secondary Wind Area' } } }));
    }
    
    // Enable seasonal sun paths
    setLayerVisibility(prev => ({
      ...prev,
      winterSunrise: true,
      winterSunset: true,
      summerSunrise: true,
      summerSunset: true
    }));
  };
  
  // Helper to create wind sector
  const createWindSector = (lat, lng, startAngle, endAngle, color, label) => {
    if (!mapInstanceRef.current) return null;
    
    const radius = 0.01;
    const sectorCoords = [];
    
    // Add center point
    sectorCoords.push([lng, lat]);
    
    // Create arc
    for (let angle = startAngle; angle <= endAngle; angle += 5) {
      const rad = angle * Math.PI / 180;
      sectorCoords.push([
        lng + Math.sin(rad) * radius,
        lat + Math.cos(rad) * radius
      ]);
    }
    
    // Close sector
    sectorCoords.push([lng, lat]);
    
    const polygon = L.polygon(sectorCoords, {
      color: color,
      fillColor: color,
      fillOpacity: 0.3,
      weight: 2
    }).bindPopup(label);
    
    return L.layerGroup([polygon]);
  };
  
  // Helper to create wind flow arrows
  const createWindFlowArrows = (lat, lng, direction, speed) => {
    if (!mapInstanceRef.current) return null;
    
    const arrows = [];
    const radius = 0.008;
    const arrowCount = 8;
    
    for (let i = 0; i < arrowCount; i++) {
      const angle = (i * 360 / arrowCount) * Math.PI / 180;
      const arrowLng = lng + Math.sin(angle) * radius;
      const arrowLat = lat + Math.cos(angle) * radius;
      
      const windRad = direction * Math.PI / 180;
      const arrowIcon = L.divIcon({
        className: 'wind-arrow',
        html: `<div style="
          transform: rotate(${direction}deg);
          color: #8b5cf6;
          font-size: 20px;
          font-weight: bold;
        ">→</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      const marker = L.marker([arrowLat, arrowLng], { icon: arrowIcon })
        .bindPopup(`Wind: ${speed} km/h from ${direction}°`);
      arrows.push(marker);
    }
    
    return L.layerGroup(arrows);
  };
  
  // Helper to create wind area
  const createWindArea = (lat, lng, startAngle, endAngle, radius, color, opacity) => {
    if (!mapInstanceRef.current) return null;
    
    const sectorCoords = [];
    sectorCoords.push([lng, lat]);
    
    for (let angle = startAngle; angle <= endAngle; angle += 5) {
      const rad = angle * Math.PI / 180;
      sectorCoords.push([
        lng + Math.sin(rad) * radius,
        lat + Math.cos(rad) * radius
      ]);
    }
    
    sectorCoords.push([lng, lat]);
    
    const polygon = L.polygon(sectorCoords, {
      color: color,
      fillColor: color,
      fillOpacity: opacity,
      weight: 2,
      dashArray: '5, 5'
    });
    
    return L.layerGroup([polygon]);
  };
  
  // REMOVED: generateFallbackContours() - was creating fake uniform contours
  // We only generate real terrain-based contours from DEM data
  // If backend fails, show error instead of fake data
  
  // REMOVED: createFallbackVisualizations() - was creating fake uniform contours
  // We only generate real terrain-based contours from DEM data
  // If backend fails, show error instead of fake data
  
  // REMOVED: All fallback visualization code - was creating fake uniform contours
  
  // ========== POND CALCULATOR ==========
  const calculatePond = () => {
    const area = parseFloat(pondCalc.area);
    const depth = parseFloat(pondCalc.depth);
    
    if (!area || !depth || area <= 0 || depth <= 0) {
      alert('Please enter valid area and depth');
      return;
    }
    
    const volume = area * depth; // m³
    const volumeLiters = volume * 1000;
    const volumeGallons = volume * 264.172;
    
    setPondCalc(prev => ({
      ...prev,
      result: {
        volumeCubicMeters: volume.toFixed(2),
        volumeLiters: volumeLiters.toFixed(2),
        volumeGallons: volumeGallons.toFixed(2),
        estimatedExcavation: (volume * 1.3).toFixed(2) // 30% over-excavation
      }
    }));
  };
  
  // ========== AI ADVISORY ==========
  const generateAIStrategy = async () => {
    if (!aiGoal.trim()) {
      showToast('Please enter a design goal', 'error');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/ai?q=${encodeURIComponent(aiGoal)}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiStrategy(data.answer || 'AI recommendation generated successfully.');
        showToast('AI strategy generated', 'success');
      } else {
        // Fallback to rule-based strategy if API fails
        const goalLower = aiGoal.toLowerCase();
        let strategy = 'Based on your terrain analysis, I recommend:\n\n';
        
        if (goalLower.includes('water') || goalLower.includes('storage')) {
          strategy += 'Install 3 key swales on contour lines 12, 15, and 18. Place a retention pond at the lowest catchment point. Estimated storage: 50,000 liters.';
        } else if (goalLower.includes('wind') || goalLower.includes('windbreak')) {
          strategy += 'Plant windbreak along the northern boundary using native species. Recommended spacing: 3m between trees, 2 rows deep.';
        } else {
          strategy += 'Based on terrain analysis, implement swales at key elevations. Create a keyline system connecting these swales to maximize water infiltration.';
        }
        
        strategy += '\n\nAdditional recommendations:\n';
        strategy += '• Zone 0 (house) should be positioned for optimal sun exposure\n';
        strategy += '• Zone 1 (kitchen garden) adjacent to Zone 0, utilizing swale overflow\n';
        strategy += '• Zone 2-3 (orchards) on moderate slopes with windbreak protection\n';
        strategy += '• Zone 4-5 (wild areas) in steepest terrain for biodiversity';
        
        setAiStrategy(strategy);
        showToast('Strategy generated (using rule-based system)', 'info');
      }
    } catch (error) {
      // Silently handle backend connection errors - use fallback
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        // Backend not available - use rule-based fallback
        showToast('Using rule-based recommendations (backend not available)', 'info');
      } else {
        console.error('AI advisory error:', error);
        showToast('AI service unavailable, using rule-based recommendations', 'info');
      }
      
      // Enhanced fallback rule-based strategy
      const goalLower = aiGoal.toLowerCase();
      let strategy = '🌱 **Permaculture Design Recommendations**\n\n';
      
      // Water management
      if (goalLower.includes('water') || goalLower.includes('storage') || goalLower.includes('hydrology')) {
        strategy += '💧 **Water Management Strategy:**\n';
        strategy += '• Install keyline swales on contour lines at 5m intervals\n';
        strategy += '• Place retention ponds at lowest catchment points\n';
        strategy += '• Estimated water storage: 50,000-100,000 liters\n';
        strategy += '• Use overflow channels to connect swales\n';
        strategy += '• Plant water-loving species along swale edges\n\n';
      }
      
      // Wind management
      if (goalLower.includes('wind') || goalLower.includes('windbreak') || goalLower.includes('wind')) {
        strategy += '🌬️ **Wind Management Strategy:**\n';
        strategy += '• Plant primary windbreak along NW boundary (prevailing wind)\n';
        strategy += '• Use native species: 3m spacing, 2-3 rows deep\n';
        strategy += '• Secondary windbreak on W side for protection\n';
        strategy += '• Create microclimates behind windbreaks\n';
        strategy += '• Position structures to utilize wind for ventilation\n\n';
      }
      
      // Plantation/crops
      if (goalLower.includes('plant') || goalLower.includes('crop') || goalLower.includes('tree') || goalLower.includes('garden') || goalLower.includes('plantation') || goalLower.includes('best plantation')) {
        strategy += '🌳 **Optimal Plantation Strategy:**\n';
        strategy += 'Based on your site analysis, here are the best planting recommendations:\n\n';
        strategy += '**Zone 1 - Kitchen Garden (High Maintenance):**\n';
        strategy += '• Location: Near structures, within 10m of access\n';
        strategy += '• Crops: Vegetables, herbs, salad greens\n';
        strategy += '• Sun: Full sun (6+ hours daily)\n';
        strategy += '• Water: Utilize swale overflow for irrigation\n';
        strategy += '• Soil: Rich, well-drained, add compost\n\n';
        
        strategy += '**Zone 2 - Orchard & Food Forest (Medium Maintenance):**\n';
        strategy += '• Location: Moderate slopes (5-15%), swale overflow areas\n';
        strategy += '• Crops: Fruit trees, berries, nut trees\n';
        strategy += '• Sun: 4-6 hours, consider winter/summer sun paths\n';
        strategy += '• Wind: Protected by windbreaks\n';
        strategy += '• Spacing: 5-8m between trees, guild planting\n\n';
        
        strategy += '**Zone 3 - Managed Forest (Low Maintenance):**\n';
        strategy += '• Location: Steeper slopes, away from structures\n';
        strategy += '• Crops: Native trees, timber, wildlife habitat\n';
        strategy += '• Management: Minimal intervention, natural succession\n';
        strategy += '• Benefits: Biodiversity, carbon sequestration\n\n';
        
        strategy += '**Zone 4-5 - Wild Areas (Minimal Maintenance):**\n';
        strategy += '• Location: Steepest terrain, remote areas\n';
        strategy += '• Purpose: Conservation, wildlife corridors\n';
        strategy += '• Management: Natural processes, occasional observation\n\n';
        
        strategy += '**Site-Specific Recommendations:**\n';
        if (aoiStats) {
          strategy += `• Your ${aoiStats.area.hectares.toFixed(2)} ha site allows for comprehensive zone planning\n`;
          strategy += `• Consider wind patterns for optimal tree placement\n`;
          strategy += `• Use contour lines for swale-based irrigation\n`;
        }
        strategy += '• Plant windbreaks on NW side (prevailing wind)\n';
        strategy += '• Position structures for optimal sun exposure\n';
        strategy += '• Use companion planting for natural pest control\n';
        strategy += '• Implement polyculture for resilience\n\n';
      }
      
      // General recommendations
      if (!goalLower.includes('water') && !goalLower.includes('wind') && !goalLower.includes('plant')) {
        strategy += '📋 **Comprehensive Design Recommendations:**\n';
        strategy += '• **Water Systems:** Implement swales on contour lines to slow and spread water\n';
        strategy += '• **Sun Exposure:** Position structures for optimal winter sun and summer shade\n';
        strategy += '• **Wind Management:** Use windbreaks for microclimate control\n';
        strategy += '• **Soil Building:** Use swale overflow for natural irrigation\n';
        strategy += '• **Zoning:** Organize by frequency of use and care requirements\n\n';
      }
      
      // Add AOI-specific recommendations
      if (aoiStats) {
        strategy += `📍 **Site-Specific Analysis:**\n`;
        strategy += `• Area: ${aoiStats.area.hectares.toFixed(2)} hectares\n`;
        strategy += `• Perimeter: ${aoiStats.perimeter.kilometers.toFixed(2)} km\n`;
        strategy += `• Consider slope analysis for swale placement\n`;
        strategy += `• Use aspect analysis for optimal structure orientation\n\n`;
      }
      
      strategy += '💡 **Next Steps:**\n';
      strategy += '1. Run full terrain analysis to get detailed contours\n';
      strategy += '2. Identify keyline points for swale placement\n';
      strategy += '3. Map water flow patterns for pond locations\n';
      strategy += '4. Design windbreak system based on prevailing winds\n';
      strategy += '5. Plan zones based on access and maintenance needs';
      
      setAiStrategy(strategy);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // ========== LOCATION SEARCH ==========
  const searchLocation = async (query) => {
    if (!query.trim()) {
      showToast('Please enter a location to search', 'error');
      return;
    }
    
    if (!mapInstanceRef.current) {
      showToast('Map not ready. Please wait...', 'error');
      return;
    }
    
    setIsSearching(true);
    try {
      // Use Nominatim (OpenStreetMap) geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'Permaculture-Design-Platform'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Search API error');
      }
      
      const results = await response.json();
      setSearchResults(results);
      
      if (results.length > 0) {
        const firstResult = results[0];
        const lat = parseFloat(firstResult.lat);
        const lon = parseFloat(firstResult.lon);
        
        // Remove previous search marker
        if (searchMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(searchMarkerRef.current);
        }
        
        // Zoom to location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 13);
          
          // Add marker
          searchMarkerRef.current = L.marker([lat, lon], {
            icon: L.icon({
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })
          }).addTo(mapInstanceRef.current);
          
          searchMarkerRef.current.bindPopup(firstResult.display_name).openPopup();
        }
        
        showToast(`Found: ${firstResult.display_name}`, 'success');
      } else {
        showToast('Location not found. Try a different search term.', 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Search failed. Check your internet connection.', 'error');
    } finally {
      setIsSearching(false);
    }
  };
  
  // ========== COORDINATE SEARCH ==========
  const searchByCoordinates = () => {
    const lat = parseFloat(coordInput.lat);
    const lng = parseFloat(coordInput.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      showToast('Please enter valid coordinates', 'error');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast('Invalid coordinate range. Lat: -90 to 90, Lng: -180 to 180', 'error');
      return;
    }
    
    if (!mapInstanceRef.current) {
      showToast('Map not ready. Please wait...', 'error');
      return;
    }
    
    // Remove previous search marker
    if (searchMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
    }
    
    mapInstanceRef.current.setView([lat, lng], 15);
    
    searchMarkerRef.current = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
    }).addTo(mapInstanceRef.current);
    
    searchMarkerRef.current.bindPopup(`Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
    showToast(`Navigated to coordinates`, 'success');
  };
  
  // ========== GPX FILE IMPORT ==========
  const parseGPX = (gpxText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
    
    const tracks = xmlDoc.getElementsByTagName('trk');
    const waypoints = xmlDoc.getElementsByTagName('wpt');
    const routes = xmlDoc.getElementsByTagName('rte');
    
    const features = [];
    
    // Parse tracks
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const trackSegments = track.getElementsByTagName('trkseg');
      const name = track.getElementsByTagName('name')[0]?.textContent || `Track ${i + 1}`;
      
      for (let j = 0; j < trackSegments.length; j++) {
        const segment = trackSegments[j];
        const points = segment.getElementsByTagName('trkpt');
        const coordinates = [];
        
        for (let k = 0; k < points.length; k++) {
          const point = points[k];
          const lat = parseFloat(point.getAttribute('lat'));
          const lon = parseFloat(point.getAttribute('lon'));
          const ele = point.getElementsByTagName('ele')[0]?.textContent;
          coordinates.push([lon, lat, ele ? parseFloat(ele) : null]);
        }
        
        if (coordinates.length > 0) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinates.map(c => [c[0], c[1]])
            },
            properties: {
              name: name,
              type: 'track',
              elevation: coordinates.map(c => c[2]).filter(e => e !== null)
            }
          });
        }
      }
    }
    
    // Parse waypoints
    for (let i = 0; i < waypoints.length; i++) {
      const wpt = waypoints[i];
      const lat = parseFloat(wpt.getAttribute('lat'));
      const lon = parseFloat(wpt.getAttribute('lon'));
      const name = wpt.getElementsByTagName('name')[0]?.textContent || `Waypoint ${i + 1}`;
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: {
          name: name,
          type: 'waypoint'
        }
      });
    }
    
    return {
      type: 'FeatureCollection',
      features: features
    };
  };
  
  const handleGPXUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.gpx')) {
      showToast('Please upload a .gpx file', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const gpxText = e.target.result;
        const geojson = parseGPX(gpxText);
        setGpxData(geojson);
        
        // Render GPX on map
        if (mapInstanceRef.current && geojson.features.length > 0) {
          // Remove existing GPX layer
          if (gpxLayerRef.current) {
            mapInstanceRef.current.removeLayer(gpxLayerRef.current);
          }
          
          // Add new GPX layer
          gpxLayerRef.current = L.geoJSON(geojson, {
            style: (feature) => {
              if (feature.geometry.type === 'LineString') {
                return {
                  color: '#f59e0b',
                  weight: 3,
                  opacity: 0.8
                };
              }
              return {
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.7,
                radius: 6
              };
            },
            pointToLayer: (feature, latlng) => {
              if (feature.geometry.type === 'Point') {
                return L.circleMarker(latlng, {
                  radius: 6,
                  fillColor: '#ef4444',
                  color: '#fff',
                  weight: 2,
                  fillOpacity: 0.7
                });
              }
              return L.marker(latlng);
            },
            onEachFeature: (feature, layer) => {
              if (feature.properties.name) {
                layer.bindPopup(feature.properties.name);
              }
            }
          }).addTo(mapInstanceRef.current);
          
          // Fit map to GPX bounds
          const bounds = gpxLayerRef.current.getBounds();
          mapInstanceRef.current.fitBounds(bounds);
          
          showToast(`GPX loaded: ${geojson.features.length} features`, 'success');
        }
      } catch (error) {
        console.error('GPX parse error:', error);
        showToast('Failed to parse GPX file', 'error');
      }
    };
    reader.readAsText(file);
  };
  
  // ========== AOI STATISTICS ==========
  const calculateAOIStats = (geojson) => {
    if (!geojson || !geojson.geometry) return null;
    
    const coords = geojson.geometry.coordinates[0];
    if (coords.length < 3) return null;
    
    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1];
      area -= coords[i + 1][0] * coords[i][1];
    }
    area = Math.abs(area) / 2;
    
    // Convert to square meters (approximate, using Haversine for better accuracy)
    const R = 6371000; // Earth radius in meters
    const lat1 = coords[0][1] * Math.PI / 180;
    const lat2 = coords[1][1] * Math.PI / 180;
    const dLat = (coords[1][1] - coords[0][1]) * Math.PI / 180;
    const dLon = (coords[1][0] - coords[0][1]) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Approximate
    
    // Better area calculation
    let areaM2 = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const lat1 = coords[i][1] * Math.PI / 180;
      const lon1 = coords[i][0] * Math.PI / 180;
      const lat2 = coords[i + 1][1] * Math.PI / 180;
      const lon2 = coords[i + 1][0] * Math.PI / 180;
      areaM2 += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    areaM2 = Math.abs(areaM2) * R * R / 2;
    
    // Calculate perimeter
    let perimeter = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const lat1 = coords[i][1] * Math.PI / 180;
      const lon1 = coords[i][0] * Math.PI / 180;
      const lat2 = coords[i + 1][1] * Math.PI / 180;
      const lon2 = coords[i + 1][0] * Math.PI / 180;
      
      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      perimeter += R * c;
    }
    
    // Calculate center
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    
    // Bounding box
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return {
      area: {
        squareMeters: areaM2,
        hectares: areaM2 / 10000,
        acres: areaM2 * 0.000247105
      },
      perimeter: {
        meters: perimeter,
        kilometers: perimeter / 1000
      },
      center: {
        lat: centerLat,
        lng: centerLng
      },
      bbox: {
        minLat,
        maxLat,
        minLng,
        maxLng
      },
      vertices: coords.length - 1
    };
  };
  
  // Update AOI stats when AOI changes
  useEffect(() => {
    if (aoi) {
      const stats = calculateAOIStats(aoi);
      setAoiStats(stats);
    } else {
      setAoiStats(null);
    }
  }, [aoi]);
  
  // ========== EXPORT & SHARE ==========
  // Wait for all map tiles to load completely - SIMPLIFIED AND RELIABLE
  const waitForAllTiles = (map) => {
    return new Promise((resolve) => {
      if (!map) {
        resolve();
        return;
      }
      
      let checkInterval;
      let timeout;
      let consecutiveChecks = 0;
      const REQUIRED_CONSECUTIVE = 3; // Need 3 consecutive checks with all tiles loaded
      
      const countTiles = () => {
        const tileImages = map.getContainer().querySelectorAll('img.leaflet-tile');
        const tilesTotal = tileImages.length;
        
        if (tilesTotal === 0) {
          // No tiles yet, keep checking
          consecutiveChecks = 0;
          return;
        }
        
        // Check if all tiles are loaded
        let loadedCount = 0;
        tileImages.forEach((img) => {
          // Check if image is loaded AND has valid dimensions
          if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && !img.src.includes('data:image')) {
            loadedCount++;
          }
        });
        
        // If all tiles are loaded, increment consecutive counter
        if (loadedCount === tilesTotal && tilesTotal > 0) {
          consecutiveChecks++;
          if (consecutiveChecks >= REQUIRED_CONSECUTIVE) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
            // Extra wait to ensure rendering is complete
            setTimeout(() => {
              log(`All ${tilesTotal} tiles loaded successfully`);
              resolve();
            }, 1000);
          return;
          }
        } else {
          consecutiveChecks = 0; // Reset if not all loaded
        }
      };
      
      // Check every 200ms
      checkInterval = setInterval(countTiles, 200);
      
      // Initial check
      countTiles();
      
      // Timeout after 15 seconds (longer for satellite tiles)
      timeout = setTimeout(() => {
        clearInterval(checkInterval);
        const tileImages = map.getContainer().querySelectorAll('img.leaflet-tile');
        const loaded = Array.from(tileImages).filter(img => img.complete && img.naturalWidth > 0).length;
        logWarn(`Tile loading timeout. Loaded ${loaded}/${tileImages.length} tiles. Proceeding with export.`);
        resolve();
      }, 15000);
    });
  };
  
  // Ensure all visible layers are shown before export
  const prepareForExport = async () => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    
    // CRITICAL: Remove ALL other basemap layers and ensure ONLY satellite is active
    // Remove any non-satellite tile layers (including OpenTopoMap overlay)
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        const url = layer._url || '';
        // Remove ALL non-satellite basemaps - we only want satellite + contour GeoJSON
        if (!url.includes('World_Imagery') && !url.includes('arcgisonline')) {
          // Remove OpenTopoMap and any other non-satellite layers
          if (layer !== basemapLayerRef.current) {
            map.removeLayer(layer);
          }
        }
      }
    });
    
    // Ensure contourTiles is removed (we don't want OpenTopoMap overlay)
    if (layerRefs.current.contourTiles && map.hasLayer(layerRefs.current.contourTiles)) {
      map.removeLayer(layerRefs.current.contourTiles);
      layerRefs.current.contourTiles = null;
    }
    
    // Force satellite basemap to be added and visible
    if (!basemapLayerRef.current || !map.hasLayer(basemapLayerRef.current)) {
      // Remove old basemap if exists
      if (basemapLayerRef.current) {
        try {
          map.removeLayer(basemapLayerRef.current);
        } catch (e) {}
      }
      
      // Create fresh satellite basemap
      const satelliteConfig = basemapConfigs.satellite;
      basemapLayerRef.current = L.tileLayer(satelliteConfig.url, {
        attribution: satelliteConfig.attribution,
        maxZoom: satelliteConfig.maxZoom
      });
      basemapLayerRef.current.addTo(map);
    }
    
    // Ensure all enabled layers are visible
    Object.keys(layerRefs.current).forEach((layerKey) => {
      const layer = layerRefs.current[layerKey];
      if (layer && layerVisibility[layerKey]) {
        if (!map.hasLayer(layer)) {
          layer.addTo(map);
        }
      }
    });
    
    // Remove any OpenTopoMap contour tiles - we only want actual contour GeoJSON data
    if (layerRefs.current.contourTiles && map.hasLayer(layerRefs.current.contourTiles)) {
      map.removeLayer(layerRefs.current.contourTiles);
      layerRefs.current.contourTiles = null;
    }
    
    // Ensure contour labels are visible if enabled
    if (contourShowLabels && labelMarkersRef.current) {
      labelMarkersRef.current.forEach(marker => {
        if (marker && !map.hasLayer(marker)) {
          marker.addTo(map);
        }
      });
    }
    
    // Force map to redraw all layers
    map.invalidateSize();
    
    // CRITICAL: Force all layers to redraw, especially contours
    if (layerRefs.current.contours) {
      try {
        map.removeLayer(layerRefs.current.contours);
        map.addLayer(layerRefs.current.contours);
        
        // Force each contour line to redraw with visible strokes
        layerRefs.current.contours.eachLayer((layer) => {
          if (layer instanceof L.Polyline) {
            layer.redraw();
            // Ensure stroke is visible on the actual DOM path
            const path = layer._path;
            if (path) {
              const weight = layer.options.weight || 3;
              const color = layer.options.color || '#22c55e';
              const opacity = layer.options.opacity || 0.9;
              
              path.style.strokeWidth = Math.max(4, weight) + 'px'; // Minimum 4px for export
              path.style.stroke = color;
              path.style.strokeOpacity = opacity.toString();
              path.style.opacity = '1';
              path.style.visibility = 'visible';
              path.style.fill = 'none';
              
              // Set attributes too for html2canvas
              path.setAttribute('stroke-width', Math.max(4, weight).toString());
              path.setAttribute('stroke', color);
              path.setAttribute('stroke-opacity', opacity.toString());
              path.setAttribute('fill', 'none');
            }
          }
        });
      } catch (e) {
        logWarn('Error refreshing contours layer:', e);
      }
    }
    
    // Wait for map to be ready
    await new Promise((resolve) => {
      if (map) {
        map.whenReady(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
    
    // Wait for ALL tiles to load completely - with longer timeout for satellite tiles
    await waitForAllTiles(map);
    
    // Additional wait to ensure satellite tiles are fully rendered
    // Force map to load tiles at current view
    map.invalidateSize();
    map._onResize();
    
    // CRITICAL: Force map to redraw all SVG overlays (contours) with visible strokes
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline) {
        try {
          layer.redraw();
          // Ensure path is visible with proper stroke
          const path = layer._path;
          if (path) {
            const weight = layer.options.weight || 3;
            const color = layer.options.color || '#22c55e';
            const opacity = layer.options.opacity || 0.9;
            
            path.style.strokeWidth = Math.max(4, weight) + 'px';
            path.style.stroke = color;
            path.style.strokeOpacity = opacity.toString();
            path.style.opacity = '1';
            path.style.visibility = 'visible';
            path.style.fill = 'none';
            path.setAttribute('stroke-width', Math.max(4, weight).toString());
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-opacity', opacity.toString());
            path.setAttribute('fill', 'none');
          }
        } catch (e) {}
      } else if (layer instanceof L.FeatureGroup) {
        try {
          layer.redraw();
          // Force redraw all polylines in feature group
          layer.eachLayer((sublayer) => {
            if (sublayer instanceof L.Polyline) {
              sublayer.redraw();
              const path = sublayer._path;
              if (path) {
                const weight = sublayer.options.weight || 3;
                const color = sublayer.options.color || '#22c55e';
                const opacity = sublayer.options.opacity || 0.9;
                
                path.style.strokeWidth = Math.max(4, weight) + 'px';
                path.style.stroke = color;
                path.style.strokeOpacity = opacity.toString();
                path.style.opacity = '1';
                path.style.visibility = 'visible';
                path.setAttribute('stroke-width', Math.max(4, weight).toString());
                path.setAttribute('stroke', color);
                path.setAttribute('stroke-opacity', opacity.toString());
              }
            }
          });
        } catch (e) {}
      }
    });
    
    // Wait longer for satellite imagery and overlays to load
    await new Promise(resolve => setTimeout(resolve, 2000));
  };
  
  const exportMapPNG = async () => {
    try {
      // Use CDN library if available, otherwise try import
      let html2canvas;
      if (window.html2canvas) {
        html2canvas = window.html2canvas;
      } else {
        html2canvas = (await import('html2canvas')).default;
      }
      
      // Get the actual map container element
      const mapContainer = document.getElementById('leaflet-map-container');
      
      if (!mapContainer) {
        showToast('Map container not found', 'error');
        return;
      }
      
      showToast('Preparing export with all analysis layers...', 'info');
      
      // Hide UI controls temporarily
      const controls = document.querySelectorAll('.absolute.z-\\[1000\\], .absolute.z-\\[999\\]');
      const originalDisplay = [];
      controls.forEach((el, i) => {
        originalDisplay[i] = el.style.display;
        el.style.display = 'none';
      });
      
      try {
        // Ensure all layers are visible and wait for ALL tiles to load
        showToast('Loading all map tiles...', 'info');
        await prepareForExport();
        
        // Additional wait for rendering to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get actual dimensions - ensure we have valid dimensions
        let mapWidth = mapContainer.offsetWidth;
        let mapHeight = mapContainer.offsetHeight;
        
        if (!mapWidth || mapWidth === 0) {
          mapWidth = mapContainer.clientWidth || window.innerWidth;
        }
        if (!mapHeight || mapHeight === 0) {
          mapHeight = mapContainer.clientHeight || window.innerHeight;
        }
        
        // Fallback to window dimensions if still invalid
        if (!mapWidth || mapWidth === 0) mapWidth = window.innerWidth;
        if (!mapHeight || mapHeight === 0) mapHeight = window.innerHeight;
        
        console.log('Export dimensions:', { mapWidth, mapHeight, offsetWidth: mapContainer.offsetWidth, offsetHeight: mapContainer.offsetHeight });
        
        showToast('Capturing map...', 'info');
        
        // Ensure map container is visible and has proper dimensions
        mapContainer.style.visibility = 'visible';
        mapContainer.style.display = 'block';
        mapContainer.style.opacity = '1';
        mapContainer.style.position = 'relative';
        mapContainer.style.width = mapWidth + 'px';
        mapContainer.style.height = mapHeight + 'px';
        mapContainer.style.overflow = 'visible';
        // DO NOT set transform on container - preserve Leaflet's coordinate system
        
        // CRITICAL: Lock map position completely before export to prevent any shifting
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          
          // Disable all map interactions to prevent shifting
          map.dragging.disable();
          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.boxZoom.disable();
          map.keyboard.disable();
          
          // Lock the exact view
          const currentCenter = map.getCenter();
          const currentZoom = map.getZoom();
          const currentBounds = map.getBounds();
          
          // Force map to exact position
          map.setView(currentCenter, currentZoom, { animate: false, reset: false });
          map.invalidateSize();
          
          // Wait for map to stabilize completely
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Verify position hasn't changed
          const newCenter = map.getCenter();
          const newZoom = map.getZoom();
          if (Math.abs(newCenter.lat - currentCenter.lat) > 0.00001 || 
              Math.abs(newCenter.lng - currentCenter.lng) > 0.00001 ||
              newZoom !== currentZoom) {
            // Force back to exact position
            map.setView(currentCenter, currentZoom, { animate: false, reset: false });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Final wait for all rendering to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if tiles are loaded
          const tiles = mapContainer.querySelectorAll('img.leaflet-tile');
          const loadedTiles = Array.from(tiles).filter(tile => tile.complete && tile.naturalWidth > 0);
          console.log(`Tiles loaded: ${loadedTiles.length}/${tiles.length}`);
          
          // Wait a bit more if tiles are still loading
          if (loadedTiles.length < tiles.length && tiles.length > 0) {
            showToast('Waiting for map tiles to load...', 'info');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        // CRITICAL: Force SVG to render as images for html2canvas compatibility
        // Convert all SVG paths to canvas-compatible format
        const allSvgs = mapContainer.querySelectorAll('svg.leaflet-zoom-animated, .leaflet-overlay-pane svg');
        allSvgs.forEach((svg) => {
          // Ensure SVG has proper viewBox and dimensions
          if (!svg.getAttribute('viewBox')) {
            const bbox = svg.getBBox();
            svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
          }
          // Force SVG to be visible and rendered
          svg.style.visibility = 'visible';
          svg.style.opacity = '1';
          svg.style.display = 'block';
        });
        
        // Additional wait for SVG rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Capture with better options for Leaflet maps
        const canvas = await html2canvas(mapContainer, {
          backgroundColor: '#ffffff', // White background instead of transparent
          useCORS: true,
          logging: false, // Disable logging for production
          width: mapWidth,
          height: mapHeight,
          scale: 1, // Use scale 1 to avoid issues
          allowTaint: true,
          foreignObjectRendering: true, // Enable for better SVG support
          removeContainer: false,
          imageTimeout: 60000, // Longer timeout for tiles
          proxy: undefined,
          ignoreElements: (element) => {
            // Ignore UI controls that are not part of the map, BUT include legend
            if (element.classList && element.classList.contains('no-export')) {
              return true;
            }
            // Include legend in export if it's visible
            if (element.classList && element.classList.contains('absolute') && showLegend) {
              // Check if it's the legend popup
              const legendContent = element.querySelector('.absolute.top-full');
              if (legendContent) {
                return false; // Include legend
              }
            }
            return element.style && element.style.display === 'none';
          },
          onclone: async (clonedDoc) => {
            // Wait for images to load in clone first
            let clonedMap = clonedDoc.getElementById('leaflet-map-container');
            if (clonedMap) {
              const images = clonedMap.querySelectorAll('img');
              await Promise.all(Array.from(images).map(img => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve; // Continue even if image fails
                  setTimeout(resolve, 3000); // Timeout after 3s
                });
              }));
            }
            
            // Now ensure map container is visible in clone - PRESERVE EXACT POSITIONING
            clonedMap = clonedDoc.getElementById('leaflet-map-container');
            if (clonedMap) {
              // Get original container style to preserve exact positioning
              const originalContainer = document.getElementById('leaflet-map-container');
              if (originalContainer) {
                const originalStyle = window.getComputedStyle(originalContainer);
                clonedMap.style.visibility = 'visible';
                clonedMap.style.display = originalStyle.display || 'block';
                clonedMap.style.position = originalStyle.position || 'relative';
                // PRESERVE original top/left - don't reset to 0!
                clonedMap.style.top = originalStyle.top;
                clonedMap.style.left = originalStyle.left;
                clonedMap.style.width = originalStyle.width || mapWidth + 'px';
                clonedMap.style.height = originalStyle.height || mapHeight + 'px';
                clonedMap.style.margin = originalStyle.margin || '0';
                clonedMap.style.padding = originalStyle.padding || '0';
                clonedMap.style.transform = originalStyle.transform || 'none';
                clonedMap.style.zIndex = originalStyle.zIndex || '1';
                clonedMap.style.backgroundColor = '#ffffff';
                clonedMap.style.overflow = originalStyle.overflow || 'visible';
              } else {
                // Fallback if original not found
                clonedMap.style.visibility = 'visible';
                clonedMap.style.display = 'block';
                clonedMap.style.position = 'relative';
                clonedMap.style.width = mapWidth + 'px';
                clonedMap.style.height = mapHeight + 'px';
                clonedMap.style.margin = '0';
                clonedMap.style.padding = '0';
                clonedMap.style.zIndex = '1';
                clonedMap.style.backgroundColor = '#ffffff';
                clonedMap.style.overflow = 'visible';
              }
              
              // Fix Leaflet map pane positioning - PRESERVE LEAFLET COORDINATE SYSTEM
              const leafletPane = clonedMap.querySelector('.leaflet-pane');
              if (leafletPane) {
                // DO NOT reset position - preserve Leaflet's coordinate system
                leafletPane.style.visibility = 'visible';
                leafletPane.style.display = 'block';
                leafletPane.style.opacity = '1';
                leafletPane.style.zIndex = '1';
              }
              
              // Ensure all Leaflet panes are visible - PRESERVE THEIR EXACT POSITIONING FROM ORIGINAL
              const allPanes = clonedMap.querySelectorAll('.leaflet-pane');
              const originalPanes = document.querySelectorAll('.leaflet-pane');
              
              allPanes.forEach((pane, index) => {
                // Find corresponding original pane
                const originalPane = originalPanes[index] || Array.from(originalPanes).find(orig => 
                  orig.className === pane.className
                );
                
                if (originalPane) {
                  const paneStyle = window.getComputedStyle(originalPane);
                  // PRESERVE exact positioning from original
                  pane.style.position = paneStyle.position;
                  pane.style.top = paneStyle.top;
                  pane.style.left = paneStyle.left;
                  pane.style.transform = paneStyle.transform;
                  pane.style.width = paneStyle.width;
                  pane.style.height = paneStyle.height;
                }
                
                pane.style.visibility = 'visible';
                pane.style.display = 'block';
                pane.style.opacity = '1';
              });
              
              // CRITICAL: Ensure satellite basemap tiles are visible - PRESERVE EXACT POSITIONING
              const allTiles = clonedMap.querySelectorAll('img.leaflet-tile');
              allTiles.forEach((tile) => {
                const tileSrc = tile.src || '';
                
                // Find corresponding original tile to preserve its exact transform
                const originalTiles = document.querySelectorAll('img.leaflet-tile');
                let originalTile = null;
                originalTiles.forEach(origTile => {
                  if (origTile.src === tile.src) {
                    originalTile = origTile;
                  }
                });
                
                if (originalTile) {
                  const tileStyle = window.getComputedStyle(originalTile);
                  tile.style.position = tileStyle.position;
                  tile.style.top = tileStyle.top;
                  tile.style.left = tileStyle.left;
                  tile.style.transform = tileStyle.transform;
                  tile.style.width = tileStyle.width;
                  tile.style.height = tileStyle.height;
                } else {
                  tile.style.position = 'absolute';
                }
                
                tile.style.imageRendering = 'auto';
                
                // Only show satellite tiles - hide OpenTopoMap tiles
                if (tileSrc.includes('World_Imagery') || tileSrc.includes('arcgisonline')) {
                  tile.style.visibility = 'visible';
                  tile.style.opacity = '1';
                  tile.style.display = 'block';
                  tile.style.zIndex = '100';
                } else if (tileSrc.includes('opentopomap')) {
                  // Hide OpenTopoMap tiles - we only want satellite + contour GeoJSON
                  tile.style.display = 'none';
                  tile.style.visibility = 'hidden';
                  tile.style.opacity = '0';
                }
              });
              
              // CRITICAL: Ensure Leaflet overlay pane is visible (contains contours)
              const overlayPane = clonedMap.querySelector('.leaflet-overlay-pane');
              if (overlayPane) {
                overlayPane.style.visibility = 'visible';
                overlayPane.style.display = 'block';
                overlayPane.style.opacity = '1';
                overlayPane.style.zIndex = '300';
                overlayPane.style.pointerEvents = 'none';
              }
              
              // CRITICAL: Fix ALL SVG overlays (contours, etc.) - PRESERVE EXACT POSITIONING FROM ORIGINAL
              const svgOverlays = clonedMap.querySelectorAll('svg.leaflet-zoom-animated, .leaflet-overlay-pane svg');
              const originalSvgs = document.querySelectorAll('svg.leaflet-zoom-animated, .leaflet-overlay-pane svg');
              
              svgOverlays.forEach((svg, index) => {
                // Find corresponding original SVG to preserve exact transform
                const originalSvg = originalSvgs[index] || Array.from(originalSvgs).find(orig => 
                  orig.getAttribute('class') === svg.getAttribute('class')
                );
                
                if (originalSvg) {
                  const svgStyle = window.getComputedStyle(originalSvg);
                  svg.style.position = svgStyle.position;
                  svg.style.top = svgStyle.top;
                  svg.style.left = svgStyle.left;
                  svg.style.transform = svgStyle.transform;
                  svg.style.width = svgStyle.width;
                  svg.style.height = svgStyle.height;
                } else {
                  svg.style.position = 'absolute';
                }
                
                svg.style.visibility = 'visible';
                svg.style.opacity = '1';
                svg.style.display = 'block';
                svg.style.zIndex = '300';
                svg.style.pointerEvents = 'none';
                svg.setAttribute('style', svg.getAttribute('style') + '; visibility: visible !important; opacity: 1 !important; display: block !important;');
                
                // CRITICAL: Ensure all path elements inside SVG are visible (contours)
                const paths = svg.querySelectorAll('path');
                paths.forEach((path) => {
                  // Get original path to preserve its actual color
                  const originalPaths = document.querySelectorAll('svg.leaflet-zoom-animated path, .leaflet-overlay-pane svg path');
                  let originalPath = null;
                  const pathD = path.getAttribute('d');
                  if (pathD) {
                    originalPath = Array.from(originalPaths).find(orig => orig.getAttribute('d') === pathD);
                  }
                  
                  path.style.visibility = 'visible';
                  path.style.opacity = '1';
                  path.style.display = 'block';
                  path.style.fill = 'none';
                  
                  // Get stroke attributes from original or use defaults
                  let strokeWidth = originalPath ? originalPath.getAttribute('stroke-width') : path.getAttribute('stroke-width');
                  let stroke = originalPath ? originalPath.getAttribute('stroke') : path.getAttribute('stroke');
                  
                  // If no stroke width or too thin, make it thicker for export visibility
                  if (!strokeWidth || strokeWidth === '0' || parseFloat(strokeWidth) < 2) {
                    strokeWidth = '4'; // Thicker for export - contours must be visible
                  } else {
                    // Increase existing stroke width by 1px for better visibility in export
                    strokeWidth = String(Math.max(4, parseFloat(strokeWidth) + 1));
                  }
                  
                  // Get actual color from original or use visible default
                  if (!stroke || stroke === 'none' || stroke === 'transparent') {
                    // Try to get computed style from original
                    if (originalPath) {
                      const computedStyle = window.getComputedStyle(originalPath);
                      stroke = computedStyle.stroke || computedStyle.color || '#22c55e'; // Green default for contours
                    } else {
                      stroke = '#22c55e'; // Green default for contours
                    }
                  }
                  
                  // CRITICAL: Set both style and attribute with !important for export
                  path.style.strokeWidth = strokeWidth + 'px';
                  path.style.stroke = stroke;
                  path.style.strokeOpacity = '1';
                  path.style.opacity = '1';
                  path.setAttribute('stroke-width', strokeWidth);
                  path.setAttribute('stroke', stroke);
                  path.setAttribute('stroke-opacity', '1');
                  path.setAttribute('fill', 'none');
                  
                  // Force visibility with !important
                  const existingStyle = path.getAttribute('style') || '';
                  path.setAttribute('style', existingStyle + 
                    '; visibility: visible !important; ' +
                    'opacity: 1 !important; ' +
                    'display: block !important; ' +
                    'stroke-width: ' + strokeWidth + 'px !important; ' +
                    'stroke: ' + stroke + ' !important; ' +
                    'stroke-opacity: 1 !important; ' +
                    'fill: none !important;');
                });
              });
              
              // Also check for ALL paths in overlay pane - ensure contours are visible
              const allPaths = clonedMap.querySelectorAll('.leaflet-overlay-pane path, svg path');
              const originalAllPaths = document.querySelectorAll('.leaflet-overlay-pane path, svg path');
              
              allPaths.forEach((path) => {
                // Find original path to preserve color
                const pathD = path.getAttribute('d');
                let originalPath = null;
                if (pathD) {
                  originalPath = Array.from(originalAllPaths).find(orig => orig.getAttribute('d') === pathD);
                }
                
                path.style.visibility = 'visible';
                path.style.opacity = '1';
                path.style.display = 'block';
                path.style.fill = 'none';
                
                // Get stroke from original or use default
                let stroke = originalPath ? originalPath.getAttribute('stroke') : path.getAttribute('stroke');
                if (!stroke || stroke === 'none' || stroke === 'transparent') {
                  if (originalPath) {
                    const computedStyle = window.getComputedStyle(originalPath);
                    stroke = computedStyle.stroke || computedStyle.color || '#22c55e';
                  } else {
                    stroke = '#22c55e'; // Green for contours
                  }
                }
                
                // Ensure stroke width is thick enough for export
                let strokeWidth = originalPath ? originalPath.getAttribute('stroke-width') : path.getAttribute('stroke-width');
                if (!strokeWidth || strokeWidth === '0' || parseFloat(strokeWidth) < 3) {
                  strokeWidth = '4'; // Minimum 4px for export visibility
                } else {
                  strokeWidth = String(Math.max(4, parseFloat(strokeWidth) + 1));
                }
                
                path.setAttribute('stroke', stroke);
                path.style.stroke = stroke;
                path.setAttribute('stroke-width', strokeWidth);
                path.style.strokeWidth = strokeWidth + 'px';
                path.setAttribute('stroke-opacity', '1');
                path.style.strokeOpacity = '1';
                
                // Force with !important
                const existingStyle = path.getAttribute('style') || '';
                path.setAttribute('style', existingStyle + 
                  '; visibility: visible !important; ' +
                  'opacity: 1 !important; ' +
                  'stroke-width: ' + strokeWidth + 'px !important; ' +
                  'stroke: ' + stroke + ' !important;');
              });
              
              // CRITICAL: Ensure contour labels are visible and above everything
              const contourLabels = clonedMap.querySelectorAll('.contour-label');
              contourLabels.forEach((label) => {
                label.style.visibility = 'visible';
                label.style.opacity = '1';
                label.style.display = 'block';
                label.style.zIndex = '400';
                label.style.pointerEvents = 'none';
                
                // Ensure label content is visible
                const labelDiv = label.querySelector('div');
                if (labelDiv) {
                  labelDiv.style.visibility = 'visible';
                  labelDiv.style.opacity = '1';
                  labelDiv.style.display = 'block';
                }
              });
              
              // Ensure all marker icons (including label markers) are visible - PRESERVE POSITIONING
              const markerIcons = clonedMap.querySelectorAll('.leaflet-marker-icon');
              const originalMarkerIcons = document.querySelectorAll('.leaflet-marker-icon');
              
              markerIcons.forEach((icon, index) => {
                // Find corresponding original marker to preserve position
                const originalIcon = originalMarkerIcons[index] || Array.from(originalMarkerIcons).find(orig => 
                  orig.src === icon.src || orig.getAttribute('class') === icon.getAttribute('class')
                );
                
                if (originalIcon) {
                  const iconStyle = window.getComputedStyle(originalIcon);
                  icon.style.position = iconStyle.position;
                  icon.style.top = iconStyle.top;
                  icon.style.left = iconStyle.left;
                  icon.style.transform = iconStyle.transform;
                  icon.style.marginLeft = iconStyle.marginLeft;
                  icon.style.marginTop = iconStyle.marginTop;
                }
                
                icon.style.visibility = 'visible';
                icon.style.opacity = '1';
                icon.style.zIndex = '400';
                icon.style.pointerEvents = 'none';
              });
              
              // CRITICAL: Ensure area of interest polygon is visible and correctly positioned
              const aoiPaths = clonedMap.querySelectorAll('.leaflet-overlay-pane path[fill="#22c55e"], .leaflet-overlay-pane path[fill="rgb(34, 197, 94)"]');
              const originalAoiPaths = document.querySelectorAll('.leaflet-overlay-pane path[fill="#22c55e"], .leaflet-overlay-pane path[fill="rgb(34, 197, 94)"]');
              
              aoiPaths.forEach((path, index) => {
                const originalPath = originalAoiPaths[index] || Array.from(originalAoiPaths).find(orig => 
                  orig.getAttribute('d') === path.getAttribute('d')
                );
                
                if (originalPath) {
                  const pathStyle = window.getComputedStyle(originalPath);
                  path.style.stroke = pathStyle.stroke || '#22c55e';
                  path.style.fill = pathStyle.fill || '#22c55e';
                  path.style.strokeWidth = pathStyle.strokeWidth || '3';
                  path.style.fillOpacity = pathStyle.fillOpacity || '0.3';
                  path.style.strokeOpacity = pathStyle.strokeOpacity || '0.9';
                }
                
                path.style.visibility = 'visible';
                path.style.opacity = '1';
                path.style.display = 'block';
              });
              
              // Ensure marker shadows are visible
              const markerShadows = clonedMap.querySelectorAll('.leaflet-marker-shadow');
              markerShadows.forEach((shadow) => {
                shadow.style.visibility = 'visible';
                shadow.style.opacity = '0.5';
              });
            }
            // Hide all controls in clone EXCEPT legend if visible
            const clonedControls = clonedDoc.querySelectorAll('.absolute');
            clonedControls.forEach((el) => {
              if (el.id !== 'leaflet-map-container' && 
                  !el.closest('#leaflet-map-container')) {
                // Keep legend visible if showLegend is true
                const isLegend = el.querySelector && (
                  el.querySelector('.absolute.top-full') || 
                  (el.textContent && el.textContent.includes('Map Legend'))
                );
                if (!isLegend || !showLegend) {
                  el.style.display = 'none';
                } else {
                  // Ensure legend is visible and properly positioned
                  el.style.visibility = 'visible';
                  el.style.opacity = '1';
                  el.style.zIndex = '10000';
                  el.style.display = 'block';
                }
              }
            });
          }
        });
        
        // Restore UI controls
        controls.forEach((el, i) => {
          el.style.display = originalDisplay[i];
        });
        
        // Validate canvas before export
        if (!canvas) {
          throw new Error('Canvas creation failed');
        }
        
        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error(`Canvas has invalid dimensions: ${canvas.width}x${canvas.height}`);
        }
        
        // Log canvas info for debugging
        console.log('Canvas created:', {
          width: canvas.width,
          height: canvas.height,
          mapWidth,
          mapHeight
        });
        
        const link = document.createElement('a');
        link.download = `permaculture-map-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        showToast('Map exported as PNG successfully', 'success');
        
        // CRITICAL: Re-enable map interactions after successful export
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          map.dragging.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.boxZoom.enable();
          map.keyboard.enable();
        }
      } catch (exportError) {
        // CRITICAL: Re-enable map interactions on error
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          map.dragging.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.boxZoom.enable();
          map.keyboard.enable();
        }
        // Restore UI controls on error
        controls.forEach((el, i) => {
          el.style.display = originalDisplay[i];
        });
        throw exportError;
      }
    } catch (error) {
      // CRITICAL: Re-enable map interactions on error
      if (mapInstanceRef.current) {
        const map = mapInstanceRef.current;
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();
      }
      console.error('Export error:', error);
      showToast('Export failed: ' + (error.message || 'Unknown error'), 'error');
    }
  };
  
  const exportMapPDF = async () => {
    try {
      // Use CDN library if available
      let jsPDF, html2canvas;
      
      if (window.jspdf) {
        jsPDF = window.jspdf.jsPDF;
      } else {
        const jspdfModule = await import('jspdf');
        jsPDF = jspdfModule.jsPDF;
      }
      
      if (window.html2canvas) {
        html2canvas = window.html2canvas;
      } else {
        html2canvas = (await import('html2canvas')).default;
      }
      
      // Get the actual map container element
      const mapContainer = document.getElementById('leaflet-map-container');
      
      if (!mapContainer) {
        showToast('Map container not found', 'error');
        return;
      }
      
      showToast('Generating PDF with all analysis layers...', 'info');
      
      // Hide UI controls temporarily
      const controls = document.querySelectorAll('.absolute.z-\\[1000\\], .absolute.z-\\[999\\]');
      const originalDisplay = [];
      controls.forEach((el, i) => {
        originalDisplay[i] = el.style.display;
        el.style.display = 'none';
      });
      
      try {
        // Ensure all layers are visible and wait for ALL tiles to load
        showToast('Loading all map tiles...', 'info');
        await prepareForExport();
        
        // Additional wait for rendering to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get actual map container dimensions - ensure we have valid dimensions
        let mapWidth = mapContainer.offsetWidth;
        let mapHeight = mapContainer.offsetHeight;
        
        if (!mapWidth || mapWidth === 0) {
          mapWidth = mapContainer.clientWidth || window.innerWidth;
        }
        if (!mapHeight || mapHeight === 0) {
          mapHeight = mapContainer.clientHeight || window.innerHeight;
        }
        
        // Fallback to window dimensions if still invalid
        if (!mapWidth || mapWidth === 0) mapWidth = window.innerWidth;
        if (!mapHeight || mapHeight === 0) mapHeight = window.innerHeight;
        
        console.log('PDF Export dimensions:', { mapWidth, mapHeight });
        
        showToast('Capturing map...', 'info');
        
        // Ensure map container is visible and has proper dimensions
        mapContainer.style.visibility = 'visible';
        mapContainer.style.display = 'block';
        mapContainer.style.opacity = '1';
        mapContainer.style.position = 'relative';
        mapContainer.style.width = mapWidth + 'px';
        mapContainer.style.height = mapHeight + 'px';
        mapContainer.style.overflow = 'visible';
        
        // CRITICAL: Lock map position completely before export to prevent any shifting
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          
          // Disable all map interactions to prevent shifting
          map.dragging.disable();
          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.boxZoom.disable();
          map.keyboard.disable();
          
          // Lock the exact view
          const currentCenter = map.getCenter();
          const currentZoom = map.getZoom();
          
          // Force map to exact position
          map.setView(currentCenter, currentZoom, { animate: false, reset: false });
          map.invalidateSize();
          
          // Wait for map to stabilize completely
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Verify position hasn't changed
          const newCenter = map.getCenter();
          const newZoom = map.getZoom();
          if (Math.abs(newCenter.lat - currentCenter.lat) > 0.00001 || 
              Math.abs(newCenter.lng - currentCenter.lng) > 0.00001 ||
              newZoom !== currentZoom) {
            // Force back to exact position
            map.setView(currentCenter, currentZoom, { animate: false, reset: false });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Check if tiles are loaded
          const tiles = mapContainer.querySelectorAll('img.leaflet-tile');
          const loadedTiles = Array.from(tiles).filter(tile => tile.complete && tile.naturalWidth > 0);
          console.log(`PDF Tiles loaded: ${loadedTiles.length}/${tiles.length}`);
          
          // Wait a bit more if tiles are still loading
          if (loadedTiles.length < tiles.length && tiles.length > 0) {
            showToast('Waiting for map tiles to load...', 'info');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Final wait for all rendering to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Capture the map with better options for Leaflet
        const canvas = await html2canvas(mapContainer, {
          backgroundColor: '#ffffff', // White background instead of transparent
          useCORS: true,
          logging: false, // Disable logging for production
          width: mapWidth,
          height: mapHeight,
          scale: 1, // Use scale 1 to avoid issues
          allowTaint: true,
          foreignObjectRendering: true, // Enable for better SVG/contour support
          removeContainer: false,
          imageTimeout: 60000, // Longer timeout for tiles
          onclone: async (clonedDoc) => {
            // Wait for images to load in clone first
            let clonedMap = clonedDoc.getElementById('leaflet-map-container');
            if (clonedMap) {
              const images = clonedMap.querySelectorAll('img');
              await Promise.all(Array.from(images).map(img => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve; // Continue even if image fails
                  setTimeout(resolve, 3000); // Timeout after 3s
                });
              }));
            }
            
            // Now ensure map container is visible in clone - PRESERVE EXACT POSITIONING
            clonedMap = clonedDoc.getElementById('leaflet-map-container');
            if (clonedMap) {
              // Get original container style to preserve exact positioning
              const originalContainer = document.getElementById('leaflet-map-container');
              if (originalContainer) {
                const originalStyle = window.getComputedStyle(originalContainer);
                clonedMap.style.visibility = 'visible';
                clonedMap.style.display = originalStyle.display || 'block';
                clonedMap.style.position = originalStyle.position || 'relative';
                // PRESERVE original top/left - don't reset to 0!
                clonedMap.style.top = originalStyle.top;
                clonedMap.style.left = originalStyle.left;
                clonedMap.style.width = originalStyle.width || mapWidth + 'px';
                clonedMap.style.height = originalStyle.height || mapHeight + 'px';
                clonedMap.style.margin = originalStyle.margin || '0';
                clonedMap.style.padding = originalStyle.padding || '0';
                clonedMap.style.transform = originalStyle.transform || 'none';
                clonedMap.style.zIndex = originalStyle.zIndex || '1';
                clonedMap.style.backgroundColor = '#ffffff';
                clonedMap.style.overflow = originalStyle.overflow || 'visible';
              } else {
                // Fallback if original not found
                clonedMap.style.visibility = 'visible';
                clonedMap.style.display = 'block';
                clonedMap.style.position = 'relative';
                clonedMap.style.width = mapWidth + 'px';
                clonedMap.style.height = mapHeight + 'px';
                clonedMap.style.margin = '0';
                clonedMap.style.padding = '0';
                clonedMap.style.zIndex = '1';
                clonedMap.style.backgroundColor = '#ffffff';
                clonedMap.style.overflow = 'visible';
              }
              
              // Fix Leaflet map pane positioning - PRESERVE LEAFLET COORDINATE SYSTEM
              const leafletPane = clonedMap.querySelector('.leaflet-pane');
              if (leafletPane) {
                // DO NOT reset position - preserve Leaflet's coordinate system
                leafletPane.style.visibility = 'visible';
                leafletPane.style.display = 'block';
                leafletPane.style.opacity = '1';
                leafletPane.style.zIndex = '1';
              }
              
              // Ensure all Leaflet panes are visible - PRESERVE THEIR EXACT POSITIONING FROM ORIGINAL
              const allPanes = clonedMap.querySelectorAll('.leaflet-pane');
              const originalPanes = document.querySelectorAll('.leaflet-pane');
              
              allPanes.forEach((pane, index) => {
                // Find corresponding original pane
                const originalPane = originalPanes[index] || Array.from(originalPanes).find(orig => 
                  orig.className === pane.className
                );
                
                if (originalPane) {
                  const paneStyle = window.getComputedStyle(originalPane);
                  // PRESERVE exact positioning from original
                  pane.style.position = paneStyle.position;
                  pane.style.top = paneStyle.top;
                  pane.style.left = paneStyle.left;
                  pane.style.transform = paneStyle.transform;
                  pane.style.width = paneStyle.width;
                  pane.style.height = paneStyle.height;
                }
                
                pane.style.visibility = 'visible';
                pane.style.display = 'block';
                pane.style.opacity = '1';
              });
              
              // CRITICAL: Ensure satellite basemap tiles are visible - PRESERVE EXACT POSITIONING
              const allTiles = clonedMap.querySelectorAll('img.leaflet-tile');
              allTiles.forEach((tile) => {
                const tileSrc = tile.src || '';
                
                // Find corresponding original tile to preserve its exact transform
                const originalTiles = document.querySelectorAll('img.leaflet-tile');
                let originalTile = null;
                originalTiles.forEach(origTile => {
                  if (origTile.src === tile.src) {
                    originalTile = origTile;
                  }
                });
                
                if (originalTile) {
                  const tileStyle = window.getComputedStyle(originalTile);
                  tile.style.position = tileStyle.position;
                  tile.style.top = tileStyle.top;
                  tile.style.left = tileStyle.left;
                  tile.style.transform = tileStyle.transform;
                  tile.style.width = tileStyle.width;
                  tile.style.height = tileStyle.height;
                } else {
                  tile.style.position = 'absolute';
                }
                
                tile.style.imageRendering = 'auto';
                
                // Only show satellite tiles - hide OpenTopoMap tiles
                if (tileSrc.includes('World_Imagery') || tileSrc.includes('arcgisonline')) {
                  tile.style.visibility = 'visible';
                  tile.style.opacity = '1';
                  tile.style.display = 'block';
                  tile.style.zIndex = '100';
                } else if (tileSrc.includes('opentopomap')) {
                  // Hide OpenTopoMap tiles - we only want satellite + contour GeoJSON
                  tile.style.display = 'none';
                  tile.style.visibility = 'hidden';
                  tile.style.opacity = '0';
                }
              });
              
              // CRITICAL: Ensure Leaflet overlay pane is visible (contains contours)
              const overlayPane = clonedMap.querySelector('.leaflet-overlay-pane');
              if (overlayPane) {
                overlayPane.style.visibility = 'visible';
                overlayPane.style.display = 'block';
                overlayPane.style.opacity = '1';
                overlayPane.style.zIndex = '300';
                overlayPane.style.pointerEvents = 'none';
              }
              
              // CRITICAL: Fix ALL SVG overlays (contours, etc.) - PRESERVE EXACT POSITIONING FROM ORIGINAL
              const svgOverlays = clonedMap.querySelectorAll('svg.leaflet-zoom-animated, .leaflet-overlay-pane svg');
              const originalSvgs = document.querySelectorAll('svg.leaflet-zoom-animated, .leaflet-overlay-pane svg');
              
              svgOverlays.forEach((svg, index) => {
                // Find corresponding original SVG to preserve exact transform
                const originalSvg = originalSvgs[index] || Array.from(originalSvgs).find(orig => 
                  orig.getAttribute('class') === svg.getAttribute('class')
                );
                
                if (originalSvg) {
                  const svgStyle = window.getComputedStyle(originalSvg);
                  svg.style.position = svgStyle.position;
                  svg.style.top = svgStyle.top;
                  svg.style.left = svgStyle.left;
                  svg.style.transform = svgStyle.transform;
                  svg.style.width = svgStyle.width;
                  svg.style.height = svgStyle.height;
                } else {
                  svg.style.position = 'absolute';
                }
                
                svg.style.visibility = 'visible';
                svg.style.opacity = '1';
                svg.style.display = 'block';
                svg.style.zIndex = '300';
                svg.style.pointerEvents = 'none';
                svg.setAttribute('style', svg.getAttribute('style') + '; visibility: visible !important; opacity: 1 !important; display: block !important;');
                
                // CRITICAL: Ensure all path elements inside SVG are visible (contours)
                const paths = svg.querySelectorAll('path');
                paths.forEach((path) => {
                  // Get original path to preserve its actual color
                  const originalPaths = document.querySelectorAll('svg.leaflet-zoom-animated path, .leaflet-overlay-pane svg path');
                  let originalPath = null;
                  const pathD = path.getAttribute('d');
                  if (pathD) {
                    originalPath = Array.from(originalPaths).find(orig => orig.getAttribute('d') === pathD);
                  }
                  
                  path.style.visibility = 'visible';
                  path.style.opacity = '1';
                  path.style.display = 'block';
                  path.style.fill = 'none';
                  
                  // Get stroke attributes from original or use defaults
                  let strokeWidth = originalPath ? originalPath.getAttribute('stroke-width') : path.getAttribute('stroke-width');
                  let stroke = originalPath ? originalPath.getAttribute('stroke') : path.getAttribute('stroke');
                  
                  // If no stroke width or too thin, make it thicker for export visibility
                  if (!strokeWidth || strokeWidth === '0' || parseFloat(strokeWidth) < 2) {
                    strokeWidth = '4'; // Thicker for export - contours must be visible
                  } else {
                    // Increase existing stroke width by 1px for better visibility in export
                    strokeWidth = String(Math.max(4, parseFloat(strokeWidth) + 1));
                  }
                  
                  // Get actual color from original or use visible default
                  if (!stroke || stroke === 'none' || stroke === 'transparent') {
                    // Try to get computed style from original
                    if (originalPath) {
                      const computedStyle = window.getComputedStyle(originalPath);
                      stroke = computedStyle.stroke || computedStyle.color || '#22c55e'; // Green default for contours
                    } else {
                      stroke = '#22c55e'; // Green default for contours
                    }
                  }
                  
                  // CRITICAL: Set both style and attribute with !important for export
                  path.style.strokeWidth = strokeWidth + 'px';
                  path.style.stroke = stroke;
                  path.style.strokeOpacity = '1';
                  path.style.opacity = '1';
                  path.setAttribute('stroke-width', strokeWidth);
                  path.setAttribute('stroke', stroke);
                  path.setAttribute('stroke-opacity', '1');
                  path.setAttribute('fill', 'none');
                  
                  // Force visibility with !important
                  const existingStyle = path.getAttribute('style') || '';
                  path.setAttribute('style', existingStyle + 
                    '; visibility: visible !important; ' +
                    'opacity: 1 !important; ' +
                    'display: block !important; ' +
                    'stroke-width: ' + strokeWidth + 'px !important; ' +
                    'stroke: ' + stroke + ' !important; ' +
                    'stroke-opacity: 1 !important; ' +
                    'fill: none !important;');
                });
              });
              
              // Also check for ALL paths in overlay pane - ensure contours are visible
              const allPaths = clonedMap.querySelectorAll('.leaflet-overlay-pane path, svg path');
              const originalAllPaths = document.querySelectorAll('.leaflet-overlay-pane path, svg path');
              
              allPaths.forEach((path) => {
                // Find original path to preserve color
                const pathD = path.getAttribute('d');
                let originalPath = null;
                if (pathD) {
                  originalPath = Array.from(originalAllPaths).find(orig => orig.getAttribute('d') === pathD);
                }
                
                path.style.visibility = 'visible';
                path.style.opacity = '1';
                path.style.display = 'block';
                path.style.fill = 'none';
                
                // Get stroke from original or use default
                let stroke = originalPath ? originalPath.getAttribute('stroke') : path.getAttribute('stroke');
                if (!stroke || stroke === 'none' || stroke === 'transparent') {
                  if (originalPath) {
                    const computedStyle = window.getComputedStyle(originalPath);
                    stroke = computedStyle.stroke || computedStyle.color || '#22c55e';
                  } else {
                    stroke = '#22c55e'; // Green for contours
                  }
                }
                
                // Ensure stroke width is thick enough for export
                let strokeWidth = originalPath ? originalPath.getAttribute('stroke-width') : path.getAttribute('stroke-width');
                if (!strokeWidth || strokeWidth === '0' || parseFloat(strokeWidth) < 3) {
                  strokeWidth = '4'; // Minimum 4px for export visibility
                } else {
                  strokeWidth = String(Math.max(4, parseFloat(strokeWidth) + 1));
                }
                
                path.setAttribute('stroke', stroke);
                path.style.stroke = stroke;
                path.setAttribute('stroke-width', strokeWidth);
                path.style.strokeWidth = strokeWidth + 'px';
                path.setAttribute('stroke-opacity', '1');
                path.style.strokeOpacity = '1';
                
                // Force with !important
                const existingStyle = path.getAttribute('style') || '';
                path.setAttribute('style', existingStyle + 
                  '; visibility: visible !important; ' +
                  'opacity: 1 !important; ' +
                  'stroke-width: ' + strokeWidth + 'px !important; ' +
                  'stroke: ' + stroke + ' !important;');
              });
              
              // CRITICAL: Ensure contour labels are visible and above everything
              const contourLabels = clonedMap.querySelectorAll('.contour-label');
              contourLabels.forEach((label) => {
                label.style.visibility = 'visible';
                label.style.opacity = '1';
                label.style.display = 'block';
                label.style.zIndex = '400';
                label.style.pointerEvents = 'none';
                
                // Ensure label content is visible
                const labelDiv = label.querySelector('div');
                if (labelDiv) {
                  labelDiv.style.visibility = 'visible';
                  labelDiv.style.opacity = '1';
                  labelDiv.style.display = 'block';
                }
              });
              
              // Ensure all marker icons (including label markers) are visible - PRESERVE POSITIONING
              const markerIcons = clonedMap.querySelectorAll('.leaflet-marker-icon');
              const originalMarkerIcons = document.querySelectorAll('.leaflet-marker-icon');
              
              markerIcons.forEach((icon, index) => {
                // Find corresponding original marker to preserve position
                const originalIcon = originalMarkerIcons[index] || Array.from(originalMarkerIcons).find(orig => 
                  orig.src === icon.src || orig.getAttribute('class') === icon.getAttribute('class')
                );
                
                if (originalIcon) {
                  const iconStyle = window.getComputedStyle(originalIcon);
                  icon.style.position = iconStyle.position;
                  icon.style.top = iconStyle.top;
                  icon.style.left = iconStyle.left;
                  icon.style.transform = iconStyle.transform;
                  icon.style.marginLeft = iconStyle.marginLeft;
                  icon.style.marginTop = iconStyle.marginTop;
                }
                
                icon.style.visibility = 'visible';
                icon.style.opacity = '1';
                icon.style.zIndex = '400';
                icon.style.pointerEvents = 'none';
              });
              
              // CRITICAL: Ensure area of interest polygon is visible and correctly positioned
              const aoiPaths = clonedMap.querySelectorAll('.leaflet-overlay-pane path[fill="#22c55e"], .leaflet-overlay-pane path[fill="rgb(34, 197, 94)"]');
              const originalAoiPaths = document.querySelectorAll('.leaflet-overlay-pane path[fill="#22c55e"], .leaflet-overlay-pane path[fill="rgb(34, 197, 94)"]');
              
              aoiPaths.forEach((path, index) => {
                const originalPath = originalAoiPaths[index] || Array.from(originalAoiPaths).find(orig => 
                  orig.getAttribute('d') === path.getAttribute('d')
                );
                
                if (originalPath) {
                  const pathStyle = window.getComputedStyle(originalPath);
                  path.style.stroke = pathStyle.stroke || '#22c55e';
                  path.style.fill = pathStyle.fill || '#22c55e';
                  path.style.strokeWidth = pathStyle.strokeWidth || '3';
                  path.style.fillOpacity = pathStyle.fillOpacity || '0.3';
                  path.style.strokeOpacity = pathStyle.strokeOpacity || '0.9';
                }
                
                path.style.visibility = 'visible';
                path.style.opacity = '1';
                path.style.display = 'block';
              });
              
              // Ensure marker shadows are visible
              const markerShadows = clonedMap.querySelectorAll('.leaflet-marker-shadow');
              markerShadows.forEach((shadow) => {
                shadow.style.visibility = 'visible';
                shadow.style.opacity = '0.5';
              });
            }
            // Hide all controls in clone EXCEPT legend if visible
            const clonedControls = clonedDoc.querySelectorAll('.absolute');
            clonedControls.forEach((el) => {
              if (el.id !== 'leaflet-map-container' && 
                  !el.closest('#leaflet-map-container')) {
                // Keep legend visible if showLegend is true
                const isLegend = el.querySelector && (
                  el.querySelector('.absolute.top-full') || 
                  (el.textContent && el.textContent.includes('Map Legend'))
                );
                if (!isLegend || !showLegend) {
                  el.style.display = 'none';
                } else {
                  // Ensure legend is visible and properly positioned
                  el.style.visibility = 'visible';
                  el.style.opacity = '1';
                  el.style.zIndex = '10000';
                  el.style.display = 'block';
                }
              }
            });
          }
        });
        
        // Restore UI controls
        controls.forEach((el, i) => {
          el.style.display = originalDisplay[i];
        });
        
        // Validate canvas before export
        if (!canvas) {
          throw new Error('Canvas creation failed');
        }
        
        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error(`Canvas has invalid dimensions: ${canvas.width}x${canvas.height}`);
        }
        
        // Log canvas info for debugging
        console.log('Canvas created for PDF:', {
          width: canvas.width,
          height: canvas.height,
          mapWidth,
          mapHeight
        });
        
        // Calculate PDF dimensions to fit properly
        const pdfWidth = 297; // A4 landscape width in mm
        const pdfHeight = 210; // A4 landscape height in mm
        
        // Calculate image dimensions maintaining aspect ratio
        const imgAspectRatio = canvas.width / canvas.height;
        let imgWidth = pdfWidth;
        let imgHeight = pdfWidth / imgAspectRatio;
        
        // If image is taller than PDF, fit to height instead
        if (imgHeight > pdfHeight) {
          imgHeight = pdfHeight;
          imgWidth = pdfHeight * imgAspectRatio;
        }
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Center the image on the page
        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;
        
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
        pdf.save(`permaculture-map-${Date.now()}.pdf`);
        
        showToast('Map exported as PDF successfully', 'success');
        
        // CRITICAL: Re-enable map interactions after successful export
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          map.dragging.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.boxZoom.enable();
          map.keyboard.enable();
        }
      } catch (exportError) {
        // CRITICAL: Re-enable map interactions on error
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          map.dragging.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.boxZoom.enable();
          map.keyboard.enable();
        }
        // Restore UI controls on error
        controls.forEach((el, i) => {
          el.style.display = originalDisplay[i];
        });
        throw exportError;
      }
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('PDF export failed: ' + (error.message || 'Unknown error'), 'error');
    }
  };
  
  const printMap = () => {
    window.print();
  };
  
  const shareMap = async () => {
    try {
      const shareData = {
        title: 'Permaculture Design Map',
        text: 'Check out this permaculture design map',
        url: window.location.href
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('Map shared', 'success');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard', 'success');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        showToast('Share failed', 'error');
      }
    }
  };
  
  // ========== UI HELPERS ==========
  const toggleSection = (section) => {
    setSidebarCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const toggleLayer = useCallback((layerKey) => {
    setLayerVisibility(prev => {
      const newValue = !prev[layerKey];
      log(`Toggling ${layerKey}: ${prev[layerKey]} -> ${newValue}`);
      return {
        ...prev,
        [layerKey]: newValue
      };
    });
  }, []);
  
  // Toggle labels visibility - show/hide all popups and labels
  const toggleLabels = useCallback(() => {
    setShowLabels(prev => {
      const newState = !prev;
      
      if (!mapInstanceRef.current) return newState;
      
      const map = mapInstanceRef.current;
      
      // Function to toggle markers in a layer
      const toggleMarkersInLayer = (layer) => {
        if (!layer) return;
        
        // Handle LayerGroup
        if (layer instanceof L.LayerGroup) {
          layer.eachLayer((sublayer) => {
            toggleMarkersInLayer(sublayer);
          });
        }
        // Handle GeoJSON layers
        else if (layer instanceof L.GeoJSON) {
          layer.eachLayer((featureLayer) => {
            if (featureLayer instanceof L.Marker || featureLayer instanceof L.CircleMarker) {
              if (newState) {
                featureLayer.setOpacity(1);
                if (featureLayer.getPopup && featureLayer.getPopup()) {
                  // Labels visible - popups work on click
                  featureLayer.on('click', () => featureLayer.openPopup());
                }
              } else {
                featureLayer.setOpacity(0);
                if (featureLayer.closePopup) {
                  featureLayer.closePopup();
                }
              }
            }
          });
        }
        // Handle individual markers
        else if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          if (newState) {
            layer.setOpacity(1);
            if (layer.getPopup && layer.getPopup()) {
              layer.on('click', () => layer.openPopup());
            }
          } else {
            layer.setOpacity(0);
            if (layer.closePopup) {
              layer.closePopup();
            }
          }
        }
      };
      
      // Toggle labels on all tracked layers
      Object.keys(layerRefs.current).forEach((layerKey) => {
        toggleMarkersInLayer(layerRefs.current[layerKey]);
      });
      
      // Toggle all markers directly on the map (including standalone markers)
      map.eachLayer((layer) => {
        // Skip basemap and AOI
        if (layer === basemapLayerRef.current || layer === aoiLayerRef.current) return;
        
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          if (newState) {
            layer.setOpacity(1);
          } else {
            layer.setOpacity(0);
            if (layer.closePopup) {
              layer.closePopup();
            }
          }
        }
        // Also handle layer groups on the map
        else if (layer instanceof L.LayerGroup) {
          toggleMarkersInLayer(layer);
        }
      });
      
      // Toggle label markers array
      if (labelMarkersRef.current && Array.isArray(labelMarkersRef.current)) {
        labelMarkersRef.current.forEach(marker => {
          if (marker) {
            if (newState) {
              marker.setOpacity(1);
              if (!map.hasLayer(marker)) {
                marker.addTo(map);
              }
            } else {
              marker.setOpacity(0);
              if (map.hasLayer(marker)) {
                map.removeLayer(marker);
              }
            }
          }
        });
      }
      
      return newState;
    });
  }, []);
  
  // Get legend data
  const getLegendData = () => {
    const legend = {
      'Terrain': [
        { name: 'Contours', color: '#1e40af', visible: layerVisibility.contours, available: !!analysisLayers.contours }
      ],
      'Hydrology': [
        { name: 'Catchments', color: '#0ea5e9', visible: layerVisibility.catchments, available: !!analysisLayers.catchments },
        { name: 'Flow Accumulation', color: '#06b6d4', visible: layerVisibility.flowAccumulation, available: !!analysisLayers.flowAccumulation },
        { name: 'Natural Ponds', color: '#3b82f6', visible: layerVisibility.naturalPonds, available: !!analysisLayers.naturalPonds }
      ],
      'Sun Path': [
        { name: 'Sun Path', color: '#f59e0b', visible: layerVisibility.sunPath, available: !!analysisLayers.sunPath },
        { name: 'Winter Sunrise', color: '#4a90e2', visible: layerVisibility.winterSunrise, available: !!analysisLayers.winterSunrise },
        { name: 'Winter Sunset', color: '#e24a4a', visible: layerVisibility.winterSunset, available: !!analysisLayers.winterSunset },
        { name: 'Summer Sunrise', color: '#f59e0b', visible: layerVisibility.summerSunrise, available: !!analysisLayers.summerSunrise },
        { name: 'Summer Sunset', color: '#f97316', visible: layerVisibility.summerSunset, available: !!analysisLayers.summerSunset }
      ],
      'Wind Analysis': [
        { name: 'Wind Flow', color: '#8b5cf6', visible: layerVisibility.windFlow, available: !!analysisLayers.windFlow },
        { name: 'Primary Wind Sector', color: '#3b82f6', visible: layerVisibility.primaryWindSector, available: !!analysisLayers.primaryWindSector },
        { name: 'Secondary Wind Sector', color: '#06b6d4', visible: layerVisibility.secondaryWindSector, available: !!analysisLayers.secondaryWindSector },
        { name: 'Primary Wind Area', color: '#3b82f6', visible: layerVisibility.primaryWindArea, available: !!analysisLayers.primaryWindArea },
        { name: 'Secondary Wind Area', color: '#06b6d4', visible: layerVisibility.secondaryWindArea, available: !!analysisLayers.secondaryWindArea }
      ],
      'Area of Interest': [
        { name: 'AOI', color: '#22c55e', visible: !!aoi, available: !!aoi }
      ]
    };
    return legend;
  };
  
  // ========== RENDER ==========
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-300">Initializing Permaculture Platform...</p>
        </div>
      </div>
    );
  }
  
  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center bg-slate-800 p-8 rounded-lg border border-red-500">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Authentication Error</h2>
          <p className="text-slate-300">{authError}</p>
        </div>
      </div>
    );
  }
  
  // Main render
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-80 bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50 flex flex-col overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-emerald-900/20 to-teal-900/20">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2 flex items-center gap-2">
            <Mountain className="w-6 h-6 text-emerald-400" />
            Permaculture Intelligence
          </h1>
          {userId && (
            <p className="text-xs text-slate-400 font-mono break-all">
              User: {userId.substring(0, 20)}...
            </p>
          )}
        </div>
        
        
        {/* AOI Statistics Panel */}
        {aoiStats && (
          <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-emerald-900/10 to-teal-900/10">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">AOI Statistics</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Area:</span>
                <span className="text-slate-200 font-medium">
                  {aoiStats.area.hectares.toFixed(2)} ha ({aoiStats.area.acres.toFixed(2)} acres)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Perimeter:</span>
                <span className="text-slate-200 font-medium">
                  {aoiStats.perimeter.kilometers.toFixed(2)} km
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Center:</span>
                <span className="text-slate-200 font-mono text-xs">
                  {aoiStats.center.lat.toFixed(6)}, {aoiStats.center.lng.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vertices:</span>
                <span className="text-slate-200 font-medium">{aoiStats.vertices}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Project Management Section */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Projects
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-slate-400 hover:text-emerald-400 transition-colors"
                title="Show help"
                aria-label="Toggle help"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleSection('projects')}
                className="text-slate-400 hover:text-slate-200"
                aria-label="Toggle projects section"
              >
                {sidebarCollapsed.projects ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {showHelp && (
            <div className="mb-3 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded text-xs text-slate-300">
              <p className="mb-1"><strong>💡 Tip:</strong> Save your work regularly. Projects include your AOI and all analysis layers.</p>
              <p>Create a new project or load an existing one to continue your design work.</p>
            </div>
          )}
          
          {!sidebarCollapsed.projects && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Project name..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={createNewProject}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
                <button
                  onClick={saveProject}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
              
              {projects.length > 0 && (
                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {projects.map((proj) => (
                    <div key={proj.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => loadProject(proj.id)}
                        className="flex-1 text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
                      >
                        {proj.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(proj.id);
                        }}
                        className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete project"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* AOI Tools */}
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Map className="w-5 h-5" />
            Area of Interest
          </h2>
          <div className="space-y-2">
            <button
              onClick={startDrawing}
              disabled={drawing}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded font-medium transition-all"
              title="Draw a polygon on the map to define your area of interest"
              aria-label="Start drawing area of interest"
            >
              {drawing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Click map to add points, double-click to finish
                </span>
              ) : (
                'Draw Area'
              )}
            </button>
            {aoi && (
              <button
                onClick={() => {
                  setAoi(null);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.eachLayer((layer) => {
                      if (layer instanceof L.GeoJSON || (layer instanceof L.Polygon && layer.options.fillColor === '#22c55e')) {
                        mapInstanceRef.current.removeLayer(layer);
                      }
                    });
                  }
                }}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm"
              >
                Clear AOI
              </button>
            )}
          </div>
        </div>
        
        
        {/* Layer Management */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Layers
            </h2>
            <button
              onClick={() => toggleSection('layers')}
              className="text-slate-400 hover:text-slate-200"
            >
              {sidebarCollapsed.layers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {!sidebarCollapsed.layers && (
            <div className="space-y-3">
              {/* Contours Layer */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Mountain className="w-4 h-4" />
                  Terrain
                </h3>
                <div className="space-y-1 ml-6">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layerVisibility.contours || false}
                      onChange={() => toggleLayer('contours')}
                      disabled={!analysisLayers.contours && !layerRefs.current.contourTiles}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                    />
                    Contours
                  </label>
                </div>
              </div>
              
              {/* Hydrology Layers */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  Hydrology
                </h3>
                <div className="space-y-1 ml-6">
                  {[
                    { key: 'catchments', label: 'Catchments' },
                    { key: 'flowAccumulation', label: 'Flow Accumulation' },
                    { key: 'naturalPonds', label: 'Natural Ponds' }
                  ].map((layer) => (
                    <label key={layer.key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layerVisibility[layer.key] || false}
                        onChange={() => toggleLayer(layer.key)}
                        disabled={!analysisLayers[layer.key === 'catchments' ? 'catchments' : layer.key === 'flowAccumulation' ? 'flowAccumulation' : 'naturalPonds']}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                      />
                      {layer.label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Permaculture Layers */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <TreePine className="w-4 h-4" />
                  Permaculture
                </h3>
                <div className="space-y-1 ml-6">
                  {[
                    { key: 'slope', label: 'Slope' },
                    { key: 'aspect', label: 'Aspect' },
                    { key: 'soilClassifier', label: 'Soil Classifier' },
                    { key: 'vegetationDensity', label: 'Vegetation Density' }
                  ].map((layer) => (
                    <label key={layer.key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layerVisibility[layer.key] || false}
                        onChange={() => toggleLayer(layer.key)}
                        disabled={!analysisLayers[layer.key]}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                      />
                      {layer.label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Sun Path Layers */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Sun Path
                </h3>
                <div className="space-y-1 ml-6">
                  {[
                    { key: 'sunPath', label: 'Sun Path' },
                    { key: 'winterSunrise', label: 'Winter Sunrise' },
                    { key: 'winterSunset', label: 'Winter Sunset' },
                    { key: 'summerSunrise', label: 'Summer Sunrise' },
                    { key: 'summerSunset', label: 'Summer Sunset' }
                  ].map((layer) => (
                    <label key={layer.key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layerVisibility[layer.key] || false}
                        onChange={() => toggleLayer(layer.key)}
                        disabled={!analysisLayers[layer.key]}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                      />
                      {layer.label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Wind Analysis Layers */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Wind Analysis
                </h3>
                <div className="space-y-1 ml-6">
                  {[
                    { key: 'windFlow', label: 'Wind Flow' },
                    { key: 'primaryWindSector', label: 'Primary Wind Sector' },
                    { key: 'secondaryWindSector', label: 'Secondary Wind Sector' },
                    { key: 'primaryWindArea', label: 'Primary Wind Area' },
                    { key: 'secondaryWindArea', label: 'Secondary Wind Area' }
                  ].map((layer) => (
                    <label key={layer.key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layerVisibility[layer.key] || false}
                        onChange={() => toggleLayer(layer.key)}
                        disabled={!analysisLayers[layer.key]}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                      />
                      {layer.label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* AI Recommendations */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Recommendations
                </h3>
                <div className="space-y-1 ml-6">
                  {[
                    { key: 'recommendedSwales', label: 'Recommended Swales' },
                    { key: 'optimalWindbreaks', label: 'Optimal Windbreaks' }
                  ].map((layer) => (
                    <label key={layer.key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layerVisibility[layer.key] || false}
                        onChange={() => toggleLayer(layer.key)}
                        disabled={!analysisLayers[layer.key === 'recommendedSwales' ? 'swales' : 'windbreaks']}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                      />
                      {layer.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Analysis Button */}
        <div className="p-4 border-b border-slate-700">
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || !aoi}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded font-medium flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
            title={!aoi ? "Please draw an Area of Interest first" : "Run comprehensive analysis including contours, hydrology, and sun path"}
            aria-label="Run analysis"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing terrain...</span>
              </>
            ) : (
              <>
                <Gauge className="w-5 h-5" />
                <span>Run Analysis</span>
              </>
            )}
          </button>
          
          {!aoi && (
            <p className="mt-2 text-xs text-slate-400 text-center">
              Draw an area first to enable analysis
            </p>
          )}
        </div>
        
        {/* Contour Settings */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Mountain className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Contour Settings</h3>
          </div>
          
          <div className="space-y-3">
            {/* Contour Interval Selector */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contour Interval (meters)</label>
              <select
                value={contourInterval}
                onChange={(e) => setContourInterval(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              >
                <option value={0.5}>0.5 m</option>
                <option value={1}>1 m</option>
                <option value={2}>2 m</option>
                <option value={5}>5 m</option>
                <option value={10}>10 m</option>
                <option value={20}>20 m</option>
                <option value={50}>50 m</option>
                <option value={100}>100 m</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Smaller intervals = more detailed contours
              </p>
            </div>
            
            {/* Bold Contour Interval */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bold Every Nth Contour</label>
              <select
                value={contourBoldInterval}
                onChange={(e) => setContourBoldInterval(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              >
                <option value={0}>None</option>
                <option value={2}>Every 2nd</option>
                <option value={5}>Every 5th</option>
                <option value={10}>Every 10th</option>
                <option value={20}>Every 20th</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Makes every Nth contour line thicker for better visibility
              </p>
            </div>
            
            {/* Show Labels Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Show Elevation Labels</label>
              <button
                onClick={() => {
                  setContourShowLabels(!contourShowLabels);
                  // Re-render contours with new label setting
                  if (analysisLayers.contours) {
                    renderContours(analysisLayers.contours, layerVisibility.contours);
                  }
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  contourShowLabels
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {contourShowLabels ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Export Raw Data Buttons */}
            {analysisLayers.contours && aoi && (
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    try {
                      const bbox = getBboxString(aoi);
                      if (!bbox) {
                        showToast('Invalid AOI for export', 'error');
                        return;
                      }
                      
                      // Use backend export endpoint for raw data
                      const response = await fetch(
                        `${BACKEND_URL}/contours/export?bbox=${bbox}&interval=${contourInterval}&bold_interval=${contourBoldInterval}&format=geojson`
                      );
                      
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `contours_${contourInterval}m_${Date.now()}.geojson`;
                        link.click();
                        URL.revokeObjectURL(url);
                        showToast('Raw contour layer exported as GeoJSON', 'success');
                      } else {
                        // Fallback to client-side export
                        const dataStr = JSON.stringify(analysisLayers.contours, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `contours_${contourInterval}m_${Date.now()}.geojson`;
                        link.click();
                        URL.revokeObjectURL(url);
                        showToast('Contour data exported as GeoJSON (fallback)', 'success');
                      }
                    } catch (error) {
                      logError('Export error:', error);
                      // Fallback
                      const dataStr = JSON.stringify(analysisLayers.contours, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `contours_${contourInterval}m_${Date.now()}.geojson`;
                      link.click();
                      URL.revokeObjectURL(url);
                      showToast('Contour data exported (offline mode)', 'info');
                    }
                  }}
                  className="w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Raw Contour Layer (GeoJSON)
                </button>
                <button
                  onClick={async () => {
                    try {
                      const bbox = getBboxString(aoi);
                      if (!bbox) {
                        showToast('Invalid AOI for export', 'error');
                        return;
                      }
                      
                      const response = await fetch(
                        `${BACKEND_URL}/contours/export?bbox=${bbox}&interval=${contourInterval}${contourBoldInterval && contourBoldInterval > 0 ? `&bold_interval=${contourBoldInterval}` : ''}&format=kml`
                      );
                      
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `contours_${contourInterval}m_${Date.now()}.kml`;
                        link.click();
                        URL.revokeObjectURL(url);
                        showToast('Raw contour layer exported as KML', 'success');
                      } else {
                        showToast('KML export unavailable', 'error');
                      }
                    } catch (error) {
                      logError('KML export error:', error);
                      showToast('KML export failed', 'error');
                    }
                  }}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export as KML (Google Earth)
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 3D Visualization Toggle */}
        <div className="p-4 border-b border-slate-700">
          <button
            onClick={() => setShow3D(!show3D)}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium flex items-center justify-center gap-2"
          >
            {show3D ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {show3D ? 'View 2D Map' : 'View 3D Terrain'}
          </button>
          {show3D && (
            <div className="mt-3 p-3 bg-slate-700 rounded text-sm text-slate-300">
              3D terrain visualization coming soon. This will display an interactive 3D model of your terrain.
            </div>
          )}
        </div>
        
        {/* Pond/Earthworks Calculator */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Pond Calculator
            </h2>
            <button
              onClick={() => toggleSection('pond')}
              className="text-slate-400 hover:text-slate-200"
            >
              {sidebarCollapsed.pond ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {!sidebarCollapsed.pond && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Area (m²)</label>
                <input
                  type="number"
                  value={pondCalc.area}
                  onChange={(e) => setPondCalc(prev => ({ ...prev, area: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Depth (m)</label>
                <input
                  type="number"
                  value={pondCalc.depth}
                  onChange={(e) => setPondCalc(prev => ({ ...prev, depth: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="e.g., 2"
                />
              </div>
              <button
                onClick={calculatePond}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
              >
                Calculate
              </button>
              
              {pondCalc.result && (
                <div className="mt-3 p-3 bg-slate-700 rounded text-sm text-slate-200 space-y-1">
                  <p><strong>Volume:</strong> {pondCalc.result.volumeCubicMeters} m³</p>
                  <p><strong>Volume:</strong> {pondCalc.result.volumeLiters} liters</p>
                  <p><strong>Volume:</strong> {pondCalc.result.volumeGallons} gallons</p>
                  <p><strong>Excavation:</strong> {pondCalc.result.estimatedExcavation} m³</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Advanced AI Advisory */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Advisory
            </h2>
            <button
              onClick={() => toggleSection('ai')}
              className="text-slate-400 hover:text-slate-200"
            >
              {sidebarCollapsed.ai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {!sidebarCollapsed.ai && (
            <div className="space-y-3">
              <textarea
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                placeholder="Enter design goal (e.g., maximize water storage)"
                className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm h-20 resize-none"
              />
              <button
                onClick={generateAIStrategy}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
              >
                Generate Strategy
              </button>
              
              {aiStrategy && (
                <div className="mt-3 p-3 bg-slate-700 rounded text-sm text-slate-200 whitespace-pre-line">
                  {aiStrategy}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* MAP CONTAINER */}
      <div className="flex-1 relative" style={{ minHeight: '100vh', width: '100%' }}>
        <div 
          ref={mapRef} 
          className="w-full h-full" 
          style={{ 
            minHeight: '100vh', 
            width: '100%',
            position: 'relative',
            zIndex: 1
          }}
          id="leaflet-map-container"
        />
        {!mapInstanceRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-0">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-300 text-sm">Loading map...</p>
            </div>
          </div>
        )}
        
        {/* Top Left: Map Search */}
        <div className="absolute top-4 left-4 z-[1000] bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-3 max-w-sm">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSearchMode('location')}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                searchMode === 'location'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Search className="w-3 h-3 inline mr-1" />
              Location
            </button>
            <button
              onClick={() => setSearchMode('coordinates')}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                searchMode === 'coordinates'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <MapPin className="w-3 h-3 inline mr-1" />
              Coords
            </button>
          </div>
          
          {searchMode === 'location' ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchLocation(searchQuery)}
                placeholder="Search location..."
                className="flex-1 px-3 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              />
              <button
                onClick={() => searchLocation(searchQuery)}
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-sm"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                value={coordInput.lat}
                onChange={(e) => setCoordInput(prev => ({ ...prev, lat: e.target.value }))}
                placeholder="Lat"
                step="any"
                className="flex-1 px-2 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-xs"
              />
              <input
                type="number"
                value={coordInput.lng}
                onChange={(e) => setCoordInput(prev => ({ ...prev, lng: e.target.value }))}
                placeholder="Lng"
                step="any"
                className="flex-1 px-2 py-2 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none text-xs"
              />
              <button
                onClick={searchByCoordinates}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
                title="Navigate to coordinates"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Top Right: Basemap, Import, Export, Labels, Legend */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {/* Basemap Button */}
          <div className="relative" style={{ zIndex: 1001 }}>
            <button
              onClick={() => {
                setShowBasemapMenu(!showBasemapMenu);
                setShowExportMenu(false);
                setShowLegend(false);
              }}
              className="px-3 py-2 bg-slate-800/95 backdrop-blur-sm hover:bg-slate-700 text-slate-200 rounded-lg shadow-xl border border-slate-700/50 flex items-center gap-2 transition-colors text-sm"
              title="Change basemap"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Basemap</span>
            </button>
            {showBasemapMenu && (
              <>
                <div 
                  className="fixed inset-0 z-[1000]" 
                  onClick={() => setShowBasemapMenu(false)}
                />
                <div className="absolute top-full right-0 mt-2 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-2 min-w-[200px] max-h-64 overflow-y-auto z-[1001]">
                  {Object.keys(basemapConfigs).map((basemapKey) => (
                    <button
                      key={basemapKey}
                      onClick={() => {
                        setLayerVisibility(prev => ({ ...prev, basemap: basemapKey }));
                        setShowBasemapMenu(false);
                      }}
                      className={`w-full px-3 py-2 rounded text-sm text-left ${
                        layerVisibility.basemap === basemapKey
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      {basemapConfigs[basemapKey].name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Import Button */}
          <div className="relative">
            <label className="px-3 py-2 bg-slate-800/95 backdrop-blur-sm hover:bg-slate-700 text-slate-200 rounded-lg shadow-xl border border-slate-700/50 flex items-center gap-2 transition-colors text-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
              <input
                type="file"
                accept=".gpx"
                onChange={handleGPXUpload}
                className="hidden"
              />
            </label>
          </div>
          
          {/* Export Menu */}
          <div className="relative" style={{ zIndex: 1001 }}>
            <button
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowBasemapMenu(false);
                setShowLegend(false);
              }}
              className="px-3 py-2 bg-slate-800/95 backdrop-blur-sm hover:bg-slate-700 text-slate-200 rounded-lg shadow-xl border border-slate-700/50 flex items-center gap-2 transition-colors text-sm"
              title="Export map"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-[1000]" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute top-full right-0 mt-2 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-2 flex flex-col gap-1 z-[1001] min-w-[150px]">
                  <button
                    onClick={() => {
                      exportMapPNG();
                      setShowExportMenu(false);
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm flex items-center gap-2 transition-colors"
                    title="Export as PNG"
                  >
                    <Image className="w-4 h-4" />
                    PNG
                  </button>
                  <button
                    onClick={() => {
                      exportMapPDF();
                      setShowExportMenu(false);
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm flex items-center gap-2 transition-colors"
                    title="Export as PDF"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      printMap();
                      setShowExportMenu(false);
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm flex items-center gap-2 transition-colors"
                    title="Print Map"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => {
                      shareMap();
                      setShowExportMenu(false);
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm flex items-center gap-2 transition-colors"
                    title="Share Map"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Labels Toggle */}
          <button
            onClick={toggleLabels}
            className={`px-3 py-2 rounded-lg shadow-xl border transition-colors text-sm flex items-center gap-2 ${
              showLabels
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800/95 backdrop-blur-sm text-slate-200 border-slate-700/50 hover:bg-slate-700'
            }`}
            title={showLabels ? "Hide labels" : "Show labels"}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Labels</span>
          </button>
          
          {/* Legend Button */}
          <div className="relative" style={{ zIndex: 1001 }}>
            <button
              onClick={() => {
                setShowLegend(!showLegend);
                setShowBasemapMenu(false);
                setShowExportMenu(false);
              }}
              className="px-3 py-2 bg-slate-800/95 backdrop-blur-sm hover:bg-slate-700 text-slate-200 rounded-lg shadow-xl border border-slate-700/50 flex items-center gap-2 transition-colors text-sm"
              title="Show legend"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Legend</span>
            </button>
            {showLegend && (
              <>
                <div 
                  className="fixed inset-0 z-[1000]" 
                  onClick={() => setShowLegend(false)}
                />
                <div className="absolute top-full right-0 mt-2 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-4 min-w-[250px] max-w-sm max-h-96 overflow-y-auto z-[1001]">
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Map Legend
                </h3>
                {Object.entries(getLegendData()).map(([category, items]) => (
                  <div key={category} className="mb-3">
                    <h4 className="text-xs font-medium text-slate-400 mb-2">{category}</h4>
                    <div className="space-y-1">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div
                            className="w-4 h-4 rounded border border-slate-600"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className={`flex-1 ${item.available ? 'text-slate-200' : 'text-slate-500'}`}>
                            {item.name}
                          </span>
                          {item.visible && item.available && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                          {!item.available && (
                            <span className="text-slate-500 text-xs">(N/A)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setShowLegend(false)}
                  className="mt-3 w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs"
                >
                  Close
                </button>
              </div>
              </>
            )}
          </div>
        </div>
        
        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="absolute top-4 left-4 bg-slate-800/95 backdrop-blur-sm px-4 py-3 rounded-lg border border-slate-700/50 flex items-center gap-3 shadow-xl z-[999]">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="text-slate-200 font-medium">Running analysis...</span>
          </div>
        )}
        
        {/* AOI Info Card (if AOI exists) */}
        {aoi && aoiStats && (
          <div className="absolute bottom-4 left-4 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-4 z-[999] max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Area of Interest</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Area:</span>
                <p className="text-slate-200 font-medium">{aoiStats.area.hectares.toFixed(2)} ha</p>
              </div>
              <div>
                <span className="text-slate-400">Perimeter:</span>
                <p className="text-slate-200 font-medium">{aoiStats.perimeter.kilometers.toFixed(2)} km</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Center:</span>
                <p className="text-slate-200 font-mono text-xs break-all">
                  {aoiStats.center.lat.toFixed(6)}, {aoiStats.center.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 3D Terrain Visualization */}
        {show3D && (
          <div className="absolute inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                  <Mountain className="w-8 h-8 text-emerald-500" />
                  3D Terrain Visualization
                </h2>
                <button
                  onClick={() => setShow3D(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
                >
                  Close
                </button>
              </div>
              
              {aoi ? (
                <div className="space-y-4">
                  <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Terrain Analysis Summary</h3>
                    {aoiStats && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Area:</span>
                          <p className="text-slate-200 font-medium">{aoiStats.area.hectares.toFixed(2)} ha</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Perimeter:</span>
                          <p className="text-slate-200 font-medium">{aoiStats.perimeter.kilometers.toFixed(2)} km</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Center:</span>
                          <p className="text-slate-200 font-mono text-xs break-all">{aoiStats.center.lat.toFixed(6)}, {aoiStats.center.lng.toFixed(6)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Vertices:</span>
                          <p className="text-slate-200 font-medium">{aoiStats.vertices}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4">3D Features Available</h3>
                    <ul className="text-left text-slate-300 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Elevation Profile: View terrain cross-sections</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Slope Analysis: Color-coded slope visualization</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Aspect Mapping: Direction of slope faces</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Water Flow: 3D visualization of drainage patterns</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Contour Overlay: Elevation lines in 3D space</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg p-6 border border-emerald-700/30">
                    <p className="text-slate-300 text-sm mb-4">
                      <strong>Note:</strong> Full 3D terrain rendering requires WebGL support and elevation data. 
                      Currently showing terrain analysis summary. Full 3D visualization coming in next update.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShow3D(false);
                          runAnalysis();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
                      >
                        Run Full Analysis
                      </button>
                      <button
                        onClick={() => setShow3D(false)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
                      >
                        Return to 2D Map
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-slate-300 mb-6">
                    Please draw an Area of Interest first to view 3D terrain analysis.
                  </p>
                  <button
                    onClick={() => setShow3D(false)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                  >
                    Return to 2D Map
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;


