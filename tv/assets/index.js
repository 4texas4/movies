const API_KEY = "0e33c92186263620ce8c7f6b8fb35b00";
const API_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const FALLBACK_IMAGE_URL = "https://dummyimage.com/200x300/333/fff.png&text=No+Cover";

const searchInput = document.getElementById("search");
const resultsContainer = document.querySelector(".results");
const searchInfo = document.getElementById("search-info");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const endMessage = document.getElementById("endMessage");
const popularContainer = document.querySelector(".popular-movies");
const topRatedContainer = document.querySelector(".top-rated-movies");
const upcomingContainer = document.querySelector(".upcoming-movies");
const favoritesContainer = document.querySelector(".favorites-movies");
const recommendationsContainer = document.querySelector(".recommendations");
const otherSections = document.getElementById("other-sections");
const searchResultsSection = document.getElementById("search-results");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("close-btn");
const loadingScreen = document.getElementById("loading");
const noMoviesMessage = document.getElementById("no-movies");
let searchAbortController = null;
let currentSearchQuery = "";
let currentPage = 1;
let totalPages = 1;
let searchDisplayedCount = 0;

async function fetchMovies(url, container, showLoading = true, signal, requestedQuery = "", append = false, onComplete = null) {
  if (showLoading) loadingScreen.style.display = "flex";
  try {
    const response = await fetch(url, { signal });
    const data = await response.json();
    if (container === resultsContainer && currentSearchQuery !== requestedQuery) return;
    if (requestedQuery) {
      totalPages = data.total_pages;
      searchDisplayedCount = append ? searchDisplayedCount + data.results.length : data.results.length;
      updateSearchInfo(searchDisplayedCount, data.total_results);
      if (currentPage < totalPages) {
        loadMoreBtn.style.display = "block";
        endMessage.style.display = "none";
      } else {
        loadMoreBtn.style.display = "none";
        endMessage.style.display = "block";
      }
    }
    updateContainerWithAnimation(container, () => displayShows(data.results, container, append));
    if (typeof onComplete === "function") onComplete(data.results);
  } catch (error) {
    if (error.name !== "AbortError") alert("Failed to fetch shows.");
  } finally {
    loadingScreen.style.display = "none";
  }
}

function updateContainerWithAnimation(container, updateCallback) {
  container.style.opacity = 0;
  setTimeout(() => {
    updateCallback();
    container.style.opacity = 1;
  }, 300);
}

function displayShows(shows, container, append = false) {
  if (!append) container.innerHTML = "";
  shows.forEach(show => {
    const showDiv = document.createElement("div");
    showDiv.classList.add("movie");
    const showImage = document.createElement("img");
    showImage.src = show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : FALLBACK_IMAGE_URL;
    showImage.onerror = function() { this.onerror = null; this.src = FALLBACK_IMAGE_URL; };
    const showInfo = document.createElement("div");
    showInfo.classList.add("movie-info");
    const showTitle = document.createElement("h3");
    showTitle.textContent = show.name;
    const showRating = document.createElement("div");
    showRating.classList.add("rating");
    showRating.textContent = `⭐ ${show.vote_average.toFixed(1)}`;
    showInfo.appendChild(showTitle);
    showInfo.appendChild(showRating);
    showDiv.appendChild(showImage);
    showDiv.appendChild(showInfo);
    const favoriteIcon = document.createElement("i");
    favoriteIcon.classList.add("fas", "fa-heart", "favorite-icon");
    if (isFavorite(show.id)) favoriteIcon.classList.add("favorited");
    favoriteIcon.addEventListener("click", e => { e.stopPropagation(); toggleFavorite(show, favoriteIcon); });
    showDiv.appendChild(favoriteIcon);
    container.appendChild(showDiv);
    showDiv.addEventListener("click", () => showDetails(show.name, show.overview, show.id));
  });
}

function updateSearchInfo(displayedCount, totalCount) {
  searchInfo.textContent = currentSearchQuery
    ? `Showing ${displayedCount} of ${totalCount} results for "${currentSearchQuery}"`
    : "";
}

function showDetails(title, overview, movieId) {
  overlay.classList.add("show");
  document.getElementById("movie-title").textContent = title;
  const player = document.getElementById("player");
  const sourceSelect = document.getElementById("source-select");
  function updatePlayerSource() {
    const template = sourceSelect.value;
    const src = template
      .replace(/\$\{movieId\}/g, movieId)
      .replace("${seriesId}", movieId)
      .replace("${season}", 1)
      .replace("${episode}", 1);
    player.src = src;
    populateSeasonsAndEpisodes(movieId);
  }
  if (sourceSelect) {
    sourceSelect.style.display = "block";
    sourceSelect.onchange = updatePlayerSource;
    updatePlayerSource();
  }
  updateRecentlyWatched(movieId);
}

overlay.addEventListener("click", e => {
  if (e.target === overlay) {
    overlay.classList.remove("show");
    document.getElementById("player").src = "";
  }
});

closeBtn.addEventListener("click", () => {
  overlay.classList.remove("show");
  document.getElementById("player").src = "";
});

function performSearch(resetPage = true) {
  const query = searchInput.value.trim();
  currentSearchQuery = query;
  if (resetPage) { currentPage = 1; searchDisplayedCount = 0; }
  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();
  if (!query) {
    searchResultsSection.style.display = "none";
    otherSections.style.display = "block";
  } else {
    searchResultsSection.style.display = "block";
    otherSections.style.display = "none";
    if (resetPage) { resultsContainer.innerHTML = ""; noMoviesMessage.style.display = "none"; updateSearchInfo(0,0); endMessage.style.display = "none"; }
    fetchMovies(
      `${API_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}`,
      resultsContainer, false, searchAbortController.signal, query, !resetPage
    );
  }
}

searchInput.addEventListener("input", () => performSearch(true));
loadMoreBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; performSearch(false); } });

fetchMovies(`${API_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=1`, popularContainer);
fetchMovies(`${API_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=1`, topRatedContainer);
fetchMovies(`${API_URL}/tv/airing_today?api_key=${API_KEY}&language=en-US&page=1`, upcomingContainer);

function getFavorites() { return JSON.parse(localStorage.getItem("favoriteMovies"))||{}; }
function saveFavorites(favorites) { localStorage.setItem("favoriteMovies", JSON.stringify(favorites)); }
function isFavorite(id) { return getFavorites().hasOwnProperty(id); }

function toggleFavorite(item, iconElement) {
  const favorites = getFavorites();
  const inFav = iconElement.closest('#favorites') !== null;
  if (isFavorite(item.id)) {
    delete favorites[item.id];
    iconElement.classList.replace("favorited", "fa-heart-broken");
    iconElement.style.animation = "heartFallApart 0.6s ease";
    iconElement.addEventListener("animationend", () => { iconElement.classList.replace("fa-heart-broken","fa-heart"); iconElement.style.animation=""; if (inFav) loadFavorites(); },{once:true});
  } else {
    favorites[item.id] = item;
    iconElement.classList.add("favorited");
    iconElement.style.animation = "pop 0.4s ease";
    iconElement.addEventListener("animationend",()=>iconElement.style.animation="",{once:true});
  }
  saveFavorites(favorites);
  if (!inFav) loadFavorites();
}

function loadFavorites() {
  const favs = Object.values(getFavorites());
  const sec = document.getElementById("favorites");
  sec.style.display = favs.length>0?"block":"none";
  updateContainerWithAnimation(favoritesContainer,()=>displayShows(favs,favoritesContainer,false));
}

function updateRecentlyWatched(id) {
  let watched = JSON.parse(localStorage.getItem("recentlyWatched"))||[];
  watched = watched.filter(x=>x!==id);
  watched.push(id);
  if(watched.length>5) watched.shift();
  localStorage.setItem("recentlyWatched",JSON.stringify(watched));
  updateRecommendations();
}

function updateRecommendations() {
  let watched = JSON.parse(localStorage.getItem("recentlyWatched"))||[];
  const sec = document.getElementById("recommendations");
  if(watched.length>0) {
    const last = watched[watched.length-1];
    fetchMovies(
      `${API_URL}/tv/${last}/recommendations?api_key=${API_KEY}&language=en-US&page=1`,
      recommendationsContainer,false,null,"",false,results=>{ sec.style.display=results.length>0?"block":"none"; }
    );
  } else { sec.style.display="none"; recommendationsContainer.innerHTML=""; }
}

async function populateSeasonsAndEpisodes(seriesId) {
  const seasonDropdown = document.getElementById("seasonSelect");
  const episodeDropdown = document.getElementById("episodeSelect");
  // Fetch series details including seasons
  const res = await fetch(`${API_URL}/tv/${seriesId}?api_key=${API_KEY}&language=en-US`);
  const data = await res.json();
  // Filter out season 0 (specials)
  const realSeasons = data.seasons.filter(s => s.season_number > 0);
  seasonDropdown.innerHTML = '';
  realSeasons.forEach(season => {
    const option = document.createElement("option");
    option.value = season.season_number;
    option.textContent = `Season ${season.season_number}`;
    seasonDropdown.appendChild(option);
  });
  // Load first real season
  loadEpisodes(seriesId, realSeasons[0].season_number);
  seasonDropdown.onchange = () => loadEpisodes(seriesId, parseInt(seasonDropdown.value));
}

async function loadEpisodes(seriesId, seasonNumber) {
  const episodeDropdown = document.getElementById("episodeSelect");
  // Fetch episodes for selected season
  const res = await fetch(`${API_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`);
  const data = await res.json();
  episodeDropdown.innerHTML = '';
  data.episodes.forEach(ep => {
    const option = document.createElement("option");
    option.value = ep.episode_number;
    option.textContent = `Episode ${ep.episode_number} – ${ep.name}`;
    episodeDropdown.appendChild(option);
  });
  // Auto-play first episode
  updateEmbedPlayer(seriesId, seasonNumber, data.episodes[0].episode_number);
}

function updateEmbedPlayer(seriesId, season, episode) {
  const embedSelect = document.getElementById("source-select");
  const iframe = document.getElementById("player");
  const template = embedSelect.value;
  const url = template.replace("${seriesId}", seriesId).replace("${season}", season).replace("${episode}", episode);
  iframe.src = url;
}

const initSliders = () => {
  document.querySelectorAll('.slider-container').forEach(container => {
    const track = container.querySelector('.slider-track');
    const prev = container.querySelector('.slider-btn.prev');
    const next = container.querySelector('.slider-btn.next');
    let index = 0, direction = 1, slideWidth = 0;
    const update = () => {
      const items = track.children;
      const visible = Math.floor(container.offsetWidth / slideWidth);
      const maxIndex = items.length - visible;
      index = Math.max(0, Math.min(index, maxIndex));
      track.style.transform = `translateX(${-index * slideWidth}px)`;
    };
    const setup = () => {
      const items = track.children;
      if (!items.length) return;
      slideWidth = items[0].getBoundingClientRect().width + parseInt(getComputedStyle(track).gap);
      prev.onclick = () => { index--; update(); };
      next.onclick = () => { index++; update(); };
      update();
      setInterval(() => {
        const visibleCount = Math.floor(container.offsetWidth / slideWidth);
        const maxIdx = track.children.length - visibleCount;
        if (index >= maxIdx) direction = -1;
        if (index <= 0) direction = 1;
        index += direction;
        update();
      }, 3000);
      observer.disconnect();
    };
    const observer = new MutationObserver(setup);
    observer.observe(track, { childList: true });
    setup();
  });
};
initSliders();
