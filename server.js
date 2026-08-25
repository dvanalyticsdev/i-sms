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
  const overallScore = Math.round((mcq + test + penAndPaper + mockInterview) / 4);

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
  const lmsScore = Math.round((avgMcq + avgTest + avgPenPaper + avgMock) / 4);

  // Rule 1: DV ELITE (Scored >= 70% in SQL, Python, SAS, and ML)
  const eliteModules = ["SQL", "PYTHON", "SAS", "ML"];
  const dvEliteEligible = eliteModules.every(modName => {
    const mod = modules.find(m => m.name.toUpperCase() === modName);
    return mod && mod.overallScore >= 70;
  });

  // Rule 2: PLACEMENT SUPPORT (Scored >= 70% in Mock Interview)
  const placementSupportEligible = avgMock >= 70;

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
  }
];

let students = rawStudents.map(computeStudentAggregates);

// Batches Collection
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
  }
];

let sessions = [
  { id: "SESS001", batchCode: "BATCH 202601", sessionNumber: 1, name: "SESSION-1", topic: "Excel AI & Foundation Setup", date: "2026-01-10", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS002", batchCode: "BATCH 202601", sessionNumber: 2, name: "SESSION-2", topic: "SQL Core Queries & Joins", date: "2026-01-20", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS003", batchCode: "BATCH 202601", sessionNumber: 3, name: "SESSION-3", topic: "Power BI Visualizations", date: "2026-02-05", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS004", batchCode: "BATCH 202601", sessionNumber: 4, name: "SESSION-4", topic: "Python Object Oriented Programming", date: "2026-02-18", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Ongoing" },
  { id: "SESS005", batchCode: "BATCH 202602", sessionNumber: 1, name: "SESSION-1", topic: "Excel & Analytics Foundations", date: "2026-02-05", timing: "11:30 AM", faculty: "Prof. S. R. Sen", status: "Completed" }
];

let staffMembers = [
  { id: "FAC001", type: "Faculty", name: "Dr. Amit Verma", email: "amit.verma@dvanalytics.in", phone: "+91 98765 20101", status: "Active" },
  { id: "FAC002", type: "Faculty", name: "Mrs. Anjali Roy", email: "anjali.roy@dvanalytics.in", phone: "+91 98765 20102", status: "Active" },
  { id: "FAC003", type: "Faculty", name: "Prof. S. R. Sen", email: "sr.sen@dvanalytics.in", phone: "+91 98765 20103", status: "Active" },
  { id: "MEN001", type: "Mentor", name: "Rohan Das", email: "rohan.das@dvanalytics.in", phone: "+91 98765 30101", status: "Active" },
  { id: "MEN002", type: "Mentor", name: "Priya Nair", email: "priya.nair@dvanalytics.in", phone: "+91 98765 30102", status: "Active" }
];

// Feedback Triad Collections based on Sheet 2 (STUDENT FEEDBACK)
let facultyFeedbackLogs = [
  {
    id: "FF001",
    studentId: "LMS1001",
    studentName: "MR DEV",
    course: "APIDS",
    batch: "BATCH 202601",
    callDate: "2026-08-25",
    connectionStatus: "Yes",
    feedbackType: "Faculty Feedback",
    application: "EXCEL AI",
    session: "SESSION-1",
    facultyName: "Dr. Amit Verma",
    facultyRating: 4.5,
    classTiming: 4.0,
    material: 4.5,
    classSpeed: 3.5,
    overallSatisfaction: 4.2,
    comments: "Faculty was clear with formulas. Speed was slightly fast in intermediate lessons."
  },
  {
    id: "FF002",
    studentId: "LMS1002",
    studentName: "Aarav Sharma",
    course: "APIDS",
    batch: "BATCH 202601",
    callDate: "2026-08-24",
    connectionStatus: "Yes",
    feedbackType: "Faculty Feedback",
    application: "SQL",
    session: "SESSION-2",
    facultyName: "Dr. Amit Verma",
    facultyRating: 5.0,
    classTiming: 5.0,
    material: 5.0,
    classSpeed: 4.8,
    overallSatisfaction: 5.0,
    comments: "Excellent practical query exercises and hands-on DB environment."
  },
  {
    id: "FF003",
    studentId: "LMS1005",
    studentName: "Kabir Mehta",
    course: "APIDS",
    batch: "BATCH 202602",
    callDate: "2026-08-20",
    connectionStatus: "Yes",
    feedbackType: "Faculty Feedback",
    application: "PYTHON",
    session: "SESSION-1",
    facultyName: "Prof. S. R. Sen",
    facultyRating: 3.5,
    classTiming: 4.0,
    material: 3.0,
    classSpeed: 2.5,
    overallSatisfaction: 3.0,
    comments: "Felt difficult to catch up after missing class due to sickness."
  }
];

let mentorFeedbackLogs = [
  {
    id: "MF001",
    studentId: "LMS1001",
    studentName: "MR DEV",
    course: "APIDS",
    batch: "BATCH 202601",
    callDate: "2026-08-25",
    connectionStatus: "Yes",
    feedbackType: "Mentor Feedback",
    application: "EXCEL AI",
    session: "SESSION-1",
    mentorName: "Rohan Das",
    mentorRating: 4.0,
    doubtClearing: 4.5,
    behaviour: 5.0,
    attention: 3.5,
    overallSatisfaction: 4.2,
    comments: "Mentor is patient and resolved doubts on VLOOKUP and XLOOKUP."
  },
  {
    id: "MF002",
    studentId: "LMS1003",
    studentName: "Ishita Roy",
    course: "APIDS",
    batch: "BATCH 202601",
    callDate: "2026-08-22",
    connectionStatus: "Yes",
    feedbackType: "Mentor Feedback",
    application: "POWER BI",
    session: "SESSION-3",
    mentorName: "Priya Nair",
    mentorRating: 4.8,
    doubtClearing: 5.0,
    behaviour: 5.0,
    attention: 4.8,
    overallSatisfaction: 4.9,
    comments: "Great support during the Power BI dashboard project."
  }
];

let mentorEvaluationLogs = [
  {
    id: "ME001",
    studentId: "LMS1001",
    studentName: "MR DEV",
    course: "APIDS",
    batch: "BATCH 202601",
    callDate: "2026-08-25",
    connectionStatus: "Yes",
    feedbackType: "Mentor Evaluation",
    application: "EXCEL AI",
    mentorName: "Rohan Das",
    assignmentStatus: "Completed",
    applicationKnowledge: "Good",
    overallFeedback: "Student showed good understanding of Excel functions but needs to attend scheduled classes regularly."
  },
  {
    id: "ME002",
    studentId: "LMS1001",
    studentName: "MR DEV",
    course: "APIDS",
    batch: "BATCH 202601",
    callDate: "2026-08-24",
    connectionStatus: "Yes",
    feedbackType: "Mentor Evaluation",
    application: "SQL",
    mentorName: "Rohan Das",
    assignmentStatus: "In Progress",
    applicationKnowledge: "Average",
    overallFeedback: "Pending assignment submission for S2-S6. Struggled with subqueries during evaluation."
  },
  {
    id: "ME003",
    studentId: "LMS1005",
    studentName: "Kabir Mehta",
    course: "APIDS",
    batch: "BATCH 202602",
    callDate: "2026-08-21",
    connectionStatus: "No",
    feedbackType: "Mentor Evaluation",
    application: "PYTHON",
    mentorName: "Rohan Das",
    assignmentStatus: "Not Started",
    applicationKnowledge: "Low",
    overallFeedback: "Call went unanswered. Follow-up scheduled for tomorrow."
  }
];

let upcomingClasses = [
  { time: "09:30 AM", course: "APIDS", topic: "Python Data Analysis with Pandas", batch: "BATCH 202601", faculty: "Dr. Amit Verma" },
  { time: "11:30 AM", course: "APIDS", topic: "SQL Advanced Aggregations & CTEs", batch: "BATCH 202602", faculty: "Prof. S. R. Sen" }
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

// 7. Dashboards & Analytics APIs
// Executive SMS Dashboard
app.get('/api/dashboard/sms', (req, res) => {
  refreshStudents();
  const { batch, session } = req.query;
  let list = [...students];
  if (batch && batch !== 'All') {
    list = list.filter(s => s.batch === batch);
  }
  if (session && session !== 'All') {
    list = list.filter(s => s.session === session);
  }

  const total = list.length;
  const activeStudents = list.filter(s => s.status === 'Active').length;
  const activeBatches = [...new Set(list.map(s => s.batch))].length;

  const dvEliteCount = list.filter(s => s.dvEliteEligible).length;
  const placementCount = list.filter(s => s.placementSupportEligible).length;
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

  res.json({
    stats: {
      totalStudents: total,
      activeStudents,
      activeBatches,
      attendanceRate: avgAttendance,
      avgAttention,
      assignmentCompletionRate: avgAssignment,
      lmsScoreRate: avgLms,
      mcqAvg,
      practicalAvg,
      hardpaperAvg,
      mockInterviewAvg,
      dvEliteCount,
      placementCount,
      atRiskCount,
      topPerformers,
      weakStudents,
      classes: upcomingClasses
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
  const totalCalls = mentorEvaluationLogs.length + facultyFeedbackLogs.length + mentorFeedbackLogs.length;
  const allFeedbackCalls = [...mentorEvaluationLogs, ...facultyFeedbackLogs, ...mentorFeedbackLogs];
  const connectedCalls = allFeedbackCalls.filter(m => String(m.connectionStatus).toUpperCase() === 'YES').length;
  const connectionRate = allFeedbackCalls.length ? Math.round((connectedCalls / allFeedbackCalls.length) * 100) : 100;

  const avgFacultyRating = facultyFeedbackLogs.length ? 
    (facultyFeedbackLogs.reduce((a, b) => a + b.facultyRating, 0) / facultyFeedbackLogs.length).toFixed(1) : "4.5";
  const avgMentorRating = mentorFeedbackLogs.length ? 
    (mentorFeedbackLogs.reduce((a, b) => a + b.mentorRating, 0) / mentorFeedbackLogs.length).toFixed(1) : "4.6";
  const avgSatisfaction = facultyFeedbackLogs.length ? 
    (facultyFeedbackLogs.reduce((a, b) => a + b.overallSatisfaction, 0) / facultyFeedbackLogs.length).toFixed(1) : "4.4";

  // Knowledge distribution
  const knowledgeDist = {
    Best: mentorEvaluationLogs.filter(m => String(m.applicationKnowledge).toUpperCase() === 'BEST').length,
    Good: mentorEvaluationLogs.filter(m => String(m.applicationKnowledge).toUpperCase() === 'GOOD').length,
    Average: mentorEvaluationLogs.filter(m => String(m.applicationKnowledge).toUpperCase() === 'AVERAGE').length,
    Low: mentorEvaluationLogs.filter(m => String(m.applicationKnowledge).toUpperCase() === 'LOW').length
  };

  // Assignment status distribution
  const assignmentDist = {
    Completed: mentorEvaluationLogs.filter(m => String(m.assignmentStatus).toUpperCase() === 'COMPLETED').length,
    InProgress: mentorEvaluationLogs.filter(m => String(m.assignmentStatus).toUpperCase() === 'IN PROGRESS').length,
    NotStarted: mentorEvaluationLogs.filter(m => String(m.assignmentStatus).toUpperCase() === 'NOT STARTED').length
  };

  res.json({
    stats: {
      totalFeedbackCount: totalCalls,
      connectionRate,
      avgFacultyRating,
      avgMentorRating,
      avgSatisfaction
    },
    knowledgeDist,
    assignmentDist,
    recentFacultyFeedback: facultyFeedbackLogs.slice(-5).reverse(),
    recentMentorFeedback: mentorFeedbackLogs.slice(-5).reverse(),
    recentEvaluations: mentorEvaluationLogs.slice(-5).reverse()
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
