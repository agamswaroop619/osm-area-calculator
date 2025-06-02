import { Component, OnInit, Output, EventEmitter } from '@angular/core';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Output() locationSelected = new EventEmitter<SearchResult>();
  @Output() drawPolygon = new EventEmitter<void>();
  @Output() drawRectangle = new EventEmitter<void>();
  @Output() clearDrawings = new EventEmitter<void>();

  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSuggestions = false;
  private debounceTimer: any;

  constructor() {}

  ngOnInit(): void {}

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
    this.drawPolygon.emit();
  }

  onDrawRectangle(): void {
    this.drawRectangle.emit();
  }

  onClearDrawings(): void {
    this.clearDrawings.emit();
  }
} 