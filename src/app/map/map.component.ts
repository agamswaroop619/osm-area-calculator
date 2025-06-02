import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private map!: L.Map;
  searchQuery: string = '';
  searchResults: SearchResult[] = [];
  showSuggestions: boolean = false;
  private debounceTimer: any;

  constructor() { }

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
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

  // Close suggestions when clicking outside
  onClickOutside(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.search-container')) {
      this.showSuggestions = false;
    }
  }
}
