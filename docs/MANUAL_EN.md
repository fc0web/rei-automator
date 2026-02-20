# Rei Automator v0.4.0 User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Interface Overview](#interface-overview)
4. [Getting Started](#getting-started)
5. [Command Reference](#command-reference)
6. [Image Recognition & OCR](#image-recognition--ocr)
7. [Japanese-to-Code Conversion](#japanese-to-code-conversion)
8. [Scheduled Execution](#scheduled-execution)
9. [Error Handling](#error-handling)
10. [Debugging](#debugging)
11. [Script Management](#script-management)
12. [Settings](#settings)
13. [Troubleshooting](#troubleshooting)
14. [License](#license)

---

## Introduction

Rei Automator is a lightweight PC automation tool for Windows, built on the philosophy of the Rei programming language. It allows you to automate mouse operations, keyboard input, image recognition, and OCR using simple, readable Rei code.

Rei Automator follows a three-layer approach: **natural language input → readable Rei code → execution with user confirmation**. You always see and approve what the tool will do before it runs.

### System Requirements

- OS: Windows 10 / Windows 11 (64-bit)
- Memory: 4GB or more recommended
- Disk: Approximately 200MB

---

## Installation

### Portable Version (Recommended)

1. Download `ReiAutomator-0.4.0-portable.exe` from [GitHub Releases](https://github.com/fc0web/rei-automator/releases/tag/v0.4.0)
2. Place it in any folder
3. Double-click to run

No installation required. You can even carry it on a USB drive.

### Installer Version

1. Download `Rei Automator Setup 0.4.0.exe` from [GitHub Releases](https://github.com/fc0web/rei-automator/releases/tag/v0.4.0)
2. Run the installer
3. Choose your installation directory and click "Install"
4. Launch from the desktop shortcut or Start Menu

### First Launch Note

Since the application is not code-signed, Windows SmartScreen may show a warning. Click "More info" → "Run anyway". This is common for independently developed software and is safe to use.

---

## Interface Overview

Rei Automator's interface consists of the following elements.

### Toolbar

The button bar at the top of the window.

- 📷 **Capture** — Take a screenshot to create templates for image recognition
- 🎯 **Pick Coordinates** — Click on the screen to get coordinates
- 📂 **Open** — Load a .rei script file
- 💾 **Save** — Save the current code as a .rei file
- 📥 **Import** — Import scripts
- 📤 **Export** — Export scripts

### Japanese Input Panel

Enter instructions in Japanese, click "Generate Code", and the corresponding Rei code will be automatically generated.

### Code Editor

The main area where you write and edit Rei code. You can also review and modify auto-generated code here.

### Sidebar

The left sidebar manages your script collection. Switch between multiple scripts easily.

### Bottom Tab Panel

- **Log** — Displays runtime log messages
- **Variables** — Shows current variables and their values
- **Errors** — Displays parse errors and runtime errors
- **History** — Shows past execution records

### Execution Controls

- ▶ **Run** — Execute the script
- ⏹ **Stop** — Abort execution
- ⏸ **Pause** — Pause execution (press again to resume)
- **ESC key** — Emergency stop from anywhere

---

## Getting Started

### Write and Run a Script

1. Type Rei code in the code editor
2. Click the ▶ **Run** button
3. The script executes line by line from top to bottom
4. Monitor progress in the Log tab
5. Press ⏹ **Stop** or the **ESC key** to abort

### Simple Example

```
// Click a window and type some text
click(500, 400)
wait(1s)
type("Hello from Rei Automator!")
```

### Save and Load Scripts

- Click 💾 **Save** → specify a filename to save as a .rei file
- Click 📂 **Open** → load a previously saved .rei file

---

## Command Reference

### Mouse Commands

| Command | Description | Example |
|---------|-------------|---------|
| `click(x, y)` | Left-click at coordinates | `click(500, 400)` |
| `dblclick(x, y)` | Double-click at coordinates | `dblclick(100, 200)` |
| `rightclick(x, y)` | Right-click at coordinates | `rightclick(300, 150)` |
| `move(x, y)` | Move the mouse cursor | `move(600, 300)` |
| `drag(x1, y1, x2, y2)` | Drag from one point to another | `drag(100, 100, 500, 500)` |

### Keyboard Commands

| Command | Description | Example |
|---------|-------------|---------|
| `type("text")` | Type text | `type("Hello World")` |
| `key("keyname")` | Press a special key | `key("Enter")` |
| `shortcut("modifier+key")` | Press a keyboard shortcut | `shortcut("Ctrl+S")` |

#### Available Special Keys

Enter, Tab, Escape, Backspace, Delete, Space, Up, Down, Left, Right, Home, End, PageUp, PageDown, F1–F12

#### Shortcut Examples

```
shortcut("Ctrl+C")       // Copy
shortcut("Ctrl+V")       // Paste
shortcut("Ctrl+Z")       // Undo
shortcut("Ctrl+S")       // Save
shortcut("Alt+F4")        // Close window
shortcut("Ctrl+Shift+N")  // Multiple modifiers
```

### Wait

| Command | Description | Example |
|---------|-------------|---------|
| `wait(Ns)` | Wait N seconds | `wait(3s)` |
| `wait(Nms)` | Wait N milliseconds | `wait(500ms)` |
| `wait(Nm)` | Wait N minutes | `wait(1m)` |

### Loops

```
// Repeat 5 times
loop(5):
  click(100, 200)
  wait(1s)

// Infinite loop (press ESC to stop)
loop:
  click(300, 400)
  wait(2s)
```

Commands inside a loop are indicated by **indentation (2 spaces)**.

### Variables

```
// Set a variable
set count = 5
set message = "Hello"

// Declare as a parameter (use at the top of a script)
param targetX = 500
param targetY = 400

// Use variables
click(targetX, targetY)
type(message)
```

### Comments

```
// This is a comment (not executed)
click(500, 400)  // End-of-line comment
```

---

## Image Recognition & OCR

### Template Matching (Image Recognition)

Search for an image on the screen and automatically find its location. Since no hardcoded coordinates are needed, scripts work even when windows are repositioned.

#### Preparing Template Images

1. Click the 📷 **Capture** button
2. Select the area you want to recognize (buttons, icons, etc.)
3. Assign a template name and save

#### Image Recognition Commands

| Command | Description | Example |
|---------|-------------|---------|
| `find("template")` | Search for a template on screen | `find("login-button")` |
| `click(found)` | Click the last found location | `click(found)` |
| `find_click("template")` | Find and click in one step | `find_click("ok-button")` |
| `wait_find("template", timeout)` | Wait until found | `wait_find("signal", 30000)` |

#### Example: Click a Button When It Appears

```
// Wait up to 30 seconds for the "confirm" button
wait_find("confirm-button", 30000)
// Click when found
click(found)
wait(1s)
```

#### Example: Monitor a Trading Signal

```
// Continuously monitor the screen
loop:
  find("buy-signal")
  click(found)
  wait(5s)
```

### OCR (Optical Character Recognition)

Powered by Tesseract.js, Rei Automator can read text from the screen. Useful for monitoring values, verifying displayed text, and conditional automation.

---

## Japanese-to-Code Conversion

The Japanese input panel converts natural Japanese instructions into Rei code.

### Input Examples

| Japanese Input | Generated Rei Code |
|----------------|-------------------|
| 座標(500,400)をクリック | `click(500, 400)` |
| 3秒待つ | `wait(3s)` |
| "こんにちは"と入力 | `type("こんにちは")` |
| Enterキーを押す | `key("Enter")` |
| Ctrl+Sを押す | `shortcut("Ctrl+S")` |
| 5回繰り返す | `loop(5):` |

Generated code is inserted into the code editor. Always review and modify before executing.

---

## Scheduled Execution

Run scripts automatically at specified times or intervals.

### Schedule Types

| Type | Description | Example |
|------|-------------|---------|
| **once** | Run once | "Run at 3:00 PM today" |
| **interval** | Repeat at intervals | "Run every 5 minutes" |
| **daily** | Run daily at a set time | "Run every day at 9:00 AM" |
| **weekly** | Run on specific weekdays | "Run every Monday at 9:00 AM" |

### Setting Up a Schedule

1. Open the schedule panel from the UI
2. Select the script to execute
3. Choose the schedule type and configure the timing
4. Click "Create"

Schedules are active only while the app is running. Settings are saved across app restarts.

---

## Error Handling

Choose how the script behaves when an error occurs during execution.

| Policy | Behavior |
|--------|----------|
| **stop** | Stop the script immediately when an error occurs |
| **skip** | Skip the failed command and continue to the next one |
| **retry** | Retry the failed command |

Select a policy from the dropdown menu in the UI before running your script.

---

## Debugging

### Step Execution

1. Enable the "Step Execution" checkbox
2. Click ▶ **Run**
3. Execution pauses after each line
4. Click "Next" to advance to the next command
5. Click "Continue" to switch to normal execution

### Variable Panel

View the current values of all variables defined with `set` or `param` in real time.

### Error List

If there are parse errors in your code, the Errors tab displays the line number and error message.

---

## Script Management

### Sidebar

Manage multiple scripts using the left sidebar.

- **New** — Create an empty script
- **Switch** — Click a script to switch to it
- **Delete** — Remove unwanted scripts

### Import/Export

- 📥 **Import** — Add external .rei files to your script collection
- 📤 **Export** — Save a script as a .rei file for sharing

---

## Settings

### Language

Choose from 9 languages. Switching the language immediately translates the entire UI. The setting persists across restarts.

Supported languages: English, 日本語, 中文（简体）, 한국어, Deutsch, Español, Français, Português, Русский

### Settings File Location

```
C:\Users\<username>\AppData\Roaming\rei-automator\settings.json
```

---

## Troubleshooting

### App Won't Start

- Verify you are running Windows 10 / 11 (64-bit)
- If SmartScreen shows a warning, click "More info" → "Run anyway"
- If your antivirus blocks the app, add it as an exception

### Clicks Land in the Wrong Position

- Display scaling other than 100% may cause coordinate offsets
- Check: Windows Settings → Display → Scale and layout
- Consider using image recognition (`find` / `find_click`) to avoid coordinate issues entirely

### Image Recognition Can't Find the Template

- Ensure the template image matches the current screen appearance
- Changes in resolution or Windows theme may affect recognition
- Try recreating the template

### ESC Doesn't Stop Execution

- Another application may be capturing the ESC key
- Use Task Manager (Ctrl+Shift+Esc) to force-close Rei Automator

### Japanese Text Input Issues

- The `type()` command supports Japanese text
- Ensure your IME is active

---

## License

Rei Automator uses a dual license.

- ✅ **Personal use** — Free
- ✅ **Non-profit organizations** — Free
- ✅ **Education and research** — Free
- 💼 **Commercial use** — License required

For commercial licensing inquiries, please contact:

- GitHub Issues: https://github.com/fc0web/rei-automator/issues
- note: https://note.com/nifty_godwit2635
- Email: fc2webb@gmail.com

---

## Links

- Download: https://github.com/fc0web/rei-automator/releases/tag/v0.4.0
- Source Code: https://github.com/fc0web/rei-automator
- Rei Language: https://github.com/fc0web/rei-lang

---

*Powered by Rei Language — Describing the world through center-periphery patterns*

*Copyright 2024-2026 Nobuki Fujimoto*
