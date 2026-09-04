const express = require('express');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Standard 10 Technical Applications List from I-SMS.xlsx
const CURRICULUM_MODULES = [
  "EXCEL AI",
  "SQL",
  "POWER BI",
  "PYTHON",
  "SAS",
  "ML",
  "GEN AI & AGENTIC AI",
  "DATA ENGINEERING",
  "MLOPS & LLMOPS",
  "INTERVIEW PREP"
];

// Helper to compute module stats
function computeModuleMetrics(m) {
  const classes = Math.max(1, parseInt(m.classes, 10) || 10);
  const attended = Math.min(classes, Math.max(0, parseInt(m.attended, 10) || 0));
  const attendancePct = classes > 0 ? Math.round((attended / classes) * 100) : 0;
  
  const classHours = classes * 2;
  const hoursAttended = attended * 2;
  
  const classDuration = classes * 120; // 120 mins per class
  const classAttention = Math.min(classDuration, Math.max(0, parseInt(m.classAttention, 10) || 0));
  const attentionPct = classDuration > 0 ? Math.round((classAttention / classDuration) * 100) : 0;
  
  const assignments = m.assignments || { s1: false, s2: false, s3: false, s4: false, s5: false, s6: false };
  const assignmentTotal = Object.values(assignments).filter(Boolean).length;
  const assignmentTarget = m.assignmentTarget || 6;
  const assignmentPct = m.assignmentPct !== undefined ? m.assignmentPct : (assignmentTarget > 0 ? Math.round((assignmentTotal / assignmentTarget) * 100) : 0);
  
  const mcq = Math.max(0, Math.min(100, Math.round(m.mcq ?? 0)));
  const test = Math.max(0, Math.min(100, Math.round(m.testScore ?? m.test ?? 0)));
  const penAndPaper = Math.max(0, Math.min(100, Math.round(m.penAndPaper ?? 0)));
  const mockInterview = Math.max(0, Math.min(100, Math.round(m.mockInterview ?? 0)));
  
  // Overall score: weighted 30% attendance + 30% assignments + 40% test score
  const overallScore = Math.round(0.30 * attendancePct + 0.30 * assignmentPct + 0.40 * test);
  
  let performanceLevel = m.level || m.performanceLevel;
  if (!performanceLevel) {
    if (overallScore >= 85) performanceLevel = "Excellent";
    else if (overallScore >= 75) performanceLevel = "Very Good";
    else if (overallScore >= 65) performanceLevel = "Good";
    else performanceLevel = "Needs Improvement";
  }

  return {
    name: m.name,
    classes,
    attended,
    attendancePct,
    classHours,
    hoursAttended,
    classDuration,
    classAttention,
    attentionPct,
    assignments,
    assignmentTotal,
    assignmentTarget,
    assignmentPct,
    mcq,
    test,
    testScore: test,
    penAndPaper,
    mockInterview,
    overallScore,
    performanceLevel
  };
}

// Helper to compute full student-level aggregates & rules
function computeStudentAggregates(student) {
  const modules = (student.modules || []).map(computeModuleMetrics);
  
  const totalClasses = modules.reduce((a, b) => a + b.classes, 0) || 100;
  const totalAttended = modules.reduce((a, b) => a + b.attended, 0);
  const overallAttendance = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  const totalHours = modules.reduce((a, b) => a + b.classHours, 0) || (totalClasses * 2);
  const totalHoursAttended = modules.reduce((a, b) => a + b.hoursAttended, 0);

  const totalDuration = modules.reduce((a, b) => a + b.classDuration, 0) || 12000;
  const totalAttention = modules.reduce((a, b) => a + b.classAttention, 0);
  const overallAttention = totalDuration > 0 ? Math.round((totalAttention / totalDuration) * 100) : 0;

  const totalAssignments = modules.reduce((a, b) => a + b.assignmentTotal, 0);
  const totalTargetAssignments = modules.reduce((a, b) => a + b.assignmentTarget, 0) || 60;
  const overallAssignmentPct = modules.length ? Math.round(modules.reduce((a, b) => a + b.assignmentPct, 0) / modules.length) : 0;

  const avgMcq = modules.length ? Math.round(modules.reduce((a, b) => a + b.mcq, 0) / modules.length) : 0;
  const avgTest = modules.length ? Math.round(modules.reduce((a, b) => a + b.test, 0) / modules.length) : 0;
  const avgPenPaper = modules.length ? Math.round(modules.reduce((a, b) => a + b.penAndPaper, 0) / modules.length) : 0;
  const avgMock = modules.length ? Math.round(modules.reduce((a, b) => a + b.mockInterview, 0) / modules.length) : 0;
  
  // Weighted Overall Score: 30% Attendance + 30% Assignment + 40% Test Score
  const weightedScore = Math.round(0.30 * overallAttendance + 0.30 * overallAssignmentPct + 0.40 * avgTest);
  const lmsScore = Math.round((avgMcq + avgTest + overallAttendance) / 3);

  // Dedicated Readiness & Placement Evaluations
  const dvEliteEligible = weightedScore >= 85 && overallAttendance >= 85 && overallAssignmentPct >= 80 && avgTest >= 80;
  const placementSupportEligible = weightedScore >= 75 && overallAttendance >= 75;
  const placementReadiness = Math.round(0.4 * weightedScore + 0.3 * overallAttendance + 0.3 * avgTest);

  let overallLevel = "Good";
  if (weightedScore >= 85) overallLevel = "Excellent";
  else if (weightedScore >= 75) overallLevel = "Very Good";
  else if (weightedScore >= 65) overallLevel = "Good";
  else overallLevel = "Needs Improvement";

  // Trend history
  const performanceTrend = student.performanceTrend || [
    { month: "Dec'24", score: Math.max(50, weightedScore - 16) },
    { month: "Jan'25", score: Math.max(55, weightedScore - 13) },
    { month: "Feb'25", score: Math.max(60, weightedScore - 10) },
    { month: "Mar'25", score: Math.max(65, weightedScore - 7) },
    { month: "Apr'25", score: Math.max(70, weightedScore - 3) },
    { month: "May'25", score: weightedScore }
  ];

  // Attendance Result Tag
  let attendanceResult = "REGULAR ATTENDANCE";
  if (overallAttendance < 75) {
    attendanceResult = "FREQUENTLY MISSED CLASSES";
  } else if (overallAttendance >= 90) {
    attendanceResult = "EXCELLENT ATTENDANCE";
  }

  // Attention Result Tag
  let attentionResult = "FOCUSED & ENGAGED";
  if (overallAttention < 60) {
    attentionResult = "LESS FOCUSED";
  } else if (overallAttention < 75) {
    attentionResult = "MODERATE ATTENTION";
  }

  // Legacy scores map for backwards compatibility
  const academicScores = {};
  modules.forEach(m => {
    const key = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    academicScores[key] = m.overallScore;
  });

  return {
    ...student,
    attendance: overallAttendance,
    attendancePct: overallAttendance,
    totalClasses,
    totalAttended,
    totalHours,
    totalHoursAttended,
    attention: overallAttention,
    attentionPct: overallAttention,
    assignmentCompletion: overallAssignmentPct,
    testScoreAvg: avgTest,
    weightedScore,
    overallScore: weightedScore,
    overallLevel,
    modules,
    academicScores,
    assessments: {
      mcq: avgMcq,
      practical: avgTest,
      hardpaper: avgPenPaper,
      mockInterview: avgMock
    },
    coreLms: {
      mcq: avgMcq,
      practical: avgTest,
      attendance: overallAttendance,
      lmsScore
    },
    readinessAssessments: {
      penAndPaper: avgPenPaper,
      mockInterview: avgMock,
      dvEliteEligible,
      placementSupportEligible
    },
    lmsScore,
    dvEliteEligible,
    eliteGroup: dvEliteEligible ? "SELECTED" : "NOT SELECTED",
    placementSupportEligible,
    placementSupport: placementSupportEligible ? "YES" : "NO",
    placementReadiness,
    currentStatus: weightedScore >= 75 ? "On Track" : "Needs Focus",
    attendanceResult,
    attentionResult,
    performanceTrend
  };
}

function cleanPdfText(value) {
  return String(value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2265/g, ">=")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
}

function pdfEscape(value) {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value, maxChars) {
  const words = cleanPdfText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function parsePngForPdf(filePath) {
  const png = fs.readFileSync(filePath);
  const signature = png.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error("Logo must be a PNG file.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) {
        throw new Error("Logo PNG format is not supported for PDF embedding.");
      }
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const scanlineLength = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const rawRgb = Buffer.alloc(width * height * 3);
  let src = 0;
  let dst = 0;
  let previous = Buffer.alloc(scanlineLength);

  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    const current = Buffer.alloc(scanlineLength);
    for (let x = 0; x < scanlineLength; x++) {
      const raw = inflated[src++];
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      let value = raw;
      if (filter === 1) value = raw + left;
      if (filter === 2) value = raw + up;
      if (filter === 3) value = raw + Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft);
        value = raw + predictor;
      }
      current[x] = value & 255;
    }

    for (let x = 0; x < width; x++) {
      const idx = x * bytesPerPixel;
      const alpha = colorType === 6 ? current[idx + 3] / 255 : 1;
      rawRgb[dst++] = Math.round(current[idx] * alpha + 255 * (1 - alpha));
      rawRgb[dst++] = Math.round(current[idx + 1] * alpha + 255 * (1 - alpha));
      rawRgb[dst++] = Math.round(current[idx + 2] * alpha + 255 * (1 - alpha));
    }
    previous = current;
  }

  return {
    width,
    height,
    data: zlib.deflateSync(rawRgb)
  };
}

function createStudentDashboardPdf(student) {
  const pageWidth = 842;  // A4 Landscape
  const pageHeight = 595;

  const objects = [];
  let nextObjId = 1;
  const addObject = data => {
    const id = nextObjId++;
    objects.push({ id, data });
    return id;
  };

  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  // Palette definition - Clean Light Theme with Brand Accents
  const cCanvasBg  = "0.973 0.980 0.988"; // #f8fafc (Clean light slate background)
  const cCardBg    = "1 1 1";             // #ffffff (Pure white card background)
  const cCardHead  = "0.945 0.961 0.976"; // #f1f5f9 (Soft slate card header banner)
  const cCardAlt   = "0.973 0.980 0.988"; // #f8fafc (Subtle zebra striping)
  const cBorder    = "0.886 0.910 0.941"; // #e2e8f0 (Sleek light border)
  const cDarkText  = "0.059 0.090 0.165"; // #0f172a (Deep charcoal primary text)
  const cSubText   = "0.278 0.333 0.412"; // #475569 (Secondary slate text)
  const cMuted     = "0.478 0.549 0.635"; // #7a8c9e (Muted metadata text)
  const cWhite     = "1 1 1";

  // Brand Accents
  const cGreen       = "0.020 0.588 0.412"; // #059669
  const cGreenPillBg = "0.820 0.980 0.898"; // #d1fae5
  const cGreenPillTx = "0.024 0.373 0.275"; // #065f46

  const cBlue        = "0.145 0.388 0.922"; // #2563eb
  const cBluePillBg  = "0.859 0.918 0.996"; // #dbeafe
  const cBluePillTx  = "0.118 0.251 0.686"; // #1e40af

  const cPurple      = "0.486 0.227 0.929"; // #7c3aed
  const cGold        = "0.851 0.467 0.024"; // #d97706

  const cCyan        = "0.008 0.518 0.780"; // #0284c7
  const cCyanPillBg  = "0.878 0.949 0.996"; // #e0f2fe
  const cCyanPillTx  = "0.012 0.412 0.631"; // #0369a1

  const cOrange      = "0.918 0.345 0.047"; // #ea580c
  const cOrangePillBg= "1.0 0.929 0.835"; // #ffedd5
  const cOrangePillTx= "0.604 0.204 0.071"; // #9a3412

  function cleanPdfText(val) {
    return String(val ?? "")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2265/g, ">=")
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
  }

  function pdfEscape(val) {
    return cleanPdfText(val).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  const ops = [];

  const setFill = color => ops.push(`${color} rg`);
  const setStroke = color => ops.push(`${color} RG`);

  const textAt = (val, x, y, size = 9, bold = false, color = cDarkText) => {
    setFill(color);
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfEscape(val)}) Tj ET`);
  };

  const textCenter = (val, x, y, size = 9, bold = false, color = cDarkText) => {
    const str = String(val);
    const approxW = (str.length * (size * (bold ? 0.58 : 0.52)));
    textAt(str, x - (approxW / 2), y, size, bold, color);
  };

  const rect = (x, y, w, h, fill = null, stroke = null, lineWidth = 0.8) => {
    if (fill) {
      setFill(fill);
      ops.push(`${x} ${y} ${w} ${h} re f`);
    }
    if (stroke) {
      setStroke(stroke);
      ops.push(`${lineWidth} w ${x} ${y} ${w} ${h} re S`);
    }
  };

  const line = (x1, y1, x2, y2, stroke = cBorder, lineWidth = 0.8) => {
    setStroke(stroke);
    ops.push(`${lineWidth} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const circle = (cx, cy, r, fill = null, stroke = null, lineWidth = 1.0) => {
    const k = 0.552284749831;
    const kr = r * k;
    const path = `
      ${cx} ${cy + r} m
      ${cx + kr} ${cy + r} ${cx + r} ${cy + kr} ${cx + r} ${cy} c
      ${cx + r} ${cy - kr} ${cx + kr} ${cy - r} ${cx} ${cy - r} c
      ${cx - kr} ${cy - r} ${cx - r} ${cy - kr} ${cx - r} ${cy} c
      ${cx - r} ${cy + kr} ${cx - kr} ${cy + r} ${cx} ${cy + r} c
    `;
    if (fill && stroke) {
      setFill(fill);
      setStroke(stroke);
      ops.push(`${lineWidth} w ${path} B`);
    } else if (fill) {
      setFill(fill);
      ops.push(`${path} f`);
    } else if (stroke) {
      setStroke(stroke);
      ops.push(`${lineWidth} w ${path} S`);
    }
  };

  // 1. Canvas Background
  rect(0, 0, pageWidth, pageHeight, cCanvasBg, null);

  // 2. Top Header Bar (y: 560 to 595)
  rect(0, 560, pageWidth, 35, cCardBg, cBorder, 1);
  textAt("STUDENT PERFORMANCE DASHBOARD", 24, 571, 12, true, cDarkText);

  // Right meta items
  const genDate = new Date().toISOString().split('T')[0];
  textAt(`Student: ${student.name}   |   ID: ${student.studentId || student.id}   |   Batch: ${student.batch}   |   Date: ${genDate}`, 380, 572, 8.5, false, cSubText);

  // =========================================================================
  // TOP ROW: Profile + 6 Clean KPI Cards (No square icon boxes) (y: 478 to 552)
  // =========================================================================
  const topY = 478;
  const topH = 74;

  // Card 1: Student Profile Card (x: 20, w: 172)
  rect(20, topY, 172, topH, cCardBg, cBorder);
  rect(20, topY + topH - 16, 172, 16, cCardHead, null);
  textCenter("STUDENT PROFILE", 106, topY + topH - 12, 7.5, true, cBlue);
  
  // Profile Avatar & Info
  circle(42, topY + 28, 14, cBluePillBg, cBlue, 1.0);
  textCenter("U", 42, topY + 24, 10, true, cBlue);

  textAt("STUDENT NAME", 64, topY + 44, 6.5, true, cMuted);
  textAt(student.name, 64, topY + 34, 8.5, true, cDarkText);
  textAt("STUDENT ID", 125, topY + 44, 6.5, true, cMuted);
  textAt(student.studentId || student.id, 125, topY + 34, 8.0, false, cSubText);

  textAt("BATCH", 64, topY + 22, 6.5, true, cMuted);
  textAt(student.batch, 64, topY + 12, 8.0, true, cDarkText);
  textAt("COURSE", 110, topY + 22, 6.5, true, cMuted);
  const courseStr = (student.course || "Data Analytics with AI");
  textAt(courseStr.length > 14 ? courseStr.slice(0, 13) + '..' : courseStr, 110, topY + 12, 7.5, true, cCyan);

  // Clean KPI Card (No square letter icon boxes)
  const drawCleanKpiCard = (x, w, title, val, subVal, color) => {
    rect(x, topY, w, topH, cCardBg, cBorder);
    textCenter(title, x + (w / 2), topY + topH - 16, 7.0, true, cSubText);
    textCenter(val, x + (w / 2), topY + 25, 17, true, color);
    textCenter(subVal, x + (w / 2), topY + 10, 6.5, false, cMuted);
  };

  const drawBadgeKpiCard = (x, w, title, badgeText, subVal, bgCol, textCol) => {
    rect(x, topY, w, topH, cCardBg, cBorder);
    textCenter(title, x + (w / 2), topY + topH - 16, 7.0, true, cSubText);

    // Badge pill
    rect(x + 10, topY + 24, w - 20, 18, bgCol, textCol, 0.8);
    textCenter(badgeText, x + (w / 2), topY + 28, 8.5, true, textCol);
    textCenter(subVal, x + (w / 2), topY + 10, 6.5, false, cMuted);
  };

  // KPI 2: Attendance (x: 198, w: 96)
  const attDays = student.attendedDays || 97;
  const totDays = student.totalDays || 104;
  drawCleanKpiCard(198, 96, "ATTENDANCE", `${student.attendancePct}%`, `(${attDays}/${totDays} Days)`, cGreen);

  // KPI 3: Assignments (x: 300, w: 96)
  drawCleanKpiCard(300, 96, "ASSIGNMENTS", `${student.assignmentCompletion}%`, "(Avg. Completion)", cBlue);

  // KPI 4: Test Score (x: 402, w: 96)
  drawCleanKpiCard(402, 96, "TEST SCORE", `${student.testScoreAvg}%`, "(Average Score)", cPurple);

  // KPI 5: Overall Score (x: 504, w: 96)
  drawCleanKpiCard(504, 96, "OVERALL SCORE", `${student.overallScore}%`, "(Weighted Score)", cGold);

  // KPI 6: Elite Group (x: 606, w: 104)
  const isElite = (student.eliteGroup === "SELECTED" || student.dvEliteEligible);
  drawBadgeKpiCard(606, 104, "ELITE GROUP", isElite ? "SELECTED" : "NOT SELECTED", isElite ? "(Eligible)" : "(Not Eligible)", isElite ? cGreenPillBg : cCardAlt, isElite ? cGreenPillTx : cMuted);

  // KPI 7: Placement Support (x: 716, w: 106)
  const isPlacement = (student.placementSupport === "YES" || student.placementSupportEligible);
  drawBadgeKpiCard(716, 106, "PLACEMENT SUPPORT", isPlacement ? "YES" : "NO", isPlacement ? "(Eligible)" : "(Not Eligible)", isPlacement ? cCyanPillBg : cCardAlt, isPlacement ? cCyanPillTx : cMuted);

  // =========================================================================
  // MIDDLE ROW: Performance Summary | Application Table | Overall Gauge (y: 226 to 470)
  // =========================================================================
  const midY = 226;
  const midH = 244;

  // 1. LEFT CARD: PERFORMANCE SUMMARY (x: 20, w: 172)
  rect(20, midY, 172, midH, cCardBg, cBorder);
  rect(20, midY + midH - 18, 172, 18, cCardHead, null);
  textCenter("PERFORMANCE SUMMARY", 106, midY + midH - 13, 7.5, true, cBlue);

  const sumItems = [
    { label: "Total Days Attended", val: `${student.attendedDays || 97} / ${student.totalDays || 104}`, pct: `(${student.attendancePct}%)`, col: cGreen },
    { label: "Total Training Hours", val: `${student.attendedHours || 194} / ${student.totalHours || 208}`, pct: `(${student.attendancePct}%)`, col: cGreen },
    { label: "Assignments Submitted", val: `${student.assignmentCompletion}%`, pct: "", col: cDarkText },
    { label: "Average Test Score", val: `${student.testScoreAvg}%`, pct: "", col: cDarkText },
    { label: "Overall Score", val: `${student.overallScore}%`, pct: "", col: cGold }
  ];

  sumItems.forEach((item, idx) => {
    const rowY = midY + midH - 38 - (idx * 40);
    rect(26, rowY - 14, 160, 34, cCardAlt, cBorder, 0.5);
    textAt(item.label, 32, rowY + 6, 7.0, true, cSubText);
    textAt(item.val, 32, rowY - 6, 9.5, true, item.col);
    if (item.pct) {
      textAt(item.pct, 130, rowY - 6, 8.5, true, cGreen);
    }
  });

  // 2. CENTER CARD: APPLICATION-WISE PERFORMANCE Table (x: 198, w: 446)
  rect(198, midY, 446, midH, cCardBg, cBorder);
  rect(198, midY + midH - 18, 446, 18, cCardHead, null);
  textAt("APPLICATION-WISE PERFORMANCE", 208, midY + midH - 13, 8.0, true, cDarkText);

  // Table Column Coordinates
  const colX = [204, 218, 305, 365, 425, 475, 525, 575];
  const tableHeadY = midY + midH - 34;

  rect(198, tableHeadY - 4, 446, 16, cCardAlt, cBorder, 0.5);
  textAt("#", colX[0], tableHeadY, 7.0, true, cSubText);
  textAt("Application", colX[1], tableHeadY, 7.0, true, cSubText);
  textAt("Attendance Days", colX[2], tableHeadY, 6.5, true, cSubText);
  textAt("Class Hours", colX[3], tableHeadY, 6.5, true, cSubText);
  textAt("Attendance %", colX[4], tableHeadY, 6.5, true, cSubText);
  textAt("Assign. %", colX[5], tableHeadY, 6.5, true, cSubText);
  textAt("Test %", colX[6], tableHeadY, 6.5, true, cSubText);
  textAt("Level", colX[7] + 8, tableHeadY, 6.5, true, cSubText);

  const modules = student.modules || [];
  const standardModules = [
    { name: "SQL", attendedDays: 18, totalDays: 20, attendedHours: 36, totalHours: 40, attendancePct: 90, assignmentPct: 92, testScorePct: 88, level: "Excellent" },
    { name: "Python", attendedDays: 20, totalDays: 21, attendedHours: 40, totalHours: 42, attendancePct: 95, assignmentPct: 85, testScorePct: 82, level: "Very Good" },
    { name: "Excel AI", attendedDays: 10, totalDays: 10, attendedHours: 20, totalHours: 20, attendancePct: 100, assignmentPct: 95, testScorePct: 91, level: "Excellent" },
    { name: "Power BI", attendedDays: 12, totalDays: 13, attendedHours: 24, totalHours: 26, attendancePct: 92, assignmentPct: 90, testScorePct: 86, level: "Excellent" },
    { name: "Statistics", attendedDays: 8, totalDays: 9, attendedHours: 16, totalHours: 18, attendancePct: 89, assignmentPct: 80, testScorePct: 78, level: "Good" },
    { name: "Machine Learning", attendedDays: 15, totalDays: 17, attendedHours: 30, totalHours: 34, attendancePct: 88, assignmentPct: 82, testScorePct: 84, level: "Very Good" },
    { name: "Gen AI", attendedDays: 8, totalDays: 8, attendedHours: 16, totalHours: 16, attendancePct: 100, assignmentPct: 90, testScorePct: 92, level: "Excellent" },
    { name: "Agentic AI", attendedDays: 6, totalDays: 6, attendedHours: 12, totalHours: 12, attendancePct: 100, assignmentPct: 85, testScorePct: 88, level: "Excellent" }
  ];

  const tableData = modules.length >= 8 ? modules.map(m => ({
    name: m.name,
    attendedDays: m.attended || m.attendedDays || 10,
    totalDays: m.classes || m.totalDays || 10,
    attendedHours: m.hoursAttended || m.attendedHours || (m.attended || 10) * 2,
    totalHours: m.classHours || m.totalHours || (m.classes || 10) * 2,
    attendancePct: m.attendancePct,
    assignmentPct: m.assignmentPct,
    testScorePct: m.testScorePct || m.testScore || m.test,
    level: m.performanceLevel || m.level || "Very Good"
  })) : standardModules;

  tableData.slice(0, 8).forEach((row, i) => {
    const rowY = tableHeadY - 20 - (i * 18);
    if (i % 2 === 1) {
      rect(198, rowY - 4, 446, 17, cCardAlt, null);
    }
    textAt(String(i + 1), colX[0], rowY, 7.5, true, cMuted);
    textAt(row.name, colX[1], rowY, 7.5, true, cDarkText);
    textAt(`${row.attendedDays}/${row.totalDays} (${row.attendancePct}%)`, colX[2], rowY, 7.0, false, cSubText);
    const hrsPct = Math.round((row.attendedHours / (row.totalHours || 1)) * 100);
    textAt(`${row.attendedHours}/${row.totalHours} (${hrsPct}%)`, colX[3], rowY, 7.0, false, cSubText);
    textAt(`${row.attendancePct}%`, colX[4], rowY, 7.5, true, cGreen);
    textAt(`${row.assignmentPct}%`, colX[5], rowY, 7.5, true, cBlue);
    textAt(`${row.testScorePct}%`, colX[6], rowY, 7.5, true, cPurple);

    // Level badge
    const isExc = row.level === "Excellent";
    const isVg = row.level === "Very Good";
    const bBg = isExc ? cGreenPillBg : (isVg ? cCyanPillBg : cOrangePillBg);
    const bCol = isExc ? cGreenPillTx : (isVg ? cCyanPillTx : cOrangePillTx);
    rect(colX[7], rowY - 3, 58, 12, bBg, bCol, 0.5);
    textCenter(row.level, colX[7] + 29, rowY, 6.5, true, bCol);
  });

  // Table Footer (OVERALL Row)
  const footY = midY + 8;
  rect(198, footY - 4, 446, 18, cCardHead, cBorder, 0.8);
  textAt("OVERALL", colX[1], footY, 8.0, true, cDarkText);
  textAt(`${attDays}/${totDays} (${student.attendancePct}%)`, colX[2], footY, 7.5, true, cGreen);
  const overallHrsAtt = student.attendedHours || (attDays * 2);
  const overallHrsTot = student.totalHours || (totDays * 2);
  const overallHrsPct = Math.round((overallHrsAtt / (overallHrsTot || 1)) * 100);
  textAt(`${overallHrsAtt}/${overallHrsTot} (${overallHrsPct}%)`, colX[3], footY, 7.5, true, cGreen);
  textAt(`${student.attendancePct}%`, colX[4], footY, 8.0, true, cGreen);
  textAt(`${student.assignmentCompletion}%`, colX[5], footY, 8.0, true, cBlue);
  textAt(`${student.testScoreAvg}%`, colX[6], footY, 8.0, true, cPurple);

  rect(colX[7], footY - 3, 58, 13, cGreenPillBg, cGreenPillTx, 0.6);
  textCenter(student.overallLevel || "Excellent", colX[7] + 29, footY + 1, 7.0, true, cGreenPillTx);

  // 3. RIGHT CARD: OVERALL PERFORMANCE & ELIGIBILITY (x: 650, w: 172)
  rect(650, midY, 172, midH, cCardBg, cBorder);
  rect(650, midY + midH - 18, 172, 18, cCardHead, null);
  textCenter("OVERALL PERFORMANCE", 736, midY + midH - 13, 7.5, true, cBlue);

  // Donut Gauge
  const gaugeCx = 736;
  const gaugeCy = midY + midH - 65;
  circle(gaugeCx, gaugeCy, 32, null, cBorder, 6);
  circle(gaugeCx, gaugeCy, 32, null, cGreen, 6);
  circle(gaugeCx, gaugeCy, 24, cCardBg, null);
  textCenter(`${student.overallScore}%`, gaugeCx, gaugeCy + 2, 13, true, cDarkText);
  textCenter("Overall Score", gaugeCx, gaugeCy - 8, 6.0, false, cMuted);

  // Gauge Legend
  const legY = midY + midH - 110;
  rect(656, legY - 30, 160, 36, cCardAlt, cBorder, 0.5);
  
  circle(664, legY - 4, 3, cGreen, null);
  textAt("Attendance (30%)", 672, legY - 6, 6.5, false, cSubText);
  textAt(`${student.attendancePct}%`, 794, legY - 6, 7.0, true, cDarkText);

  circle(664, legY - 14, 3, cBlue, null);
  textAt("Assignments (30%)", 672, legY - 16, 6.5, false, cSubText);
  textAt(`${student.assignmentCompletion}%`, 794, legY - 16, 7.0, true, cDarkText);

  circle(664, legY - 24, 3, cPurple, null);
  textAt("Test Score (40%)", 672, legY - 26, 6.5, false, cSubText);
  textAt(`${student.testScoreAvg}%`, 794, legY - 26, 7.0, true, cDarkText);

  // Eligibility & Status Box
  const eligY = midY + 70;
  rect(656, eligY - 62, 160, 64, cCardAlt, cBorder, 0.5);
  rect(656, eligY - 6, 160, 14, cCardHead, null);
  textCenter("ELIGIBILITY & STATUS", 736, eligY - 2, 6.5, true, cCyan);

  textAt("Elite Group", 662, eligY - 18, 6.5, false, cSubText);
  rect(750, eligY - 22, 60, 10, isElite ? cGreenPillBg : cCardBg, isElite ? cGreenPillTx : cBorder, 0.5);
  textCenter(isElite ? "SELECTED" : "NOT SELECTED", 780, eligY - 19, 5.5, true, isElite ? cGreenPillTx : cMuted);

  textAt("Placement Support", 662, eligY - 30, 6.5, false, cSubText);
  rect(750, eligY - 34, 60, 10, isPlacement ? cCyanPillBg : cCardBg, isPlacement ? cCyanPillTx : cBorder, 0.5);
  textCenter(isPlacement ? "YES" : "NO", 780, eligY - 31, 5.5, true, isPlacement ? cCyanPillTx : cMuted);

  textAt("Placement Readiness", 662, eligY - 42, 6.5, false, cSubText);
  textAt(`${student.placementReadiness || 89}%`, 785, eligY - 42, 7.0, true, cPurple);

  textAt("Current Status", 662, eligY - 54, 6.5, false, cSubText);
  textAt(student.currentStatus || "On Track", 760, eligY - 54, 7.0, true, cOrange);

  // =========================================================================
  // BOTTOM ROW: 4 Visual Charts in Light Theme (y: 18 to 216)
  // =========================================================================
  const botY = 18;
  const botH = 198;
  const chartW = 194;

  const appNamesShort = ["SQL", "Python", "Excel", "Power..", "Statis..", "Machin..", "Gen AI", "Agent.."];

  // Helper for Bar Charts
  const drawBarChartCard = (x, title, dataKey, color) => {
    rect(x, botY, chartW, botH, cCardBg, cBorder);
    rect(x, botY + botH - 18, chartW, 18, cCardHead, null);
    textCenter(title, x + (chartW / 2), botY + botH - 13, 7.0, true, cBlue);

    const innerH = 135;
    const innerY = botY + 28;
    const barStep = (chartW - 20) / 8;

    // Grid lines
    [25, 50, 75, 100].forEach(p => {
      const gy = innerY + (p / 100) * innerH;
      line(x + 10, gy, x + chartW - 10, gy, cBorder, 0.4);
    });

    tableData.slice(0, 8).forEach((d, idx) => {
      const val = d[dataKey] || 0;
      const barH = Math.max(4, (val / 100) * innerH);
      const bx = x + 14 + (idx * barStep);
      const by = innerY;
      
      // Bar rectangle
      rect(bx, by, barStep - 5, barH, color, null);

      // Percentage label on top of bar
      textCenter(`${val}%`, bx + ((barStep - 5) / 2), by + barH + 3, 5.5, true, cDarkText, 4.0);

      // App label below
      textCenter(appNamesShort[idx] || "", bx + ((barStep - 5) / 2), botY + 14, 5.5, false, cSubText, 4.0);
    });
  };

  // Chart 1: Attendance %
  drawBarChartCard(20, "ATTENDANCE % BY APPLICATION", "attendancePct", cGreen);

  // Chart 2: Assignment %
  drawBarChartCard(220, "ASSIGNMENT % BY APPLICATION", "assignmentPct", cBlue);

  // Chart 3: Test Score %
  drawBarChartCard(420, "TEST SCORE % BY APPLICATION", "testScorePct", cPurple);

  // Chart 4: Student Performance Trend (x: 620, w: 202)
  rect(620, botY, 202, botH, cCardBg, cBorder);
  rect(620, botY + botH - 18, 202, 18, cCardHead, null);
  textCenter("STUDENT PERFORMANCE TREND (OVERALL SCORE %)", 721, botY + botH - 13, 6.2, true, cBlue);

  const trendMonths = student.performanceTrend || [
    { month: "Dec'24", score: 72 },
    { month: "Jan'25", score: 75 },
    { month: "Feb'25", score: 78 },
    { month: "Mar'25", score: 81 },
    { month: "Apr'25", score: 85 },
    { month: "May'25", score: 88 }
  ];

  const trendInnerH = 135;
  const trendInnerY = botY + 28;
  const trendBarStep = 180 / trendMonths.length;

  // Grid lines
  [25, 50, 75, 100].forEach(p => {
    const gy = trendInnerY + (p / 100) * trendInnerH;
    line(630, gy, 810, gy, cBorder, 0.4);
  });

  trendMonths.forEach((pt, idx) => {
    const val = pt.score || 0;
    const barH = Math.max(4, (val / 100) * trendInnerH);
    const bx = 631 + (idx * trendBarStep);
    const by = trendInnerY;

    // Bar rectangle
    rect(bx, by, trendBarStep - 5, barH, cBlue, null);

    // Percentage label on top of bar
    textCenter(`${val}%`, bx + ((trendBarStep - 5) / 2), by + barH + 3, 5.5, true, cDarkText, 4.0);

    // Month label below
    textCenter(pt.month || "", bx + ((trendBarStep - 5) / 2), botY + 14, 5.5, false, cSubText, 4.0);
  });

  // Assemble PDF structure
  const pagesId = addObject("");
  const stream = Buffer.from(ops.join("\n"), 'binary');
  const contentId = addObject(Buffer.concat([
    Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'binary'),
    stream,
    Buffer.from("\nendstream", 'binary')
  ]));

  const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  
  objects.find(o => o.id === pagesId).data = `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach(obj => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${obj.id} 0 obj\n`;
    if (Buffer.isBuffer(obj.data)) {
      pdf += obj.data.toString('binary');
    } else {
      pdf += `${obj.data}\n`;
    }
    pdf += "endobj\n";
  });

  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}

function createStudentReportPdf(student) {
  return createStudentDashboardPdf(student);
}

// Start with empty operational data. Real entries are added through the app.
let rawStudents = [];

let students = rawStudents.map(computeStudentAggregates);

// Batches Collection
let batches = [];

let sessions = [];

let staffMembers = [];

// Feedback Triad Collections based on Sheet 2 (STUDENT FEEDBACK)
let facultyFeedbackLogs = [];

let mentorFeedbackLogs = [];

let mentorEvaluationLogs = [];

let upcomingClasses = [];

let alerts = [];

// Re-sync all students
function refreshStudents() {
  students = rawStudents.map(computeStudentAggregates);
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Auth Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'dvadmin' && password === 'DVA-SMS-2026!xQ7#R9vL') {
    res.json({
      message: "Login successful",
      user: {
        username: 'dvadmin',
        role: 'Administrator',
        name: 'Admin Officer'
      }
    });
  } else {
    res.status(401).json({ error: "Invalid credentials." });
  }
});

// 2. Curriculum Modules Reference
app.get('/api/modules', (req, res) => {
  res.json(CURRICULUM_MODULES);
});

// 3. Batches & Sessions
app.get('/api/batches', (req, res) => res.json(batches));
app.get('/api/sessions', (req, res) => res.json(sessions));

// 4. Students API
app.get('/api/students', (req, res) => {
  refreshStudents();
  const { search, status, batch, session, dvElite, placementSupport } = req.query;
  let filtered = [...students];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.mobile.includes(q)
    );
  }
  if (status && status !== 'All') {
    filtered = filtered.filter(s => s.status === status);
  }
  if (batch && batch !== 'All') {
    filtered = filtered.filter(s => s.batch === batch);
  }
  if (session && session !== 'All') {
    filtered = filtered.filter(s => s.session === session);
  }
  if (dvElite === 'true') {
    filtered = filtered.filter(s => s.dvEliteEligible);
  }
  if (placementSupport === 'true') {
    filtered = filtered.filter(s => s.placementSupportEligible);
  }

  res.json(filtered);
});

app.get('/api/students/:id/report.pdf', (req, res) => {
  refreshStudents();
  const student = students.find(s => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const reportStudent = {
    ...student,
    facultyFeedback: facultyFeedbackLogs.filter(f => f.studentId === student.id),
    mentorFeedback: mentorFeedbackLogs.filter(f => f.studentId === student.id),
    mentorEvaluations: mentorEvaluationLogs.filter(f => f.studentId === student.id)
  };

  try {
    const pdf = createStudentReportPdf(reportStudent);
    const safeName = student.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="I-SMS_${safeName}_${student.id}_Report.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error("PDF report generation failed:", error);
    res.status(500).json({ error: "Unable to generate student report PDF" });
  }
});

app.get('/api/students/:id', (req, res) => {
  refreshStudents();
  const student = students.find(s => s.id === req.params.id);
  if (student) {
    const facFeedback = facultyFeedbackLogs.filter(f => f.studentId === student.id);
    const menFeedback = mentorFeedbackLogs.filter(f => f.studentId === student.id);
    const menEval = mentorEvaluationLogs.filter(f => f.studentId === student.id);
    res.json({
      ...student,
      facultyFeedback: facFeedback,
      mentorFeedback: menFeedback,
      mentorEvaluations: menEval
    });
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

app.post('/api/students', (req, res) => {
  const newStudent = req.body;
  const nextId = "LMS" + String(1000 + rawStudents.length + 1);
  
  const createdModules = CURRICULUM_MODULES.map(name => ({
    name,
    classes: 10,
    attended: 10,
    classDuration: 1200,
    classAttention: 1000,
    assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
    mcq: 80,
    test: 80,
    penAndPaper: 75,
    mockInterview: 80
  }));

  const raw = {
    id: nextId,
    name: newStudent.name || "New Student",
    mobile: newStudent.mobile || "",
    email: newStudent.email || "",
    program: newStudent.program || "APIDS",
    course: newStudent.course || "Advanced Post Graduate Program in Data Science & AI",
    batch: newStudent.batch || "",
    session: newStudent.session || "SESSION-1",
    faculty: newStudent.faculty || "",
    counselor: newStudent.counselor || "",
    status: newStudent.status || "Active",
    enrollmentDate: newStudent.enrollmentDate || new Date().toISOString().split('T')[0],
    notes: newStudent.notes || "",
    documents: [],
    timeline: [
      { date: new Date().toISOString().split('T')[0], event: "Enrolled in APIDS Program" }
    ],
    modules: newStudent.modules || createdModules
  };

  rawStudents.push(raw);
  refreshStudents();
  const created = students.find(s => s.id === nextId);
  res.status(201).json(created);
});

app.put('/api/students/:id', (req, res) => {
  const id = req.params.id;
  const index = rawStudents.findIndex(s => s.id === id);
  if (index !== -1) {
    rawStudents[index] = { ...rawStudents[index], ...req.body };
    refreshStudents();
    res.json(students.find(s => s.id === id));
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const id = req.params.id;
  const index = rawStudents.findIndex(s => s.id === id);
  if (index !== -1) {
    rawStudents.splice(index, 1);
    refreshStudents();
    res.json({ message: "Student deleted successfully" });
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

// 5. Performance APIs
app.get('/api/performance', (req, res) => {
  refreshStudents();
  const { batch, session, dvElite, placementSupport } = req.query;
  let filtered = [...students];
  if (batch && batch !== 'All') {
    filtered = filtered.filter(s => s.batch === batch);
  }
  if (session && session !== 'All') {
    filtered = filtered.filter(s => s.session === session);
  }
  if (dvElite === 'true') {
    filtered = filtered.filter(s => s.dvEliteEligible);
  }
  if (placementSupport === 'true') {
    filtered = filtered.filter(s => s.placementSupportEligible);
  }
  res.json(filtered);
});

// Update specific module for student
app.put('/api/performance/:id/module/:moduleName', (req, res) => {
  const { id, moduleName } = req.params;
  const student = rawStudents.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  const modIndex = student.modules.findIndex(m => m.name.toUpperCase() === decodeURIComponent(moduleName).toUpperCase());
  if (modIndex === -1) {
    return res.status(404).json({ error: "Module not found" });
  }

  student.modules[modIndex] = {
    ...student.modules[modIndex],
    ...req.body
  };

  student.timeline.push({
    date: new Date().toISOString().split('T')[0],
    event: `Scorecard updated for ${student.modules[modIndex].name}`
  });

  refreshStudents();
  res.json(students.find(s => s.id === id));
});

// Bulk update entire scorecard
app.put('/api/performance/:id', (req, res) => {
  const { id } = req.params;
  const student = rawStudents.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  if (req.body.modules) {
    student.modules = req.body.modules;
  }
  if (req.body.notes !== undefined) {
    student.notes = req.body.notes;
  }

  student.timeline.push({
    date: new Date().toISOString().split('T')[0],
    event: "Academic performance scorecard synchronized."
  });

  refreshStudents();
  res.json(students.find(s => s.id === id));
});

// 6. Feedback Triad APIs (Sheet 2)
// Unified list
app.get('/api/feedback', (req, res) => {
  const { type, studentId, batch, application } = req.query;
  let combined = [];

  if (!type || type === 'All' || type === 'Faculty') {
    combined.push(...facultyFeedbackLogs.map(item => ({ ...item, category: 'Faculty Feedback' })));
  }
  if (!type || type === 'All' || type === 'Mentor') {
    combined.push(...mentorFeedbackLogs.map(item => ({ ...item, category: 'Mentor Feedback' })));
  }
  if (!type || type === 'All' || type === 'Evaluation') {
    combined.push(...mentorEvaluationLogs.map(item => ({ ...item, category: 'Mentor Evaluation' })));
  }

  if (studentId) {
    combined = combined.filter(c => c.studentId === studentId);
  }
  if (batch && batch !== 'All') {
    combined = combined.filter(c => c.batch === batch);
  }
  if (application && application !== 'All') {
    combined = combined.filter(c => c.application && c.application.toUpperCase() === application.toUpperCase());
  }

  res.json(combined.sort((a, b) => new Date(b.callDate) - new Date(a.callDate)));
});

app.get('/api/staff', (req, res) => {
  const { type } = req.query;
  let list = [...staffMembers];
  if (type && type !== "All") {
    list = list.filter(member => member.type.toLowerCase() === String(type).toLowerCase());
  }
  res.json(list.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)));
});

app.post('/api/staff', (req, res) => {
  const data = req.body;
  const type = String(data.type || "").trim();
  const name = String(data.name || "").trim();
  if (!["Faculty", "Mentor", "Student Coordinator"].includes(type)) {
    return res.status(400).json({ error: "Staff type must be Faculty, Mentor, or Student Coordinator" });
  }
  if (!name) {
    return res.status(400).json({ error: "Staff name is required" });
  }

  let prefix = "FAC";
  if (type === "Mentor") prefix = "MEN";
  else if (type === "Student Coordinator") prefix = "SCO";
  const nextNumber = staffMembers.filter(member => member.type === type).length + 1;
  const entry = {
    id: prefix + String(nextNumber).padStart(3, "0"),
    type,
    name,
    email: data.email || "",
    phone: data.phone || "",
    status: data.status || "Active"
  };
  staffMembers.push(entry);
  res.status(201).json(entry);
});

app.delete('/api/staff/:id', (req, res) => {
  const index = staffMembers.findIndex(member => member.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Staff member not found" });
  }
  const [removed] = staffMembers.splice(index, 1);
  res.json({ message: "Staff member removed", removed });
});

// Student -> Faculty Feedback
app.post('/api/feedback/faculty', (req, res) => {
  const data = req.body;
  const student = students.find(s => s.id === data.studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const nextId = "FF" + String(facultyFeedbackLogs.length + 1).padStart(3, '0');
  const entry = {
    id: nextId,
    studentId: student.id,
    studentName: student.name,
    course: student.course,
    batch: student.batch,
    callDate: data.callDate || new Date().toISOString().split('T')[0],
    sessionDate: data.sessionDate || data.session_date || data.callDate || new Date().toISOString().split('T')[0],
    connectionStatus: data.connectionStatus || "Yes",
    feedbackType: "Faculty Feedback",
    application: data.application || "EXCEL AI",
    session: data.session || student.session || "SESSION-1",
    calledBy: data.calledBy || data.callBy || "",
    facultyName: data.facultyName || student.faculty || "Not assigned",
    facultyRating: Math.max(0, Math.min(5, parseFloat(data.facultyRating) || 5)),
    assignmentRating: Math.max(0, Math.min(5, parseFloat(data.assignmentRating) || 5)),
    videoUploaded: String(data.videoUploaded || "On Time").trim() === "Delay" ? "Delay" : "On Time",
    classTiming: Math.max(0, Math.min(5, parseFloat(data.classTiming) || 5)),
    material: Math.max(0, Math.min(5, parseFloat(data.material) || 5)),
    classSpeed: Math.max(0, Math.min(5, parseFloat(data.classSpeed) || 5)),
    overallSatisfaction: Math.max(0, Math.min(5, parseFloat(data.overallSatisfaction) || 5)),
    comments: data.comments || ""
  };

  facultyFeedbackLogs.unshift(entry);

  // Sync to unified call reviews list
  callReviewsList.unshift({
    id: callReviewsList.length + 1,
    studentId: entry.studentId,
    studentName: entry.studentName,
    batch: entry.batch,
    course: entry.course,
    application: entry.application,
    faculty: entry.facultyName,
    classMaterial: entry.material,
    video: entry.videoUploaded === "On Time" ? 5.0 : 3.5,
    deliveryOnTime: entry.classTiming,
    overallFeedback: entry.facultyRating,
    reviewSummary: entry.comments || "Faculty session feedback",
    sentiment: entry.facultyRating >= 4.0 ? "positive" : "neutral",
    date: entry.callDate,
    connected: String(entry.connectionStatus).toUpperCase() === "YES"
  });

  res.status(201).json(entry);
});

// Student -> Mentor Feedback
app.post('/api/feedback/mentor', (req, res) => {
  const data = req.body;
  const student = students.find(s => s.id === data.studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const nextId = "MF" + String(mentorFeedbackLogs.length + 1).padStart(3, '0');
  const entry = {
    id: nextId,
    studentId: student.id,
    studentName: student.name,
    course: student.course,
    batch: student.batch,
    callDate: data.callDate || new Date().toISOString().split('T')[0],
    sessionDate: data.sessionDate || data.session_date || data.callDate || new Date().toISOString().split('T')[0],
    connectionStatus: data.connectionStatus || "Yes",
    feedbackType: "Mentor Feedback",
    application: data.application || "EXCEL AI",
    session: data.session || student.session || "SESSION-1",
    calledBy: data.calledBy || data.callBy || "",
    mentorName: data.mentorName || student.counselor || "Not assigned",
    mentorRating: Math.max(0, Math.min(5, parseFloat(data.mentorRating) || 5)),
    doubtClearing: Math.max(0, Math.min(5, parseFloat(data.doubtClearing) || 5)),
    behaviour: Math.max(0, Math.min(5, parseFloat(data.behaviour) || 5)),
    attention: Math.max(0, Math.min(5, parseFloat(data.attention) || 5)),
    overallSatisfaction: Math.max(0, Math.min(5, parseFloat(data.overallSatisfaction) || 5)),
    comments: data.comments || ""
  };

  mentorFeedbackLogs.push(entry);
  res.status(201).json(entry);
});

// Mentor -> Student Evaluation Log
app.post('/api/feedback/mentor-evaluation', (req, res) => {
  const data = req.body;
  const student = students.find(s => s.id === data.studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const nextId = "ME" + String(mentorEvaluationLogs.length + 1).padStart(3, '0');
  const entry = {
    id: nextId,
    studentId: student.id,
    studentName: student.name,
    course: student.course,
    batch: student.batch,
    callDate: data.callDate || new Date().toISOString().split('T')[0],
    sessionDate: data.sessionDate || data.session_date || data.callDate || new Date().toISOString().split('T')[0],
    connectionStatus: data.connectionStatus || "Yes",
    feedbackType: "Mentor Evaluation",
    application: data.application || "EXCEL AI",
    session: data.session || student.session || "SESSION-1",
    calledBy: data.calledBy || data.callBy || "",
    mentorName: data.mentorName || student.counselor || "Not assigned",
    assignmentStatus: data.assignmentStatus || "Completed", // Completed / In Progress / Not Started
    applicationKnowledge: data.applicationKnowledge || "Good", // Low / Average / Good / Best
    overallFeedback: data.overallFeedback || ""
  };

  mentorEvaluationLogs.push(entry);

  const rawStu = rawStudents.find(s => s.id === student.id);
  if (rawStu) {
    rawStu.timeline.push({
      date: entry.callDate,
      event: `Mentor Evaluation Call Logged (${entry.application} - Knowledge: ${entry.applicationKnowledge})`
    });
  }

  res.status(201).json(entry);
});

// Helper to get ISO week string and label
function getWeekInfo(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { key: "Unknown", label: "Unknown" };
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
  const year = d.getUTCFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    key: `${year}-W${String(weekNumber).padStart(2, '0')}`,
    label: `W${weekNumber} (${monthNames[d.getUTCMonth()]})`
  };
}

// 7. Dashboards & Analytics APIs
// Executive SMS Dashboard
app.get('/api/dashboard/sms', (req, res) => {
  refreshStudents();
  const { batch, session, datePreset, startDate, endDate } = req.query;
  let list = [...students];
  if (batch && batch !== 'All') {
    list = list.filter(s => s.batch === batch);
  }
  if (session && session !== 'All') {
    list = list.filter(s => s.session === session);
  }

  const totalCohortStudents = students.length;
  const total = list.length;
  const selectedStudentsPct = totalCohortStudents > 0 ? Math.round((total / totalCohortStudents) * 100) : 0;
  const activeStudents = list.filter(s => s.status === 'Active').length;
  const activeStudentsPct = total > 0 ? Math.round((activeStudents / total) * 100) : 0;
  const activeBatches = [...new Set(list.map(s => s.batch))].length;

  const dvEliteCount = list.filter(s => s.dvEliteEligible).length;
  const placementCount = list.filter(s => s.placementSupportEligible).length;
  const dvElitePct = total > 0 ? Math.round((dvEliteCount / total) * 100) : 0;
  const placementPct = total > 0 ? Math.round((placementCount / total) * 100) : 0;
  const atRiskCount = list.filter(s => s.attendance < 75 || s.attention < 60).length;

  const avgAttendance = total ? Math.round(list.reduce((a, b) => a + b.attendance, 0) / total) : 0;
  const avgAttention = total ? Math.round(list.reduce((a, b) => a + b.attention, 0) / total) : 0;
  const avgAssignment = total ? Math.round(list.reduce((a, b) => a + b.assignmentCompletion, 0) / total) : 0;
  const avgLms = total ? Math.round(list.reduce((a, b) => a + b.lmsScore, 0) / total) : 0;

  const mcqAvg = total ? Math.round(list.reduce((a, b) => a + b.assessments.mcq, 0) / total) : 0;
  const practicalAvg = total ? Math.round(list.reduce((a, b) => a + b.assessments.practical, 0) / total) : 0;
  const hardpaperAvg = total ? Math.round(list.reduce((a, b) => a + b.assessments.hardpaper, 0) / total) : 0;
  const mockInterviewAvg = total ? Math.round(list.reduce((a, b) => a + b.assessments.mockInterview, 0) / total) : 0;

  // Top & Weak performers
  const sorted = [...list].sort((a, b) => b.lmsScore - a.lmsScore);
  const topPerformers = sorted.slice(0, 4).map(s => ({
    id: s.id,
    name: s.name,
    batch: s.batch,
    session: s.session,
    performance: s.lmsScore,
    attendance: s.attendance
  }));

  const weakStudents = sorted.filter(s => s.lmsScore < 70 || s.attendance < 75).map(s => ({
    id: s.id,
    name: s.name,
    batch: s.batch,
    session: s.session,
    performance: s.lmsScore,
    attendance: s.attendance
  }));

  // Module competence averages
  const moduleAverages = CURRICULUM_MODULES.map(name => {
    let sum = 0, count = 0;
    list.forEach(s => {
      const m = s.modules.find(mod => mod.name.toUpperCase() === name);
      if (m) {
        sum += m.overallScore;
        count++;
      }
    });
    return {
      name,
      averageScore: count ? Math.round(sum / count) : 0
    };
  });

  // ----------------------------------------------------
  // CALLING & TELEPHONY ANALYTICS (EXACT REQUIREMENTS)
  // ----------------------------------------------------
  const allCalls = [...facultyFeedbackLogs, ...mentorFeedbackLogs, ...mentorEvaluationLogs];
  let filteredCalls = allCalls.filter(call => {
    const student = students.find(s => s.id === call.studentId);
    const callBatch = call.batch || (student ? student.batch : "");
    const callSession = call.session || (student ? student.session : "");
    if (batch && batch !== 'All' && callBatch !== batch) return false;
    if (session && session !== 'All' && callSession !== session) return false;
    return true;
  });

  // Filtered student IDs
  const filteredStudentIds = new Set(list.map(s => s.id));
  if (batch !== 'All' || session !== 'All') {
    filteredCalls = filteredCalls.filter(c => filteredStudentIds.has(c.studentId));
  }

  // Date Filtering Support (all, today, yesterday, last7, last30, custom)
  const maxDateInDataset = "2026-08-25"; // Anchor date for relative filters
  const anchorTime = new Date(maxDateInDataset).getTime();

  if (datePreset === 'today') {
    filteredCalls = filteredCalls.filter(c => c.callDate === "2026-08-25");
  } else if (datePreset === 'yesterday') {
    filteredCalls = filteredCalls.filter(c => c.callDate === "2026-08-24");
  } else if (datePreset === 'last7') {
    filteredCalls = filteredCalls.filter(c => {
      const t = new Date(c.callDate).getTime();
      return t >= anchorTime - 7 * 86400000 && t <= anchorTime;
    });
  } else if (datePreset === 'last30') {
    filteredCalls = filteredCalls.filter(c => {
      const t = new Date(c.callDate).getTime();
      return t >= anchorTime - 30 * 86400000 && t <= anchorTime;
    });
  } else if (datePreset === 'custom' || (startDate && endDate)) {
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;
    filteredCalls = filteredCalls.filter(c => {
      const t = new Date(c.callDate).getTime();
      return t >= start && t <= end;
    });
  }

  // 1. Calling KPIs
  const totalCallsDialed = filteredCalls.length;
  const connectedCallsList = filteredCalls.filter(c => String(c.connectionStatus || "").toUpperCase() === 'YES');
  const totalCallsConnected = connectedCallsList.length;
  const uniqueStudentsConnected = new Set(connectedCallsList.map(c => c.studentId)).size;
  const connectPercentage = totalCallsDialed > 0 ? Math.round((totalCallsConnected / totalCallsDialed) * 100) : 0;
  const totalCallsMade = totalCallsDialed;
  const averageCallsMade = total > 0 ? Number((totalCallsMade / total).toFixed(1)) : 0;

  // 2. Trend Visualizations (Daily, Weekly, Monthly, Yearly)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Daily Trend
  const dailyMap = {};
  filteredCalls.forEach(c => {
    const d = c.callDate || "2026-08-25";
    if (!dailyMap[d]) dailyMap[d] = { date: d, dialed: 0, connected: 0 };
    dailyMap[d].dialed += 1;
    if (String(c.connectionStatus || "").toUpperCase() === 'YES') {
      dailyMap[d].connected += 1;
    }
  });
  const dailyTrend = Object.values(dailyMap)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(item => {
      const dt = new Date(item.date);
      const label = isNaN(dt.getTime()) ? item.date : `${dt.getUTCDate()} ${monthNames[dt.getUTCMonth()]}`;
      return {
        ...item,
        label,
        connectPct: item.dialed > 0 ? Math.round((item.connected / item.dialed) * 100) : 0
      };
    });

  // Weekly Trend
  const weeklyMap = {};
  filteredCalls.forEach(c => {
    const d = c.callDate || "2026-08-25";
    const { key, label } = getWeekInfo(d);
    if (!weeklyMap[key]) weeklyMap[key] = { week: key, label, dialed: 0, connected: 0, sortKey: d };
    weeklyMap[key].dialed += 1;
    if (String(c.connectionStatus || "").toUpperCase() === 'YES') {
      weeklyMap[key].connected += 1;
    }
  });
  const weeklyTrend = Object.values(weeklyMap)
    .sort((a, b) => new Date(a.sortKey) - new Date(b.sortKey))
    .map(item => ({
      week: item.week,
      label: item.label,
      dialed: item.dialed,
      connected: item.connected,
      connectPct: item.dialed > 0 ? Math.round((item.connected / item.dialed) * 100) : 0
    }));

  // Monthly Trend
  const monthlyMap = {};
  filteredCalls.forEach(c => {
    const d = c.callDate || "2026-08-25";
    const dt = new Date(d);
    const key = isNaN(dt.getTime()) ? d.slice(0, 7) : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const label = isNaN(dt.getTime()) ? key : `${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, label, dialed: 0, connected: 0, sortKey: d };
    monthlyMap[key].dialed += 1;
    if (String(c.connectionStatus || "").toUpperCase() === 'YES') {
      monthlyMap[key].connected += 1;
    }
  });
  const monthlyTrend = Object.values(monthlyMap)
    .sort((a, b) => new Date(a.sortKey) - new Date(b.sortKey))
    .map(item => ({
      month: item.month,
      label: item.label,
      dialed: item.dialed,
      connected: item.connected,
      connectPct: item.dialed > 0 ? Math.round((item.connected / item.dialed) * 100) : 0
    }));

  // Yearly Trend
  const yearlyMap = {};
  filteredCalls.forEach(c => {
    const d = c.callDate || "2026-08-25";
    const dt = new Date(d);
    const year = isNaN(dt.getTime()) ? d.slice(0, 4) : String(dt.getFullYear());
    if (!yearlyMap[year]) yearlyMap[year] = { year, label: year, dialed: 0, connected: 0 };
    yearlyMap[year].dialed += 1;
    if (String(c.connectionStatus || "").toUpperCase() === 'YES') {
      yearlyMap[year].connected += 1;
    }
  });
  const yearlyTrend = Object.values(yearlyMap)
    .sort((a, b) => a.year.localeCompare(b.year))
    .map(item => ({
      ...item,
      connectPct: item.dialed > 0 ? Math.round((item.connected / item.dialed) * 100) : 0
    }));

  // 3. Batch-wise Comparison Visualizations (Active Cohort Batches)
  const allBatchCodes = Array.from(new Set(students.map(s => s.batch))).filter(Boolean);

  // Batch-wise Students Number vs Attendance Count (Clustered Column Data)
  const batchStudentsAttendanceComparison = allBatchCodes.map(batchCode => {
    const batchStudents = students.filter(s => s.batch === batchCode);
    const totalStudents = batchStudents.length;
    const avgAttendance = totalStudents
      ? Math.round(batchStudents.reduce((acc, s) => acc + s.attendance, 0) / totalStudents)
      : 0;
    const attendanceCount = Math.round((totalStudents * avgAttendance) / 100);
    return {
      batch: batchCode,
      totalStudents,
      attendanceCount: attendanceCount || (totalStudents ? Math.max(1, Math.round(totalStudents * 0.7)) : 0),
      attendanceRate: avgAttendance,
      activeStudents: batchStudents.filter(s => s.status === 'Active').length
    };
  });

  // Attendance Comparison Batch-wise (Legacy Module Breakdown)
  const batchAttendanceOverall = allBatchCodes.map(batchCode => {
    const batchStudents = students.filter(s => s.batch === batchCode);
    const avg = batchStudents.length
      ? Math.round(batchStudents.reduce((acc, s) => acc + s.attendance, 0) / batchStudents.length)
      : 0;
    return {
      batch: batchCode,
      attendance: avg,
      studentCount: batchStudents.length
    };
  });

  const batchAttendanceByModule = CURRICULUM_MODULES.map(modName => {
    const row = { module: modName };
    allBatchCodes.forEach(batchCode => {
      const batchStudents = students.filter(s => s.batch === batchCode);
      let sum = 0, count = 0;
      batchStudents.forEach(s => {
        const m = s.modules.find(mod => mod.name.toUpperCase() === modName.toUpperCase());
        if (m) {
          sum += m.attendancePct;
          count++;
        }
      });
      row[batchCode] = count ? Math.round(sum / count) : 0;
    });
    return row;
  });

  // Batch-wise Unique Students Called
  const batchUniqueStudentsCalled = allBatchCodes.map(batchCode => {
    const batchStudents = students.filter(s => s.batch === batchCode);
    const batchStudentIds = new Set(batchStudents.map(s => s.id));
    const batchCalls = allCalls.filter(c => batchStudentIds.has(c.studentId));
    const uniqueCalled = new Set(batchCalls.map(c => c.studentId)).size;
    const connectedCalls = batchCalls.filter(c => String(c.connectionStatus || "").toUpperCase() === 'YES');
    const uniqueConnected = new Set(connectedCalls.map(c => c.studentId)).size;
    return {
      batch: batchCode,
      uniqueCalled,
      uniqueConnected,
      totalCalls: batchCalls.length,
      totalStudents: batchStudents.length
    };
  });

  // Batch-wise Total Students
  const batchTotalStudents = allBatchCodes.map(batchCode => {
    const batchStudents = students.filter(s => s.batch === batchCode);
    return {
      batch: batchCode,
      totalStudents: batchStudents.length,
      activeStudents: batchStudents.filter(s => s.status === 'Active').length
    };
  });

  // Assignment Completion by Application Module (For Donut Chart)
  const assignmentCompletionByModule = CURRICULUM_MODULES.map(name => {
    let totalSubmitted = 0;
    let totalTarget = 0;
    list.forEach(s => {
      const m = s.modules.find(mod => mod.name.toUpperCase() === name.toUpperCase());
      if (m) {
        totalSubmitted += m.assignmentTotal;
        totalTarget += m.assignmentTarget;
      }
    });
    const completionPct = totalTarget > 0 ? Math.round((totalSubmitted / totalTarget) * 100) : 0;
    const shortName = name === "DATA ENGINEERING" ? "DATA ENG" : name === "INTERVIEW PREP" ? "INTERVIEW" : name;
    return {
      module: name,
      shortName,
      submitted: totalSubmitted,
      target: totalTarget,
      completionPct
    };
  });

  const totalSubmittedAll = assignmentCompletionByModule.reduce((acc, m) => acc + m.submitted, 0);
  assignmentCompletionByModule.forEach(m => {
    m.sharePct = totalSubmittedAll > 0 ? Math.round((m.submitted / totalSubmittedAll) * 100) : Math.round(100 / CURRICULUM_MODULES.length);
  });

  res.json({
    stats: {
      totalCohortStudents,
      selectedStudents: total,
      selectedStudentsPct,
      totalStudents: total,
      activeStudents,
      activeStudentsPct,
      activeBatches,
      attendanceRate: avgAttendance,
      avgAttention,
      assignmentCompletionRate: avgAssignment,
      lmsScoreRate: avgLms,
      mcqAvg,
      practicalAvg,
      hardpaperAvg,
      mockInterviewAvg,
      coreLmsPillars: {
        mcq: mcqAvg,
        practical: practicalAvg,
        attendance: avgAttendance,
        lmsScore: avgLms
      },
      readinessAssessments: {
        penAndPaper: hardpaperAvg,
        mockInterview: mockInterviewAvg,
        dvEliteCount,
        dvElitePct,
        placementCount,
        placementPct
      },
      dvEliteCount,
      dvElitePct,
      placementCount,
      placementPct,
      atRiskCount,
      topPerformers,
      weakStudents,
      classes: upcomingClasses,

      // Calling KPIs
      totalCallsDialed,
      totalCallsConnected,
      uniqueStudentsConnected,
      connectPercentage,
      totalCallsMade,
      averageCallsMade,

      // Assignment Donut
      assignmentDonut: assignmentCompletionByModule
    },
    assignmentDonut: assignmentCompletionByModule,
    callingKpis: {
      totalCohortStudents,
      selectedStudents: total,
      selectedStudentsPct,
      totalCallsDialed,
      totalCallsConnected,
      totalStudents: total,
      uniqueStudentsConnected,
      connectPercentage,
      totalCallsMade,
      averageCallsMade
    },
    trends: {
      daily: dailyTrend,
      weekly: weeklyTrend,
      monthly: monthlyTrend,
      yearly: yearlyTrend
    },
    comparisons: {
      batchStudentsAttendanceComparison,
      batchAttendanceOverall,
      batchAttendanceByModule,
      batchUniqueStudentsCalled,
      batchTotalStudents,
      batches: allBatchCodes
    },
    moduleAverages,
    upcomingClasses,
    alerts,
    batches,
    sessions
  });
});

// SRM / Feedback Dashboard
app.get('/api/dashboard/srm', (req, res) => {
  const { batch, session, startDate, endDate } = req.query;

  let filteredFaculty = [...facultyFeedbackLogs];
  let filteredMentor = [...mentorFeedbackLogs];
  let filteredEvals = [...mentorEvaluationLogs];

  if (batch && batch !== 'All') {
    filteredFaculty = filteredFaculty.filter(f => f.batch === batch);
    filteredMentor = filteredMentor.filter(m => m.batch === batch);
    filteredEvals = filteredEvals.filter(e => e.batch === batch);
  }

  if (session && session !== 'All') {
    filteredFaculty = filteredFaculty.filter(f => f.session === session);
    filteredMentor = filteredMentor.filter(m => m.session === session);
    filteredEvals = filteredEvals.filter(e => e.session === session);
  }

  if (startDate) {
    filteredFaculty = filteredFaculty.filter(f => f.callDate >= startDate);
    filteredMentor = filteredMentor.filter(m => m.callDate >= startDate);
    filteredEvals = filteredEvals.filter(e => e.callDate >= startDate);
  }
  if (endDate) {
    filteredFaculty = filteredFaculty.filter(f => f.callDate <= endDate);
    filteredMentor = filteredMentor.filter(m => m.callDate <= endDate);
    filteredEvals = filteredEvals.filter(e => e.callDate <= endDate);
  }

  const totalCalls = filteredEvals.length + filteredFaculty.length + filteredMentor.length;
  const allFeedbackCalls = [...filteredEvals, ...filteredFaculty, ...filteredMentor];
  const connectedCalls = allFeedbackCalls.filter(m => String(m.connectionStatus).toUpperCase() === 'YES').length;
  const connectionRate = allFeedbackCalls.length ? Math.round((connectedCalls / allFeedbackCalls.length) * 100) : 100;

  // Faculty Feedback Calculations (Connected Calls with valid rating)
  const connectedFacultyLogs = filteredFaculty.filter(f => String(f.connectionStatus).toUpperCase() === 'YES' && Number(f.facultyRating) > 0);
  const positiveFacultyLogs = connectedFacultyLogs.filter(f => Number(f.facultyRating) >= 4.0);

  const avgFacultyRating = connectedFacultyLogs.length ? 
    (connectedFacultyLogs.reduce((a, b) => a + Number(b.facultyRating), 0) / connectedFacultyLogs.length).toFixed(2) : "0.00";
  const facultyPositiveRate = connectedFacultyLogs.length ?
    Math.round((positiveFacultyLogs.length / connectedFacultyLogs.length) * 100) : 0;

  const connectedMentorLogs = filteredMentor.filter(m => String(m.connectionStatus).toUpperCase() === 'YES' && Number(m.mentorRating) > 0);
  const avgMentorRating = connectedMentorLogs.length ? 
    (connectedMentorLogs.reduce((a, b) => a + Number(b.mentorRating), 0) / connectedMentorLogs.length).toFixed(2) : "0.00";
  const avgSatisfaction = connectedFacultyLogs.length ? 
    (connectedFacultyLogs.reduce((a, b) => a + Number(b.overallSatisfaction), 0) / connectedFacultyLogs.length).toFixed(2) : "0.00";

  // Per-Faculty Rating Calculation & Top 3 Ranking
  const facultyMap = {};

  // Seed with registered faculty
  staffMembers.filter(s => s.type === 'Faculty').forEach(staff => {
    facultyMap[staff.name] = {
      name: staff.name,
      id: staff.id,
      email: staff.email,
      totalLogs: 0,
      connectedLogs: 0,
      ratingSum: 0,
      positiveCount: 0,
      satisfactionSum: 0,
      materialSum: 0,
      timingSum: 0,
      speedSum: 0
    };
  });

  filteredFaculty.forEach(log => {
    const fName = log.facultyName || "Unassigned Faculty";
    if (!facultyMap[fName]) {
      facultyMap[fName] = {
        name: fName,
        id: "",
        email: "",
        totalLogs: 0,
        connectedLogs: 0,
        ratingSum: 0,
        positiveCount: 0,
        satisfactionSum: 0,
        materialSum: 0,
        timingSum: 0,
        speedSum: 0
      };
    }
    facultyMap[fName].totalLogs += 1;
    if (String(log.connectionStatus).toUpperCase() === 'YES' && Number(log.facultyRating) > 0) {
      const r = Number(log.facultyRating);
      facultyMap[fName].connectedLogs += 1;
      facultyMap[fName].ratingSum += r;
      if (r >= 4.0) {
        facultyMap[fName].positiveCount += 1;
      }
      facultyMap[fName].satisfactionSum += Number(log.overallSatisfaction) || 0;
      facultyMap[fName].materialSum += Number(log.material) || 0;
      facultyMap[fName].timingSum += Number(log.classTiming) || 0;
      facultyMap[fName].speedSum += Number(log.classSpeed) || 0;
    }
  });

  const facultyRankings = Object.values(facultyMap).map(f => {
    const count = f.connectedLogs;
    const avgRating = count > 0 ? Number((f.ratingSum / count).toFixed(2)) : 0;
    const positivePct = count > 0 ? Math.round((f.positiveCount / count) * 100) : 0;
    const avgSat = count > 0 ? Number((f.satisfactionSum / count).toFixed(2)) : 0;
    const avgMat = count > 0 ? Number((f.materialSum / count).toFixed(2)) : 0;
    const avgTim = count > 0 ? Number((f.timingSum / count).toFixed(2)) : 0;
    const avgSpd = count > 0 ? Number((f.speedSum / count).toFixed(2)) : 0;

    return {
      name: f.name,
      id: f.id,
      email: f.email,
      totalLogs: f.totalLogs,
      connectedLogs: f.connectedLogs,
      avgRating,
      positiveCount: f.positiveCount,
      positivePercentage: positivePct,
      avgSatisfaction: avgSat,
      avgMaterial: avgMat,
      avgTiming: avgTim,
      avgSpeed: avgSpd
    };
  })
  .filter(f => f.totalLogs > 0 || f.connectedLogs > 0)
  .sort((a, b) => {
    if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
    if (b.positivePercentage !== a.positivePercentage) return b.positivePercentage - a.positivePercentage;
    return b.connectedLogs - a.connectedLogs;
  });

  facultyRankings.forEach((f, index) => {
    f.rank = index + 1;
  });

  const topFaculty = facultyRankings.slice(0, 3);

  // Knowledge distribution
  const knowledgeDist = {
    Best: filteredEvals.filter(m => String(m.applicationKnowledge).toUpperCase() === 'BEST').length,
    Good: filteredEvals.filter(m => String(m.applicationKnowledge).toUpperCase() === 'GOOD').length,
    Average: filteredEvals.filter(m => String(m.applicationKnowledge).toUpperCase() === 'AVERAGE').length,
    Low: filteredEvals.filter(m => String(m.applicationKnowledge).toUpperCase() === 'LOW').length
  };

  // Assignment status distribution
  const assignmentDist = {
    Completed: filteredEvals.filter(m => String(m.assignmentStatus).toUpperCase() === 'COMPLETED').length,
    InProgress: filteredEvals.filter(m => String(m.assignmentStatus).toUpperCase() === 'IN PROGRESS').length,
    NotStarted: filteredEvals.filter(m => String(m.assignmentStatus).toUpperCase() === 'NOT STARTED').length
  };

  res.json({
    stats: {
      totalFeedbackCount: totalCalls,
      connectionRate,
      avgFacultyRating,
      avgMentorRating,
      avgSatisfaction,
      facultyPositiveRate,
      totalFacultyLogs: filteredFaculty.length,
      connectedFacultyLogs: connectedFacultyLogs.length,
      topFacultyName: topFaculty[0] ? topFaculty[0].name : "N/A"
    },
    facultyFeedback: {
      totalLogs: filteredFaculty.length,
      connectedLogs: connectedFacultyLogs.length,
      avgRating: avgFacultyRating,
      positiveRate: facultyPositiveRate,
      positiveCount: positiveFacultyLogs.length,
      topFaculty,
      allFaculty: facultyRankings
    },
    knowledgeDist,
    assignmentDist,
    recentFacultyFeedback: filteredFaculty.slice(-5).reverse(),
    recentMentorFeedback: filteredMentor.slice(-5).reverse(),
    recentEvaluations: filteredEvals.slice(-5).reverse()
  });
});

// ----------------------------------------------------
// DEDICATED STUDENT REVIEW & PERFORMANCE DASHBOARD DATA
// ----------------------------------------------------

const baseCallReviews = [];

let generatedReviews = [];
let callReviewsList = generatedReviews;

app.get('/api/dashboard/performance-view', (req, res) => {
  refreshStudents();
  const { studentId, batch } = req.query;

  let targetStudent = null;
  if (studentId && studentId !== 'All') {
    targetStudent = students.find(s => (
      s.id === studentId ||
      (s.studentId && s.studentId === studentId) ||
      s.name.toLowerCase() === studentId.toLowerCase()
    ));
  }
  if (!targetStudent && batch && batch !== 'All') {
    targetStudent = students.find(s => s.batch === batch);
  }
  if (!targetStudent) {
    targetStudent = students[0] || null;
  }

  const studentsList = students.map(s => ({
    id: s.id,
    name: s.name,
    batch: s.batch,
    course: s.course
  }));
  const batchNames = [...new Set(students.map(s => s.batch).filter(Boolean))];

  if (!targetStudent) {
    return res.json({
      student: null,
      studentsList,
      batches: batchNames,
      batchSummary: {
        batchName: "",
        totalStudents: 0,
        eliteSelected: { count: 0, pct: 0 },
        eliteNotSelected: { count: 0, pct: 0 },
        placementEligible: { count: 0, pct: 0 },
        placementNotEligible: { count: 0, pct: 0 }
      }
    });
  }

  const currentBatch = targetStudent.batch || "";
  const batchStudents = students.filter(s => s.batch === currentBatch);
  const selectedEliteCount = batchStudents.filter(s => s.dvEliteEligible).length;
  const placementEligibleCount = batchStudents.filter(s => s.placementSupportEligible).length;
  const totalStudents = batchStudents.length;

  const applicationScorecard = (targetStudent.modules || []).map((m, idx) => ({
    id: idx + 1,
    name: m.name,
    attendedDays: m.attended || 0,
    totalDays: m.classes || 0,
    attendanceDisplay: `${m.attended || 0} / ${m.classes || 0}`,
    attendedHours: m.hoursAttended || (m.attended || 0) * 2,
    totalHours: m.classHours || (m.classes || 0) * 2,
    hoursDisplay: `${m.hoursAttended || (m.attended || 0) * 2} / ${m.classHours || (m.classes || 0) * 2}`,
    attendancePct: m.attendancePct || 0,
    assignmentPct: m.assignmentPct || 0,
    testScorePct: m.testScore || m.test || 0,
    performanceLevel: m.performanceLevel || "Not Rated"
  }));

  res.json({
    student: {
      id: targetStudent.id,
      studentId: targetStudent.studentId || targetStudent.id,
      name: targetStudent.name,
      batch: targetStudent.batch,
      course: targetStudent.course,
      avatar: targetStudent.avatar || "",
      attendancePct: targetStudent.attendancePct || 0,
      attendanceDays: `${targetStudent.totalAttended || 0} / ${targetStudent.totalClasses || 0}`,
      attendedDays: targetStudent.totalAttended || 0,
      totalDays: targetStudent.totalClasses || 0,
      trainingHours: `${targetStudent.totalHoursAttended || 0} / ${targetStudent.totalHours || 0}`,
      attendedHours: targetStudent.totalHoursAttended || 0,
      totalHours: targetStudent.totalHours || 0,
      assignmentCompletion: targetStudent.assignmentCompletion || 0,
      testScoreAvg: targetStudent.testScoreAvg || targetStudent.assessments?.practical || 0,
      overallScore: targetStudent.overallScore || targetStudent.weightedScore || 0,
      overallLevel: targetStudent.overallLevel || "Not Rated",
      eliteGroup: targetStudent.eliteGroup || (targetStudent.dvEliteEligible ? "SELECTED" : "NOT SELECTED"),
      placementSupport: targetStudent.placementSupport || (targetStudent.placementSupportEligible ? "YES" : "NO"),
      placementReadiness: targetStudent.placementReadiness || 0,
      currentStatus: targetStudent.currentStatus || "Not Rated",
      performanceTrend: targetStudent.performanceTrend || [],
      modules: applicationScorecard,
      overallBreakdown: {
        attendance: { weightPct: 30, scorePct: targetStudent.attendancePct || 0 },
        assignments: { weightPct: 30, scorePct: targetStudent.assignmentCompletion || 0 },
        testScore: { weightPct: 40, scorePct: targetStudent.testScoreAvg || targetStudent.assessments?.practical || 0 }
      }
    },
    studentsList,
    batches: batchNames,
    batchSummary: {
      batchName: currentBatch,
      totalStudents,
      eliteSelected: { count: selectedEliteCount, pct: totalStudents ? Math.round((selectedEliteCount / totalStudents) * 1000) / 10 : 0 },
      eliteNotSelected: { count: totalStudents - selectedEliteCount, pct: totalStudents ? Math.round(((totalStudents - selectedEliteCount) / totalStudents) * 1000) / 10 : 0 },
      placementEligible: { count: placementEligibleCount, pct: totalStudents ? Math.round((placementEligibleCount / totalStudents) * 1000) / 10 : 0 },
      placementNotEligible: { count: totalStudents - placementEligibleCount, pct: totalStudents ? Math.round(((totalStudents - placementEligibleCount) / totalStudents) * 1000) / 10 : 0 }
    }
  });
});

app.get('/api/dashboard/reviews-view', (req, res) => {
  const { batch, search, startDate, endDate } = req.query;
  let list = [...callReviewsList];

  if (batch && batch !== 'All' && batch !== 'All Batches') {
    list = list.filter(r => r.batch === batch);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(r =>
      (r.studentId && r.studentId.toLowerCase().includes(q)) ||
      (r.studentName && r.studentName.toLowerCase().includes(q)) ||
      (r.batch && r.batch.toLowerCase().includes(q)) ||
      (r.course && r.course.toLowerCase().includes(q)) ||
      (r.application && r.application.toLowerCase().includes(q)) ||
      (r.faculty && r.faculty.toLowerCase().includes(q)) ||
      (r.reviewSummary && r.reviewSummary.toLowerCase().includes(q))
    );
  }
  if (startDate && endDate) {
    list = list.filter(r => r.date >= startDate && r.date <= endDate);
  }

  const totalReviews = list.length;
  const avgOverall = totalReviews > 0 ? (list.reduce((acc, r) => acc + (Number(r.overallFeedback) || 0), 0) / totalReviews).toFixed(1) : "0.0";
  const positiveReviews = list.filter(r => (Number(r.overallFeedback) || 0) >= 4.0).length;
  const positivePct = totalReviews > 0 ? ((positiveReviews / totalReviews) * 100).toFixed(1) : "0.0";
  const suggestions = list.filter(r => (Number(r.overallFeedback) || 0) < 4.0).length;
  const suggestionsPct = totalReviews > 0 ? ((suggestions / totalReviews) * 100).toFixed(1) : "0.0";
  const callsConnected = list.filter(r => r.connected !== false).length;

  // Distribution
  const count5 = list.filter(r => (Number(r.overallFeedback) || 0) >= 4.8).length;
  const count4 = list.filter(r => (Number(r.overallFeedback) || 0) >= 4.0 && (Number(r.overallFeedback) || 0) < 4.8).length;
  const count3 = list.filter(r => (Number(r.overallFeedback) || 0) >= 3.0 && (Number(r.overallFeedback) || 0) < 4.0).length;
  const count12 = list.filter(r => (Number(r.overallFeedback) || 0) < 3.0).length;

  const pct5 = totalReviews > 0 ? ((count5 / totalReviews) * 100).toFixed(1) : "0.0";
  const pct4 = totalReviews > 0 ? ((count4 / totalReviews) * 100).toFixed(1) : "0.0";
  const pct3 = totalReviews > 0 ? ((count3 / totalReviews) * 100).toFixed(1) : "0.0";
  const pct12 = totalReviews > 0 ? ((count12 / totalReviews) * 100).toFixed(1) : "0.0";

  // Category averages
  const avgFac = totalReviews > 0 ? (list.reduce((acc, r) => acc + (Number(r.facultyRating || r.overallFeedback) || 0), 0) / totalReviews).toFixed(1) : "0.0";
  const avgMat = totalReviews > 0 ? (list.reduce((acc, r) => acc + (Number(r.classMaterial || r.material) || 0), 0) / totalReviews).toFixed(1) : "0.0";
  const avgVid = totalReviews > 0 ? (list.reduce((acc, r) => acc + (Number(r.video) || 0), 0) / totalReviews).toFixed(1) : "0.0";
  const avgDel = totalReviews > 0 ? (list.reduce((acc, r) => acc + (Number(r.deliveryOnTime || r.timing) || 0), 0) / totalReviews).toFixed(1) : "0.0";

  // Reviews by batch (Dynamically computed based on filtered results)
  const batchCountsMap = {};
  list.forEach(r => {
    if (r.batch) batchCountsMap[r.batch] = (batchCountsMap[r.batch] || 0) + 1;
  });
  const reviewsByBatch = Object.entries(batchCountsMap)
    .map(([batch, count]) => ({ batch, count }))
    .sort((a, b) => b.count - a.count);

  // Dynamic Feedback Trend calculation accurately partitioned from filtered list
  const trendByDate = {};
  list.forEach(r => {
    if (!r.date) return;
    if (!trendByDate[r.date]) trendByDate[r.date] = [];
    trendByDate[r.date].push(Number(r.overallFeedback) || 0);
  });
  const feedbackTrend = Object.keys(trendByDate).sort().slice(-6).map(date => {
    const values = trendByDate[date];
    const rating = values.length ? values.reduce((acc, val) => acc + val, 0) / values.length : 0;
    return { date: date.slice(5), rating: parseFloat(rating.toFixed(1)) };
  });

  const uniqueBatches = Array.from(new Set(callReviewsList.map(r => r.batch).filter(b => b && b !== 'All' && b !== 'All Batches')));

  res.json({
    kpis: {
      totalReviews,
      overallRating: avgOverall,
      positiveReviews: { count: positiveReviews, pct: positivePct },
      suggestions: { count: suggestions, pct: suggestionsPct },
      callsConnected
    },
    distribution: {
      total: totalReviews,
      excellent: { count: count5, pct: pct5 },
      veryGood: { count: count4, pct: pct4 },
      good: { count: count3, pct: pct3 },
      needsImprovement: { count: count12, pct: pct12 }
    },
    categoryRatings: {
      faculty: parseFloat(avgFac),
      classMaterial: parseFloat(avgMat),
      videoQuality: parseFloat(avgVid),
      deliveryOnTime: parseFloat(avgDel),
      overallFeedback: parseFloat(avgOverall)
    },
    reviewsByBatch,
    feedbackTrend,
    batches: uniqueBatches,
    reviews: list
  });
});

// Post review endpoint
app.post('/api/reviews', (req, res) => {
  const data = req.body;
  const newId = callReviewsList.length + 1;
  const newEntry = {
    id: newId,
    studentId: data.studentId || `STU2025${String(newId + 100).padStart(4, '0')}`,
    studentName: data.studentName || "Student",
    batch: data.batch || "",
    course: data.course || "Data Analytics with AI",
    application: data.application || "SQL",
    faculty: data.faculty || "",
    classMaterial: parseFloat(data.classMaterial) || 5.0,
    video: parseFloat(data.video) || 5.0,
    deliveryOnTime: parseFloat(data.deliveryOnTime) || 5.0,
    overallFeedback: parseFloat(data.overallFeedback) || 5.0,
    reviewSummary: data.reviewSummary || "Good session",
    sentiment: parseFloat(data.overallFeedback) >= 4.0 ? "positive" : "neutral",
    date: data.date || new Date().toISOString().split('T')[0],
    connected: true
  };
  callReviewsList.unshift(newEntry);

  // Sync to faculty feedback logs
  facultyFeedbackLogs.unshift({
    id: "FF" + String(facultyFeedbackLogs.length + 1).padStart(3, '0'),
    studentId: newEntry.studentId,
    studentName: newEntry.studentName,
    course: newEntry.course,
    batch: newEntry.batch,
    callDate: newEntry.date,
    connectionStatus: newEntry.connected ? "YES" : "NO",
    feedbackType: "Faculty Feedback",
    application: newEntry.application,
    session: "SESSION-1",
    facultyName: newEntry.faculty,
    facultyRating: newEntry.overallFeedback,
    assignmentRating: newEntry.classMaterial,
    videoUploaded: newEntry.video >= 4.0 ? "On Time" : "Delay",
    classTiming: newEntry.deliveryOnTime,
    material: newEntry.classMaterial,
    classSpeed: 4.0,
    overallSatisfaction: newEntry.overallFeedback,
    comments: newEntry.reviewSummary
  });

  res.status(201).json(newEntry);
});

// Alerts endpoints
app.post('/api/alerts/:id/resolve', (req, res) => {
  alerts = alerts.filter(a => a.id !== req.params.id);
  res.json({ message: "Alert resolved" });
});

app.post('/api/alerts/clear-all', (req, res) => {
  alerts = [];
  res.json({ message: "All alerts cleared" });
});

// SPA Catch-all
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'student-performance-dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`I-SMS Server running on http://localhost:${PORT}`);
});
