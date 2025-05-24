// Simple test script to verify slash command functionality
// Run this in the browser console on http://localhost:3000/test-editor

function testSlashCommand() {
  console.log('Testing Slash Command Functionality...');

  // Wait for the editor to load
  setTimeout(() => {
    const contentEditable = document.querySelector(
      '.editor [contenteditable="true"]',
    );

    if (!contentEditable) {
      console.error('❌ ContentEditable element not found');
      return;
    }

    console.log('✅ ContentEditable element found');

    // Focus the editor
    contentEditable.focus();

    // Create and dispatch a keyboard event to type "/"
    const event = new KeyboardEvent('keydown', {
      key: '/',
      code: 'Slash',
      keyCode: 191,
      which: 191,
      bubbles: true,
      cancelable: true,
    });

    contentEditable.dispatchEvent(event);

    // Add the "/" character to the content
    const textEvent = new InputEvent('input', {
      data: '/',
      inputType: 'insertText',
      bubbles: true,
      cancelable: true,
    });

    contentEditable.textContent = '/';
    contentEditable.dispatchEvent(textEvent);

    // Check if the typeahead menu appears
    setTimeout(() => {
      const typeaheadMenu = document.querySelector('.typeahead-popover');
      const componentPickerMenu = document.querySelector(
        '.component-picker-menu',
      );

      if (typeaheadMenu || componentPickerMenu) {
        console.log('✅ Slash command menu appeared!');
        console.log('Menu element:', typeaheadMenu || componentPickerMenu);

        // Check for menu items
        const menuItems = document.querySelectorAll(
          '.typeahead-popover li, .component-picker-menu li',
        );
        console.log(`✅ Found ${menuItems.length} menu items`);

        if (menuItems.length > 0) {
          console.log('Available options:');
          menuItems.forEach((item, index) => {
            const text =
              item.querySelector('.text')?.textContent || item.textContent;
            console.log(`  ${index + 1}. ${text.trim()}`);
          });
        }
      } else {
        console.error('❌ Slash command menu did not appear');
        console.log('Available elements:', {
          typeaheadPopover: document.querySelectorAll('.typeahead-popover'),
          componentPickerMenu: document.querySelectorAll(
            '.component-picker-menu',
          ),
          allMenus: document.querySelectorAll('[class*="menu"]'),
          allPopovers: document.querySelectorAll('[class*="popover"]'),
        });
      }
    }, 500);
  }, 1000);
}

// Auto-run the test
testSlashCommand();

console.log(`
📋 Manual Testing Instructions:
1. Visit http://localhost:3000/test-editor
2. Click in the editor
3. Type "/" (forward slash)
4. You should see a dropdown menu with options like:
   - Paragraph
   - Heading 1, 2, 3
   - Table
   - Numbered List
   - Bulleted List
   - Quote
   - Code
   - etc.

If the menu appears, the slash command is working correctly! ✅
`);
