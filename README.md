# Wordle Clone — Multi-Length Edition

A modern, responsive Wordle clone supporting 2, 3, 4, and 5-letter words. Each page load gives a new random word.

## Files

```
wordle-clone/
├── index.html   — markup & structure
├── style.css    — modern dark theme
├── game.js      — all game logic
├── words.js     — word lists for each length
└── README.md
```

---

## Deploying to GitHub Pages (Linux)

### 1 — Prerequisites

Make sure you have Git installed:

```bash
git --version
# If not installed:
sudo apt install git       # Debian/Ubuntu
sudo dnf install git       # Fedora
```

### 2 — Create a GitHub repository

1. Go to https://github.com/new
2. Name it something like `wordle-clone`
3. Set it to **Public** (required for free GitHub Pages)
4. **Do NOT** initialize with README (you already have files)
5. Click **Create repository**

### 3 — Initialize and push from your local folder

Open a terminal in the `wordle-clone` folder and run:

```bash
cd /path/to/wordle-clone

git init
git add .
git commit -m "Initial commit: Wordle clone"

# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/wordle-clone.git
git branch -M main
git push -u origin main
```

> **Tip:** If you use SSH instead of HTTPS, replace the remote URL with:
> `git@github.com:YOUR_USERNAME/wordle-clone.git`

### 4 — Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select `Deploy from a branch`
4. Set Branch to `main` and folder to `/ (root)`
5. Click **Save**

### 5 — Access your site

After ~1–2 minutes, your game will be live at:

```
https://YOUR_USERNAME.github.io/wordle-clone/
```

GitHub will show the URL in the Pages settings once it's ready.

---

## Updating the game later

After making changes, just run:

```bash
git add .
git commit -m "Your update message"
git push
```

GitHub Pages will automatically redeploy within ~1 minute.

---

## Customising word lists

All word lists are in `words.js`. You can:
- Add more words to any array
- Replace the 2/3/4-letter hardcoded lists with full dictionaries
- The 5-letter list already contains ~1500+ common words

---

## Browser support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No build step or dependencies needed — pure HTML/CSS/JS.
