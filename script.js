let fontData = {
    name: "Unnamed font",
    width: 3,
    height: 7,
    thickness: 30,
    unit: 200,
    unitsPerEm: 1000,
    ascender: 0,
    descender: 2,
    glyphs: {
        ".notdef": {advance: 3, data: [
            [0, 0, 0, 6, 2, 6, 2, 0, 0, 0],
            [0, 0, 2, 6],
            [0, 6, 2, 0]
        ]},
    }
};
let selectedGlyph;
let unsaved = false;

function drawOTGlyph(name, gdata) {
    let thickness = fontData.thickness;
    let unit = fontData.unit;
    const path = new opentype.Path();
    gdata.data.forEach((stroke) => {
        for (let i = 2; i < stroke.length; i += 2) {
            const topoint = { x: stroke[i - 2], y: stroke[i - 1] };
            const frompoint = { x: stroke[i], y: stroke[i + 1] };
            const to = { x: topoint.x * unit, y: topoint.y * unit };
            const from = { x: frompoint.x * unit, y: frompoint.y * unit };
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const offfront = { x: Math.cos(angle) * thickness, y: Math.sin(angle) * thickness }
            const left = angle + Math.PI / 2;
            const offleft = { x: Math.cos(left) * thickness, y: Math.sin(left) * thickness }
            const right = angle - Math.PI / 2;
            const offright = { x: Math.cos(right) * thickness, y: Math.sin(right) * thickness }
            path.moveTo(from.x + offleft.x, from.y + offleft.y);
            path.lineTo(to.x + offleft.x, to.y + offleft.y);
            path.curveTo(
                to.x + offleft.x + offfront.x * 1.2,
                to.y + offleft.y + offfront.y * 1.2,
                to.x + offright.x + offfront.x * 1.2,
                to.y + offright.y + offfront.y * 1.2,
                to.x + offright.x,
                to.y + offright.y
            )
            path.lineTo(from.x + offright.x, from.y + offright.y)
            path.curveTo(
                from.x + offright.x - offfront.x * 1.2,
                from.y + offright.y - offfront.y * 1.2,
                from.x + offleft.x - offfront.x * 1.2,
                from.y + offleft.y - offfront.y * 1.2,
                from.x + offleft.x,
                from.y + offleft.y
            )
        }
    });
    const glyph = new opentype.Glyph({
        name: name,
        unicode: name.codePointAt(0),
        advanceWidth: unit * gdata.advance,
        path: path
    });
    return glyph;
}
function drawSVGGlyph(svg, gdata, scale, x, y) {
    let thickness = fontData.thickness * (scale / fontData.unit);
    let unit = scale;
    gdata.data.forEach((stroke, i) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let d = ""
        for (let i = 2; i < stroke.length; i += 2) {
            const topoint = { x: stroke[i - 2], y: stroke[i - 1] };
            const frompoint = { x: stroke[i], y: stroke[i + 1] };
            const to = { x: topoint.x * unit, y: topoint.y * unit };
            const from = { x: frompoint.x * unit, y: frompoint.y * unit };
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const offfront = { x: Math.cos(angle) * thickness, y: Math.sin(angle) * thickness }
            const left = angle + Math.PI / 2;
            const offleft = { x: Math.cos(left) * thickness, y: Math.sin(left) * thickness }
            const right = angle - Math.PI / 2;
            const offright = { x: Math.cos(right) * thickness, y: Math.sin(right) * thickness }
            const dx = x - (fontData.width - 1) * unit / 2
            const dy = y + (fontData.height - 1) * unit / 2
            d = d + `M ${dx + from.x + offleft.x} ${dy-(from.y + offleft.y)}
            L ${dx + to.x + offleft.x} ${dy-(to.y + offleft.y)}
            C ${dx + to.x + offleft.x + offfront.x * 1.2}
              ${dy-(to.y + offleft.y + offfront.y * 1.2)}
              ${dx + to.x + offright.x + offfront.x * 1.2}
              ${dy-(to.y + offright.y + offfront.y * 1.2)}
              ${dx + to.x + offright.x}
              ${dy-(to.y + offright.y)}
            L ${dx + from.x + offright.x} ${dy-(from.y + offright.y)}
            C ${dx + from.x + offright.x - offfront.x * 1.2}
              ${dy-(from.y + offright.y - offfront.y * 1.2)}
              ${dx + from.x + offleft.x - offfront.x * 1.2}
              ${dy-(from.y + offleft.y - offfront.y * 1.2)}
              ${dx + from.x + offleft.x}
              ${dy-(from.y + offleft.y)}`
        }
        path.setAttribute("d", d);
        path.setAttribute("fill", "black");
        path.setAttribute("data-stroke-index", i)
        svg.appendChild(path);
    });
    return svg;
}

function generatefont() {
    const glyphs = [];
    Object.keys(fontData.glyphs).forEach((glyph) => {
        glyphs.push(drawOTGlyph(glyph, fontData.glyphs[glyph]));
    });

    let unit = fontData.unit;
    const font = new opentype.Font({
        familyName: fontData.name,
        styleName: "Medium",
        unitsPerEm: fontData.unitsPerEm,
        ascender: (fontData.ascender + fontData.height - 1) * unit,
        descender: (fontData.descender * -1) * unit,
        glyphs: glyphs
    });

    // const href = window.URL.createObjectURL(new Blob([font.toArrayBuffer()]), {type: "font/opentype"});
    // console.log(href);

    return font;
}

function draw(canvas, text, x, y, size, clear) {
    const ctx = canvas.getContext("2d");

    if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
    font.draw(ctx, text, x, y, size)
}
function regulardraw(canvas, text, x, y, size, clear) {
    const ctx = canvas.getContext("2d");

    if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = size + 'px serif';
    ctx.fillStyle = "#0007";
    ctx.fillText(text, x, y);
}

function switchtab(tab) {
    document.querySelector(".tab.active").classList.remove("active");
    document.querySelector("#" + tab + "-tab").classList.add("active");
    document.querySelector(".menu.active").classList.remove("active");
    document.querySelector("#" + tab + "-menu").classList.add("active");
    if (tab == "edit") {
        editor.x = (fontData.width - 1) / 2;
        editor.y = (fontData.height - 1) / 2;
        render();
    } else if (tab == "select") {
        loadglyphs();
    } else if (tab == "preview") {
        rendertext();
    } else if (tab == "metadata") {
        metadatafn.value = fontData.name;
        metadataw.value = fontData.width;
        metadatah.value = fontData.height;
        metadatath.value = fontData.thickness;
        metadatau.value = fontData.unit;
        metadataupm.value = fontData.unitsPerEm;
        metadataasc.value = fontData.ascender;
    }
}
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        switchtab(tab.id.slice(0, -4));
    });
})

// blocks
const selectfilter = document.getElementById("filter-block");
blocks.forEach((uniblock, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.innerHTML = uniblock.blockName;
    selectfilter.appendChild(option);
});

const selectglyphs = document.getElementById("select-glyphs");
function loadglyphs() {
    const filter = document.querySelector('input[name="filter-type"]:checked');
    const block = blocks[selectfilter.value];
    let glyphs = [];
    for (let i = block.startCode; i <= block.endCode; i++) {
        const character = i == 0 ? ".notdef" : String.fromCodePoint(i);
        if (filter.value == "all" || (filter.value == "defined" && fontData.glyphs[character]) || (filter.value == "undefined" && !fontData.glyphs[character])) {
            glyphs.push(i == 0 ? ".notdef" : i);
        }
    }

    const perrow = Math.floor((selectglyphs.clientWidth + 5) / 117);
    const renderSingleItem = (li) => {
        const index = glyphs[li];
        if (!index) return;
        const character = index == ".notdef" ? ".notdef" : String.fromCodePoint(index);
        const glyph = document.createElement("div");
        glyph.classList.add("glyph");

        const glyphlabel = document.createElement("span");
        glyphlabel.classList.add("glyph-name");

        if (characters[index]) {
            glyphlabel.innerHTML = characters[index].name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        } else if (index == ".notdef") {
            glyphlabel.innerHTML = ".notdef";
        } else {
            glyphlabel.innerHTML = "U+" + (index).toString(16).toUpperCase();
        }

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("glyph-preview");
        svg.setAttribute("width", "100px");
        svg.setAttribute("height", "100px");
        svg.setAttribute("viewBox", "0 0 100 100");
        if (fontData.glyphs[character]) {
            svg = drawSVGGlyph(svg, fontData.glyphs[character], 25 / fontData.width, 50, 50)
        } else {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", "50%");
            text.setAttribute("y", "50%");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "central");
            text.setAttribute("font-size", (fontData.width - 1) * (60 / fontData.width) + "px");
            text.setAttribute("fill", "#0005")
            text.innerHTML = character;
            svg.appendChild(text);
        }

        glyph.appendChild(svg);
        glyph.appendChild(glyphlabel);

        glyph.addEventListener("click", () => {
            selectedGlyph = character;
            switchtab("edit");
        })

        return glyph;
    };
    const renderItem = (li) => {
        const row = document.createElement("div");
        row.classList.add("glyph-row");
        for (let i = 0; i < perrow; i++) {
            const glyph = renderSingleItem(li * perrow + i);
            if (glyph) row.appendChild(glyph);
        }
        return row;
    }

    document.getElementById("select-glyphs-vscroll").remove();
    const selectglyphsvs = document.createElement("div")
    selectglyphsvs.id = "select-glyphs-vscroll";
    new HyperList(selectglyphsvs, {
        itemHeight: 145,
        total: Math.ceil(glyphs.length / perrow),
        generate: renderItem,
        buffer: 5
    })
    selectglyphs.appendChild(selectglyphsvs);
}
loadglyphs();

selectfilter.addEventListener("input", loadglyphs);
document.getElementById("filter-type-all").addEventListener("input", loadglyphs);
document.getElementById("filter-type-defined").addEventListener("input", loadglyphs);
document.getElementById("filter-type-undefined").addEventListener("input", loadglyphs);
window.addEventListener("resize, orientationchange", loadglyphs)

// edit page
const edittab = document.getElementById("edit-tab");
const editsvg = document.getElementById("edit-svg");
const edittitle = document.getElementById("edit-glyph");
const editunit = document.getElementById("edit-unit-size");
const editx = document.getElementById("edit-x");
const edity = document.getElementById("edit-y");
const editadvance = document.getElementById("edit-advance");
const editnew = document.getElementById("edit-new-stroke");
const editdelete = document.getElementById("edit-delete-stroke");

let editor = {
    unit: 1,
    x: 0,
    y: 0,
    scale: 1,
    units: {x: 0, y: 0, rel: 0},
    pos: (x, y) => {
        return {x: editsvg.clientWidth / 2 + x * editor.scale - editor.x * editor.scale,
                y: editsvg.clientHeight / 2 - (y * editor.scale - editor.y * editor.scale)};
    },
    rel: (x, y) => {
        return {x: editor.x + Math.round((x - editsvg.clientWidth / 2) / editor.units.rel) / (2**(editor.unit-1)),
                y: editor.y - Math.round((y - editsvg.clientHeight / 2) / editor.units.rel) / (2**(editor.unit-1))};
    },
    mouselast: {x: 0, y: 0},
    selected: -1,
    point: -1,
    mode: "select" // "move", "add"
}

function render() {
    editsvg.innerHTML = "";
    if (!selectedGlyph) {
        edittitle.innerHTML = "Select a glyph in the Select menu to start!";
        return;
    };
    if (!fontData.glyphs[selectedGlyph]) {
        fontData.glyphs[selectedGlyph] = {
            advance: 3,
            data: []
        };
        unsaved = true;
    }
    const index = selectedGlyph.codePointAt(0);
    if (selectedGlyph == ".notdef") {
        edittitle.innerHTML = ".notdef";
    } else if (characters[index]) {
        edittitle.innerHTML = characters[index].name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + " — U+" + (index).toString(16).toUpperCase();
    } else {
        edittitle.innerHTML = "U+" + (index).toString(16).toUpperCase();
    }
    
    editor.scale = Math.min(editsvg.clientWidth / (fontData.width - 1), editsvg.clientHeight / (fontData.height - 1)) * 0.65
    editor.units.x = Math.ceil(editsvg.clientWidth / editor.scale);
    editor.units.y = Math.ceil(editsvg.clientHeight / editor.scale);
    const pos1 = editor.pos(0, 0);
    const pos2 = editor.pos(1, 0);
    editor.units.rel = (pos2.x - pos1.x) / (2**(editor.unit-1));
    drawPath();
    drawGrid();
    editadvance.value = fontData.glyphs[selectedGlyph].advance;
    editadvance.setAttribute("step", 1 / (2**(editor.unit - 1)));
}

function drawPath() {
    editsvg.querySelectorAll(".glyph-path, .path-point, .path-line").forEach((path) => {
        path.remove();
    });
    const glyph = fontData.glyphs[selectedGlyph];
    const pos = editor.pos((fontData.width - 1) / 2, (fontData.height - 1) / 2);
    drawSVGGlyph(editsvg, glyph, editor.scale, pos.x, pos.y);

    editsvg.querySelectorAll("path").forEach((path) => {
        path.classList.add("glyph-path")
        if (path.getAttribute("data-stroke-index") == editor.selected) {
            ThePathFunctionTM(editsvg, path, glyph);
        }

        path.addEventListener("click", () => {
            if (editor.mode == "select") {
                editsvg.querySelectorAll(".path-point, .path-line").forEach((path) => {
                    path.remove();
                });
                if (path.classList.contains("select")) {
                    path.classList.remove("select");
                    editor.selected = -1;
                } else {
                    ThePathFunctionTM(editsvg, path, glyph);
                }
            }
        })
    })
}

function ThePathFunctionTM(editsvg, path, glyph) {
    editsvg.querySelectorAll("path.select").forEach((path) => {
        path.classList.remove("select");
    })
    const index = path.getAttribute("data-stroke-index");
    path.classList.add("select");
    editor.selected = index;

    const stroke = glyph.data[index];
    for (let i = 0; i < stroke.length; i = i + 2) {
        const to = {x: stroke[i],
                    y: stroke[i+1]};
        const pointto = editorcircle(to.x, to.y, 0.15);
        pointto.classList.add("path-point");
        if (editor.point == i) pointto.classList.add("select");
        editsvg.appendChild(pointto);
        if (i > 0) {
            const from = {x: stroke[i-2],
                          y: stroke[i-1]};
            const line = editorline(from.x, from.y, to.x, to.y)
            line.classList.add("path-line");
            editsvg.appendChild(line);
        }
        pointto.addEventListener("mousedown", () => {
            if (editor.mode == "select") {
                editor.mode = "move";
                editor.point = i;
                editsvg.classList.add("nohover");
            }
        });
    }
}
editsvg.addEventListener("mousemove", (event) => {
    const bound = editsvg.getBoundingClientRect();
    const mouse = editor.rel(event.clientX - bound.x, event.clientY - bound.y);
    if (mouse.x == editor.mouselast.x && mouse.y == editor.mouselast.y) return;
    editor.mouselast = mouse;
    if ((editor.mode == "move" || editor.mode == "add") && editor.selected != -1 && editor.point != -1) {
        const glyph = fontData.glyphs[selectedGlyph];
        const stroke = glyph.data[editor.selected];
        stroke[editor.point] = mouse.x;
        stroke[editor.point + 1] = mouse.y;
        unsaved = true;
        drawPath();
    }
});
editsvg.addEventListener("mouseup", () => {
    if (editor.mode == "move") {
        editor.mode = "select";
        editor.point = -1;
        unsaved = true;
        drawPath();
        editsvg.classList.remove("nohover");
    } else if (editor.mode == "add") {
        editor.point += 2;
        drawPath();
    }
});

function editorcircle(x, y, r) {
    const pos = editor.pos(x, y);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pos.x);
    circle.setAttribute("cy", pos.y);
    circle.setAttribute("r", r * editor.scale);
    return circle;
}
function editorline(x1, y1, x2, y2) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const from = editor.pos(x1, y1);
    const to = editor.pos(x2, y2);
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    return line
}
function drawGrid() {
    document.querySelectorAll("line.grid-line").forEach((line) => {
        line.remove();
    });
    const glyph = fontData.glyphs[selectedGlyph];
    const linesx = {};
    const linesy = {};

    // origin
    const linexo = editorline(0, editor.y - editor.units.y, 0, editor.y + editor.units.y);
    linexo.classList.add("grid-line-boundary", "grid-line")
    editsvg.insertBefore(linexo, editsvg.firstChild);
    const lineyo = editorline(editor.x - editor.units.x, 0, editor.x + editor.units.x, 0);
    lineyo.classList.add("grid-line-boundary", "grid-line")
    editsvg.insertBefore(lineyo, editsvg.firstChild);
    // advance
    const linead = editorline(glyph.advance - 1, editor.y - editor.units.y, glyph.advance - 1, editor.y + editor.units.y);
    linead.classList.add("grid-line-boundary", "grid-line")
    editsvg.insertBefore(linead, editsvg.firstChild);
    const lineadm = editorline(glyph.advance, editor.y - editor.units.y, glyph.advance, editor.y + editor.units.y);
    lineadm.classList.add("grid-line-x-advance", "grid-line")
    editsvg.insertBefore(lineadm, editsvg.firstChild);
    // border
    const linexb = editorline(fontData.width - 1, editor.y - editor.units.y, fontData.width - 1, editor.y + editor.units.y);
    linexb.classList.add("grid-line-boundary-suggestion", "grid-line")
    editsvg.insertBefore(linexb, editsvg.firstChild);
    const lineyb = editorline(editor.x - editor.units.x, fontData.height - 1, editor.x + editor.units.x, fontData.height - 1);
    lineyb.classList.add("grid-line-boundary-suggestion", "grid-line")
    editsvg.insertBefore(lineyb, editsvg.firstChild);
    
    for (let u = 0; u < editor.unit; u++) {
        for (let x = (editor.x - editor.units.x) * (2**u); x < (editor.x + editor.units.x) * (2**u); x++) {
            const nx = x / (2**u);
            if (linesx[nx]) continue;
            linesx[nx] = true;
            const line = editorline(nx, editor.y - editor.units.y, nx, editor.y + editor.units.y);
            line.setAttribute("stroke-opacity", 0.75 / (2**(u + 1)));
            line.setAttribute("stroke", "#000");
            line.setAttribute("stroke-width", 1);
            line.classList.add("grid-line")
            editsvg.insertBefore(line, editsvg.firstChild);
        }
        for (let y = (editor.y - editor.units.y) * (2**u); y < (editor.y + editor.units.y) * (2**u); y++) {
            const ny = y / (2**u);
            if (linesy[ny]) continue;
            linesy[ny] = true;
            const line = editorline(editor.x - editor.units.x, ny, editor.x + editor.units.x, ny);
            line.setAttribute("stroke-opacity", 0.75 / (2**(u + 1)));
            line.setAttribute("stroke", "#000");
            line.setAttribute("stroke-width", 1);
            line.classList.add("grid-line")
            editsvg.insertBefore(line, editsvg.firstChild);
        }
    }
}

editunit.addEventListener("input", () => {
    editor.unit = parseInt(editunit.value);
    editadvance.setAttribute("step", 1 / (2**(editor.unit - 1)));
    const pos1 = editor.pos(0, 0);
    const pos2 = editor.pos(1, 0);
    editor.units.rel = (pos2.x - pos1.x) / (2**(editor.unit-1));
    drawGrid();
})
editx.addEventListener("input", () => {
    editor.x = parseInt(editx.value) + (fontData.width - 1) / 2;
    drawGrid();
    drawPath();
})
edity.addEventListener("input", () => {
    editor.y = parseInt(edity.value) + (fontData.height - 1) / 2;
    drawGrid();
    drawPath();
})
editadvance.addEventListener("input", () => {
    if (!isNaN(parseFloat(editadvance.value))) {
        fontData.glyphs[selectedGlyph].advance = parseFloat(editadvance.value);
        unsaved = true;
        drawGrid();
    }
})
function newstroke() {
    const glyph = fontData.glyphs[selectedGlyph];
    if (editor.mode != "add") {
        editor.mode = "add";
        editor.selected = glyph.data.length;
        editor.point = 0;
        glyph.data.push([0, 0]);
        editsvg.classList.add("nohover");
        editnew.setAttribute("value", "Finish stroke");
        unsaved = true;
        drawPath();
    } else {
        glyph.data[editor.selected].splice(editor.point, 2);
        editor.mode = "select";
        editor.selected = -1;
        editor.point = -1;
        editnew.setAttribute("value", "New stroke");
        editsvg.classList.remove("nohover");
        unsaved = true;
        drawPath();
    }
}
editnew.addEventListener("click", newstroke);
function deletestroke() {
    if (editor.selected != -1) {
        editor.mode = "select";
        fontData.glyphs[selectedGlyph].data.splice(editor.selected, 1);
        unsaved = true;
        editor.selected = -1;
        editor.point = -1;
        drawPath();
    }
}
editdelete.addEventListener("click", deletestroke);
window.addEventListener("keydown", (event) => {
    if (!edittab.classList.contains("active")) return;
    if ((event.key == "n" && editor.mode != "add")
       || ((event.key == "Enter" || event.key == "Escape") && editor.mode == "add")
       || event.key == " ") {
        newstroke();
    }
    if (event.key == "Backspace" || event.key == "Delete") {
        deletestroke();
    }
})

// preview page
const previewsvg = document.getElementById("preview-svg");
const previewtext = document.getElementById("preview-text");
const previewsize = document.getElementById("preview-font-size");

function rendertext() {
    previewsvg.innerHTML = "";
    const text = previewtext.value;
    let x = 10 + (fontData.width - 1) / 2 * previewsize.value;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const glyph = fontData.glyphs[char] || fontData.glyphs[".notdef"];
        if (glyph) {
            drawSVGGlyph(previewsvg, glyph, previewsize.value, x, (fontData.height - 1) / 2 * previewsize.value + 10);
            x += glyph.advance * previewsize.value;
        }
    }
}
previewtext.addEventListener("input", rendertext);
previewsize.addEventListener("input", rendertext);

// metadata page
const metadatafn = document.getElementById("metadata-name");
const metadataw = document.getElementById("metadata-width");
const metadatah = document.getElementById("metadata-height");
const metadatath = document.getElementById("metadata-thickness");
const metadatau = document.getElementById("metadata-unit");
const metadataupm = document.getElementById("metadata-units-per-em");
const metadataasc = document.getElementById("metadata-ascender");
const metadatadsc = document.getElementById("metadata-descender");

metadatafn.addEventListener("input", () => {
    fontData.name = metadatafn.value;
    unsaved = true;
});
metadataw.addEventListener("input", () => {
    fontData.width = parseInt(metadataw.value) || 1;
    unsaved = true;
});
metadatah.addEventListener("input", () => {
    fontData.height = parseInt(metadatah.value) || 1;
    unsaved = true;
});
metadatath.addEventListener("input", () => {
    fontData.thickness = parseInt(metadatath.value) || 1;
    unsaved = true;
});
metadatau.addEventListener("input", () => {
    fontData.unit = parseInt(metadatau.value) || 1;
    unsaved = true;
});
metadataupm.addEventListener("input", () => {
    fontData.unitsPerEm = parseInt(metadataupm.value) || 1;
    unsaved = true;
});
metadataasc.addEventListener("input", () => {
    fontData.ascender = parseInt(metadataasc.value) || 1;
    unsaved = true;
});
metadatadsc.addEventListener("input", () => {
    fontData.descender = parseInt(metadatadsc.value) || 1;
    unsaved = true;
});

// import/export page
const importproject = document.getElementById("import-project");
const exportproject = document.getElementById("export-project");
const exportfont = document.getElementById("export-font");

importproject.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", () => {
        const file = input.files[0];
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            // validation
            const f = JSON.parse(reader.result);
            // this is so ugly but WHATEVER enjoy debugging this HAAHHAHAA.
            if (typeof f.name == "string" && typeof f.width == "number" && typeof f.height == "number" && typeof f.thickness == "number" && typeof f.unit == "number" && typeof f.unitsPerEm == "number" && typeof f.ascender == "number" && typeof f.descender == "number" && typeof f.glyphs == "object") {
                Object.keys(f.glyphs).forEach((glyph) => {
                    if (typeof f.glyphs[glyph].advance == "number" && Array.isArray(f.glyphs[glyph].data)) {
                        f.glyphs[glyph].data.forEach((stroke) => {
                            if (Array.isArray(stroke)) {
                                stroke.forEach((point) => {
                                    if (typeof point != "number") {
                                        alert("Invalid project file!");
                                        return;
                                    }
                                })
                            } else {
                                alert("Invalid project file!");
                                return;
                            }
                        })
                    } else {
                        alert("Invalid project file!");
                        return;
                    }
                })
            } else {
                alert("Invalid project file!");
                return;
            }
            
            // loading
            fontData = f;
            switchtab("select");
        });
        reader.readAsText(file);
    });
    input.click();
});

exportproject.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(fontData)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fontData.name + ".json";
    a.click();
    URL.revokeObjectURL(url);
});

exportfont.addEventListener("click", () => {
    const font = generatefont();
    const blob = new Blob([font.toArrayBuffer()], {type: "font/opentype"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fontData.name + ".otf";
    a.click();
    URL.revokeObjectURL(url);
})

// other
window.addEventListener("beforeunload", (event) => {
    if (unsaved) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave without exporting a project file?";
    }
})