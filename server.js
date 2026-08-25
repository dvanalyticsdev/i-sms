const express = require('express');
const path = require('path');
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
  if ((username === 'admin' && password === 'admin') ||
      (username === 'counselor' && password === 'counselor') ||
      (username === 'faculty' && password === 'faculty')) {
    res.json({
      message: "Login successful",
      user: {
        username,
        role: username === 'admin' ? 'Administrator' : (username === 'faculty' ? 'Faculty Member' : 'Academic Counselor'),
        name: username === 'admin' ? 'Admin Officer' : (username === 'faculty' ? 'Dr. Amit Verma' : 'Rohan Das')
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

// SRM / Feedback Dashboard (Sheet 5 STU FEEDBACK DASHBOARD)
app.get('/api/dashboard/srm', (req, res) => {
  const totalCalls = mentorEvaluationLogs.length + facultyFeedbackLogs.length + mentorFeedbackLogs.length;
  const connectedCalls = mentorEvaluationLogs.filter(m => m.connectionStatus === 'Yes').length;
  const connectionRate = mentorEvaluationLogs.length ? Math.round((connectedCalls / mentorEvaluationLogs.length) * 100) : 100;

  const avgFacultyRating = facultyFeedbackLogs.length ? 
    (facultyFeedbackLogs.reduce((a, b) => a + b.facultyRating, 0) / facultyFeedbackLogs.length).toFixed(1) : "4.5";
  const avgMentorRating = mentorFeedbackLogs.length ? 
    (mentorFeedbackLogs.reduce((a, b) => a + b.mentorRating, 0) / mentorFeedbackLogs.length).toFixed(1) : "4.6";
  const avgSatisfaction = facultyFeedbackLogs.length ? 
    (facultyFeedbackLogs.reduce((a, b) => a + b.overallSatisfaction, 0) / facultyFeedbackLogs.length).toFixed(1) : "4.4";

  // Knowledge distribution
  const knowledgeDist = {
    Best: mentorEvaluationLogs.filter(m => m.applicationKnowledge === 'Best').length,
    Good: mentorEvaluationLogs.filter(m => m.applicationKnowledge === 'Good').length,
    Average: mentorEvaluationLogs.filter(m => m.applicationKnowledge === 'Average').length,
    Low: mentorEvaluationLogs.filter(m => m.applicationKnowledge === 'Low').length
  };

  // Assignment status distribution
  const assignmentDist = {
    Completed: mentorEvaluationLogs.filter(m => m.assignmentStatus === 'Completed').length,
    InProgress: mentorEvaluationLogs.filter(m => m.assignmentStatus === 'In Progress').length,
    NotStarted: mentorEvaluationLogs.filter(m => m.assignmentStatus === 'Not Started').length
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
