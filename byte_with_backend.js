// Globals
let currentCategory = '';
let refreshInterval = null;

// Dark Mode Toggle with Remembering State
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// Load dark mode state from storage
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

// Show/Hide Loader
function showLoader() {
  document.getElementById('loader').style.display = 'block';
}

function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

// Capitalize function
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Render article reusable function
function renderArticle(article) {
  return `
    <div style="margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #ccc;">
      ${article.image ? `<img src="${article.image}" alt="News Image" style="max-width:100%; border-radius: 8px; margin: 10px 0;" />` : ''}
      <h3><a href="${article.url}" target="_blank" style="color:#1e3a8a;">${article.title}</a></h3>
      <p>${article.description || 'No description available.'}</p>
      <a href="${article.url}" target="_blank" class="read-more-btn">Read More</a><br/>
      <small style="color: gray;">Source: ${article.source.name}</small>
    </div>`;
}

// Auto-refresh
function autoRefresh(category) {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => loadCategory(category), 5 * 60 * 1000); // 5 mins
}

// Main function to load categories
async function loadCategory(category) {
  currentCategory = category;
  autoRefresh(category);
  showLoader();
  const container = document.getElementById('news-container');
  container.innerHTML = `<h2>${capitalize(category)} News</h2><p>Loading...</p>`;

  try {
    let data;

    if (category === 'trending') {
      const apiKey = '6c8e0dd7de4cd667015e9a68a1876c0f';
      const url = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=10&apikey=${apiKey}`;
      const response = await fetch(url);
      data = await response.json();
    } else {
      const response = await fetch(`http://localhost:5000/news?category=${category}`);
      data = await response.json();
    }

    if (!data.articles || data.articles.length === 0) {
      container.innerHTML = `<h2>${capitalize(category)} News</h2><p>No articles found.</p>`;
      hideLoader();
      return;
    }

    if (category === 'summary') {
      container.innerHTML = `<h2>Summary News</h2>`;
      for (const article of data.articles) {
        const summary = await summarizeArticle(article.content || article.description || article.title);
        container.innerHTML += `
          <div style="margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #ccc;">
            <h3><a href="${article.url}" target="_blank" style="color:#1e3a8a;">${article.title}</a></h3>
            <div class="summary-box"><strong>Summary:</strong> ${summary}</div>
            <a href="${article.url}" target="_blank" class="read-more-btn">Read More</a><br/>
            <small style="color: gray;">Source: ${article.source.name}</small>
          </div>`;
      }
    } else if (category === 'trending') {
      container.innerHTML = `<h2>Trending News</h2>`;
      data.articles.forEach(article => container.innerHTML += renderArticle(article));
    } else {
      const filterResponse = await fetch(`http://localhost:5000/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, articles: data.articles })
      });
      const filtered = await filterResponse.json();
      if (!filtered.articles || filtered.articles.length === 0) {
        container.innerHTML = `<h2>${capitalize(category)} News</h2><p>No relevant articles found.</p>`;
        hideLoader();
        return;
      }
      container.innerHTML = `<h2>${capitalize(category)} News</h2>`;
      filtered.articles.forEach(article => container.innerHTML += renderArticle(article));
    }

  } catch (error) {
    console.error(error);
    container.innerHTML = `<h2>${capitalize(category)} News</h2><p>Error loading articles.</p>`;
  }

  hideLoader();
}

// Summarization function
async function summarizeArticle(content) {
  try {
    const response = await fetch('http://localhost:5000/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    return data.summary || 'Summarization failed.';
  } catch (error) {
    console.error('Summarization error:', error);
    return 'Summarization failed.';
  }
}

// Search Function
document.getElementById('searchInput').addEventListener('keypress', async function (e) {
  if (e.key === 'Enter') {
    const query = this.value.trim();
    if (!query) return;

    showLoader();
    const container = document.getElementById('news-container');
    container.innerHTML = `<h2>Search Results for "${query}"</h2><p>Loading...</p>`;

    try {
      const response = await fetch(`http://localhost:5000/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!data.articles || data.articles.length === 0) {
        container.innerHTML = `<h2>Search Results for "${query}"</h2><p>No articles found.</p>`;
        hideLoader();
        return;
      }

      container.innerHTML = `<h2>Search Results for "${query}"</h2>`;
      data.articles.forEach(article => container.innerHTML += renderArticle(article));

    } catch (error) {
      console.error('Search error:', error);
      container.innerHTML = `<h2>Search Results for "${query}"</h2><p>Error loading search results.</p>`;
    }

    hideLoader();
  }
});
