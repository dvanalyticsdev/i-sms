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
  const classes = m.classes || 10;
  const attended = Math.min(classes, Math.max(0, m.attended || 0));
  const attendancePct = classes > 0 ? Math.round((attended / classes) * 100) : 0;
  
  const classDuration = m.classDuration || classes * 120; // 120 mins per class default (1200 mins)
  const classAttention = Math.min(classDuration, Math.max(0, m.classAttention || 0));
  const attentionPct = classDuration > 0 ? Math.round((classAttention / classDuration) * 100) : 0;
  
  const assignments = m.assignments || { s1: false, s2: false, s3: false, s4: false, s5: false, s6: false };
  const assignmentTotal = Object.values(assignments).filter(Boolean).length;
  const assignmentTarget = m.assignmentTarget || 6;
  const assignmentPct = assignmentTarget > 0 ? Math.round((assignmentTotal / assignmentTarget) * 100) : 0;
  
  const mcq = Math.max(0, Math.min(100, Math.round(m.mcq ?? 0)));
  const test = Math.max(0, Math.min(100, Math.round(m.test ?? 0)));
  const penAndPaper = Math.max(0, Math.min(100, Math.round(m.penAndPaper ?? 0)));
  const mockInterview = Math.max(0, Math.min(100, Math.round(m.mockInterview ?? 0)));
  // Core Application LMS Pillars: MCQ, Practical Test, and Attendance %
  const overallScore = Math.round((mcq + test + attendancePct) / 3);

  return {
    name: m.name,
    classes,
    attended,
    attendancePct,
    classDuration,
    classAttention,
    attentionPct,
    assignments,
    assignmentTotal,
    assignmentTarget,
    assignmentPct,
    mcq,
    test,
    penAndPaper,
    mockInterview,
    overallScore
  };
}

// Helper to compute full student-level aggregates & rules
function computeStudentAggregates(student) {
  const modules = (student.modules || []).map(computeModuleMetrics);
  
  const totalClasses = modules.reduce((a, b) => a + b.classes, 0) || 100;
  const totalAttended = modules.reduce((a, b) => a + b.attended, 0);
  const overallAttendance = Math.round((totalAttended / totalClasses) * 100);

  const totalDuration = modules.reduce((a, b) => a + b.classDuration, 0) || 12000;
  const totalAttention = modules.reduce((a, b) => a + b.classAttention, 0);
  const overallAttention = Math.round((totalAttention / totalDuration) * 100);

  const totalAssignments = modules.reduce((a, b) => a + b.assignmentTotal, 0);
  const totalTargetAssignments = modules.reduce((a, b) => a + b.assignmentTarget, 0) || 60;
  const overallAssignmentPct = Math.round((totalAssignments / totalTargetAssignments) * 100);

  const avgMcq = modules.length ? Math.round(modules.reduce((a, b) => a + b.mcq, 0) / modules.length) : 0;
  const avgTest = modules.length ? Math.round(modules.reduce((a, b) => a + b.test, 0) / modules.length) : 0;
  const avgPenPaper = modules.length ? Math.round(modules.reduce((a, b) => a + b.penAndPaper, 0) / modules.length) : 0;
  const avgMock = modules.length ? Math.round(modules.reduce((a, b) => a + b.mockInterview, 0) / modules.length) : 0;
  
  // Core Application LMS Score: MCQ, Practical Test, and Attendance %
  const lmsScore = Math.round((avgMcq + avgTest + overallAttendance) / 3);

  // Dedicated Readiness & Placement Evaluations (Pen & Paper and Mock Interview)
  // Rule 1: DV ELITE (Overall Application LMS >= 70%, SQL, Python, SAS, ML >= 70%, Pen & Paper >= 70%, Attendance >= 75%)
  const eliteModules = ["SQL", "PYTHON", "SAS", "ML"];
  const dvEliteEligible = overallAttendance >= 75 && avgPenPaper >= 70 && eliteModules.every(modName => {
    const mod = modules.find(m => m.name.toUpperCase() === modName);
    return mod && mod.overallScore >= 70;
  });

  // Rule 2: PLACEMENT SUPPORT (Mock Interview >= 70%, Pen & Paper >= 70%, Attendance >= 75%)
  const placementSupportEligible = overallAttendance >= 75 && avgMock >= 70 && avgPenPaper >= 70;

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
    attention: overallAttention,
    assignmentCompletion: overallAssignmentPct,
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
    placementSupportEligible,
    attendanceResult,
    attentionResult
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

function createStudentReportPdf(student) {
  const logoPath = path.join(__dirname, 'public', 'Logos', 'DV-Logo.png');
  const logo = parsePngForPdf(logoPath);
  const objects = [];
  const addObject = content => {
    objects.push(Buffer.isBuffer(content) ? content : Buffer.from(content, 'binary'));
    return objects.length;
  };

  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const logoId = addObject(Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.data.length} >>\nstream\n`, 'binary'),
    logo.data,
    Buffer.from("\nendstream", 'binary')
  ]));

  const pageIds = [];
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 44;
  const contentRight = pageWidth - margin;
  const orange = "0.941 0.353 0.157";
  const navy = "0.071 0.094 0.173";
  const muted = "0.376 0.435 0.529";
  const border = "0.82 0.84 0.88";
  const light = "0.965 0.972 0.984";
  let ops = [];
  let y = 760;
  let pageNo = 0;

  const newPage = () => {
    ops = [];
    y = 760;
    pageNo += 1;
  };

  const finishPage = () => {
    drawFooter();
    const stream = Buffer.from(ops.join("\n"), 'binary');
    const contentId = addObject(Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'binary'),
      stream,
      Buffer.from("\nendstream", 'binary')
    ]));
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Logo ${logoId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  };

  const ensureSpace = amount => {
    if (y - amount < 78) {
      finishPage();
      newPage();
      drawHeader();
    }
  };

  const setFill = color => ops.push(`${color} rg`);
  const setStroke = color => ops.push(`${color} RG`);

  const textAt = (value, x, yy, size = 10, bold = false, color = navy) => {
    setFill(color);
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${yy} Td (${pdfEscape(value)}) Tj ET`);
  };

  const text = (value, x, size = 10, bold = false, color = navy) => {
    textAt(value, x, y, size, bold, color);
  };

  const line = (x1, y1, x2, y2) => {
    setStroke(border);
    ops.push(`0.7 w ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const rect = (x, yy, w, h, fillColor = null, strokeColor = border) => {
    if (fillColor) {
      setFill(fillColor);
      ops.push(`${x} ${yy} ${w} ${h} re f`);
    }
    if (strokeColor) {
      setStroke(strokeColor);
      ops.push(`0.7 w ${x} ${yy} ${w} ${h} re S`);
    }
  };

  const drawHeader = () => {
    setFill(orange);
    ops.push(`${margin} 804 ${contentRight - margin} 4 re f`);
    ops.push("q 82 0 0 35 454 754 cm /Logo Do Q");
    textAt("I-SMS", margin, 780, 10, true, orange);
    textAt("Student Performance Report", margin, 758, 22, true, navy);
    textAt(`${student.name} (${student.id})`, margin, 738, 12, true, navy);
    textAt(`Generated: ${new Date().toISOString().split('T')[0]}`, margin, 721, 9, false, muted);
    line(margin, 704, contentRight, 704);
    y = 678;
  };

  const drawFooter = () => {
    line(margin, 48, contentRight, 48);
    textAt("DV Analytics / I-SMS", margin, 32, 8, false, muted);
    textAt(`Page ${pageNo}`, contentRight - 42, 32, 8, false, muted);
  };

  const section = title => {
    ensureSpace(42);
    text(title, margin, 14, true, navy);
    y -= 10;
    setFill(orange);
    ops.push(`${margin} ${y} 34 2 re f`);
    line(margin + 40, y + 1, contentRight, y + 1);
    y -= 22;
  };

  const keyValueAt = (label, value, x, yy, width = 220) => {
    textAt(label, x, yy, 8, true, muted);
    const lines = wrapText(value, Math.floor(width / 5.3));
    lines.forEach((lineText, idx) => {
      textAt(lineText, x, yy - 13 - idx * 12, 10, idx === 0, navy);
    });
    return 16 + lines.length * 12;
  };

  const paragraph = (value, x, maxChars, size = 9) => {
    wrapText(value, maxChars).forEach(lineText => {
      ensureSpace(14);
      text(lineText, x, size, false, navy);
      y -= 13;
    });
  };

  const moduleScore = mod => Math.round((mod.mcq + mod.test + mod.penAndPaper + mod.mockInterview) / 4);
  const strongestModules = [...student.modules].sort((a, b) => moduleScore(b) - moduleScore(a)).slice(0, 3);
  const focusModules = [...student.modules]
    .sort((a, b) => {
      const aRisk = (a.attendancePct < 75 ? 20 : 0) + (a.attentionPct < 60 ? 20 : 0) + (moduleScore(a) < 50 ? 20 : 0) + (100 - moduleScore(a));
      const bRisk = (b.attendancePct < 75 ? 20 : 0) + (b.attentionPct < 60 ? 20 : 0) + (moduleScore(b) < 50 ? 20 : 0) + (100 - moduleScore(b));
      return bRisk - aRisk;
    })
    .slice(0, 3);

  newPage();
  drawHeader();

  section("Student Summary");
  const summaryY = y;
  const h1 = keyValueAt("Course", student.program, margin, summaryY, 230);
  const h2 = keyValueAt("Batch / Session", `${student.batch} / ${student.session}`, 310, summaryY, 220);
  const rowHeight1 = Math.max(h1, h2);
  const summaryY2 = summaryY - rowHeight1 - 10;
  const h3 = keyValueAt("Email", student.email || "Not recorded", margin, summaryY2, 230);
  const h4 = keyValueAt("Mobile", student.mobile || "Not recorded", 310, summaryY2, 220);
  y = summaryY2 - Math.max(h3, h4) - 14;

  section("Performance Snapshot");
  const cards = [
    ["Attendance", `${student.attendance}%`, student.attendanceResult],
    ["Focus Rate", `${student.attention}%`, student.attentionResult],
    ["Assignments", `${student.assignmentCompletion}%`, "S1-S6 completion"],
    ["LMS Score", `${student.lmsScore}%`, "Assessment pillar average"]
  ];
  ensureSpace(88);
  cards.forEach((card, idx) => {
    const x = margin + idx * 126;
    rect(x, y - 66, 116, 66, light, border);
    setFill(orange);
    ops.push(`${x} ${y - 66} 3 66 re f`);
    textAt(card[0], x + 12, y - 18, 8, true, muted);
    textAt(card[1], x + 12, y - 42, 22, true, navy);
    wrapText(card[2], 21).slice(0, 2).forEach((lineText, lineIndex) => {
      textAt(lineText, x + 12, y - 55 - lineIndex * 9, 7, false, muted);
    });
  });
  y -= 90;

  section("Eligibility Rules");
  paragraph(`DV Elite: ${student.dvEliteEligible ? "Eligible" : "Pending"} - SQL, Python, SAS, and ML must score at least 70%.`, margin, 102, 10);
  paragraph(`Placement Support: ${student.placementSupportEligible ? "Ready" : "Pending"} - mock interview average must be at least 70%.`, margin, 102, 10);
  y -= 4;
  rect(margin, y - 42, contentRight - margin, 46, "1 0.985 0.965", "0.94 0.72 0.62");
  textAt("Counselor Note", margin + 12, y - 12, 8, true, orange);
  wrapText(student.notes || "No note recorded.", 94).slice(0, 2).forEach((lineText, idx) => {
    textAt(lineText, margin + 12, y - 27 - idx * 11, 9, false, navy);
  });
  y -= 62;

  section("Executive Insights");
  ensureSpace(176);
  const insightTop = y;
  const insightCard = (title, items, x, yy, w, h) => {
    rect(x, yy - h, w, h, light, border);
    textAt(title, x + 10, yy - 14, 8, true, muted);
    items.forEach((item, idx) => {
      textAt(item, x + 10, yy - 32 - idx * 15, 9, idx === 0, navy);
    });
  };

  insightCard(
    "Strongest Modules",
    strongestModules.map(mod => `${mod.name}: ${moduleScore(mod)}%`),
    margin,
    insightTop,
    240,
    82
  );
  insightCard(
    "Needs Focus",
    focusModules.map(mod => `${mod.name}: ${moduleScore(mod)}%, Att. ${mod.attendancePct}%`),
    305,
    insightTop,
    240,
    82
  );

  y = insightTop - 104;
  rect(margin, y - 70, contentRight - margin, 74, "0.965 0.985 0.975", "0.70 0.84 0.76");
  textAt("Recommended Actions", margin + 12, y - 14, 8, true, muted);
  const actionItems = [];
  if (student.attendance < 75) actionItems.push("Schedule attendance recovery plan for low-attendance modules.");
  if (student.attention < 70) actionItems.push("Add mentor check-ins to improve class focus and doubt clearing.");
  if (student.assignmentCompletion < 80) actionItems.push("Prioritize pending S1-S6 assignment submissions.");
  if (student.lmsScore < 70) actionItems.push("Plan remedial assessment practice before placement support.");
  if (!actionItems.length) actionItems.push("Continue current learning plan and prepare for advanced placement support.");
  actionItems.slice(0, 4).forEach((item, idx) => {
    textAt(`${idx + 1}. ${item}`, margin + 12, y - 31 - idx * 12, 8.5, false, navy);
  });
  y -= 94;

  ensureSpace(70 + student.modules.length * 18);
  section("Module Scorecard");
  const headers = ["Application", "Attendance", "Attention", "Assign.", "MCQ", "Test", "Paper", "Mock", "Score"];
  const colX = [margin, 194, 260, 320, 372, 412, 450, 490, 530];
  rect(margin, y - 11, contentRight - margin, 22, light, null);
  headers.forEach((header, index) => {
    textAt(header, colX[index], y - 2, 7, true, muted);
  });
  y -= 22;

  student.modules.forEach((mod, rowIndex) => {
    ensureSpace(28);
    if (rowIndex % 2 === 0) {
      rect(margin, y - 5, contentRight - margin, 18, "0.992 0.994 0.998", null);
    }
    const row = [
      mod.name,
      `${mod.attended}/${mod.classes} (${mod.attendancePct}%)`,
      `${mod.attentionPct}%`,
      `${mod.assignmentTotal}/${mod.assignmentTarget}`,
      `${mod.mcq}%`,
      `${mod.test}%`,
      `${mod.penAndPaper}%`,
      `${mod.mockInterview}%`,
      `${moduleScore(mod)}%`
    ];
    row.forEach((value, index) => {
      const shown = index === 0 && value.length > 19 ? `${value.slice(0, 18)}...` : value;
      textAt(shown, colX[index], y, 7.5, index === 0 || index === 8, navy);
    });
    y -= 18;
  });
  y -= 8;

  section("Feedback Summary");
  const feedbackRows = [
    ["Faculty Feedback", student.facultyFeedback?.length || 0],
    ["Mentor Feedback", student.mentorFeedback?.length || 0],
    ["Mentor Evaluations", student.mentorEvaluations?.length || 0]
  ];
  feedbackRows.forEach(([label, count], index) => {
    const x = margin + index * 166;
    rect(x, y - 38, 150, 42, light, border);
    textAt(label, x + 10, y - 13, 8, true, muted);
    textAt(`${count} record${count === 1 ? "" : "s"}`, x + 10, y - 29, 11, true, navy);
  });
  y -= 56;

  finishPage();

  objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, 'binary');
  objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`, 'binary');

  const buffers = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", 'binary')];
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.concat(buffers).length);
    buffers.push(Buffer.from(`${index + 1} 0 obj\n`, 'binary'), object, Buffer.from("\nendobj\n", 'binary'));
  });
  const xrefOffset = Buffer.concat(buffers).length;
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  for (let i = 1; i <= objects.length; i++) {
    xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  xref.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  buffers.push(Buffer.from(xref.join(""), 'binary'));
  return Buffer.concat(buffers);
}

// Initial Mock Students including MR DEV (LMS1001) from I-SMS.xlsx
let rawStudents = [
  {
    id: "LMS1001",
    name: "MR DEV",
    mobile: "+91 98765 10001",
    email: "mr.dev@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202601",
    session: "SESSION-1",
    faculty: "Dr. Amit Verma",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-01-05",
    notes: "STUDENT IS NOT SERIOUS IN THE CLASSES AND ALSO NEVER ATTENDED THE TEST AND ASSIGNMENTS PROPERLY",
    documents: ["LMS1001_Registration.pdf"],
    timeline: [
      { date: "2026-01-05", event: "Enrolled into APIDS BATCH 202601" },
      { date: "2026-02-10", event: "Attendance warning issued: Missed classes in SQL & Python" },
      { date: "2026-03-01", event: "Mock interview evaluation conducted (Score: 90% in Excel AI, 94% in SQL)" }
    ],
    modules: [
      {
        name: "EXCEL AI",
        classes: 10,
        attended: 10,
        classDuration: 1200,
        classAttention: 972,
        assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
        mcq: 98,
        test: 67,
        penAndPaper: 24,
        mockInterview: 90
      },
      {
        name: "SQL",
        classes: 10,
        attended: 6,
        classDuration: 1200,
        classAttention: 684,
        assignments: { s1: true, s2: false, s3: false, s4: false, s5: false, s6: false },
        mcq: 83,
        test: 14,
        penAndPaper: 62,
        mockInterview: 94
      },
      {
        name: "POWER BI",
        classes: 10,
        attended: 8,
        classDuration: 1200,
        classAttention: 636,
        assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
        mcq: 87,
        test: 46,
        penAndPaper: 22,
        mockInterview: 45
      },
      {
        name: "PYTHON",
        classes: 10,
        attended: 5,
        classDuration: 1200,
        classAttention: 504,
        assignments: { s1: true, s2: true, s3: true, s4: false, s5: false, s6: false },
        mcq: 10,
        test: 71,
        penAndPaper: 48,
        mockInterview: 93
      },
      {
        name: "SAS",
        classes: 10,
        attended: 9,
        classDuration: 1200,
        classAttention: 1164,
        assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
        mcq: 89,
        test: 71,
        penAndPaper: 23,
        mockInterview: 18
      },
      {
        name: "ML",
        classes: 10,
        attended: 9,
        classDuration: 1200,
        classAttention: 1164,
        assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
        mcq: 36,
        test: 1,
        penAndPaper: 28,
        mockInterview: 33
      },
      {
        name: "GEN AI & AGENTIC AI",
        classes: 10,
        attended: 8,
        classDuration: 1200,
        classAttention: 948,
        assignments: { s1: true, s2: true, s3: true, s4: true, s5: false, s6: false },
        mcq: 10,
        test: 31,
        penAndPaper: 56,
        mockInterview: 30
      },
      {
        name: "DATA ENGINEERING",
        classes: 10,
        attended: 8,
        classDuration: 1200,
        classAttention: 600,
        assignments: { s1: true, s2: true, s3: true, s4: true, s5: false, s6: false },
        mcq: 17,
        test: 30,
        penAndPaper: 13,
        mockInterview: 66
      },
      {
        name: "MLOPS & LLMOPS",
        classes: 10,
        attended: 3,
        classDuration: 1200,
        classAttention: 396,
        assignments: { s1: true, s2: true, s3: true, s4: false, s5: false, s6: false },
        mcq: 7,
        test: 30,
        penAndPaper: 10,
        mockInterview: 13
      },
      {
        name: "INTERVIEW PREP",
        classes: 10,
        attended: 3,
        classDuration: 1200,
        classAttention: 720,
        assignments: { s1: true, s2: true, s3: false, s4: false, s5: false, s6: false },
        mcq: 7,
        test: 30,
        penAndPaper: 10,
        mockInterview: 13
      }
    ]
  },
  {
    id: "LMS1002",
    name: "Aarav Sharma",
    mobile: "+91 98765 43210",
    email: "aarav.sharma@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202601",
    session: "SESSION-1",
    faculty: "Dr. Amit Verma",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-01-10",
    notes: "High performer across Python, SQL, and ML. Eligible for DV Elite honors.",
    documents: ["Aarav_CV.pdf", "Offer_Letter.pdf"],
    timeline: [
      { date: "2026-01-10", event: "Enrolled in APIDS BATCH 202601" },
      { date: "2026-02-15", event: "Achieved 95% in ML Assignment and Mock Interview" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 10,
      classDuration: 1200,
      classAttention: 1100 + (i % 3) * 30,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 90 + (i % 8),
      test: 85 + (i % 10),
      penAndPaper: 80 + (i % 12),
      mockInterview: 88 + (i % 8)
    }))
  },
  {
    id: "LMS1003",
    name: "Ishita Roy",
    mobile: "+91 98213 45678",
    email: "ishita.roy@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202601",
    session: "SESSION-1",
    faculty: "Dr. Amit Verma",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-01-12",
    notes: "Good progress in SQL and Power BI. Needs additional practice in MLOps.",
    documents: ["Graduation_Degree.pdf"],
    timeline: [
      { date: "2026-01-12", event: "Enrolled in BATCH 202601" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: i < 5 ? 9 : 7,
      classDuration: 1200,
      classAttention: 850 + (i % 4) * 50,
      assignments: { s1: true, s2: true, s3: true, s4: i < 6, s5: i < 4, s6: i < 3 },
      mcq: 75 + (i % 10),
      test: 70 + (i % 8),
      penAndPaper: 65 + (i % 15),
      mockInterview: 74 + (i % 10)
    }))
  },
  {
    id: "LMS1004",
    name: "Sneha Patel",
    mobile: "+91 97765 12345",
    email: "sneha.patel@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202602",
    session: "SESSION-1",
    faculty: "Mrs. Anjali Roy",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-02-10",
    notes: "Consistent performer with strong visual presentation and dashboard skills.",
    documents: ["Academic_Transcript.pdf"],
    timeline: [
      { date: "2026-02-10", event: "Joined BATCH 202602" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 9,
      classDuration: 1200,
      classAttention: 980,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 85 + (i % 10),
      test: 82 + (i % 8),
      penAndPaper: 80 + (i % 5),
      mockInterview: 86 + (i % 8)
    }))
  },
  {
    id: "LMS1005",
    name: "Kabir Mehta",
    mobile: "+91 91234 56789",
    email: "kabir.mehta@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202602",
    session: "SESSION-1",
    faculty: "Prof. S. R. Sen",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-02-01",
    notes: "Frequently absent due to health issues. Scheduled for remedial support.",
    documents: ["Medical_Note.pdf"],
    timeline: [
      { date: "2026-02-01", event: "Enrolled in BATCH 202602" },
      { date: "2026-02-28", event: "Alert raised for low attendance (<65%)" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 5 + (i % 3),
      classDuration: 1200,
      classAttention: 500 + (i % 4) * 40,
      assignments: { s1: true, s2: i < 5, s3: false, s4: false, s5: false, s6: false },
      mcq: 50 + (i % 15),
      test: 45 + (i % 10),
      penAndPaper: 40 + (i % 12),
      mockInterview: 48 + (i % 10)
    }))
  },
  {
    id: "LMS1006",
    name: "Rohan Sengupta",
    mobile: "+91 98301 23456",
    email: "rohan.sengupta@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202603",
    session: "SESSION-1",
    faculty: "Mrs. Anjali Roy",
    counselor: "Vikram Singhania",
    status: "Active",
    enrollmentDate: "2026-03-01",
    notes: "Top-tier student with strong grasp of deep learning, PyTorch, and NLP architectures.",
    documents: ["Rohan_Registration.pdf", "BTech_Degree.pdf"],
    timeline: [
      { date: "2026-03-01", event: "Enrolled in BATCH 202603" },
      { date: "2026-04-15", event: "Achieved 96% in SQL & Python assessments" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 10,
      classDuration: 1200,
      classAttention: 1120 + (i % 3) * 20,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 94 + (i % 5),
      test: 90 + (i % 8),
      penAndPaper: 88 + (i % 7),
      mockInterview: 92 + (i % 6)
    }))
  },
  {
    id: "LMS1007",
    name: "Pooja Iyer",
    mobile: "+91 98402 34567",
    email: "pooja.iyer@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202603",
    session: "SESSION-1",
    faculty: "Mrs. Anjali Roy",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-03-05",
    notes: "Excellent attendance and consistent 90%+ scores in Power BI and Data Engineering.",
    documents: ["Pooja_Certificates.pdf"],
    timeline: [
      { date: "2026-03-05", event: "Joined BATCH 202603" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 9,
      classDuration: 1200,
      classAttention: 1050 + (i % 3) * 30,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 88 + (i % 8),
      test: 86 + (i % 7),
      penAndPaper: 84 + (i % 6),
      mockInterview: 89 + (i % 5)
    }))
  },
  {
    id: "LMS1008",
    name: "Vikram Malhotra",
    mobile: "+91 98503 45678",
    email: "vikram.malhotra@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202603",
    session: "SESSION-2",
    faculty: "Mrs. Anjali Roy",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-03-10",
    notes: "Steady performer. Needs extra support on advanced MLOps deployment pipelines.",
    documents: ["Vikram_ID.pdf"],
    timeline: [
      { date: "2026-03-10", event: "Joined BATCH 202603" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 8,
      classDuration: 1200,
      classAttention: 880 + (i % 4) * 40,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: i < 7, s6: i < 5 },
      mcq: 76 + (i % 10),
      test: 72 + (i % 8),
      penAndPaper: 70 + (i % 9),
      mockInterview: 75 + (i % 7)
    }))
  },
  {
    id: "LMS1009",
    name: "Arjun Nair",
    mobile: "+91 98604 56789",
    email: "arjun.nair@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202603",
    session: "SESSION-2",
    faculty: "Mrs. Anjali Roy",
    counselor: "Vikram Singhania",
    status: "Active",
    enrollmentDate: "2026-03-15",
    notes: "Low attendance in morning slots due to work commitments. Remedial plan underway.",
    documents: ["Work_Certificate.pdf"],
    timeline: [
      { date: "2026-03-15", event: "Enrolled in BATCH 202603" },
      { date: "2026-05-10", event: "Counseling call completed for attendance recovery" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 6,
      classDuration: 1200,
      classAttention: 650 + (i % 3) * 50,
      assignments: { s1: true, s2: true, s3: i < 5, s4: false, s5: false, s6: false },
      mcq: 60 + (i % 12),
      test: 55 + (i % 10),
      penAndPaper: 52 + (i % 8),
      mockInterview: 58 + (i % 10)
    }))
  },
  {
    id: "LMS1010",
    name: "Aditya Varma",
    mobile: "+91 98715 67890",
    email: "aditya.varma@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202604",
    session: "SESSION-1",
    faculty: "Dr. Rajesh Gupta",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-04-01",
    notes: "Exceptional analytical skills. Completed end-to-end LLM fine-tuning capstone.",
    documents: ["Aditya_Degree.pdf"],
    timeline: [
      { date: "2026-04-01", event: "Enrolled into BATCH 202604" },
      { date: "2026-06-20", event: "Top score in Mock Placement Interview (96%)" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 10,
      classDuration: 1200,
      classAttention: 1140,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 95 + (i % 4),
      test: 92 + (i % 5),
      penAndPaper: 90 + (i % 6),
      mockInterview: 95 + (i % 4)
    }))
  },
  {
    id: "LMS1011",
    name: "Neha Kapoor",
    mobile: "+91 98826 78901",
    email: "neha.kapoor@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202604",
    session: "SESSION-1",
    faculty: "Dr. Rajesh Gupta",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-04-05",
    notes: "Active in classroom discussions and hands-on laboratory sessions.",
    documents: ["Neha_Transcript.pdf"],
    timeline: [
      { date: "2026-04-05", event: "Joined BATCH 202604" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 9,
      classDuration: 1200,
      classAttention: 980 + (i % 3) * 40,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: i < 8 },
      mcq: 84 + (i % 8),
      test: 80 + (i % 7),
      penAndPaper: 78 + (i % 6),
      mockInterview: 82 + (i % 8)
    }))
  },
  {
    id: "LMS1012",
    name: "Priya Kulkarni",
    mobile: "+91 98937 89012",
    email: "priya.kulkarni@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202604",
    session: "SESSION-2",
    faculty: "Dr. Rajesh Gupta",
    counselor: "Vikram Singhania",
    status: "Active",
    enrollmentDate: "2026-04-10",
    notes: "Struggling with Python object-oriented programming. Mentor assigned for 1-on-1 tutoring.",
    documents: ["Enrollment_Form.pdf"],
    timeline: [
      { date: "2026-04-10", event: "Joined BATCH 202604" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 6,
      classDuration: 1200,
      classAttention: 680 + (i % 3) * 40,
      assignments: { s1: true, s2: true, s3: false, s4: false, s5: false, s6: false },
      mcq: 58 + (i % 10),
      test: 52 + (i % 10),
      penAndPaper: 50 + (i % 12),
      mockInterview: 55 + (i % 8)
    }))
  },
  {
    id: "LMS1013",
    name: "Siddharth Rao",
    mobile: "+91 98048 90123",
    email: "siddharth.rao@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202604",
    session: "SESSION-2",
    faculty: "Dr. Rajesh Gupta",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-04-12",
    notes: "Good progress in SQL and Power BI dashboard architectures.",
    documents: ["Degree.pdf"],
    timeline: [
      { date: "2026-04-12", event: "Enrolled in BATCH 202604" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 8,
      classDuration: 1200,
      classAttention: 920 + (i % 4) * 30,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: false },
      mcq: 82 + (i % 6),
      test: 78 + (i % 8),
      penAndPaper: 76 + (i % 8),
      mockInterview: 80 + (i % 7)
    }))
  },
  {
    id: "LMS1014",
    name: "Ananya Das",
    mobile: "+91 98159 01234",
    email: "ananya.das@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202605",
    session: "SESSION-1",
    faculty: "Dr. Amit Verma",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-05-02",
    notes: "DV Elite placement track qualified with 94% composite score across modules.",
    documents: ["Ananya_CV.pdf"],
    timeline: [
      { date: "2026-05-02", event: "Enrolled in BATCH 202605" },
      { date: "2026-07-10", event: "Awarded Star Performer in GenAI Capstone" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 10,
      classDuration: 1200,
      classAttention: 1150,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 96 + (i % 3),
      test: 94 + (i % 4),
      penAndPaper: 92 + (i % 4),
      mockInterview: 96 + (i % 3)
    }))
  },
  {
    id: "LMS1015",
    name: "Karthik Raman",
    mobile: "+91 98260 12345",
    email: "karthik.raman@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202605",
    session: "SESSION-1",
    faculty: "Dr. Amit Verma",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-05-05",
    notes: "High competency in distributed machine learning and Spark pipelines.",
    documents: ["Transcript.pdf"],
    timeline: [
      { date: "2026-05-05", event: "Joined BATCH 202605" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 9,
      classDuration: 1200,
      classAttention: 1060 + (i % 3) * 30,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 90 + (i % 6),
      test: 88 + (i % 7),
      penAndPaper: 85 + (i % 7),
      mockInterview: 91 + (i % 5)
    }))
  },
  {
    id: "LMS1016",
    name: "Rahul Roy",
    mobile: "+91 98371 23456",
    email: "rahul.roy@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202605",
    session: "SESSION-2",
    faculty: "Dr. Amit Verma",
    counselor: "Vikram Singhania",
    status: "Active",
    enrollmentDate: "2026-05-12",
    notes: "Attendance irregular in SQL module. Progressing in practical projects.",
    documents: ["Registration.pdf"],
    timeline: [
      { date: "2026-05-12", event: "Enrolled into BATCH 202605" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 7,
      classDuration: 1200,
      classAttention: 750 + (i % 4) * 40,
      assignments: { s1: true, s2: true, s3: true, s4: i < 5, s5: false, s6: false },
      mcq: 68 + (i % 8),
      test: 64 + (i % 8),
      penAndPaper: 60 + (i % 10),
      mockInterview: 65 + (i % 8)
    }))
  },
  {
    id: "LMS1017",
    name: "Tanvi Joshi",
    mobile: "+91 98482 34567",
    email: "tanvi.joshi@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202601",
    session: "SESSION-2",
    faculty: "Dr. Amit Verma",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-01-15",
    notes: "Consistent learner with strong problem-solving skills in SAS and Excel AI.",
    documents: ["Tanvi_Degree.pdf"],
    timeline: [
      { date: "2026-01-15", event: "Enrolled in BATCH 202601" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 9,
      classDuration: 1200,
      classAttention: 1020 + (i % 3) * 30,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true },
      mcq: 89 + (i % 6),
      test: 85 + (i % 8),
      penAndPaper: 83 + (i % 7),
      mockInterview: 87 + (i % 6)
    }))
  },
  {
    id: "LMS1018",
    name: "Manish Verma",
    mobile: "+91 98593 45678",
    email: "manish.verma@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202601",
    session: "SESSION-3",
    faculty: "Dr. Amit Verma",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-01-20",
    notes: "Steady attendance. Working through mock interview preparations.",
    documents: ["Manish_ID.pdf"],
    timeline: [
      { date: "2026-01-20", event: "Joined BATCH 202601" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 8,
      classDuration: 1200,
      classAttention: 900 + (i % 4) * 30,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: false },
      mcq: 80 + (i % 8),
      test: 76 + (i % 8),
      penAndPaper: 74 + (i % 8),
      mockInterview: 79 + (i % 7)
    }))
  },
  {
    id: "LMS1019",
    name: "Kavita Reddy",
    mobile: "+91 98604 98765",
    email: "kavita.reddy@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202602",
    session: "SESSION-2",
    faculty: "Prof. S. R. Sen",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-02-12",
    notes: "Solid work on Data Engineering and pipeline deployment tasks.",
    documents: ["Kavita_Cert.pdf"],
    timeline: [
      { date: "2026-02-12", event: "Enrolled in BATCH 202602" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 8,
      classDuration: 1200,
      classAttention: 930 + (i % 4) * 20,
      assignments: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: false },
      mcq: 83 + (i % 7),
      test: 79 + (i % 8),
      penAndPaper: 77 + (i % 7),
      mockInterview: 81 + (i % 6)
    }))
  },
  {
    id: "LMS1020",
    name: "Suresh Pillai",
    mobile: "+91 98715 09876",
    email: "suresh.pillai@example.com",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    batch: "BATCH 202602",
    session: "SESSION-2",
    faculty: "Prof. S. R. Sen",
    counselor: "Vikram Singhania",
    status: "Active",
    enrollmentDate: "2026-02-18",
    notes: "Requires revision in Power BI and DAX queries. Ongoing mentor guidance.",
    documents: ["Suresh_Transcript.pdf"],
    timeline: [
      { date: "2026-02-18", event: "Joined BATCH 202602" }
    ],
    modules: CURRICULUM_MODULES.map((name, i) => ({
      name,
      classes: 10,
      attended: 6,
      classDuration: 1200,
      classAttention: 710 + (i % 3) * 40,
      assignments: { s1: true, s2: true, s3: false, s4: false, s5: false, s6: false },
      mcq: 62 + (i % 10),
      test: 58 + (i % 10),
      penAndPaper: 56 + (i % 10),
      mockInterview: 60 + (i % 8)
    }))
  }
];

let students = rawStudents.map(computeStudentAggregates);

// Batches Collection (5 Batches)
let batches = [
  {
    id: "BATCH202601",
    code: "BATCH 202601",
    name: "APIDS AI & Data Science Premier Cohort",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    faculty: "Dr. Amit Verma",
    startDate: "2026-01-05",
    endDate: "2026-07-31",
    timing: "09:30 AM - 11:30 AM",
    status: "Active"
  },
  {
    id: "BATCH202602",
    code: "BATCH 202602",
    name: "APIDS Executive Data Engineering & AI",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    faculty: "Prof. S. R. Sen",
    startDate: "2026-02-01",
    endDate: "2026-08-31",
    timing: "11:30 AM - 01:30 PM",
    status: "Active"
  },
  {
    id: "BATCH202603",
    code: "BATCH 202603",
    name: "APIDS Evening Fast-Track Data Science",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    faculty: "Mrs. Anjali Roy",
    startDate: "2026-03-01",
    endDate: "2026-09-30",
    timing: "06:00 PM - 08:00 PM",
    status: "Active"
  },
  {
    id: "BATCH202604",
    code: "BATCH 202604",
    name: "APIDS Weekend AI & Machine Learning",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    faculty: "Dr. Rajesh Gupta",
    startDate: "2026-04-01",
    endDate: "2026-10-31",
    timing: "10:00 AM - 02:00 PM",
    status: "Active"
  },
  {
    id: "BATCH202605",
    code: "BATCH 202605",
    name: "APIDS GenAI & Agentic AI Masterclass",
    program: "APIDS",
    course: "Advanced Post Graduate Program in Data Science & AI",
    faculty: "Dr. Amit Verma",
    startDate: "2026-05-01",
    endDate: "2026-11-30",
    timing: "02:30 PM - 04:30 PM",
    status: "Active"
  }
];

let sessions = [
  { id: "SESS001", batchCode: "BATCH 202601", sessionNumber: 1, name: "SESSION-1", topic: "Excel AI & Foundation Setup", date: "2026-01-10", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS002", batchCode: "BATCH 202601", sessionNumber: 2, name: "SESSION-2", topic: "SQL Core Queries & Joins", date: "2026-01-20", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS003", batchCode: "BATCH 202601", sessionNumber: 3, name: "SESSION-3", topic: "Power BI Visualizations", date: "2026-02-05", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS004", batchCode: "BATCH 202601", sessionNumber: 4, name: "SESSION-4", topic: "Python Object Oriented Programming", date: "2026-02-18", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Ongoing" },
  { id: "SESS005", batchCode: "BATCH 202602", sessionNumber: 1, name: "SESSION-1", topic: "Excel & Analytics Foundations", date: "2026-02-05", timing: "11:30 AM", faculty: "Prof. S. R. Sen", status: "Completed" },
  { id: "SESS006", batchCode: "BATCH 202602", sessionNumber: 2, name: "SESSION-2", topic: "SQL Data Modeling & Views", date: "2026-02-22", timing: "11:30 AM", faculty: "Prof. S. R. Sen", status: "Completed" },
  { id: "SESS007", batchCode: "BATCH 202603", sessionNumber: 1, name: "SESSION-1", topic: "Python for Data Analytics", date: "2026-03-08", timing: "06:00 PM", faculty: "Mrs. Anjali Roy", status: "Completed" },
  { id: "SESS008", batchCode: "BATCH 202603", sessionNumber: 2, name: "SESSION-2", topic: "Power BI Advanced DAX Measures", date: "2026-03-25", timing: "06:00 PM", faculty: "Mrs. Anjali Roy", status: "Completed" },
  { id: "SESS009", batchCode: "BATCH 202604", sessionNumber: 1, name: "SESSION-1", topic: "Machine Learning Algorithms & Scikit-Learn", date: "2026-04-10", timing: "10:00 AM", faculty: "Dr. Rajesh Gupta", status: "Completed" },
  { id: "SESS010", batchCode: "BATCH 202604", sessionNumber: 2, name: "SESSION-2", topic: "Deep Learning Foundations & Neural Networks", date: "2026-04-28", timing: "10:00 AM", faculty: "Dr. Rajesh Gupta", status: "Completed" },
  { id: "SESS011", batchCode: "BATCH 202605", sessionNumber: 1, name: "SESSION-1", topic: "Large Language Models & Prompt Engineering", date: "2026-05-15", timing: "02:30 PM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS012", batchCode: "BATCH 202605", sessionNumber: 2, name: "SESSION-2", topic: "Agentic AI Architectures with LangChain", date: "2026-06-02", timing: "02:30 PM", faculty: "Dr. Amit Verma", status: "Ongoing" }
];

let staffMembers = [
  { id: "FAC001", type: "Faculty", name: "Dr. Amit Verma", email: "amit.verma@dvanalytics.in", phone: "+91 98765 20101", status: "Active" },
  { id: "FAC002", type: "Faculty", name: "Mrs. Anjali Roy", email: "anjali.roy@dvanalytics.in", phone: "+91 98765 20102", status: "Active" },
  { id: "FAC003", type: "Faculty", name: "Prof. S. R. Sen", email: "sr.sen@dvanalytics.in", phone: "+91 98765 20103", status: "Active" },
  { id: "FAC004", type: "Faculty", name: "Dr. Rajesh Gupta", email: "rajesh.gupta@dvanalytics.in", phone: "+91 98765 20104", status: "Active" },
  { id: "MEN001", type: "Mentor", name: "Rohan Das", email: "rohan.das@dvanalytics.in", phone: "+91 98765 30101", status: "Active" },
  { id: "MEN002", type: "Mentor", name: "Priya Nair", email: "priya.nair@dvanalytics.in", phone: "+91 98765 30102", status: "Active" },
  { id: "MEN003", type: "Mentor", name: "Vikram Singhania", email: "vikram.s@dvanalytics.in", phone: "+91 98765 30103", status: "Active" }
];

// Feedback Triad Collections based on Sheet 2 (STUDENT FEEDBACK)
let facultyFeedbackLogs = [
  { id: "FF001", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-25", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "EXCEL AI", session: "SESSION-1", facultyName: "Dr. Amit Verma", facultyRating: 4.5, assignmentRating: 4.0, videoUploaded: "On Time", classTiming: 4.0, material: 4.5, classSpeed: 3.5, overallSatisfaction: 4.2, comments: "Faculty was clear with formulas. Speed was slightly fast in intermediate lessons." },
  { id: "FF002", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-25", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "SQL", session: "SESSION-2", facultyName: "Dr. Amit Verma", facultyRating: 5.0, assignmentRating: 5.0, videoUploaded: "On Time", classTiming: 5.0, material: 5.0, classSpeed: 4.8, overallSatisfaction: 5.0, comments: "Excellent practical query exercises and hands-on DB environment." },
  { id: "FF003", studentId: "LMS1006", studentName: "Rohan Sengupta", course: "APIDS", batch: "BATCH 202603", callDate: "2026-08-24", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "PYTHON", session: "SESSION-1", facultyName: "Mrs. Anjali Roy", facultyRating: 5.0, assignmentRating: 5.0, videoUploaded: "On Time", classTiming: 5.0, material: 5.0, classSpeed: 4.9, overallSatisfaction: 5.0, comments: "Superb coverage of Pandas, NumPy, and OOP design patterns." },
  { id: "FF004", studentId: "LMS1010", studentName: "Aditya Varma", course: "APIDS", batch: "BATCH 202604", callDate: "2026-08-24", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "ML", session: "SESSION-1", facultyName: "Dr. Rajesh Gupta", facultyRating: 4.9, assignmentRating: 4.8, videoUploaded: "On Time", classTiming: 4.9, material: 5.0, classSpeed: 4.8, overallSatisfaction: 4.9, comments: "Clear mathematical intuition behind gradient descent and random forests." },
  { id: "FF005", studentId: "LMS1014", studentName: "Ananya Das", course: "APIDS", batch: "BATCH 202605", callDate: "2026-08-23", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "GEN AI & AGENTIC AI", session: "SESSION-1", facultyName: "Dr. Amit Verma", facultyRating: 5.0, assignmentRating: 5.0, videoUploaded: "On Time", classTiming: 5.0, material: 5.0, classSpeed: 5.0, overallSatisfaction: 5.0, comments: "World-class prompt engineering and LangGraph workflows demo." },
  { id: "FF006", studentId: "LMS1007", studentName: "Pooja Iyer", course: "APIDS", batch: "BATCH 202603", callDate: "2026-08-23", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "POWER BI", session: "SESSION-2", facultyName: "Mrs. Anjali Roy", facultyRating: 4.8, assignmentRating: 4.7, videoUploaded: "On Time", classTiming: 4.8, material: 4.9, classSpeed: 4.7, overallSatisfaction: 4.8, comments: "Very practical dashboard building examples." },
  { id: "FF007", studentId: "LMS1015", studentName: "Karthik Raman", course: "APIDS", batch: "BATCH 202605", callDate: "2026-08-22", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "GEN AI & AGENTIC AI", session: "SESSION-1", facultyName: "Dr. Amit Verma", facultyRating: 4.9, assignmentRating: 4.8, videoUploaded: "On Time", classTiming: 4.8, material: 4.9, classSpeed: 4.7, overallSatisfaction: 4.9, comments: "Great depth in vector databases and RAG architectures." },
  { id: "FF008", studentId: "LMS1011", studentName: "Neha Kapoor", course: "APIDS", batch: "BATCH 202604", callDate: "2026-08-22", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "ML", session: "SESSION-1", facultyName: "Dr. Rajesh Gupta", facultyRating: 4.6, assignmentRating: 4.5, videoUploaded: "On Time", classTiming: 4.7, material: 4.8, classSpeed: 4.5, overallSatisfaction: 4.7, comments: "Explained model validation metrics thoroughly." },
  { id: "FF009", studentId: "LMS1017", studentName: "Tanvi Joshi", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-21", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "POWER BI", session: "SESSION-3", facultyName: "Dr. Amit Verma", facultyRating: 4.8, assignmentRating: 4.7, videoUploaded: "On Time", classTiming: 4.8, material: 4.8, classSpeed: 4.6, overallSatisfaction: 4.8, comments: "Very clear DAX calculations walkthrough." },
  { id: "FF010", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2026-08-20", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "PYTHON", session: "SESSION-1", facultyName: "Prof. S. R. Sen", facultyRating: 3.5, assignmentRating: 3.0, videoUploaded: "Delay", classTiming: 4.0, material: 3.0, classSpeed: 2.5, overallSatisfaction: 3.0, comments: "Felt difficult to catch up after missing class due to sickness." },
  { id: "FF011", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-14", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "POWER BI", session: "SESSION-3", facultyName: "Dr. Amit Verma", facultyRating: 4.8, assignmentRating: 4.5, videoUploaded: "On Time", classTiming: 4.5, material: 4.7, classSpeed: 4.5, overallSatisfaction: 4.8, comments: "Great interactive visual demos." },
  { id: "FF012", studentId: "LMS1004", studentName: "Sneha Patel", course: "APIDS", batch: "BATCH 202602", callDate: "2026-07-28", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "PYTHON", session: "SESSION-1", facultyName: "Mrs. Anjali Roy", facultyRating: 5.0, assignmentRating: 5.0, videoUploaded: "On Time", classTiming: 5.0, material: 4.8, classSpeed: 4.6, overallSatisfaction: 4.9, comments: "Very supportive and structured explanation of OOPs." },
  { id: "FF013", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-07-15", connectionStatus: "No", feedbackType: "Faculty Feedback", application: "SQL", session: "SESSION-2", facultyName: "Dr. Amit Verma", facultyRating: 0, assignmentRating: 0, videoUploaded: "Delay", classTiming: 0, material: 0, classSpeed: 0, overallSatisfaction: 0, comments: "Call disconnected after ringing." },
  { id: "FF014", studentId: "LMS1008", studentName: "Vikram Malhotra", course: "APIDS", batch: "BATCH 202603", callDate: "2026-07-10", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "PYTHON", session: "SESSION-1", facultyName: "Mrs. Anjali Roy", facultyRating: 4.7, assignmentRating: 4.6, videoUploaded: "On Time", classTiming: 4.8, material: 4.8, classSpeed: 4.5, overallSatisfaction: 4.7, comments: "Hands-on coding was very helpful." },
  { id: "FF015", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2026-06-18", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "POWER BI", session: "SESSION-3", facultyName: "Dr. Amit Verma", facultyRating: 4.9, assignmentRating: 5.0, videoUploaded: "On Time", classTiming: 5.0, material: 5.0, classSpeed: 4.7, overallSatisfaction: 4.9, comments: "Comprehensive DAX explanations." },
  { id: "FF016", studentId: "LMS1019", studentName: "Kavita Reddy", course: "APIDS", batch: "BATCH 202602", callDate: "2026-06-12", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "DATA ENGINEERING", session: "SESSION-2", facultyName: "Prof. S. R. Sen", facultyRating: 4.2, assignmentRating: 4.0, videoUploaded: "On Time", classTiming: 4.4, material: 4.3, classSpeed: 4.0, overallSatisfaction: 4.2, comments: "Good understanding of ETL workflows." },
  { id: "FF017", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2026-05-22", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "EXCEL AI", session: "SESSION-1", facultyName: "Prof. S. R. Sen", facultyRating: 4.0, assignmentRating: 3.5, videoUploaded: "Delay", classTiming: 4.0, material: 3.8, classSpeed: 3.5, overallSatisfaction: 3.9, comments: "Covered basic calculations well." },
  { id: "FF018", studentId: "LMS1004", studentName: "Sneha Patel", course: "APIDS", batch: "BATCH 202602", callDate: "2026-04-12", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "SQL", session: "SESSION-1", facultyName: "Mrs. Anjali Roy", facultyRating: 4.7, assignmentRating: 4.5, videoUploaded: "On Time", classTiming: 4.5, material: 4.9, classSpeed: 4.5, overallSatisfaction: 4.7, comments: "Query optimization tips were very helpful." },
  { id: "FF019", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2026-03-10", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "EXCEL AI", session: "SESSION-1", facultyName: "Dr. Amit Verma", facultyRating: 4.6, assignmentRating: 4.0, videoUploaded: "On Time", classTiming: 4.5, material: 4.5, classSpeed: 4.2, overallSatisfaction: 4.5, comments: "Well paced session on lookup formulas." },
  { id: "FF020", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-02-14", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "PYTHON", session: "SESSION-4", facultyName: "Dr. Amit Verma", facultyRating: 3.8, assignmentRating: 3.0, videoUploaded: "Delay", classTiming: 4.0, material: 3.5, classSpeed: 3.0, overallSatisfaction: 3.6, comments: "Need slower pace for complex algorithms." },
  { id: "FF021", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2026-01-22", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "EXCEL AI", session: "SESSION-1", facultyName: "Dr. Amit Verma", facultyRating: 5.0, assignmentRating: 5.0, videoUploaded: "On Time", classTiming: 5.0, material: 5.0, classSpeed: 4.9, overallSatisfaction: 5.0, comments: "Great start to the batch." },
  { id: "FF022", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2025-12-15", connectionStatus: "No", feedbackType: "Faculty Feedback", application: "EXCEL AI", session: "SESSION-1", facultyName: "Prof. S. R. Sen", facultyRating: 0, assignmentRating: 0, videoUploaded: "Delay", classTiming: 0, material: 0, classSpeed: 0, overallSatisfaction: 0, comments: "Student switched off phone." },
  { id: "FF023", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2025-11-20", connectionStatus: "Yes", feedbackType: "Faculty Feedback", application: "EXCEL AI", session: "SESSION-1", facultyName: "Dr. Amit Verma", facultyRating: 4.5, assignmentRating: 4.0, videoUploaded: "On Time", classTiming: 4.5, material: 4.5, classSpeed: 4.0, overallSatisfaction: 4.5, comments: "Orientation call went smoothly." }
];

let mentorFeedbackLogs = [
  { id: "MF001", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-25", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", mentorRating: 4.0, doubtClearing: 4.5, behaviour: 5.0, attention: 3.5, overallSatisfaction: 4.2, comments: "Mentor is patient and resolved doubts on VLOOKUP and XLOOKUP." },
  { id: "MF002", studentId: "LMS1006", studentName: "Rohan Sengupta", course: "APIDS", batch: "BATCH 202603", callDate: "2026-08-25", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "PYTHON", session: "SESSION-1", mentorName: "Vikram Singhania", mentorRating: 5.0, doubtClearing: 5.0, behaviour: 5.0, attention: 5.0, overallSatisfaction: 5.0, comments: "Excellent mentor guidance on multithreading in Python." },
  { id: "MF003", studentId: "LMS1010", studentName: "Aditya Varma", course: "APIDS", batch: "BATCH 202604", callDate: "2026-08-24", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "ML", session: "SESSION-1", mentorName: "Priya Nair", mentorRating: 4.9, doubtClearing: 5.0, behaviour: 5.0, attention: 5.0, overallSatisfaction: 5.0, comments: "Deep dive into hyperparameter tuning." },
  { id: "MF004", studentId: "LMS1014", studentName: "Ananya Das", course: "APIDS", batch: "BATCH 202605", callDate: "2026-08-24", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "GEN AI & AGENTIC AI", session: "SESSION-1", mentorName: "Rohan Das", mentorRating: 5.0, doubtClearing: 5.0, behaviour: 5.0, attention: 5.0, overallSatisfaction: 5.0, comments: "Very thorough review of vector index strategies." },
  { id: "MF005", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-22", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "POWER BI", session: "SESSION-3", mentorName: "Priya Nair", mentorRating: 4.8, doubtClearing: 5.0, behaviour: 5.0, attention: 4.8, overallSatisfaction: 4.9, comments: "Great support during the Power BI dashboard project." },
  { id: "MF006", studentId: "LMS1004", studentName: "Sneha Patel", course: "APIDS", batch: "BATCH 202602", callDate: "2026-08-16", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "PYTHON", session: "SESSION-1", mentorName: "Priya Nair", mentorRating: 5.0, doubtClearing: 5.0, behaviour: 5.0, attention: 5.0, overallSatisfaction: 5.0, comments: "Cleared syntax doubts immediately." },
  { id: "MF007", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-08", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "SQL", session: "SESSION-2", mentorName: "Rohan Das", mentorRating: 5.0, doubtClearing: 5.0, behaviour: 5.0, attention: 5.0, overallSatisfaction: 5.0, comments: "Excellent mentor guidance." },
  { id: "MF008", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2026-07-20", connectionStatus: "No", feedbackType: "Mentor Feedback", application: "PYTHON", session: "SESSION-1", mentorName: "Rohan Das", mentorRating: 0, doubtClearing: 0, behaviour: 0, attention: 0, overallSatisfaction: 0, comments: "Did not answer regular mentor check-in call." },
  { id: "MF009", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-06-25", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "PYTHON", session: "SESSION-4", mentorName: "Rohan Das", mentorRating: 3.8, doubtClearing: 4.0, behaviour: 4.5, attention: 3.5, overallSatisfaction: 3.8, comments: "Mentor reviewed pending assignments." },
  { id: "MF010", studentId: "LMS1004", studentName: "Sneha Patel", course: "APIDS", batch: "BATCH 202602", callDate: "2026-05-18", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "SQL", session: "SESSION-1", mentorName: "Priya Nair", mentorRating: 4.9, doubtClearing: 5.0, behaviour: 5.0, attention: 4.8, overallSatisfaction: 4.9, comments: "Assisted with mock DB project setup." },
  { id: "MF011", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2026-04-20", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "SQL", session: "SESSION-2", mentorName: "Priya Nair", mentorRating: 4.7, doubtClearing: 4.8, behaviour: 5.0, attention: 4.6, overallSatisfaction: 4.8, comments: "Very clear instructions on index tuning." },
  { id: "MF012", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2026-03-15", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", mentorRating: 4.9, doubtClearing: 5.0, behaviour: 5.0, attention: 4.9, overallSatisfaction: 4.9, comments: "Prompt feedback on assignment solutions." },
  { id: "MF013", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2026-02-24", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", mentorRating: 3.6, doubtClearing: 4.0, behaviour: 4.0, attention: 3.0, overallSatisfaction: 3.5, comments: "Discussed missing assignment schedule." },
  { id: "MF014", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-01-18", connectionStatus: "No", feedbackType: "Mentor Feedback", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", mentorRating: 0, doubtClearing: 0, behaviour: 0, attention: 0, overallSatisfaction: 0, comments: "Call busy." },
  { id: "MF015", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2025-12-22", connectionStatus: "Yes", feedbackType: "Mentor Feedback", application: "EXCEL AI", session: "SESSION-1", mentorName: "Priya Nair", mentorRating: 4.6, doubtClearing: 4.8, behaviour: 5.0, attention: 4.5, overallSatisfaction: 4.7, comments: "Initial onboarding mentor discussion." }
];

let mentorEvaluationLogs = [
  { id: "ME001", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-25", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", assignmentStatus: "Completed", applicationKnowledge: "Good", overallFeedback: "Student showed good understanding of Excel functions but needs to attend scheduled classes regularly." },
  { id: "ME002", studentId: "LMS1006", studentName: "Rohan Sengupta", course: "APIDS", batch: "BATCH 202603", callDate: "2026-08-25", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "PYTHON", session: "SESSION-1", mentorName: "Vikram Singhania", assignmentStatus: "Completed", applicationKnowledge: "Best", overallFeedback: "Outstanding grasp of async programming and API frameworks." },
  { id: "ME003", studentId: "LMS1010", studentName: "Aditya Varma", course: "APIDS", batch: "BATCH 202604", callDate: "2026-08-24", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "ML", session: "SESSION-1", mentorName: "Priya Nair", assignmentStatus: "Completed", applicationKnowledge: "Best", overallFeedback: "Ready for placement mock round." },
  { id: "ME004", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-24", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "SQL", session: "SESSION-2", mentorName: "Rohan Das", assignmentStatus: "In Progress", applicationKnowledge: "Average", overallFeedback: "Pending assignment submission for S2-S6. Struggled with subqueries during evaluation." },
  { id: "ME005", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2026-08-21", connectionStatus: "No", feedbackType: "Mentor Evaluation", application: "PYTHON", session: "SESSION-1", mentorName: "Rohan Das", assignmentStatus: "Not Started", applicationKnowledge: "Low", overallFeedback: "Call went unanswered. Follow-up scheduled for tomorrow." },
  { id: "ME006", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2026-08-18", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "PYTHON", session: "SESSION-4", mentorName: "Rohan Das", assignmentStatus: "Completed", applicationKnowledge: "Best", overallFeedback: "Excellent grasp of object-oriented design and Pandas manipulation." },
  { id: "ME007", studentId: "LMS1004", studentName: "Sneha Patel", course: "APIDS", batch: "BATCH 202602", callDate: "2026-08-11", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "SQL", session: "SESSION-1", mentorName: "Priya Nair", assignmentStatus: "Completed", applicationKnowledge: "Best", overallFeedback: "Demonstrated accurate query joins, window functions, and clean formatting." },
  { id: "ME008", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2026-07-22", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "POWER BI", session: "SESSION-3", mentorName: "Priya Nair", assignmentStatus: "Completed", applicationKnowledge: "Good", overallFeedback: "Dashboard interactive charts properly constructed and published." },
  { id: "ME009", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-07-08", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "POWER BI", session: "SESSION-3", mentorName: "Rohan Das", assignmentStatus: "Completed", applicationKnowledge: "Average", overallFeedback: "Understands visual tiles, needs to practice DAX measures." },
  { id: "ME010", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2026-06-14", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", assignmentStatus: "In Progress", applicationKnowledge: "Average", overallFeedback: "Needs to complete S2 and S3 workbook submissions." },
  { id: "ME011", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2026-05-10", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "SQL", session: "SESSION-2", mentorName: "Rohan Das", assignmentStatus: "Completed", applicationKnowledge: "Best", overallFeedback: "Scored high in live coding query problem." },
  { id: "ME012", studentId: "LMS1004", studentName: "Sneha Patel", course: "APIDS", batch: "BATCH 202602", callDate: "2026-04-18", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "EXCEL AI", session: "SESSION-1", mentorName: "Priya Nair", assignmentStatus: "Completed", applicationKnowledge: "Good", overallFeedback: "Good application of advanced nested formulas." },
  { id: "ME013", studentId: "LMS1003", studentName: "Ishita Roy", course: "APIDS", batch: "BATCH 202601", callDate: "2026-03-24", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "SQL", session: "SESSION-2", mentorName: "Priya Nair", assignmentStatus: "Completed", applicationKnowledge: "Good", overallFeedback: "Good work on aggregation queries." },
  { id: "ME014", studentId: "LMS1001", studentName: "MR DEV", course: "APIDS", batch: "BATCH 202601", callDate: "2026-02-18", connectionStatus: "No", feedbackType: "Mentor Evaluation", application: "PYTHON", session: "SESSION-4", mentorName: "Rohan Das", assignmentStatus: "Not Started", applicationKnowledge: "Low", overallFeedback: "Unreachable on scheduled evaluation slot." },
  { id: "ME015", studentId: "LMS1005", studentName: "Kabir Mehta", course: "APIDS", batch: "BATCH 202602", callDate: "2026-01-28", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", assignmentStatus: "In Progress", applicationKnowledge: "Average", overallFeedback: "Initial progress check completed." },
  { id: "ME016", studentId: "LMS1002", studentName: "Aarav Sharma", course: "APIDS", batch: "BATCH 202601", callDate: "2025-12-10", connectionStatus: "Yes", feedbackType: "Mentor Evaluation", application: "EXCEL AI", session: "SESSION-1", mentorName: "Rohan Das", assignmentStatus: "Completed", applicationKnowledge: "Best", overallFeedback: "Flawless performance in baseline review." }
];

let upcomingClasses = [
  { time: "09:30 AM", course: "APIDS", topic: "Python Data Analysis with Pandas", batch: "BATCH 202601", faculty: "Dr. Amit Verma" },
  { time: "11:30 AM", course: "APIDS", topic: "SQL Advanced Aggregations & CTEs", batch: "BATCH 202602", faculty: "Prof. S. R. Sen" },
  { time: "02:30 PM", course: "APIDS", topic: "Agentic AI Multi-Agent Workflows", batch: "BATCH 202605", faculty: "Dr. Amit Verma" },
  { time: "06:00 PM", course: "APIDS", topic: "Power BI DAX & Report Server Publishing", batch: "BATCH 202603", faculty: "Mrs. Anjali Roy" }
];

let alerts = [
  { id: "A1", type: "Low Attendance", text: "MR DEV (LMS1001) is marked FREQUENTLY MISSED CLASSES in MLOps & Interview Prep", status: "Active" },
  { id: "A2", type: "Low Attention", text: "MR DEV (LMS1001) attention dropped below 40% in MLOps (33%)", status: "Active" },
  { id: "A3", type: "Pending Assignments", text: "MR DEV (LMS1001) has 5 pending assignments in SQL module", status: "Active" }
];

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
  if (username === 'admin' && password === 'admin') {
    res.json({
      message: "Login successful",
      user: {
        username: 'admin',
        role: 'Administrator',
        name: 'Admin Officer'
      }
    });
  } else {
    res.status(401).json({ error: "Invalid credentials. Hint: admin / admin" });
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
    batch: newStudent.batch || "BATCH 202601",
    session: newStudent.session || "SESSION-1",
    faculty: newStudent.faculty || "Dr. Amit Verma",
    counselor: newStudent.counselor || "Rohan Das",
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
  if (!["Faculty", "Mentor"].includes(type)) {
    return res.status(400).json({ error: "Staff type must be Faculty or Mentor" });
  }
  if (!name) {
    return res.status(400).json({ error: "Staff name is required" });
  }

  const prefix = type === "Faculty" ? "FAC" : "MEN";
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
    connectionStatus: data.connectionStatus || "Yes",
    feedbackType: "Faculty Feedback",
    application: data.application || "EXCEL AI",
    session: data.session || student.session || "SESSION-1",
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

  facultyFeedbackLogs.push(entry);
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
    connectionStatus: data.connectionStatus || "Yes",
    feedbackType: "Mentor Feedback",
    application: data.application || "EXCEL AI",
    session: data.session || student.session || "SESSION-1",
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
    connectionStatus: data.connectionStatus || "Yes",
    feedbackType: "Mentor Evaluation",
    application: data.application || "EXCEL AI",
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

  // 3. Batch-wise Comparison Visualizations
  const allBatchCodes = batches.map(b => b.code);

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
  res.sendFile(path.join(__dirname, 'public', 'performance.html'));
});

app.listen(PORT, () => {
  console.log(`I-SMS Server running on http://localhost:${PORT}`);
});
