import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-geometryutil';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface AreaMeasurement {
  id: string;
  name: string;
  area: number;
  perimeter: number;
  color: string;
  layer: L.Layer;
}

interface AreaStyle {
  color: string;
  name: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private map!: L.Map;
  private drawnItems = new L.FeatureGroup();
  private drawControl!: L.Control.Draw;
  private currentStyle: AreaStyle = { color: '#3388ff', name: 'Area 1 (Blue)' };
  private areaCounter = 1;
  areaMeasurements: AreaMeasurement[] = [];

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
          showArea: true,
          shapeOptions: {
            color: this.currentStyle.color
          }
        },
        rectangle: {
          showArea: true,
          shapeOptions: {
            color: this.currentStyle.color
          }
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
      layer.setStyle({ color: this.currentStyle.color });
      this.drawnItems.addLayer(layer);
      this.addAreaMeasurement(layer);
    });

    this.map.on(L.Draw.Event.EDITED, (e: any) => {
      e.layers.eachLayer((layer: any) => {
        const measurement = this.areaMeasurements.find(m => m.layer === layer);
        if (measurement) {
          const { area, perimeter } = this.calculateMeasurement(layer);
          measurement.area = area;
          measurement.perimeter = perimeter;
        }
      });
    });

    this.map.on(L.Draw.Event.DELETED, (e: any) => {
      e.layers.eachLayer((layer: any) => {
        this.areaMeasurements = this.areaMeasurements.filter(m => m.layer !== layer);
      });
    });
  }

  private calculateMeasurement(layer: L.Layer): { area: number; perimeter: number } {
    if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];

      const area = L.GeometryUtil.geodesicArea(latlngs);
      let perimeter = 0;

      for (let i = 0; i < latlngs.length - 1; i++) {
        perimeter += this.map.distance(latlngs[i], latlngs[i + 1]);
      }
      perimeter += this.map.distance(latlngs[latlngs.length - 1], latlngs[0]);

      return {
        area: Math.round(area),
        perimeter: Math.round(perimeter)
      };
    }
    return { area: 0, perimeter: 0 };
  }

  private addAreaMeasurement(layer: L.Layer): void {
    const { area, perimeter } = this.calculateMeasurement(layer);
    const areaNumber = this.areaCounter++;
    const measurement: AreaMeasurement = {
      id: `area-${areaNumber}`,
      name: `Area ${areaNumber}`,
      area,
      perimeter,
      color: this.currentStyle.color,
      layer
    };
    this.areaMeasurements.push(measurement);
  }

  selectLocation(result: SearchResult): void {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    this.map.setView([lat, lon], 16);
    L.marker([lat, lon]).addTo(this.map);
  }

  formatArea(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} km²`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(2)} ha`;
    return `${value.toFixed(2)} m²`;
  }

  formatPerimeter(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(2)} m`;
  }

  startDrawingPolygon(style: AreaStyle): void {
    this.currentStyle = style;
    // Update the draw control options with the new color
    (this.drawControl as any).setDrawingOptions({
      polygon: {
        shapeOptions: {
          color: style.color
        }
      }
    });
    // @ts-ignore - Leaflet types don't include _toolbars
    const polygonButton = this.drawControl._toolbars.draw._modes.polygon.handler;
    polygonButton.enable();
  }

  startDrawingRectangle(style: AreaStyle): void {
    this.currentStyle = style;
    // Update the draw control options with the new color
    (this.drawControl as any).setDrawingOptions({
      rectangle: {
        shapeOptions: {
          color: style.color
        }
      }
    });
    // @ts-ignore - Leaflet types don't include _toolbars
    const rectangleButton = this.drawControl._toolbars.draw._modes.rectangle.handler;
    rectangleButton.enable();
  }

  clearDrawings(): void {
    this.drawnItems.clearLayers();
    this.areaMeasurements = [];
    this.areaCounter = 1;
  }
}
