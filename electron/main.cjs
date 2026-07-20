/**
 * Electron main process for the desktop / Steam build.
 *
 * Loads the Vite production build from `dist/`. Saves are written to
 * `app.getPath('userData')` via the preload bridge rather than to the renderer's
 * localStorage, so they live somewhere the player can find and back up — and
 * somewhere Steam Cloud can be pointed at later.
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const steam = require('./steam.cjs');

/** 16:9 at a comfortable default; the game letterboxes to fit anyway. */
const DEFAULT_SIZE = { width: 1600, height: 900 };
const MIN_SIZE = { width: 1024, height: 576 };

const SAVE_FILE = () => path.join(app.getPath('userData'), 'saves.json');

/** Whole-store read. The save set is a handful of KB, so this stays simple. */
function readStore() {
  try {
    return JSON.parse(fs.readFileSync(SAVE_FILE(), 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(data) {
  const file = SAVE_FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write-then-rename so a crash mid-write cannot truncate an existing save.
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), 'utf8');
  fs.renameSync(tmp, file);
}

/**
 * Synchronous whole-store fetch, used once by the preload to seed its cache.
 * `sendSync` needs `ipcMain.on` with `returnValue` — `handle` is async only.
 */
ipcMain.on('store:all', (e) => {
  e.returnValue = readStore();
});

ipcMain.handle('store:get', (_e, key) => readStore()[key] ?? null);

ipcMain.handle('store:set', (_e, key, value) => {
  const data = readStore();
  data[key] = value;
  writeStore(data);
});

ipcMain.handle('store:remove', (_e, key) => {
  const data = readStore();
  delete data[key];
  writeStore(data);
});

ipcMain.handle('store:path', () => SAVE_FILE());

function createWindow() {
  const win = new BrowserWindow({
    ...DEFAULT_SIZE,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    backgroundColor: '#1a120c',
    title: 'Lancet & Linen',
    // Avoid a white flash before the first frame.
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.removeMenu();

  // External links open in the real browser, never in the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Before the window, so the overlay hooks the renderer's GL context.
  steam.init();
  steam.registerIpc(ipcMain);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // macOS convention is to stay resident, but a single-window game has no
  // reason to; quitting everywhere keeps the Steam overlay's state honest.
  app.quit();
});
