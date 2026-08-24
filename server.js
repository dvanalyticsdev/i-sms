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
    session: "Session 5",
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
      mcq: 95, practical: 92, hardpaper: 90, mockInterview: 94
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
    session: "Session 3",
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
      mcq: 82, practical: 75, hardpaper: 78, mockInterview: 80
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
    session: "Session 2",
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
      mcq: 50, practical: 42, hardpaper: 48, mockInterview: 45
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
    session: "Session 4",
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
      mcq: 90, practical: 88, hardpaper: 86, mockInterview: 92
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
    session: "Session 5",
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
      mcq: 94, practical: 96, hardpaper: 95, mockInterview: 98
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
    session: "Session 1",
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
      mcq: 45, practical: 30, hardpaper: 35, mockInterview: 40
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
    session: "Session 4",
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
      mcq: 90, practical: 92, hardpaper: 85, mockInterview: 89
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
    session: "Session 2",
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
      mcq: 68, practical: 55, hardpaper: 60, mockInterview: 58
    },
    notes: "On medical leave since last 2 weeks. Expected to return by end of August.",
    documents: ["Medical_Certificate.pdf"],
    timeline: [
      { date: "2026-02-15", event: "Enrolled" },
      { date: "2026-03-01", event: "Submitted medical leave application" }
    ]
  }
];

// Batches Collection
let batches = [
  {
    id: "BATCH001",
    code: "B-2026-A",
    name: "AI & ML Alpha Cohort 2026",
    program: "Advanced AI & ML with Gen AI",
    course: "Generative AI Specialization",
    faculty: "Dr. Amit Verma",
    startDate: "2026-01-10",
    endDate: "2026-06-30",
    timing: "09:30 AM - 11:30 AM",
    status: "Active"
  },
  {
    id: "BATCH002",
    code: "B-2026-B",
    name: "Data Science Foundation & Deep Learning",
    program: "Data Science Master Program",
    course: "Deep Learning Bootcamp",
    faculty: "Prof. S. R. Sen",
    startDate: "2026-02-01",
    endDate: "2026-07-31",
    timing: "11:30 AM - 01:30 PM",
    status: "Active"
  },
  {
    id: "BATCH003",
    code: "B-2026-C",
    name: "Business Analytics & Predictive Modeling",
    program: "Business Analytics Pro",
    course: "Business Analytics Core",
    faculty: "Mrs. Anjali Roy",
    startDate: "2026-02-10",
    endDate: "2026-08-15",
    timing: "02:30 PM - 04:30 PM",
    status: "Active"
  },
  {
    id: "BATCH004",
    code: "B-2026-D",
    name: "Big Data Pipelines & Distributed Streams",
    program: "Data Engineering Master",
    course: "Big Data & Pipelines",
    faculty: "Mr. Raj Malhotra",
    startDate: "2025-08-01",
    endDate: "2026-01-20",
    timing: "04:30 PM - 06:30 PM",
    status: "Completed"
  }
];

// Sessions Collection
let sessions = [
  { id: "SESS001", batchCode: "B-2026-A", sessionNumber: 1, name: "Session 1", topic: "Intro to GenAI & Agent Architectures", date: "2026-01-15", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS002", batchCode: "B-2026-A", sessionNumber: 2, name: "Session 2", topic: "Prompt Engineering & Few-Shot", date: "2026-01-22", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS003", batchCode: "B-2026-A", sessionNumber: 3, name: "Session 3", topic: "Agent Frameworks & Function Calling", date: "2026-02-05", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS004", batchCode: "B-2026-A", sessionNumber: 4, name: "Session 4", topic: "Multi-Agent System Orchestration", date: "2026-02-20", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS005", batchCode: "B-2026-A", sessionNumber: 5, name: "Session 5", topic: "Production Deployment & LLMOps", date: "2026-03-12", timing: "09:30 AM", faculty: "Dr. Amit Verma", status: "Completed" },
  { id: "SESS006", batchCode: "B-2026-B", sessionNumber: 1, name: "Session 1", topic: "Python Data Science Foundations", date: "2026-02-05", timing: "11:30 AM", faculty: "Prof. S. R. Sen", status: "Completed" },
  { id: "SESS007", batchCode: "B-2026-B", sessionNumber: 2, name: "Session 2", topic: "Advanced Pandas & Vectorization", date: "2026-02-15", timing: "11:30 AM", faculty: "Prof. S. R. Sen", status: "Completed" },
  { id: "SESS008", batchCode: "B-2026-B", sessionNumber: 3, name: "Session 3", topic: "Machine Learning Regression & Trees", date: "2026-02-28", timing: "11:30 AM", faculty: "Prof. S. R. Sen", status: "Ongoing" },
  { id: "SESS009", batchCode: "B-2026-C", sessionNumber: 1, name: "Session 1", topic: "Advanced Excel Modeling", date: "2026-02-15", timing: "02:30 PM", faculty: "Mrs. Anjali Roy", status: "Completed" },
  { id: "SESS010", batchCode: "B-2026-C", sessionNumber: 2, name: "Session 2", topic: "SQL Analytics & Aggregations", date: "2026-03-01", timing: "02:30 PM", faculty: "Mrs. Anjali Roy", status: "Completed" }
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

// Helper to calculate individual student LMS Score (combining 4 assessment pillars)
function calculateStudentLmsScore(assessments = {}) {
  const mcq = typeof assessments.mcq === 'number' ? Math.max(0, Math.min(100, assessments.mcq)) : 0;
  const practical = typeof assessments.practical === 'number' ? Math.max(0, Math.min(100, assessments.practical)) : 0;
  const hardpaper = typeof assessments.hardpaper === 'number' ? Math.max(0, Math.min(100, assessments.hardpaper)) : 0;
  const mockInterview = typeof assessments.mockInterview === 'number' ? Math.max(0, Math.min(100, assessments.mockInterview)) : 0;
  return Math.round((mcq + practical + hardpaper + mockInterview) / 4);
}

// Helper to calculate statistics with dynamic Batch & Session cohort filtering
function getSmsStats(batchFilter = 'All', sessionFilter = 'All') {
  let cohortStudents = [...students];

  if (batchFilter && batchFilter !== 'All') {
    cohortStudents = cohortStudents.filter(s => s.batch === batchFilter);
  }
  if (sessionFilter && sessionFilter !== 'All') {
    cohortStudents = cohortStudents.filter(s => s.session === sessionFilter);
  }

  const total = cohortStudents.length;
  const activeStudents = cohortStudents.filter(s => s.status === 'Active');
  const activeCount = activeStudents.length;
  const activeBatchesCount = [...new Set((activeStudents.length ? activeStudents : cohortStudents).map(s => s.batch))].length;

  const targetList = activeStudents.length > 0 ? activeStudents : cohortStudents;
  const count = targetList.length || 1;

  const avgAttendance = targetList.length ? Math.round(targetList.reduce((acc, curr) => acc + (Number(curr.attendance) || 0), 0) / count) : 0;
  const avgAssignment = targetList.length ? Math.round(targetList.reduce((acc, curr) => acc + (Number(curr.assignmentCompletion) || 0), 0) / count) : 0;

  // LMS assessment component averages
  let mcqSum = 0, practicalSum = 0, hardpaperSum = 0, mockInterviewSum = 0, lmsScoreSum = 0;
  targetList.forEach(s => {
    const a = s.assessments || {};
    const mcq = Number(a.mcq) || 0;
    const practical = Number(a.practical) || 0;
    const hardpaper = Number(a.hardpaper) || 0;
    const mockInterview = Number(a.mockInterview) || 0;
    const studentLms = calculateStudentLmsScore(a);
    mcqSum += mcq;
    practicalSum += practical;
    hardpaperSum += hardpaper;
    mockInterviewSum += mockInterview;
    lmsScoreSum += studentLms;
  });

  const avgLmsScore = targetList.length ? Math.round(lmsScoreSum / count) : 0;
  const avgMcq = targetList.length ? Math.round(mcqSum / count) : 0;
  const avgPractical = targetList.length ? Math.round(practicalSum / count) : 0;
  const avgHardpaper = targetList.length ? Math.round(hardpaperSum / count) : 0;
  const avgMockInterview = targetList.length ? Math.round(mockInterviewSum / count) : 0;

  // Calculate average performance percent across academic module scores
  let totalScoreSum = 0;
  let totalScoreCount = 0;
  targetList.forEach(s => {
    const scores = Object.values(s.academicScores || {});
    if (scores.length) {
      totalScoreSum += scores.reduce((a, b) => a + b, 0);
      totalScoreCount += scores.length;
    }
  });
  const avgPerformance = totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : avgLmsScore;

  // Satisfaction %
  const totalCallsCount = callLogs.length;
  const satisfiedCalls = callLogs.filter(c => c.feedback === 'Satisfactory').length;
  const satisfactionRate = Math.round((satisfiedCalls / (totalCallsCount || 1)) * 100);

  // Follow ups counts
  const pendingFollowups = callLogs.filter(c => c.followUpStatus === 'Pending' || c.followUpStatus === 'Overdue').length;
  const completedCalls = callLogs.length;

  // Top and Weak performers for this cohort
  const topPerformers = targetList.filter(s => {
    const lms = calculateStudentLmsScore(s.assessments);
    return lms >= 85 || s.attendance >= 90;
  }).sort((a, b) => calculateStudentLmsScore(b.assessments) - calculateStudentLmsScore(a.assessments));

  const weakStudents = targetList.filter(s => {
    const lms = calculateStudentLmsScore(s.assessments);
    return (lms < 70 || s.attendance < 75) && s.status === 'Active';
  }).sort((a, b) => calculateStudentLmsScore(a.assessments) - calculateStudentLmsScore(b.assessments));

  // Filter upcoming classes if batch is selected
  let cohortClasses = [...upcomingClasses];
  if (batchFilter && batchFilter !== 'All') {
    cohortClasses = cohortClasses.filter(c => c.batch === batchFilter);
  }

  return {
    totalStudents: total,
    activeStudents: activeCount,
    activeBatches: activeBatchesCount,
    attendanceRate: avgAttendance,
    assignmentCompletionRate: avgAssignment,
    lmsScoreRate: avgLmsScore,
    overallPerformance: avgPerformance,
    mcqAvg: avgMcq,
    practicalAvg: avgPractical,
    hardpaperAvg: avgHardpaper,
    mockInterviewAvg: avgMockInterview,
    satisfactionRate: satisfactionRate,
    pendingFollowups: pendingFollowups,
    completedCalls: completedCalls,
    topPerformersCount: topPerformers.length,
    weakStudentsCount: weakStudents.length,
    topPerformers: topPerformers.map(s => ({
      id: s.id,
      name: s.name,
      batch: s.batch,
      session: s.session || "Session 1",
      attendance: s.attendance,
      performance: calculateStudentLmsScore(s.assessments),
      lmsScore: calculateStudentLmsScore(s.assessments)
    })),
    weakStudents: weakStudents.map(s => ({
      id: s.id,
      name: s.name,
      batch: s.batch,
      session: s.session || "Session 1",
      attendance: s.attendance,
      performance: calculateStudentLmsScore(s.assessments),
      lmsScore: calculateStudentLmsScore(s.assessments)
    })),
    classes: cohortClasses
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
  if (username === 'admin' && password === 'admin') {
    res.json({ token: 'mock-token-admin', user: { name: 'Dr. Amit Verma', role: 'Admin' } });
  } else if (username === 'counselor' && password === 'counselor') {
    res.json({ token: 'mock-token-counselor', user: { name: 'Rohan Das', role: 'Counselor' } });
  } else {
    res.status(401).json({ error: "Invalid credentials. Use 'admin'/'admin' or 'counselor'/'counselor'" });
  }
});

// Batches Management APIs
app.get('/api/batches', (req, res) => {
  res.json(batches);
});

app.post('/api/batches', (req, res) => {
  const b = req.body;
  if (!b.code || !b.name) {
    return res.status(400).json({ error: "Batch code and name are required." });
  }
  const nextId = "BATCH" + String(batches.length + 1).padStart(3, '0');
  const newBatch = {
    id: nextId,
    code: b.code.trim().toUpperCase(),
    name: b.name.trim(),
    program: b.program || "Advanced AI & ML with Gen AI",
    course: b.course || "Specialization Track",
    faculty: b.faculty || "Dr. Amit Verma",
    startDate: b.startDate || new Date().toISOString().split('T')[0],
    endDate: b.endDate || "",
    timing: b.timing || "09:30 AM - 11:30 AM",
    status: b.status || "Active"
  };
  batches.push(newBatch);
  res.status(201).json(newBatch);
});

app.put('/api/batches/:id', (req, res) => {
  const id = req.params.id;
  const idx = batches.findIndex(b => b.id === id || b.code === id);
  if (idx !== -1) {
    batches[idx] = { ...batches[idx], ...req.body };
    res.json(batches[idx]);
  } else {
    res.status(404).json({ error: "Batch not found" });
  }
});

app.delete('/api/batches/:id', (req, res) => {
  const id = req.params.id;
  const idx = batches.findIndex(b => b.id === id || b.code === id);
  if (idx !== -1) {
    batches.splice(idx, 1);
    res.json({ message: "Batch deleted successfully" });
  } else {
    res.status(404).json({ error: "Batch not found" });
  }
});

// Sessions Management APIs
app.get('/api/sessions', (req, res) => {
  const { batch } = req.query;
  let filtered = [...sessions];
  if (batch && batch !== 'All') {
    filtered = filtered.filter(s => s.batchCode === batch);
  }
  res.json(filtered);
});

app.post('/api/sessions', (req, res) => {
  const s = req.body;
  if (!s.name || !s.batchCode) {
    return res.status(400).json({ error: "Session name and batch are required." });
  }
  const nextId = "SESS" + String(sessions.length + 1).padStart(3, '0');
  const newSession = {
    id: nextId,
    batchCode: s.batchCode,
    sessionNumber: parseInt(s.sessionNumber) || (sessions.filter(x => x.batchCode === s.batchCode).length + 1),
    name: s.name.trim(),
    topic: s.topic || "Core Module Overview",
    date: s.date || new Date().toISOString().split('T')[0],
    timing: s.timing || "09:30 AM",
    faculty: s.faculty || "Faculty Lead",
    status: s.status || "Scheduled"
  };
  sessions.push(newSession);
  res.status(201).json(newSession);
});

app.put('/api/sessions/:id', (req, res) => {
  const id = req.params.id;
  const idx = sessions.findIndex(s => s.id === id);
  if (idx !== -1) {
    sessions[idx] = { ...sessions[idx], ...req.body };
    res.json(sessions[idx]);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  const id = req.params.id;
  const idx = sessions.findIndex(s => s.id === id);
  if (idx !== -1) {
    sessions.splice(idx, 1);
    res.json({ message: "Session deleted successfully" });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// Students API
app.get('/api/students', (req, res) => {
  const { search, status, batch, session, program } = req.query;
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
  if (program && program !== 'All') {
    filtered = filtered.filter(s => s.program === program);
  }

  res.json(filtered.map(s => ({
    ...s,
    lmsScore: calculateStudentLmsScore(s.assessments)
  })));
});

app.get('/api/students/:id', (req, res) => {
  const student = students.find(s => s.id === req.params.id);
  if (student) {
    const studentCalls = callLogs.filter(c => c.studentId === student.id);
    res.json({
      ...student,
      lmsScore: calculateStudentLmsScore(student.assessments),
      callLogs: studentCalls
    });
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

app.post('/api/students', (req, res) => {
  const newStudent = req.body;
  const nextId = "SMS" + String(students.length + 1).padStart(3, '0');
  const student = {
    id: nextId,
    name: newStudent.name || "Unknown Student",
    mobile: newStudent.mobile || "",
    email: newStudent.email || "",
    program: newStudent.program || "Advanced AI & ML with Gen AI",
    course: newStudent.course || "Generative AI Specialization",
    batch: newStudent.batch || "B-2026-A",
    session: newStudent.session || "Session 1",
    faculty: newStudent.faculty || "Dr. Amit Verma",
    counselor: newStudent.counselor || "Rohan Das",
    status: newStudent.status || "Active",
    enrollmentDate: newStudent.enrollmentDate || new Date().toISOString().split('T')[0],
    attendance: Math.max(0, Math.min(100, parseInt(newStudent.attendance) || 100)),
    assignmentCompletion: Math.max(0, Math.min(100, parseInt(newStudent.assignmentCompletion) || 0)),
    academicScores: newStudent.academicScores || {
      excel: 0, sql: 0, sas: 0, python: 0, ml: 0, dl: 0, genai: 0, agenticai: 0, mlops: 0, llmops: 0
    },
    assignments: newStudent.assignments || {
      session1: "Pending", session2: "Pending", session3: "Pending", session4: "Pending", session5: "Pending"
    },
    assessments: {
      mcq: Math.max(0, Math.min(100, parseInt(newStudent.assessments?.mcq) || 0)),
      practical: Math.max(0, Math.min(100, parseInt(newStudent.assessments?.practical) || 0)),
      hardpaper: Math.max(0, Math.min(100, parseInt(newStudent.assessments?.hardpaper) || 0)),
      mockInterview: Math.max(0, Math.min(100, parseInt(newStudent.assessments?.mockInterview) || 0))
    },
    notes: newStudent.notes || "",
    documents: [],
    timeline: [
      { date: new Date().toISOString().split('T')[0], event: "Enrolled in " + (newStudent.program || "Program") }
    ]
  };
  students.push(student);
  res.status(201).json({ ...student, lmsScore: calculateStudentLmsScore(student.assessments) });
});

app.put('/api/students/:id', (req, res) => {
  const id = req.params.id;
  const index = students.findIndex(s => s.id === id);
  if (index !== -1) {
    const updated = { ...students[index], ...req.body };
    if (req.body.assessments) {
      updated.assessments = {
        mcq: Math.max(0, Math.min(100, parseInt(req.body.assessments.mcq ?? students[index].assessments?.mcq) || 0)),
        practical: Math.max(0, Math.min(100, parseInt(req.body.assessments.practical ?? students[index].assessments?.practical) || 0)),
        hardpaper: Math.max(0, Math.min(100, parseInt(req.body.assessments.hardpaper ?? students[index].assessments?.hardpaper) || 0)),
        mockInterview: Math.max(0, Math.min(100, parseInt(req.body.assessments.mockInterview ?? students[index].assessments?.mockInterview) || 0))
      };
    }
    if (req.body.attendance !== undefined) {
      updated.attendance = Math.max(0, Math.min(100, parseInt(req.body.attendance) || 0));
    }
    if (req.body.assignmentCompletion !== undefined) {
      updated.assignmentCompletion = Math.max(0, Math.min(100, parseInt(req.body.assignmentCompletion) || 0));
    }
    students[index] = updated;
    res.json({ ...students[index], lmsScore: calculateStudentLmsScore(students[index].assessments) });
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
  const { batch, session } = req.query;
  let filtered = [...students];
  if (batch && batch !== 'All') {
    filtered = filtered.filter(s => s.batch === batch);
  }
  if (session && session !== 'All') {
    filtered = filtered.filter(s => s.session === session);
  }

  const data = filtered.map(s => {
    const lms = calculateStudentLmsScore(s.assessments);
    return {
      id: s.id,
      name: s.name,
      batch: s.batch,
      session: s.session || "Session 1",
      course: s.course,
      attendance: s.attendance,
      scores: s.academicScores,
      assignments: s.assignments,
      assignmentCompletion: s.assignmentCompletion,
      assessments: s.assessments,
      lmsScore: lms,
      overallScore: lms,
      remarks: (lms < 70 || s.attendance < 75) ? "Needs Attention - Retake Recommended" : "Progressing Well"
    };
  });
  res.json(data);
});

app.put('/api/performance/:id', (req, res) => {
  const student = students.find(s => s.id === req.params.id);
  if (student) {
    const { scores, assignments, assessments, attendance, assignmentCompletion, session, batch } = req.body;
    if (scores) student.academicScores = { ...student.academicScores, ...scores };
    if (assignments) {
      student.assignments = { ...student.assignments, ...assignments };
      const vals = Object.values(student.assignments);
      const done = vals.filter(v => v === 'Completed').length;
      student.assignmentCompletion = Math.round((done / vals.length) * 100);
    }
    if (assignmentCompletion !== undefined) {
      student.assignmentCompletion = Math.max(0, Math.min(100, parseInt(assignmentCompletion) || 0));
    }
    if (assessments) {
      student.assessments = {
        mcq: Math.max(0, Math.min(100, parseInt(assessments.mcq ?? student.assessments?.mcq) || 0)),
        practical: Math.max(0, Math.min(100, parseInt(assessments.practical ?? student.assessments?.practical) || 0)),
        hardpaper: Math.max(0, Math.min(100, parseInt(assessments.hardpaper ?? student.assessments?.hardpaper) || 0)),
        mockInterview: Math.max(0, Math.min(100, parseInt(assessments.mockInterview ?? student.assessments?.mockInterview) || 0))
      };
    }
    if (attendance !== undefined) student.attendance = Math.max(0, Math.min(100, parseInt(attendance) || 0));
    if (session) student.session = session;
    if (batch) student.batch = batch;
    
    // Add to timeline
    student.timeline.push({
      date: new Date().toISOString().split('T')[0],
      event: `Academic performance scorecard updated (LMS: ${calculateStudentLmsScore(student.assessments)}%)`
    });
    
    res.json({
      ...student,
      lmsScore: calculateStudentLmsScore(student.assessments)
    });
  } else {
    res.status(404).json({ error: "Student not found" });
  }
});

app.post('/api/performance/bulk-import', (req, res) => {
  students.forEach(s => {
    Object.keys(s.academicScores).forEach(module => {
      s.academicScores[module] = Math.min(100, s.academicScores[module] + Math.floor(Math.random() * 5));
    });
    if (s.assessments) {
      s.assessments.mockInterview = Math.min(100, (s.assessments.mockInterview || 75) + Math.floor(Math.random() * 4));
    }
  });
  res.json({ message: "Academic and LMS scores successfully synchronized from external report." });
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

  if (newCall.feedback === 'Satisfactory') {
    alerts = alerts.filter(a => !(a.type === 'Unsatisfied Feedback' && a.text.includes(student.id)));
  }

  student.timeline.push({
    date: newCall.date,
    event: `Counselor Call Logged (${newCall.feedback}) - Remarks: ${newCall.counselorRemarks}`
  });

  res.status(201).json(newCall);
});

// Dashboards APIs
app.get('/api/dashboard/sms', (req, res) => {
  const { batch, session } = req.query;
  res.json({
    stats: getSmsStats(batch, session),
    upcomingClasses: upcomingClasses,
    alerts: alerts,
    batches: batches,
    sessions: sessions
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

app.post('/api/alerts/clear-all', (req, res) => {
  alerts = [];
  res.json({ message: "All alerts cleared successfully" });
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
