import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface AreaStyle {
  color: string;
  name: string;
}

interface AreaMeasurement {
  id: string;
  name: string;
  area: number;
  perimeter: number;
  color: string;
  layer: any;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() areaMeasurements: AreaMeasurement[] = [];
  @Output() locationSelected = new EventEmitter<SearchResult>();
  @Output() drawPolygon = new EventEmitter<AreaStyle>();
  @Output() drawRectangle = new EventEmitter<AreaStyle>();
  @Output() clearDrawings = new EventEmitter<void>();
  @Output() areaColorChanged = new EventEmitter<{area: AreaMeasurement, style: AreaStyle}>();

  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;
  selectedArea: AreaMeasurement | null = null;
  private debounceTimer: any;

  areaStyles: AreaStyle[] = [
    { color: '#3388ff', name: 'Area 1 (Blue)' },
    { color: '#dc3545', name: 'Area 2 (Red)' },
    { color: '#28a745', name: 'Area 3 (Green)' },
    { color: '#ffc107', name: 'Area 4 (Yellow)' },
    { color: '#6f42c1', name: 'Area 5 (Purple)' }
  ];

  selectedAreaStyle: AreaStyle = this.areaStyles[0];

  constructor() {}

  ngOnInit(): void {}

  openColorPicker(area: AreaMeasurement): void {
    this.selectedArea = this.selectedArea === area ? null : area;
  }

  updateAreaColor(area: AreaMeasurement, style: AreaStyle): void {
    this.areaColorChanged.emit({ area, style });
    this.selectedArea = null;
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

  fetchSearchResults(): void {
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
    this.locationSelected.emit(result);
  }

  onClickOutsideSuggestions(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.search-container')) {
      this.showSuggestions = false;
    }
  }

  onDrawPolygon(): void {
    this.drawPolygon.emit(this.selectedAreaStyle);
  }

  onDrawRectangle(): void {
    this.drawRectangle.emit(this.selectedAreaStyle);
  }

  onClearDrawings(): void {
    this.clearDrawings.emit();
  }

  setSelectedAreaStyle(style: AreaStyle): void {
    this.selectedAreaStyle = style;
  }

  formatArea(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} km²`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(2)} ha`;
    return `${value.toFixed(2)} m²`;
  }

  formatPerimeter(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(2)} m`;
  }
} 