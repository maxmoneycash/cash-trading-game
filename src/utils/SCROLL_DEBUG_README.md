# Scroll Debugging Guide

This guide explains how to use the scroll debugging features to verify scrolling works properly without visible scrollbars.

## Features

### 1. **Hidden Scrollbars**
- All scrollbars are hidden globally using CSS
- Scrolling functionality is preserved
- Works on all browsers (Chrome, Firefox, Safari, Edge)

### 2. **Debug Mode**
- Press `Ctrl+D` (or `Cmd+D` on Mac) when the modal is open to toggle debug mode
- Shows a green "DEBUG MODE ON" indicator in the top-right of the modal

### 3. **Visual Scroll Indicators**
- When scrolling any tab, a red indicator appears showing:
  - Which tab is scrolling (Leaderboard, Account, or Controls)
  - Current scroll position in pixels
  - Auto-hides after 1 second

### 4. **Console Debugging**
When debug mode is ON, you can use these console commands:

```javascript
// Show info about all scrollable elements
window.scrollTest.info()

// Test scrolling on all elements (scrolls 100px down)
window.scrollTest.testAll()
```

### 5. **Detailed Scroll Logs**
Every scroll event logs detailed information to the console:
- Element dimensions (scrollHeight vs clientHeight)
- Scroll capability (can it scroll vertically/horizontally?)
- Current scroll position and percentage
- Visual progress bar

## Testing Checklist

### Desktop:
1. Open modal and press `Ctrl+D` to enable debug mode
2. Try scrolling with mouse wheel on each tab
3. Check console for scroll events
4. Verify no scrollbars are visible
5. Run `window.scrollTest.info()` to check scroll capability

### Mobile:
1. Open modal and look for touch scrolling
2. Swipe up/down on content
3. Check that scrolling is smooth (-webkit-overflow-scrolling: touch)
4. Verify no scrollbars appear
5. Check horizontal scrolling on tables (should work without scrollbars)

## CSS Classes

- `.hide-scrollbar` - Applied to all scrollable containers
- `.scroll-debug` - The red debug indicator class

## Troubleshooting

If scrolling doesn't work:
1. Check console for errors
2. Run `window.scrollTest.info()` to see if elements can scroll
3. Verify `overflow: auto` is set on containers
4. Check that content height exceeds container height
5. Make sure `-webkit-overflow-scrolling: touch` is set for mobile

## Implementation Details

Scrollbars are hidden using:
```css
/* Hide scrollbars but keep functionality */
.hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}

.hide-scrollbar::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
}
``` 
