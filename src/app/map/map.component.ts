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
  private activeDrawHandler: any = null;

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

    this.initializeDrawControl();

    this.map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      layer.setStyle({ 
        color: this.currentStyle.color,
        fillColor: this.currentStyle.color,
        fillOpacity: 0.2,
        weight: 2
      });
      this.drawnItems.addLayer(layer);
      this.addAreaMeasurement(layer);
      
      // Reset active handler after shape is created
      this.activeDrawHandler = null;
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

    // Handle draw stop event
    this.map.on(L.Draw.Event.DRAWSTOP, () => {
      this.activeDrawHandler = null;
    });
  }

  updateAreaColor(event: { area: AreaMeasurement, style: AreaStyle }): void {
    const { area, style } = event;
    area.color = style.color;
    
    // Update the layer style
    if (area.layer) {
      (area.layer as L.Path).setStyle({
        color: style.color,
        fillColor: style.color,
        fillOpacity: 0.2,
        weight: 2
      });
    }
  }

  private initializeDrawControl(): void {
    const drawOptions: L.Control.DrawConstructorOptions = {
      position: 'topright' as L.ControlPosition,
      draw: {
        marker: false,
        circlemarker: false,
        circle: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: this.currentStyle.color,
            fillColor: this.currentStyle.color,
            fillOpacity: 0.2,
            weight: 2
          }
        },
        rectangle: {
          showArea: true,
          shapeOptions: {
            color: this.currentStyle.color,
            fillColor: this.currentStyle.color,
            fillOpacity: 0.2,
            weight: 2
          }
        }
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true
      }
    };

    this.drawControl = new L.Control.Draw(drawOptions);
    this.map.addControl(this.drawControl);
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
    // Disable any active drawing handler
    if (this.activeDrawHandler) {
      this.activeDrawHandler.disable();
    }

    this.currentStyle = style;
    
    // Remove existing draw control and create a new one with updated colors
    if (this.drawControl) {
      this.map.removeControl(this.drawControl);
    }
    this.initializeDrawControl();
    
    // @ts-ignore - Leaflet types don't include _toolbars
    const polygonButton = this.drawControl._toolbars.draw._modes.polygon.handler;
    this.activeDrawHandler = polygonButton;
    polygonButton.enable();
  }

  startDrawingRectangle(style: AreaStyle): void {
    // Disable any active drawing handler
    if (this.activeDrawHandler) {
      this.activeDrawHandler.disable();
    }

    this.currentStyle = style;
    
    // Remove existing draw control and create a new one with updated colors
    if (this.drawControl) {
      this.map.removeControl(this.drawControl);
    }
    this.initializeDrawControl();
    
    // @ts-ignore - Leaflet types don't include _toolbars
    const rectangleButton = this.drawControl._toolbars.draw._modes.rectangle.handler;
    this.activeDrawHandler = rectangleButton;
    rectangleButton.enable();
  }

  clearDrawings(): void {
    this.drawnItems.clearLayers();
    this.areaMeasurements = [];
    this.areaCounter = 1;
    
    // Reset active handler
    if (this.activeDrawHandler) {
      this.activeDrawHandler.disable();
      this.activeDrawHandler = null;
    }
  }
}
