import { Component, OnInit, HostListener } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-geometryutil';

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
  private drawnItems = new L.FeatureGroup();
  private debounceTimer: any;
  private drawControl!: L.Control.Draw;

  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;
  currentMeasurement: AreaMeasurement | null = null;

  constructor() {}

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([31.524949, 34.596849], 14); // Sderot
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.addLayer(this.drawnItems);

    this.drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        marker: false,
        circlemarker: false,
        circle: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          showArea: true
        },
        rectangle: {
          showArea: true
        }
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true
      }
    });

    this.map.addControl(this.drawControl);

    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      this.drawnItems.addLayer(layer);
      this.calculateMeasurement(layer);
    });

    this.map.on(L.Draw.Event.EDITED, (e: any) => {
      e.layers.eachLayer((layer: any) => {
        this.calculateMeasurement(layer);
      });
    });

    this.map.on(L.Draw.Event.DELETED, () => {
      this.currentMeasurement = null;
    });
  }

  private calculateMeasurement(layer: L.Layer): void {
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];

      const area = L.GeometryUtil.geodesicArea(latlngs);
      let perimeter = 0;

      for (let i = 0; i < latlngs.length - 1; i++) {
        perimeter += this.map.distance(latlngs[i], latlngs[i + 1]);
      }
      perimeter += this.map.distance(latlngs[latlngs.length - 1], latlngs[0]);

      this.currentMeasurement = {
        area: Math.round(area),
        perimeter: Math.round(perimeter)
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
    this.debounceTimer = setTimeout(() => this.fetchSearchResults(), 300);
  }

  private fetchSearchResults(): void {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.searchResults = data;
        this.showSuggestions = true;
      })
      .catch(err => {
        console.error('Nominatim search error:', err);
        this.searchResults = [];
        this.showSuggestions = false;
      });
  }

  selectLocation(result: SearchResult): void {
    this.searchQuery = result.display_name;
    this.showSuggestions = false;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    this.map.setView([lat, lon], 16);
    L.marker([lat, lon]).addTo(this.map);
  }

  onClickOutsideSuggestions(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.search-container')) {
      this.showSuggestions = false;
    }
  }

  formatArea(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} km²`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(2)} ha`;
    return `${value.toFixed(2)} m²`;
  }

  formatPerimeter(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(2)} m`;
  }

  startDrawingPolygon(): void {
    // @ts-ignore - Leaflet types don't include _toolbars
    const polygonButton = this.drawControl._toolbars.draw._modes.polygon.handler;
    polygonButton.enable();
  }

  startDrawingRectangle(): void {
    // @ts-ignore - Leaflet types don't include _toolbars
    const rectangleButton = this.drawControl._toolbars.draw._modes.rectangle.handler;
    rectangleButton.enable();
  }

  clearDrawings(): void {
    this.drawnItems.clearLayers();
    this.currentMeasurement = null;
  }
}
