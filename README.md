# Vector Font Editor
A simple, online vector font editor, made because I'm mad this doesn't already exist.

# Usage
Visit https://aadenboy.github.io/vector-font-editor/ to start.

## Select tab
The Select tab is where you'll find all the Unicode characters. Click on any character to begin editing it. 
* The dropdown at the top allows you to choose any Unicode block.
* * By default, all glyphs are shown, but this can be changed to show only defined and undefined glyphs with the radio buttons below the dropdown.

## Edit tab
The Edit tab allows editing defined glyphs.
* Clicking New Stroke (or N, Enter, or Space) will create a new stroke, after which you click to place new points and click the now Finish Stroke button (or Enter, Escape, or Space) to complete the stroke.
* Clicking an existing stroke allows you to drag its points or delete it with the Delete Stroke button (or by pressing Backspace or Delete).
* The Grid Size slider controls the amount of steps on the grid, which allows up to 1/8th of a unit.
* The X and Y sliders control the X and Y position of the editor's camera.
* Advance is how many units to advance the next character by (or the kerning). By default, this is the set width of your font.
* The blue dashed lines denote the left and bottom-most sides of the glyph. The black dashed lines denote the defined top and right of all glyphs. The right-most blue dashed line is one less of the advance line, denoted with a red dashed line.

## Preview tab
The Preview tab allows previewing your glyphs. Typing in the text field will render all text, optionally with a size set by the Font Size slider.

## Metadata tab
The Metadata tab controls the settings of the font.
* Font Name is the name of the font itself.
* Width and Height control the default width and height of all glyphs.
* Thickness controls the thickness of the lines.
* Unit and Units per Em control the sizing of the font. Admittedly, I have no idea how either work when together, and you may need to fumble around with both for a bit.
* Ascender and Descender control how many units are dedicated to the ascending and descending portion of the font.

## Import/Export tab
Importing and exporting a project file uses the JSON that the font is encoded as. To actually export a usable font, click the Export OTF File button.

# Credits
* [Joël Galeran](https://github.com/Jolg42) for [opentype.js](https://github.com/opentypejs/opentype.js)
* [Tim Branyen](https://github.com/tbranyen) for [hyperlist](https://github.com/tbranyen/hyperlist)
* [Christopher Brown](https://github.com/chbrown) for the Unicode data JSONs found in [unidata](https://github.com/chbrown/unidata)
