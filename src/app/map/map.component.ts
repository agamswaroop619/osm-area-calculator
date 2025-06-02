import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface AreaMeasurement {
  area: number;
  perimeter: number;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private map!: L.Map;
  private drawnItems: L.FeatureGroup = new L.FeatureGroup();
  searchQuery: string = '';
  searchResults: SearchResult[] = [];
  showSuggestions: boolean = false;
  private debounceTimer: any;
  currentMeasurement: AreaMeasurement | null = null;

  constructor() { }

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Add draw control
    this.map.addLayer(this.drawnItems);

    const drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        circlemarker: false,
        circle: false,
        polyline: false,
        rectangle: true,
        polygon: {
          allowIntersection: false,
          showArea: true
        }
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true
      }
    });

    this.map.addControl(drawControl);

    // Handle draw events
    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      this.drawnItems.addLayer(layer);
      this.calculateAreaAndPerimeter(layer);
    });

    this.map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        this.calculateAreaAndPerimeter(layer);
      });
    });

    this.map.on(L.Draw.Event.DELETED, () => {
      this.currentMeasurement = null;
    });
  }

  private calculateAreaAndPerimeter(layer: L.Layer): void {
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      
      // Calculate area
      const area = L.GeometryUtil.geodesicArea(latlngs);
      
      // Calculate perimeter
      let perimeter = 0;
      for (let i = 0; i < latlngs.length - 1; i++) {
        perimeter += this.map.distance(latlngs[i], latlngs[i + 1]);
      }
      // Add distance from last point to first point to complete the perimeter
      perimeter += this.map.distance(latlngs[latlngs.length - 1], latlngs[0]);

      this.currentMeasurement = {
        area: Math.round(area), // in square meters
        perimeter: Math.round(perimeter) // in meters
      };
    }
  }

  onSearchInput(): void {
    clearTimeout(this.debounceTimer);
    if (this.searchQuery.length < 3) {
      this.searchResults = [];
      this.showSuggestions = false;
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.fetchSearchResults();
    }, 300);
  }

  private fetchSearchResults(): void {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`;

    fetch(nominatimUrl)
      .then(response => response.json())
      .then(data => {
        this.searchResults = data;
        this.showSuggestions = true;
      })
      .catch(error => {
        console.error('Error fetching search results:', error);
        this.searchResults = [];
        this.showSuggestions = false;
      });
  }

  selectLocation(result: SearchResult): void {
    this.searchQuery = result.display_name;
    this.showSuggestions = false;
    
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    this.map.setView([lat, lon], 13);
    L.marker([lat, lon]).addTo(this.map);
  }

  onSearch(): void {
    if (!this.searchQuery) return;
    this.fetchSearchResults();
  }

  onClickOutside(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.search-container')) {
      this.showSuggestions = false;
    }
  }

  formatMeasurement(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} km²`;
    } else if (value >= 10000) {
      return `${(value / 10000).toFixed(2)} ha`;
    } else {
      return `${value.toFixed(2)} m²`;
    }
  }

  formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    } else {
      return `${meters.toFixed(2)} m`;
    }
  }
}
