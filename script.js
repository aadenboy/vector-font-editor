/*

versioning:

dataformat 1 (or none): initial release
  + name: string, name of font
  + width: number, default character width
  + height: number, default character height
  + thickness: number, stroke thickness
  + unit: number, unit size
  + unitsPerEm: number, units per em
  + ascender: number, glyph ascender
  + descender: number, glyph descender
  + glyphs: object, glyphs; should have .notdef by default
      + advance: number, advance width (kerning)
      + data: array, stroke data
         [
            stroke -> [x, y, x, y, ...]
            stroke -> [x, y, x, y, ...]
            ...
         ]

dataformat 2: added ligatures, styling, and versioning
  + style: string, font style
  + ligatures: object, ligatures
      + glyphs: string, sequence of characters that match the ligature
      + advance: number, advance width (kerning)
      + data: array, stroke data (see above)
  + dataformat: number, data format version
  
dataformat 3: added line styling
  + defaultwidth: the default stroke width
  + defaultjoin: the default line joining type
  + defaultcap: the default cap type
  * glyphs
    * data: now includes line styling
      + points: a list of points; [x, y, x, y, ...]
      + width: the width of the line as a percent 
      + join: how to join at corners
         "round": connects the lines with an arc
         "miter": extends the lines to meet at an angle
         "bevel": connects the lines with a straight edge
         "none": leaves a gap
      + cap: the kind of caps at the ends of the line
         "circle": adds a half-circle
         "square": extends it out
         "triangle": connects the corners at an angle
         "none": does nothing

*/

/*
window.onerror = (message, _, line) => {
    alert(line + " - Error occured: " + message);
    return false;
}

*/const debugdiv = document.createElement("div"); debugdiv.style.display = "none";/*
debugdiv.id = "debug";
document.body.appendChild(debugdiv);
function debug(s) {
    const p = document.createElement("p");
    p.innerHTML = s;
    debugdiv.appendChild(p);
}
*/

let fontData = {
    name: "Unnamed font",
    style: "Regular",
    width: 3,
    height: 7,
    thickness: 30,
    unit: 200,
    unitsPerEm: 1000,
    ascender: 0,
    descender: 2,
    defaultwidth: 1,
    defaultjoin: "round",
    defaultcap: "circle",
    glyphs: {
        ".notdef": {advance: 3, data: [
            {points: [0, 0, 0, 6, 2, 6, 2, 0, 0, 0], width: 1, join: "round", cap: "circle"},
            {points: [0, 0, 2, 6], width: 1, join: "round", cap: "circle"},
            {points: [0, 6, 2, 0], width: 1, join: "round", cap: "circle"},
        ]},
    },
    ligatures: {},
    dataformat: 3
};
let selectedGlyph;
let selectedType = "glyphs";
let unsaved = false;

class SVGPath {
    constructor(x, y) {
        this.commands = [];
        this.offset = {x: x, y: y}
    }

    push(v, i) {
        if (i != undefined) this.commands[i] = v; else this.commands.push(v);
    }

    moveTo(x, y, i) {
        this.push(`M ${this.offset.x+x} ${this.offset.y-y}`, i);
    }

    lineTo(x, y, i) {
        this.push(`L ${this.offset.x+x} ${this.offset.y-y}`, i);
    }

    curveTo(x1, y1, x2, y2, x3, y3, i) {
        this.push(`C ${this.offset.x+x1} ${this.offset.y-y1} ${this.offset.x+x2} ${this.offset.y-y2} ${this.offset.x+x3} ${this.offset.y-y3}`, i);
    }

    toString() {
        return this.commands.join(' ') + " Z";
    }
}


function calcArc(x1, y1, x4, y4, xc, yc) { // taken from https://stackoverflow.com/a/44829356
    // use two arcs if angle is 180
    let ax = x1 - xc;
    let ay = y1 - yc;
    let bx = x4 - xc;
    let by = y4 - yc;
    let q1 = ax * ax + ay * ay;
    let q2 = q1 + ax * bx + ay * by;
    let k2 = (4/3) * (ax * by - ay * bx) / (Math.sqrt(2 * q1 * q2) + q2);

    let x2 = xc + ax - k2 * ay;
    let y2 = yc + ay + k2 * ax;
    let x3 = xc + bx + k2 * by;
    let y3 = yc + by - k2 * bx;
    return {x2: x2, y2: y2, x3: x3, y3: y3};
}
function drawArc(path, x1, y1, x4, y4, xc, yc) {
    const arc = calcArc(x1, y1, x4, y4, xc, yc);
    path.curveTo(arc.x2, arc.y2, arc.x3, arc.y3, x4, y4);
}

const r90 = Math.PI/2;
function drawStroke(path, stroke, thickness, unit) {
    const datastart = path.commands.length;
    const tw = thickness * stroke.width;
    const points = stroke.points;
    const last = points.length - 2;
    const equalse = points[0] == points[last]
                 && points[1] == points[last+1];
    if ((equalse && points.length <= 4) || points.length <= 2) {
        const b = {x: points[0] * unit, y: points[1] * unit};
        const l = {x: -tw, y: 0};
        const u = {x: 0,   y: -tw};
        if (stroke.cap == "circle") {
            path.moveTo(b.x-l.x, b.y-l.y);
            drawArc(path, b.x-l.x, b.y-l.y, b.x-u.x, b.y-u.y, b.x, b.y);
            drawArc(path, b.x-u.x, b.y-u.y, b.x+l.x, b.y+l.y, b.x, b.y);
            drawArc(path, b.x+l.x, b.y+l.y, b.x+u.x, b.y+u.y, b.x, b.y);
            drawArc(path, b.x+u.x, b.y+u.y, b.x-l.x, b.y-l.y, b.x, b.y);
        } else if (stroke.cap == "triangle") {
            path.moveTo(b.x-l.x, b.y-l.y);
            path.lineTo(b.x-u.x, b.y-u.y);
            path.lineTo(b.x+l.x, b.y+l.y);
            path.lineTo(b.x+u.x, b.y+u.y);
        } else {
            path.moveTo(b.x-l.x-u.x, b.x-l.y-u.y);
            path.moveTo(b.x+l.x-u.x, b.x+l.y-u.y);
            path.moveTo(b.x+l.x+u.x, b.x+l.y+u.y);
            path.moveTo(b.x-l.x+u.x, b.x-l.y+u.y);
        }
        return;
    }
    for (let ri = 0; ri < points.length*2-2; ri += 2) {
        const i     = -Math.abs(ri     - (last)) + (last);
        const iprev = -Math.abs(ri - 2 - (last)) + (last);
        const inext = -Math.abs(ri + 2 - (last)) + (last);
        let a = {x: points[iprev] * unit, y: points[iprev+1] * unit}; // previous
        let b = {x: points[i]     * unit, y: points[i+1]     * unit}; // current
        let c = {x: points[inext] * unit, y: points[inext+1] * unit}; // next
        if (i == 0 && (ri < points.length || !equalse)) {
            const rcb = Math.atan2(c.y - b.y, c.x - b.x);
            const lcb = {x: Math.cos(rcb+r90) * tw, y: Math.sin(rcb+r90) * tw};
            const ucb = {x: Math.cos(rcb)     * tw, y: Math.sin(rcb)     * tw};
            if (ri >= points.length) {
                const rba = Math.atan2(b.y - a.y, b.x - a.x);
                const lba = {x: Math.cos(rba+r90) * tw, y: Math.sin(rba+r90) * tw};
                path.lineTo(b.x+lba.x, b.y+lba.y);
                break;
            }
            if (equalse) path.moveTo(b.x+lcb.x, b.y+lcb.y);
            else if (stroke.cap == "none") path[ri == 0 ? "moveTo" : "lineTo"](b.x+lcb.x, b.y+lcb.y);
            else if (stroke.cap == "circle") {
                path.moveTo(b.x-lcb.x, b.y-lcb.y);
                drawArc(path, b.x-lcb.x, b.y-lcb.y, b.x-ucb.x, b.y-ucb.y, b.x, b.y);
                drawArc(path, b.x-ucb.x, b.y-ucb.y, b.x+lcb.x, b.y+lcb.y, b.x, b.y);
            } else if (stroke.cap == "square") {
                path.moveTo(b.x-lcb.x-ucb.x, b.y-lcb.y-ucb.y);
                path.lineTo(b.x+lcb.x-ucb.x, b.y+lcb.y-ucb.y);
            } else if (stroke.cap == "triangle") {
                path.moveTo(b.x-lcb.x, b.y-lcb.y);
                path.lineTo(b.x-ucb.x, b.y-ucb.y);
                path.lineTo(b.x+lcb.x, b.y+lcb.y);
            }
        } else if (i == last && !equalse) {
            const rba = Math.atan2(b.y - a.y, b.x - a.x);
            const lba = {x: Math.cos(rba+r90) * tw, y: Math.sin(rba+r90) * tw};
            const uba = {x: Math.cos(rba)     * tw, y: Math.sin(rba)     * tw};
            if (stroke.cap == "circle") {
                path.lineTo(b.x+lba.x, b.y+lba.y);
                drawArc(path, b.x+lba.x, b.y+lba.y, b.x+uba.x, b.y+uba.y, b.x, b.y);
                drawArc(path, b.x+uba.x, b.y+uba.y, b.x-lba.x, b.y-lba.y, b.x, b.y);
            } else if (stroke.cap == "square") {
                path.lineTo(b.x+lba.x+uba.x, b.y+lba.y+uba.y);
                path.lineTo(b.x-lba.x+uba.x, b.y-lba.y+uba.y);
            } else if (stroke.cap == "triangle") {
                path.lineTo(b.x+lba.x, b.y+lba.y);
                path.lineTo(b.x+uba.x, b.y+uba.y);
                path.lineTo(b.x-lba.x, b.y-lba.y);
            } else if (stroke.cap == "none") {
                path.lineTo(b.x+lba.x, b.y+lba.y);
                path.lineTo(b.x-lba.x, b.y-lba.y);
            }
        } else {
            if (i == last) c = {x: points[2] * unit, y: points[3] * unit};
            if (i == 0) c = {x: points[points.length - 4] * unit, y: points[points.length - 3] * unit};
            const rba = Math.atan2(b.y - a.y, b.x - a.x);
            const rcb = Math.atan2(c.y - b.y, c.x - b.x);
            const lcb = {x: Math.cos(rcb+r90) * tw, y: Math.sin(rcb+r90) * tw};
            const ucb = {x: Math.cos(rcb)     * tw, y: Math.sin(rcb)     * tw};
            const lba = {x: Math.cos(rba+r90) * tw, y: Math.sin(rba+r90) * tw};
            const uba = {x: Math.cos(rba)     * tw, y: Math.sin(rba)     * tw};
            const cross = -((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x));
            if (stroke.join == "none" && cross > 0) {
                path.lineTo(b.x+lba.x, b.y+lba.y);
                path.lineTo(b.x, b.y);
                path.lineTo(b.x+lcb.x, b.y+lcb.y);
            } else if (stroke.join == "round" && cross > 0) {
                path.lineTo(b.x+lba.x, b.y+lba.y);
                drawArc(path, b.x+lba.x, b.y+lba.y, b.x+lcb.x, b.y+lcb.y, b.x, b.y);
            } else if (stroke.join == "bevel" && cross > 0) {
                path.lineTo(b.x+lba.x, b.y+lba.y);
                path.lineTo(b.x+lcb.x, b.y+lcb.y);
            }
            if ((cross < 0 || stroke.join == "miter" || (cross > 0 && i == last)) && cross != 0) { // interestingly, the tangent point works for both the underside and the miter join
                const theta0 = rba + r90;
                const theta1 = rcb + r90;
                const theta = theta1 - theta0;
                const tan = Math.tan(-0.5 * theta);
                if (cross < 0 || stroke.join == "miter") path.lineTo(b.x+lba.x+uba.x*tan, b.y+lba.y+uba.y*tan);
                if (i == last && cross < 0) { // turns out it's symmetric, that's why!
                    path.moveTo(b.x-lba.x, b.y-lba.y);
                    // hacky way of doing this but whatever
                    path.moveTo(b.x+lba.x+uba.x*tan, b.y+lba.y+uba.y*tan);
                    path.commands[datastart] = path.commands[path.commands.length-1];
                    path.commands.pop();
                } else if (i == last && cross > 0) {
                    path.moveTo(b.x-lba.x-uba.x*tan, b.y-lba.y-uba.y*tan);
                    path.moveTo(b.x+lcb.x, b.y+lcb.y);
                    path.commands[datastart] = path.commands[path.commands.length-1];
                    path.commands.pop();
                }
            }
        }
    }
}

function drawOTGlyph(name, gdata, unicode) {
    const thickness = fontData.thickness;
    const unit = fontData.unit;
    const path = new opentype.Path();
    const strokes = gdata.data;
    strokes.forEach((stroke) => {
        drawStroke(path, stroke, thickness, unit);
    });
    const data = {
        name: name,
        advanceWidth: unit * gdata.advance,
        path: path
    };
    if (unicode == undefined || unicode) data.unicode = unicode || name.codePointAt(0);
    const glyph = new opentype.Glyph(data);
    return glyph;
}
function drawSVGGlyph(svg, gdata, scale, x, y) {
    let thickness = fontData.thickness * (scale / fontData.unit);
    let unit = scale;
    const dx = x - (fontData.width - 1) * unit / 2
    const dy = y + (fontData.height - 1) * unit / 2
    debugdiv.innerHTML = ""
    gdata.data.forEach((stroke, i) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = new SVGPath(dx, dy);
        drawStroke(d, stroke, thickness, unit);
        path.setAttribute("d", d.toString());
        path.setAttribute("fill", "black");
        path.setAttribute("data-stroke-index", i)
        svg.appendChild(path);
    });
    return svg;
}

function validlig(s) {
    if (!s || s.length < 2) return false;
    for (let i = 0; i < s.length; i++) {
        if (!fontData.glyphs[s[i]]) return false;
    }
    return true;
}

function generatefont() {
    const glyphs = [];
    const cti = {};
    const ligatures = [];

    // glyphs
    if (fontData.glyphs[".notdef"]) {
        glyphs.push(drawOTGlyph(".notdef", fontData.glyphs[".notdef"], false));
    }
    
    Object.keys(fontData.glyphs).forEach((glyph) => {
        if (glyph == ".notdef") return;
        glyphs.push(drawOTGlyph(glyph, fontData.glyphs[glyph], glyph.codePointAt(0)));
        cti[glyph] = glyphs.length - 1;
    });

    // ligatures
    let valid = true;
    Object.keys(fontData.ligatures).forEach((name) => {
        const lig = fontData.ligatures[name];
        if (!validlig(lig.glyphs)) valid = false;
        glyphs.push(drawOTGlyph(name, lig, false));
        const components = [];
        for (let i = 1; i < lig.glyphs.length; i++) {
            components.push(cti[lig.glyphs[i]]);
        }
        ligatures.push({
            first: cti[lig.glyphs[0]],
            components: components,
            ligGlyph: ligatures.length + glyphs.length - 1
        });
    });
    if (!valid) {
        alert("One or more ligatures have problematic sequences! All characters in a ligature sequence must have their own glyph defined and be at least two characters long, otherwise the ligature will not work for your font! Please fix this in the Ligatures tab before you can export your font."); // could probably word this better
        return;
    }

    let unit = fontData.unit;
    const font = new opentype.Font({
        familyName: fontData.name,
        styleName: fontData.style,
        unitsPerEm: fontData.unitsPerEm,
        ascender: (fontData.ascender + fontData.height - 1) * unit,
        descender: (fontData.descender * -1) * unit,
        glyphs: glyphs
    });

    if (ligatures.length > 0) {
        const ligsets = {};
        ligatures.forEach((lig) => {
            if (!ligsets[lig.first]) ligsets[lig.first] = [];
            ligsets[lig.first].push({
                ligGlyph: lig.ligGlyph,
                components: lig.components
            });
        })
        const coverage = [];
        const ligsetarr = [];
        Object.keys(ligsets).forEach((glyph) => {
            coverage.push(parseInt(glyph));
            ligsetarr.push(ligsets[glyph]);
        })
        
        font.tables.gsub = {
            version: 1,
            scripts: [{
                tag: 'DFLT', // sure
                script: {
                    defaultLangSys: {
                        reserved: 0,
                        reqFeatureIndex: 0xFFFF,
                        featureIndexes: [0]
                    },
                    langSysRecords: []
                }
            }],
            features: [{
                tag: 'liga',
                feature: {
                    params: 0,
                    lookupListIndexes: [0]
                }
            }],
            lookups: [{
                lookupType: 4,
                lookupFlag: 0,
                subtables: [{
                    substFormat: 1,
                    coverage: {
                        format: 1,
                        glyphs: coverage
                    },
                    ligatureSets: ligsetarr
                }]
            }]
        };
        console.log(font, font.tables.gsub);
    }

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
        const yscroll = document.getElementById("select-glyphs-vscroll").scrollTop;
        loadglyphs();
        document.getElementById("select-glyphs-vscroll").scrollTop = yscroll;
    } else if (tab == "ligature") {
        const yscroll = document.getElementById("select-ligatures-vscroll").scrollTop;
        loadligatures();
        document.getElementById("select-ligatures-vscroll").scrollTop = yscroll;
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
const filtersearch = document.getElementById("filter-search");

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
    const search = filtersearch.value;
    if (search != "") {
        glyphs = [];
        if (search.startsWith("U+")) {
            const codepoint = parseInt(search.slice(2), 16);
            if (codepoint && codepoint >= 0 && codepoint <= 0x10FFFF) glyphs.push(codepoint);
        } else if (search.length == 1) {
            glyphs.push(search.codePointAt(0));
        } else {
            characters.forEach((c) => {
                if (c.name.toLowerCase().includes(search.toLowerCase())) {
                    glyphs.push(c.code);
                }
            });
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

        const cdata = characters.find((c) => c.code == index);
        if (cdata) {
            glyphlabel.innerHTML = cdata.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
            selectedType = "glyphs";
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
window.addEventListener("resize, orientationchange", loadglyphs);
filtersearch.addEventListener("input", loadglyphs);

// ligatures
const selectligatures = document.getElementById("select-ligatures");
const newligature = document.getElementById("new-ligature");
const ligatureinvalid = document.getElementById("ligature-invalid");

function loadligatures() {
    let ligatures = [];
    Object.keys(fontData.ligatures).forEach((ligature) => {
        ligatures.push(ligature);
    })
    ligatures.sort((a, b) => {
        return a < b;
    })
    if (ligatures.length == 0) {
        document.getElementById("select-ligatures-vscroll").innerHTML = "<p>No ligatures defined.</p>";
        return;
    };

    ligatureinvalid.style.display = "none";
    const perrow = Math.floor((selectligatures.clientWidth + 5) / 117);
    const renderSingleItem = (li) => {
        const index = ligatures[li];
        if (!index) return;
        const ligature = fontData.ligatures[index];
        const glyph = document.createElement("div");
        glyph.classList.add("glyph");
        if (!validlig(ligature.glyphs)) {
            glyph.style.backgroundColor = "#fcc";
            ligatureinvalid.style.display = "block";
        }

        const glyphlabel = document.createElement("span");
        glyphlabel.classList.add("glyph-name");
        glyphlabel.innerHTML = index;

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("glyph-preview");
        svg.setAttribute("width", "100px");
        svg.setAttribute("height", "100px");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg = drawSVGGlyph(svg, ligature, 25 / fontData.width, 50, 50)

        glyph.appendChild(svg);
        glyph.appendChild(glyphlabel);

        glyph.addEventListener("click", () => {
            selectedGlyph = index;
            selectedType = "ligatures";
            switchtab("edit");
        })

        return glyph;
    };
    const renderItem = (li) => {
        const row = document.createElement("div");
        row.classList.add("glyph-row");
        for (let i = 0; i < perrow; i++) {
            const ligature = renderSingleItem(li * perrow + i);
            if (ligature) row.appendChild(ligature);
        }
        return row;
    }

    document.getElementById("select-ligatures-vscroll").remove();
    const selectligaturesvs = document.createElement("div")
    selectligaturesvs.id = "select-ligatures-vscroll";
    new HyperList(selectligaturesvs, {
        itemHeight: 145,
        total: Math.ceil(ligatures.length / perrow),
        generate: renderItem,
        buffer: 5
    })
    selectligatures.appendChild(selectligaturesvs);
}
loadligatures();

newligature.addEventListener("click", () => {
    const name = prompt("Enter the name of the ligature:");
    if (name) {
        fontData.ligatures[name] = {
            glyphs: "",
            advance: fontData.width,
            data: []
        };
        unsaved = true;
        loadligatures();
    }
})

// edit page
const edittab = document.getElementById("edit-tab");
const editsvg = document.getElementById("edit-svg");
const edittitle = document.getElementById("edit-glyph");
const editunit = document.getElementById("edit-unit-size");
const editx = document.getElementById("edit-x");
const edity = document.getElementById("edit-y");
const editadvance = document.getElementById("edit-advance");
const editglyphs = document.getElementById("edit-glyphs");
const editnew = document.getElementById("edit-new-stroke");
const editdelete = document.getElementById("edit-delete-stroke");
const editdeleteglyph = document.getElementById("edit-delete-glyph");
const editstroke = document.getElementById("edit-stroke-select");
const editwidth = document.getElementById("edit-width");
const editdefault = document.getElementById("edit-stroke-default");

const editcapradios = document.querySelectorAll('input[name="edit-cap-type"]');
const editcornerradios = document.querySelectorAll('input[name="edit-corner-type"]');
function editcap() { return document.querySelector('input[name="edit-cap-type"]:checked'); }
function editcorner() { return document.querySelector('input[name="edit-corner-type"]:checked'); }

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
    editor.selected = -1;
    editor.point = -1;
    editor.mode = "select";
    editstroke.value = "none";
    editwidth.value = "none";
    editwidth.parentNode.classList.add("disabled");
    editcapradios.forEach((node) => node.parentNode.classList.add("disabled"));
    editcornerradios.forEach((node) => node.parentNode.classList.add("disabled"));
    if (!selectedGlyph) {
        edittitle.innerHTML = "Select a glyph or ligature to start!";
        editunit.parentNode.classList.add("disabled");
        editx.parentNode.classList.add("disabled");
        edity.parentNode.classList.add("disabled");
        editadvance.parentNode.classList.add("disabled");
        editstroke.parentNode.classList.add("disabled");
        editglyphs.parentNode.classList.add("disabled");
        editnew.classList.add("disabled");
        editdelete.classList.add("disabled");
        editdeleteglyph.classList.add("disabled");
        return;
    };
    if (!fontData[selectedType][selectedGlyph]) {
        fontData[selectedType][selectedGlyph] = selectedType == "glyphs" ? {
            advance: fontData.width,
            data: []
        } : { // redundant, but just in case
            glyphs: "",
            advance: fontData.width,
            data: []
        };
        unsaved = true;
    }
    if (selectedType == "glyphs") {
        const index = selectedGlyph.codePointAt(0);
        if (selectedGlyph == ".notdef") {
            edittitle.innerHTML = ".notdef";
        } else if (characters[index]) {
            edittitle.innerHTML = characters[index].name.replace(/</g, "&lt;").replace(/>/g, "&gt;") + " — U+" + index.toString(16).toUpperCase().padStart(4, "0");
        } else {
            edittitle.innerHTML = "U+" + (index).toString(16).toUpperCase();
        }
        document.getElementById("ligature-metadata").style.display = "none";
    } else {
        edittitle.innerHTML = selectedGlyph.replace(/</g, "&lt;").replace(/>/g, "&gt;")
        document.getElementById("ligature-metadata").style.display = "block";
        editglyphs.style.backgroundColor = validlig(fontData.ligatures[selectedGlyph].glyphs) ? "#fff" : "#fcc";
        editglyphs.value = fontData.ligatures[selectedGlyph].glyphs;
    };
    
    editunit.parentNode.classList.remove("disabled");
    editx.parentNode.classList.remove("disabled");
    edity.parentNode.classList.remove("disabled");
    editadvance.parentNode.classList.remove("disabled");
    editstroke.parentNode.classList.remove("disabled");
    editglyphs.parentNode.classList.remove("disabled");
    editnew.classList.remove("disabled");
    editdelete.classList.remove("disabled");
    editdeleteglyph.classList.remove("disabled");
    
    editor.scale = Math.min(editsvg.clientWidth / (fontData.width - 1), editsvg.clientHeight / (fontData.height - 1)) * 0.65
    editor.units.x = Math.ceil(editsvg.clientWidth / editor.scale);
    editor.units.y = Math.ceil(editsvg.clientHeight / editor.scale);
    const pos1 = editor.pos(0, 0);
    const pos2 = editor.pos(1, 0);
    editor.units.rel = (pos2.x - pos1.x) / (2**(editor.unit-1));
    drawPath();
    drawGrid();
    editadvance.value = fontData[selectedType][selectedGlyph].advance;
    editadvance.setAttribute("step", 1 / (2**(editor.unit - 1)));
}

function drawPath() {
    editsvg.querySelectorAll(".glyph-path, .path-point, .path-line").forEach((path) => {
        path.remove();
    });
    const glyph = fontData[selectedType][selectedGlyph];
    const pos = editor.pos((fontData.width - 1) / 2, (fontData.height - 1) / 2);
    drawSVGGlyph(editsvg, glyph, editor.scale, pos.x, pos.y);
    editstroke.value = "none";
    editdefault.classList.add("disabled");
    editwidth.parentNode.classList.add("disabled");
    editcapradios.forEach((node) => node.parentNode.classList.add("disabled"));
    editcornerradios.forEach((node) => node.parentNode.classList.add("disabled"));

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
                    editor.point = -1;
                    editstroke.value = "none";
                    editdefault.classList.add("disabled");
                    editwidth.parentNode.classList.add("disabled");
                    editcapradios.forEach((node) => node.parentNode.classList.add("disabled"));
                    editcornerradios.forEach((node) => node.parentNode.classList.add("disabled"));
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
    const index = parseInt(path.getAttribute("data-stroke-index"));
    const stroke = glyph.data[index];
    path.classList.add("select");
    editor.selected = index;
    editstroke.value = index + 1;
    editwidth.parentNode.classList.remove("disabled");
    editwidth.value = stroke.width * 100;
    if (fontData.defaultwidth != stroke.width || fontData.defaultjoin != stroke.join || fontData.defaultcap != stroke.cap) {
        editdefault.classList.remove("disabled");
    }
    editcapradios.forEach((node) => node.parentNode.classList.remove("disabled"));
    editcap().checked = false;
    document.getElementById("edit-cap-type-" + stroke.cap).checked = true;
    editcornerradios.forEach((node) => node.parentNode.classList.remove("disabled"));
    editcorner().checked = false;
    document.getElementById("edit-corner-type-" + stroke.join).checked = true;

    for (let i = 0; i < stroke.points.length; i += 2) {
        const to = {x: stroke.points[i], y: stroke.points[i+1]};
        const pointto = editorcircle(to.x, to.y, 0.15);
        pointto.classList.add("path-point");
        if (editor.point == i) pointto.classList.add("select");
        editsvg.appendChild(pointto);
        if (i > 0) {
            const from = {x: stroke.points[i-2], y: stroke.points[i-1]};
            const line = editorline(from.x, from.y, to.x, to.y)
            line.classList.add("path-line");
            editsvg.appendChild(line);
        }
        pointto.addEventListener("mousedown", () => {
            if (editor.mode == "select") {
                editor.mouselast.x = NaN;
                editor.mouselast.y = NaN;
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
        const glyph = fontData[selectedType][selectedGlyph];
        const stroke = glyph.data[editor.selected];
        stroke.points[editor.point] = mouse.x;
        stroke.points[editor.point + 1] = mouse.y;
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
        const points = fontData[selectedType][selectedGlyph].data[editor.selected].points;
        if (points[0] == points[points.length - 2] && points[1] == points[points.length - 1] && points.length > 2) newstroke();
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
    const glyph = fontData[selectedType][selectedGlyph];
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
        fontData[selectedType][selectedGlyph].advance = parseFloat(editadvance.value);
        unsaved = true;
        drawGrid();
    }
})
editwidth.addEventListener("input", () => {
    if (!isNaN(parseFloat(editadvance.value))) {
        fontData[selectedType][selectedGlyph].data[editor.selected].width = parseFloat(editwidth.value) / 100;
        unsaved = true;
        drawPath();
    }
})
editdefault.addEventListener("click", () => {
    const stroke = fontData[selectedType][selectedGlyph].data[editor.selected];
    fontData.defaultwidth = stroke.width;
    fontData.defaultjoin = stroke.join;
    fontData.defaultcap = stroke.cap;
    unsaved = true;
    editdefault.classList.add("disabled");
})
editstroke.addEventListener("input", () => {
    if (!isNaN(parseFloat(editadvance.value)) && fontData[selectedType][selectedGlyph].data[parseFloat(editstroke.value) - 1]) {
        editor.selected = parseFloat(editstroke.value) - 1;
        drawPath();
    } else {
        editor.selected = -1;
        drawPath();
    }
})
editcapradios.forEach((radio) => {
    radio.addEventListener("input", () => {
        if (radio.checked) {
            fontData[selectedType][selectedGlyph].data[editor.selected].cap = radio.value;
            unsaved = true;
            drawPath();
        }
    })
})
editcornerradios.forEach((radio) => {
    radio.addEventListener("input", () => {
        if (radio.checked) {
            fontData[selectedType][selectedGlyph].data[editor.selected].join = radio.value;
            unsaved = true;
            drawPath();
        }
    })
})
function newstroke() {
    const glyph = fontData[selectedType][selectedGlyph];
    if (editor.mode != "add") {
        editor.mode = "add";
        editor.selected = glyph.data.length;
        editor.point = 0;
        glyph.data.push({points: [0, 0], width: fontData.defaultwidth, join: fontData.defaultjoin, cap: fontData.defaultcap});
        editor.mouselast.x = NaN;
        editor.mouselast.y = NaN;
        editsvg.classList.add("nohover");
        editnew.setAttribute("value", "Finish stroke");
        unsaved = true;
        drawPath();
    } else {
        glyph.data[editor.selected].points.splice(editor.point, 2);
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
        fontData[selectedType][selectedGlyph].data.splice(editor.selected, 1);
        unsaved = true;
        editor.selected = -1;
        editor.point = -1;
        drawPath();
    }
}
editdelete.addEventListener("click", deletestroke);
window.addEventListener("keydown", (event) => {
    if (!edittab.classList.contains("active") || document.activeElement.nodeName == "INPUT") return;
    if ((event.key == "n" && editor.mode != "add")
       || ((event.key == "Enter" || event.key == "Escape") && editor.mode == "add")
       || event.key == " ") {
        newstroke();
    }
    if (event.key == "Backspace" || event.key == "Delete") {
        deletestroke();
    }
})
editdeleteglyph.addEventListener("click", () => {
    if (!selectedGlyph) return;
    delete fontData[selectedType][selectedGlyph];
    unsaved = true;
    switchtab(selectedType == "glyphs" ? "select" : "ligature");
})
editglyphs.addEventListener("input", () => {
    if (selectedType != "ligatures") return;
    fontData.ligatures[selectedGlyph].glyphs = editglyphs.value;
    unsaved = true;
    editglyphs.style.backgroundColor = validlig(editglyphs.value) ? "#fff" : "#fcc";
})

// preview page
const previewsvg = document.getElementById("preview-svg");
const previewtext = document.getElementById("preview-text");
const previewsize = document.getElementById("preview-font-size");

function rendertext() {
    previewsvg.innerHTML = "";
    const text = previewtext.value;
    let x = 10 + (fontData.width - 1) / 2 * previewsize.value;
    let iskip = 0;
    for (let i = 0; i < text.length; i++) {
        if (i < iskip) continue;
        Object.keys(fontData.ligatures).forEach((name) => {
            const ligature = fontData.ligatures[name];
            if (text.slice(i, i + ligature.glyphs.length) == ligature.glyphs) {
                drawSVGGlyph(previewsvg, ligature, previewsize.value, x, (fontData.height - 1) / 2 * previewsize.value + 10);
                x += ligature.advance * previewsize.value;
                iskip = i + name.length;
            }
        })
        if (i < iskip) continue; // twice because of the ligature check
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
const metadatafs = document.getElementById("metadata-style");
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
metadatafs.addEventListener("input", () => {
    fontData.style = metadatafs.value;
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
            // validation crap
            const f = JSON.parse(reader.result);
            console.log(f);
            if (f.dataformat == 2 && f.defaultjoin) f.dataformat = 3; // because I messed up
            let version = f.dataformat || 1;
            if (typeof f.name == "string" && (typeof f.style == "string" || version < 2) && typeof f.width == "number" && typeof f.height == "number" && typeof f.thickness == "number" && typeof f.unit == "number" && typeof f.unitsPerEm == "number" && typeof f.ascender == "number" && typeof f.descender == "number" && typeof f.glyphs == "object" && (typeof f.ligatures == "object" || version < 2) && (typeof f.dataformat == "number" || version < 2)) {
                const checkthing = (g) => {
                    Object.keys(g).forEach((glyph) => {
                        if (typeof g[glyph].advance == "number" && Array.isArray(g[glyph].data) && (g == f.glyphs || typeof g[glyph].glyphs == "string")) {
                            g[glyph].data.forEach((stroke) => {
                                if ((version < 3 && Array.isArray(stroke)) || (Array.isArray(stroke.points) && typeof stroke.width == "number" && typeof stroke.join == "string" && typeof stroke.cap == "string" && stroke.join.match(/^round$|^miter$|^bevel$|^none$/) && stroke.cap.match(/^circle$|^square$|^triangle$|^none$/))) {
                                    (version < 3 ? stroke : stroke.points).forEach((point) => {
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
                }
                checkthing(f.glyphs);
                if (version > 1) checkthing(f.ligatures);
            } else {
                alert("Invalid project file!");
                return;
            }

            // updates older versions to newer ones iteratively
            if (version == 1) {
                f.style = "Regular";
                f.ligatures = {};
                f.dataformat = 2;
                version++;
            }
            if (version == 2) {
                f.defaultwidth = 1;
                f.defaultcap = "circle";
                f.defaultjoin = "round";
                f.dataformat = 3;

                const upgradething = (g) => {
                    Object.keys(g).forEach((glyph) => {
                        g[glyph].data.forEach((stroke, i) => {
                            g[glyph].data[i] = {points: stroke, width: 1, join: "round", cap: "circle"};
                        })
                    })
                }
                upgradething(f.glyphs);
                upgradething(f.ligatures);
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
    if (!font) return;
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
