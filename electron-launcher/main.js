'use strict'

const electron = require('electron')
const {app, BrowserWindow, Menu, dialog, shell, session} = electron

const isUrl = require('is-url-superb')

const args = process.argv.slice(2)
console.log(args)

let inputUrl = args[0]

let gameTitle
let icon
let p = args.indexOf('--name')
if (p !== -1 && args[p + 1]) {
  gameTitle = args[p + 1]
  app.setName(gameTitle)
} else {
  app.setName('lutris-web-runner')
}
p = args.indexOf('--icon')
if (p !== -1 && args[p + 1]) {
  icon = args[p + 1]
}

const appMenu = Menu.buildFromTemplate(require('./menu'))

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  if (!inputUrl) {
    dialog.showErrorBox('No input url', '')
    app.quit()
    return
  }
  let windowSize = ''
  let p = args.indexOf('--window-size')
  if (p !== -1) {
    windowSize = args[p + 1] || 'x'
  }

  windowSize = windowSize.split('x')
  windowSize.length = 2
  windowSize = windowSize.map((n) => parseInt(n, 10) || 0)

  for (let i = 0; i < args.length; ++i) {
    if (args[i] === '--set-cookie' && args[i + 1]) {
      const sep = args[i + 1].indexOf('=')
      const cookie = {
        url: inputUrl,
        name: args[i + 1].slice(0, sep),
        value: args[i + 1].slice(sep + 1)
      }
      session.defaultSession.cookies.set(cookie)
    }
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false, // very important!
      plugins: true,
      allowDisplayingInsecureContent: true
    },
    title: gameTitle || 'Lutris Web Runner',
    width: windowSize[0] || 800,
    height: windowSize[1] || 600,
    useContentSize: true,
    center: true,
    autoHideMenuBar: true,
    show: false,
    icon: icon,
    resizable: !args.includes('--disable-resizing'),
    backgroundColor: '#000000',
    frame: !args.includes('--frameless')
  })

  if (!isUrl(inputUrl) && !inputUrl.startsWith('file://')) {
    inputUrl = 'file://' + inputUrl
  }
  mainWindow.loadURL(inputUrl)

  if (args.includes('--devtools')) {
    mainWindow.webContents.openDevTools()
  }

  if (args.includes('--disable-menu-bar')) {
    mainWindow.setMenu(null)
  }

  let execjs = []

  execjs.push(`
    document.body.style.userSelect = "none"
    document.body.style.webkitUserSelect = "none"
  `)
  if (args.includes('--disable-scrolling')) {
    execjs.push('document.documentElement.style.overflow = "hidden"')
    execjs.push('document.body.style.overflow = "hidden"')
  }
  if (args.includes('--hide-cursor')) {
    execjs.push('document.body.style.cursor = "none"')
  }
  if (args.includes('--remove-margin')) {
    execjs.push(`
      document.documentElement.style.margin = '0'
      document.body.style.margin = '0'
      document.documentElement.style.padding = '0'
      document.body.style.padding = '0'
    `)
  }

  execjs = execjs.join(';\n')

  mainWindow.once('ready-to-show', () => {
    mainWindow.webContents.executeJavaScript(execjs, false)

    p = args.indexOf('--execjs')
    if (p !== -1 && args[p + 1]) {
      mainWindow.webContents.executeJavaScript(args[p + 1], true)
    }

    p = args.indexOf('--zoom-factor')
    if (p !== -1) {
      mainWindow.webContents.setZoomFactor(parseFloat(args[p + 1]))
    }

    // this has to be before fullscreen, so when the user exits fullscreen, window is still maximized
    if (args.includes('--maximize-window') && !args.includes('--disable-resizing')) {
      mainWindow.maximize()
    }

    if (args.includes('--fullscreen', 2) && !args.includes('--disable-resizing')) {
      mainWindow.setFullScreen(true)
    }

    p = args.indexOf('--injectcss')
    if (p !== -1 && args[p + 1]) {
      mainWindow.webContents.insertCSS(args[p + 1])
    }

    mainWindow.show()
  })

  mainWindow.webContents.once('did-fail-load', (e, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame) return
    dialog.showErrorBox('Failed to load url', validatedUrl + '\n\n' + errorCode + ' ' + errorDescription)
    app.quit()
  })

  mainWindow.webContents.on('will-navigate', handleRedirect)
  mainWindow.webContents.on('new-window', handleRedirect)

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function handleRedirect (e, url) {
  if (url !== mainWindow.webContents.getURL() && !args.includes('--open-links')) {
    e.preventDefault()
    console.log('Opening url ' + url + ' in external browser')
    shell.openExternal(url)
  }
}

Menu.setApplicationMenu(appMenu)

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit()
})
