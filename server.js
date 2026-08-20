const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock Data
let students = [
  {
    id: "SMS001",
    name: "Aarav Sharma",
    mobile: "+91 98765 43210",
    email: "aarav.sharma@example.com",
    program: "Advanced AI & ML with Gen AI",
    course: "Generative AI Specialization",
    batch: "B-2026-A",
    faculty: "Dr. Amit Verma",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-01-10",
    attendance: 94,
    assignmentCompletion: 100,
    academicScores: {
      excel: 90, sql: 95, sas: 88, python: 98, ml: 96, dl: 94, genai: 95, agenticai: 97, mlops: 92, llmops: 94
    },
    assignments: {
      session1: "Completed", session2: "Completed", session3: "Completed", session4: "Completed", session5: "Completed"
    },
    assessments: {
      mcq: 95, practical: 92, hardpaper: 90
    },
    notes: "Highly proactive student, interested in building multi-agent systems.",
    documents: ["Resume.pdf", "Offer_Letter.pdf"],
    timeline: [
      { date: "2026-01-10", event: "Enrolled in Advanced AI & ML Program" },
      { date: "2026-02-05", event: "Completed Excel & SQL Module with A+" },
      { date: "2026-03-12", event: "Submitted Session-3 Assignment" }
    ]
  },
  {
    id: "SMS002",
    name: "Ishita Roy",
    mobile: "+91 98213 45678",
    email: "ishita.roy@example.com",
    program: "Data Science Master Program",
    course: "Data Science Foundation",
    batch: "B-2026-A",
    faculty: "Dr. Amit Verma",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-01-12",
    attendance: 88,
    assignmentCompletion: 80,
    academicScores: {
      excel: 85, sql: 88, sas: 78, python: 80, ml: 85, dl: 70, genai: 72, agenticai: 65, mlops: 70, llmops: 68
    },
    assignments: {
      session1: "Completed", session2: "Completed", session3: "Completed", session4: "Pending", session5: "Pending"
    },
    assessments: {
      mcq: 82, practical: 75, hardpaper: 78
    },
    notes: "Requires minor assistance in advanced programming algorithms.",
    documents: ["Graduation_Degree.pdf"],
    timeline: [
      { date: "2026-01-12", event: "Enrolled in Data Science Master Program" },
      { date: "2026-02-15", event: "Completed Excel Assignment" }
    ]
  },
  {
    id: "SMS003",
    name: "Kabir Mehta",
    mobile: "+91 91234 56789",
    email: "kabir.mehta@example.com",
    program: "Advanced AI & ML with Gen AI",
    course: "Deep Learning Bootcamp",
    batch: "B-2026-B",
    faculty: "Prof. S. R. Sen",
    counselor: "Rohan Das",
    status: "Active",
    enrollmentDate: "2026-02-01",
    attendance: 62,
    assignmentCompletion: 40,
    academicScores: {
      excel: 72, sql: 65, sas: 60, python: 58, ml: 52, dl: 48, genai: 40, agenticai: 35, mlops: 30, llmops: 25
    },
    assignments: {
      session1: "Completed", session2: "Completed", session3: "Pending", session4: "Pending", session5: "Pending"
    },
    assessments: {
      mcq: 50, practical: 42, hardpaper: 48
    },
    notes: "Weak performance. Low attendance due to health issues. Counselor recommended remedial session.",
    documents: [],
    timeline: [
      { date: "2026-02-01", event: "Enrolled in B-2026-B Batch" },
      { date: "2026-02-28", event: "Alert raised for low attendance (<75%)" },
      { date: "2026-03-05", event: "Counselor callback logged: student requested health leave" }
    ]
  },
  {
    id: "SMS004",
    name: "Sneha Patel",
    mobile: "+91 97765 12345",
    email: "sneha.patel@example.com",
    program: "Business Analytics Pro",
    course: "Business Analytics Core",
    batch: "B-2026-C",
    faculty: "Mrs. Anjali Roy",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-02-10",
    attendance: 92,
    assignmentCompletion: 100,
    academicScores: {
      excel: 95, sql: 92, sas: 90, python: 85, ml: 80, dl: 75, genai: 88, agenticai: 80, mlops: 78, llmops: 82
    },
    assignments: {
      session1: "Completed", session2: "Completed", session3: "Completed", session4: "Completed", session5: "Completed"
    },
    assessments: {
      mcq: 90, practical: 88, hardpaper: 86
    },
    notes: "Consistent performer, excellent analytics presentation skills.",
    documents: ["Academic_Transcript.pdf"],
    timeline: [
      { date: "2026-02-10", event: "Joined Business Analytics Program" },
      { date: "2026-03-01", event: "Submitted all basic business assessments" }
    ]
  },
  {
    id: "SMS005",
    name: "Arjun Verma",
    mobile: "+91 96543 21098",
    email: "arjun.verma@example.com",
    program: "Data Engineering Master",
    course: "Big Data & Pipelines",
    batch: "B-2026-D",
    faculty: "Mr. Raj Malhotra",
    counselor: "Rohan Das",
    status: "Completed",
    enrollmentDate: "2025-08-01",
    attendance: 96,
    assignmentCompletion: 100,
    academicScores: {
      excel: 98, sql: 96, sas: 92, python: 94, ml: 88, dl: 82, genai: 80, agenticai: 82, mlops: 95, llmops: 90
    },
    assignments: {
      session1: "Completed", session2: "Completed", session3: "Completed", session4: "Completed", session5: "Completed"
    },
    assessments: {
      mcq: 94, practical: 96, hardpaper: 95
    },
    notes: "Completed course successfully. Placed at CloudTech Solutions as Associate Engineer.",
    documents: ["Completion_Certificate.pdf", "Placement_Letter.pdf"],
    timeline: [
      { date: "2025-08-01", event: "Enrolled in Data Engineering Course" },
      { date: "2025-12-15", event: "Completed all exams with Grade A+" },
      { date: "2026-01-20", event: "Graduation and certificate issued" }
    ]
  },
  {
    id: "SMS006",
    name: "Riya Sen",
    mobile: "+91 93321 09876",
    email: "riya.sen@example.com",
    program: "Data Science Master Program",
    course: "Python & Machine Learning",
    batch: "B-2026-B",
    faculty: "Prof. S. R. Sen",
    counselor: "Priya Nair",
    status: "Dropped",
    enrollmentDate: "2025-09-01",
    attendance: 40,
    assignmentCompletion: 20,
    academicScores: {
      excel: 60, sql: 50, sas: 40, python: 45, ml: 30, dl: 0, genai: 0, agenticai: 0, mlops: 0, llmops: 0
    },
    assignments: {
      session1: "Completed", session2: "Pending", session3: "Pending", session4: "Pending", session5: "Pending"
    },
    assessments: {
      mcq: 45, practical: 30, hardpaper: 0
    },
    notes: "Student discontinued due to work relocation. Fee refund processed.",
    documents: ["Refund_Receipt.pdf"],
    timeline: [
      { date: "2025-09-01", event: "Enrolled in Data Science Master Program" },
      { date: "2025-10-15", event: "Long absence reported by Faculty" },
      { date: "2025-11-05", event: "Requested formal dropout due to relocations" }
    ]
  },
  {
    id: "SMS007",
    name: "Divya Teja",
    mobile: "+91 88888 77777",
    email: "divya.teja@example.com",
    program: "Advanced AI & ML with Gen AI",
    course: "Generative AI Specialization",
    batch: "B-2026-A",
    faculty: "Dr. Amit Verma",
    counselor: "Priya Nair",
    status: "Active",
    enrollmentDate: "2026-01-15",
    attendance: 90,
    assignmentCompletion: 100,
    academicScores: {
      excel: 88, sql: 90, sas: 84, python: 92, ml: 90, dl: 88, genai: 92, agenticai: 94, mlops: 86, llmops: 88
    },
    assignments: {
      session1: "Completed", session2: "Completed", session3: "Completed", session4: "Completed", session5: "Completed"
    },
    assessments: {
      mcq: 90, practical: 92, hardpaper: 85
    },
    notes: "Punctual student, good coding style.",
    documents: [],
    timeline: [
      { date: "2026-01-15", event: "Enrolled" }
    ]
  },
  {
    id: "SMS008",
    name: "Nikhil Gupta",
    mobile: "+91 99887 76655",
    email: "nikhil.gupta@example.com",
    program: "Business Analytics Pro",
    course: "Business Analytics Core",
    batch: "B-2026-C",
    faculty: "Mrs. Anjali Roy",
    counselor: "Rohan Das",
    status: "Inactive",
    enrollmentDate: "2026-02-15",
    attendance: 55,
    assignmentCompletion: 60,
    academicScores: {
      excel: 75, sql: 70, sas: 65, python: 60, ml: 55, dl: 50, genai: 60, agenticai: 50, mlops: 45, llmops: 48
    },
    assignments: {
      session1: "Completed", session2: "Completed", session3: "Completed", session4: "Pending", session5: "Pending"
    },
    assessments: {
      mcq: 68, practical: 55, hardpaper: 60
    },
    notes: "On medical leave since last 2 weeks. Expected to return by end of August.",
    documents: ["Medical_Certificate.pdf"],
    timeline: [
      { date: "2026-02-15", event: "Enrolled" },
      { date: "2026-03-01", event: "Submitted medical leave application" }
    ]
  }
];

let callLogs = [
  {
    id: "CALL001",
    date: "2026-08-10",
    studentId: "SMS001",
    studentName: "Aarav Sharma",
    batch: "B-2026-A",
    ongoingClass: "Agentic AI Frameworks",
    facultyRating: 10,
    materialRating: 9,
    challenges: "None. Excited about advanced agent courses.",
    feedback: "Satisfactory",
    counselorRemarks: "Very pleased. Moving fast. Keep challenging him.",
    followUpDate: "2026-09-10",
    followUpStatus: "Pending"
  },
  {
    id: "CALL002",
    date: "2026-08-11",
    studentId: "SMS002",
    studentName: "Ishita Roy",
    batch: "B-2026-A",
    ongoingClass: "Data Science Basics",
    facultyRating: 8,
    materialRating: 8,
    challenges: "Struggling with advanced SQL joines and stats definitions.",
    feedback: "Neutral",
    counselorRemarks: "Shared secondary study links. Will monitor.",
    followUpDate: "2026-08-25",
    followUpStatus: "Pending"
  },
  {
    id: "CALL003",
    date: "2026-08-05",
    studentId: "SMS003",
    studentName: "Kabir Mehta",
    batch: "B-2026-B",
    ongoingClass: "Python Foundations",
    facultyRating: 6,
    materialRating: 7,
    challenges: "Missed classes due to fever. Struggling to catch up on code assignments.",
    feedback: "Unsatisfied",
    counselorRemarks: "Arranged an offline backup class with TA.",
    followUpDate: "2026-08-15",
    followUpStatus: "Overdue"
  },
  {
    id: "CALL004",
    date: "2026-08-14",
    studentId: "SMS004",
    studentName: "Sneha Patel",
    batch: "B-2026-C",
    ongoingClass: "Advanced Excel Modeling",
    facultyRating: 9,
    materialRating: 9,
    challenges: "None. Requested extra reading on PowerBI.",
    feedback: "Satisfactory",
    counselorRemarks: "Excellent feedback. Shared PowerBI guide.",
    followUpDate: "2026-09-15",
    followUpStatus: "Pending"
  },
  {
    id: "CALL005",
    date: "2026-08-16",
    studentId: "SMS008",
    studentName: "Nikhil Gupta",
    batch: "B-2026-C",
    ongoingClass: "Tableau & Dashboards",
    facultyRating: 7,
    materialRating: 8,
    challenges: "Due to health reasons, lagging in homeworks.",
    feedback: "Neutral",
    counselorRemarks: "Reminded him to complete assignments before classes resume.",
    followUpDate: "2026-08-18",
    followUpStatus: "Pending"
  }
];

let upcomingClasses = [
  { time: "09:30 AM", course: "Advanced AI & ML with Gen AI", topic: "Agent Design Patterns", batch: "B-2026-A", faculty: "Dr. Amit Verma" },
  { time: "11:30 AM", course: "Data Science Master Program", topic: "Intro to Random Forests", batch: "B-2026-B", faculty: "Prof. S. R. Sen" },
  { time: "02:30 PM", course: "Business Analytics Pro", topic: "Forecasting & Analytics", batch: "B-2026-C", faculty: "Mrs. Anjali Roy" },
  { time: "04:30 PM", course: "Data Engineering Master", topic: "Kafka Streams", batch: "B-2026-D", faculty: "Mr. Raj Malhotra" }
];

let alerts = [
  { id: "A1", type: "Low Attendance", text: "Kabir Mehta (SMS003) attendance is below 75% (currently 62%)", status: "Active" },
  { id: "A2", type: "Unsatisfied Feedback", text: "Unsatisfied feedback rating logged for Kabir Mehta (SMS003)", status: "Active" },
  { id: "A3", type: "Pending Assignment", text: "Ishita Roy (SMS002) has overdue assignment: Session 4", status: "Active" }
];

// Helper to calculate statistics
function getSmsStats() {
  const activeStudents = students.filter(s => s.status === 'Active');
  const total = students.length;
  const activeCount = activeStudents.length;
  const activeBatchesCount = [...new Set(activeStudents.map(s => s.batch))].length;
  
  const avgAttendance = Math.round(activeStudents.reduce((acc, curr) => acc + curr.attendance, 0) / (activeCount || 1));
  const avgAssignment = Math.round(activeStudents.reduce((acc, curr) => acc + curr.assignmentCompletion, 0) / (activeCount || 1));
  
  // Calculate average performance percent (overall score out of 100 based on all academicScores)
  let totalScoreSum = 0;
  let totalScoreCount = 0;
  activeStudents.forEach(s => {
    const scores = Object.values(s.academicScores);
    totalScoreSum += scores.reduce((a, b) => a + b, 0);
    totalScoreCount += scores.length;
  });
  const avgPerformance = Math.round(totalScoreSum / (totalScoreCount || 1));
  
  // Satisfaction %
  const totalCallsCount = callLogs.length;
  const satisfiedCalls = callLogs.filter(c => c.feedback === 'Satisfactory').length;
  const satisfactionRate = Math.round((satisfiedCalls / (totalCallsCount || 1)) * 100);

  // Follow ups counts
  const pendingFollowups = callLogs.filter(c => c.followUpStatus === 'Pending' || c.followUpStatus === 'Overdue').length;
  const completedCalls = callLogs.length;
  
  // Top and Weak
  const topPerformers = students.filter(s => {
    const scores = Object.values(s.academicScores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avg >= 88 && s.status === 'Active';
  });
  
  const weakStudents = students.filter(s => {
    const scores = Object.values(s.academicScores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (avg < 70 || s.attendance < 75) && s.status === 'Active';
  });

  return {
    totalStudents: total,
    activeStudents: activeCount,
    activeBatches: activeBatchesCount,
    attendanceRate: avgAttendance,
    assignmentCompletionRate: avgAssignment,
    overallPerformance: avgPerformance,
    satisfactionRate: satisfactionRate,
    pendingFollowups: pendingFollowups,
    completedCalls: completedCalls,
    topPerformersCount: topPerformers.length,
    weakStudentsCount: weakStudents.length,
    topPerformers: topPerformers.map(s => ({ id: s.id, name: s.name, batch: s.batch, attendance: s.attendance, performance: Math.round(Object.values(s.academicScores).reduce((a, b) => a + b, 0) / Object.values(s.academicScores).length) })),
    weakStudents: weakStudents.map(s => ({ id: s.id, name: s.name, batch: s.batch, attendance: s.attendance, performance: Math.round(Object.values(s.academicScores).reduce((a, b) => a + b, 0) / Object.values(s.academicScores).length) }))
  };
}

function getSrmStats() {
  const totalCalls = callLogs.length;
  const studentsCalled = [...new Set(callLogs.map(c => c.studentId))].length;
  const callsPerStudent = (totalCalls / (studentsCalled || 1)).toFixed(1);
  
  const satisfied = callLogs.filter(c => c.feedback === 'Satisfactory').length;
  const neutral = callLogs.filter(c => c.feedback === 'Neutral').length;
  const unsatisfied = callLogs.filter(c => c.feedback === 'Unsatisfied').length;
  
  const satisfiedPercent = Math.round((satisfied / (totalCalls || 1)) * 100);
  const neutralPercent = Math.round((neutral / (totalCalls || 1)) * 100);
  const unsatisfiedPercent = Math.round((unsatisfied / (totalCalls || 1)) * 100);

  const avgFaculty = (callLogs.reduce((acc, curr) => acc + curr.facultyRating, 0) / (totalCalls || 1)).toFixed(1);
  const avgMaterial = (callLogs.reduce((acc, curr) => acc + curr.materialRating, 0) / (totalCalls || 1)).toFixed(1);
  
  const pendingFollowups = callLogs.filter(c => c.followUpStatus === 'Pending').length;
  const missedFollowups = callLogs.filter(c => c.followUpStatus === 'Missed').length;
  const overdueFollowups = callLogs.filter(c => c.followUpStatus === 'Overdue').length;
  const completedFollowups = callLogs.filter(c => c.followUpStatus === 'Completed').length;

  return {
    studentsCalled,
    totalCalls,
    callsPerStudent,
    satisfied,
    neutral,
    unsatisfied,
    satisfiedPercent,
    neutralPercent,
    unsatisfiedPercent,
    avgFacultyRating: avgFaculty,
    avgMaterialRating: avgMaterial,
    pendingFollowups,
    missedFollowups,
    overdueFollowups,
    completedFollowups
  };
}

// API Routes

// Mock login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  // Simulating successful login
  if (username === 'admin' && password === 'admin') {
    res.json({ token: 'mock-token-admin', user: { name: 'Dr. Amit Verma (Admin)', role: 'Admin' } });
  } else if (username === 'counselor' && password === 'counselor') {
    res.json({ token: 'mock-token-counselor', user: { name: 'Rohan Das (Counselor)', role: 'Counselor' } });
  } else {
    res.status(401).json({ error: "Invalid credentials. Use 'admin'/'admin' or 'counselor'/'counselor'" });
  }
});

// Students API
app.get('/api/students', (req, res) => {
  const { search, status, batch, program } = req.query;
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
  if (program && program !== 'All') {
    filtered = filtered.filter(s => s.program === program);
  }

  res.json(filtered);
});

app.get('/api/students/:id', (req, res) => {
  const student = students.find(s => s.id === req.params.id);
  if (student) {
    // Inject call logs into student profile
    const studentCalls = callLogs.filter(c => c.studentId === student.id);
    res.json({ ...student, callLogs: studentCalls });
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

app.post('/api/students', (req, res) => {
  const newStudent = req.body;
  // Generate ID
  const nextId = "SMS" + String(students.length + 1).padStart(3, '0');
  const student = {
    id: nextId,
    name: newStudent.name || "Unknown Student",
    mobile: newStudent.mobile || "",
    email: newStudent.email || "",
    program: newStudent.program || "Data Science Master Program",
    course: newStudent.course || "Data Science Foundation",
    batch: newStudent.batch || "B-2026-A",
    faculty: newStudent.faculty || "Dr. Amit Verma",
    counselor: newStudent.counselor || "Rohan Das",
    status: newStudent.status || "Active",
    enrollmentDate: newStudent.enrollmentDate || new Date().toISOString().split('T')[0],
    attendance: parseInt(newStudent.attendance) || 100,
    assignmentCompletion: 0,
    academicScores: {
      excel: 0, sql: 0, sas: 0, python: 0, ml: 0, dl: 0, genai: 0, agenticai: 0, mlops: 0, llmops: 0
    },
    assignments: {
      session1: "Pending", session2: "Pending", session3: "Pending", session4: "Pending", session5: "Pending"
    },
    assessments: {
      mcq: 0, practical: 0, hardpaper: 0
    },
    notes: newStudent.notes || "",
    documents: [],
    timeline: [
      { date: new Date().toISOString().split('T')[0], event: "Enrolled in " + (newStudent.program || "Program") }
    ]
  };
  students.push(student);
  res.status(201).json(student);
});

app.put('/api/students/:id', (req, res) => {
  const id = req.params.id;
  const index = students.findIndex(s => s.id === id);
  if (index !== -1) {
    students[index] = { ...students[index], ...req.body };
    res.json(students[index]);
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const id = req.params.id;
  const index = students.findIndex(s => s.id === id);
  if (index !== -1) {
    students.splice(index, 1);
    res.json({ message: "Student deleted successfully" });
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

// Performance APIs
app.get('/api/performance', (req, res) => {
  // Returns academic progress list
  const data = students.map(s => ({
    id: s.id,
    name: s.name,
    batch: s.batch,
    course: s.course,
    attendance: s.attendance,
    scores: s.academicScores,
    assignments: s.assignments,
    assignmentCompletion: s.assignmentCompletion,
    assessments: s.assessments,
    overallScore: Math.round(Object.values(s.academicScores).reduce((a, b) => a + b, 0) / Object.values(s.academicScores).length),
    remarks: s.attendance < 75 ? "Needs Attention - Attendance Low" : "Progressing Well"
  }));
  res.json(data);
});

app.put('/api/performance/:id', (req, res) => {
  const student = students.find(s => s.id === req.params.id);
  if (student) {
    const { scores, assignments, assessments, attendance } = req.body;
    if (scores) student.academicScores = { ...student.academicScores, ...scores };
    if (assignments) {
      student.assignments = { ...student.assignments, ...assignments };
      // Recalculate completion percentage
      const vals = Object.values(student.assignments);
      const done = vals.filter(v => v === 'Completed').length;
      student.assignmentCompletion = Math.round((done / vals.length) * 100);
    }
    if (assessments) student.assessments = { ...student.assessments, ...assessments };
    if (attendance !== undefined) student.attendance = parseInt(attendance);
    
    // Add to timeline
    student.timeline.push({
      date: new Date().toISOString().split('T')[0],
      event: "Academic performance scorecard updated"
    });
    
    res.json(student);
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

app.post('/api/performance/bulk-import', (req, res) => {
  // Mock performance Excel import
  students.forEach(s => {
    // Bump scores randomly as mock update
    Object.keys(s.academicScores).forEach(module => {
      s.academicScores[module] = Math.min(100, s.academicScores[module] + Math.floor(Math.random() * 5));
    });
  });
  res.json({ message: "Academic scores successfully synchronized from external report." });
});

// Relationship / Reviews API
app.get('/api/relationship', (req, res) => {
  res.json(callLogs);
});

app.post('/api/relationship', (req, res) => {
  const log = req.body;
  const student = students.find(s => s.id === log.studentId);
  if (!student) {
    return res.status(404).json({ error: "Student ID not found" });
  }
  const nextCallId = "CALL" + String(callLogs.length + 1).padStart(3, '0');
  const newCall = {
    id: nextCallId,
    date: log.date || new Date().toISOString().split('T')[0],
    studentId: log.studentId,
    studentName: student.name,
    batch: student.batch,
    ongoingClass: log.ongoingClass || "Agentic AI Frameworks",
    facultyRating: parseInt(log.facultyRating) || 8,
    materialRating: parseInt(log.materialRating) || 8,
    challenges: log.challenges || "None",
    feedback: log.feedback || "Satisfactory",
    counselorRemarks: log.counselorRemarks || "Routine check-in call completed.",
    followUpDate: log.followUpDate || "",
    followUpStatus: log.followUpDate ? "Pending" : "None"
  };

  callLogs.push(newCall);

  // If there's an active low attendance or bad feedback alert, mark resolved if feedback is Satisfactory
  if (newCall.feedback === 'Satisfactory') {
    alerts = alerts.filter(a => !(a.type === 'Unsatisfied Feedback' && a.text.includes(student.id)));
  }

  // Add event to student timeline
  student.timeline.push({
    date: newCall.date,
    event: `Counselor Call Logged (${newCall.feedback}) - Remarks: ${newCall.counselorRemarks}`
  });

  res.status(201).json(newCall);
});

// Dashboards APIs
app.get('/api/dashboard/sms', (req, res) => {
  res.json({
    stats: getSmsStats(),
    upcomingClasses: upcomingClasses,
    alerts: alerts
  });
});

app.get('/api/dashboard/srm', (req, res) => {
  res.json({
    stats: getSrmStats(),
    callHistory: callLogs.slice(-10)
  });
});

// Alerts resolution API
app.post('/api/alerts/:id/resolve', (req, res) => {
  const alertId = req.params.id;
  alerts = alerts.filter(a => a.id !== alertId);
  res.json({ message: "Alert dismissed successfully" });
});

// Catch-all route to serve the SPA or individual files
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`Student Management System (SMS) Mock Server running on http://localhost:${PORT}`);
});
