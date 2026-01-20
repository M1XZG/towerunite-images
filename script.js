function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setError(msg) {
  const error = document.getElementById('error');
  error.textContent = msg || '';
  error.classList.toggle('hidden', !msg);
}

function isImageFile(name) {
  // Ignore .gitkeep and non-image extensions
  if (name.toLowerCase() === '.gitkeep') return false;
  return /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(name);
}

function mediaUrl(filename) {
  // Build a URL relative to the current page for images in media/
  return new URL(filename, window.location.href).toString();
}

async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  const status = document.getElementById('gallery-status');
  const owner = 'M1XZG';
  const repo = 'shared-game-images';
  const branch = 'main';
  try {
    // Fetch images from media/
    const mediaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/media?ref=${branch}`);
    if (!mediaRes.ok) throw new Error(`GitHub API error ${mediaRes.status} (media/)`);
    const mediaFiles = await mediaRes.json();
    const mediaImages = mediaFiles.filter((f) => f.type === 'file' && isImageFile(f.name)).map(f => ({...f, _source: 'media'}));

    // Fetch images from image-pool/portrait/
    const portraitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/image-pool/portrait?ref=${branch}`);
    let portraitImages = [];
    if (portraitRes.ok) {
      const portraitFiles = await portraitRes.json();
      portraitImages = portraitFiles.filter((f) => f.type === 'file' && isImageFile(f.name)).map(f => ({...f, _source: 'image-pool/portrait'}));
    }

    // Fetch images from image-pool/landscape/
    const landscapeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/image-pool/landscape?ref=${branch}`);
    let landscapeImages = [];
    if (landscapeRes.ok) {
      const landscapeFiles = await landscapeRes.json();
      landscapeImages = landscapeFiles.filter((f) => f.type === 'file' && isImageFile(f.name)).map(f => ({...f, _source: 'image-pool/landscape'}));
    }

    // Separate portrait/media and landscape images
    const portraitAndMediaImages = [...mediaImages, ...portraitImages];
    const grid = document.getElementById('gallery-grid');
    const landscapeGrid = document.getElementById('landscape-gallery-grid');
    const landscapeStatus = document.getElementById('landscape-gallery-status');

    // Portrait/media section
    if (!portraitAndMediaImages.length) {
      status.textContent = 'No images yet. Add files to media/ or image-pool/portrait/ and refresh.';
      grid.innerHTML = '<div class="empty">No images in media/ or image-pool/portrait/.</div>';
    } else {
      status.textContent = `Loaded ${portraitAndMediaImages.length} file(s) from media/ and image-pool/portrait/`;
      grid.innerHTML = '';
      portraitAndMediaImages.forEach((file) => {
        const card = document.createElement('div');
        card.className = 'thumb';
        const img = document.createElement('img');
        img.src = mediaUrl(file.path);
        img.alt = file.name;
        const label = document.createElement('div');
        label.className = 'thumb-name';
        let poolLabel = '';
        if (file._source === 'image-pool/portrait') poolLabel = ' (portrait)';
        else if (file._source === 'media') poolLabel = '';
        label.textContent = file.name + poolLabel;
        card.appendChild(img);
        card.appendChild(label);
        card.addEventListener('click', () => {
          const url = file.path;
          const params = new URLSearchParams(window.location.search);
          params.set('src', url);
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          history.replaceState(null, '', newUrl);
          document.getElementById('src').value = url;
          showViewer(url);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        grid.appendChild(card);
      });
    }

    // Landscape section (table, 2 per row)
    const landscapeTable = document.getElementById('landscape-gallery-table');
    if (!landscapeImages.length) {
      landscapeStatus.textContent = 'No landscape images yet. Add files to image-pool/landscape/ and refresh.';
      landscapeTable.innerHTML = '<tr><td class="empty" colspan="2">No images in image-pool/landscape/.</td></tr>';
    } else {
      landscapeStatus.textContent = `Loaded ${landscapeImages.length} landscape image(s) from image-pool/landscape/`;
      landscapeTable.innerHTML = '';
      for (let i = 0; i < landscapeImages.length; i += 2) {
        const row = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          const idx = i + j;
          const cell = document.createElement('td');
          if (idx < landscapeImages.length) {
            const file = landscapeImages[idx];
            const wrapper = document.createElement('div');
            wrapper.className = 'landscape-cell';
            const img = document.createElement('img');
            img.src = mediaUrl(file.path);
            img.alt = file.name;
            wrapper.appendChild(img);
            // Optional: add label below image
            // const label = document.createElement('div');
            // label.className = 'thumb-name';
            // label.textContent = file.name + ' (landscape)';
            // wrapper.appendChild(label);
            wrapper.addEventListener('click', () => {
              const url = file.path;
              const params = new URLSearchParams(window.location.search);
              params.set('src', url);
              const newUrl = `${window.location.pathname}?${params.toString()}`;
              history.replaceState(null, '', newUrl);
              document.getElementById('src').value = url;
              showViewer(url);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            cell.appendChild(wrapper);
          }
          row.appendChild(cell);
        }
        landscapeTable.appendChild(row);
      }
    }
  } catch (err) {
    status.textContent = 'Unable to load image list (GitHub API). Add images to media/, image-pool/portrait/, or image-pool/landscape/ and try again.';
    console.error(err);
  }
}

function showViewer(url) {
  const viewer = document.getElementById('viewer');
  const img = document.getElementById('image');
  const openLink = document.getElementById('open-link');
  viewer.classList.remove('hidden');
  img.src = url;
  openLink.href = url;
  setError('');
}

async function downloadImage(url) {
  try {
    const res = await fetch(url, { mode: 'no-cors' });
    const a = document.createElement('a');
    a.href = url;
    const filename = url.split('/').pop()?.split('?')[0] || 'image';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    setError('Unable to download this image directly. Try right-click > Save image as.');
  }
}

function init() {
  const form = document.getElementById('image-form');
  const input = document.getElementById('src');
  const copyBtn = document.getElementById('copy-link');
  const dlBtn = document.getElementById('download-image');

  const initial = qs('src');
  if (initial) {
    if (isImageFile(initial)) {
      input.value = initial;
      showViewer(initial);
    } else {
      setError('Unsupported image type. Allowed: png, jpg, jpeg, gif, webp, avif, bmp.');
    }
  }

  loadGallery();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) return;
    const finalUrl = url.replace(/^\.\//, '');
    // Enforce media/ prefix to keep all images local
    if (!finalUrl.startsWith('media/')) {
      setError('Images must be in the media/ folder (use media/your-image.jpg).');
      return;
    }
    if (!isImageFile(finalUrl)) {
      setError('Unsupported image type. Allowed: png, jpg, jpeg, gif, webp, avif, bmp.');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('src', finalUrl);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.replaceState(null, '', newUrl);
    showViewer(finalUrl);
  });

  copyBtn.addEventListener('click', async () => {
    const url = document.getElementById('image').src;
    try {
      await navigator.clipboard.writeText(url);
      setError('Link copied to clipboard.');
      setTimeout(() => setError(''), 1200);
    } catch (e) {
      setError('Unable to copy link to clipboard.');
    }
  });

  dlBtn.addEventListener('click', () => {
    const url = document.getElementById('image').src;
    downloadImage(url);
  });
}

document.addEventListener('DOMContentLoaded', init);
