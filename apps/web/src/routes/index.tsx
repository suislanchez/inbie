import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	Archive,
	ArrowRight,
	Ban,
	BarChart,
	Bell,
	BellOff,
	Calendar,
	Check,
	CheckCircle,
	ChevronRight,
	Clock,
	Filter,
	Globe,
	LineChart,
	Mail,
	MessageCircle,
	Minus,
	PieChart,
	RefreshCw,
	Send,
	Settings,
	Shield,
	SlidersHorizontal,
	Sparkles,
	Star,
	Tag,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { useTheme } from "@/components/theme-provider";
import { GoogleAuth } from "@/components/google-auth";
import { EmailList, type EmailListRef } from "../components/email-list";
import { debugEvents } from "@/components/debug-overlay";
import { fetchGmailEmails, type GmailEmail } from "@/lib/email-api";
import { generateEmailDraft, type EmailData } from "@/lib/ai-draft";
import { processEmailWithAI } from '../lib/ai-email-processor'
import { ManualLabelDropdown } from "../components/manual-label-dropdown"
import { AILabelButton } from "../components/ai-label-button"

// CSS for email body rendering
const emailStyles = `
  .email-body {
    @apply text-gray-800 leading-relaxed space-y-1 max-w-[800px] mx-auto break-words overflow-wrap-anywhere;
  }

  /* Basic text elements */
  .email-body p {
    @apply my-1 leading-relaxed;
  }

  /* Condense multiple consecutive breaks */
  .email-body br + br {
    display: none;
  }

  /* Links */
  .email-body a {
    @apply text-blue-600 underline break-all hover:text-blue-800 overflow-wrap-anywhere;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
    color: #2563eb; /* Tailwind blue-600 */
  }

  /* Images */
  .email-body img {
    @apply max-w-full h-auto rounded-lg my-2 object-contain;
    max-height: 400px;
  }

  /* Blockquotes */
  .email-body blockquote {
    @apply border-l-4 border-gray-200 pl-4 my-2 italic text-gray-600 bg-gray-50 py-2;
  }

  /* Code blocks */
  .email-body pre {
    @apply bg-gray-50 p-4 rounded-lg overflow-x-auto my-3 text-sm font-mono;
  }

  /* Tables */
  .email-body table {
    @apply border-collapse w-full my-3 text-sm;
  }
  .email-body th, .email-body td {
    @apply border border-gray-200 p-2;
  }
  .email-body th {
    @apply bg-gray-50 font-medium;
  }

  /* Email footers */
  .email-body .email-footer {
    @apply mt-4 pt-3 border-t border-gray-200 text-sm text-gray-500;
  }
  .email-body .email-footer p {
    @apply my-1;
  }
  .email-body .email-footer a {
    @apply text-blue-600 hover:text-blue-800;
    color: #2563eb; /* Tailwind blue-600 */
  }

  /* Special content sections */
  .email-body .special-content {
    @apply bg-gray-50 p-3 rounded-lg my-3 text-sm;
  }
  .email-body .special-content a {
    @apply text-blue-600 hover:text-blue-800;
    color: #2563eb; /* Tailwind blue-600 */
  }

  /* Lists */
  .email-body ul, .email-body ol {
    @apply my-2 pl-6 space-y-1;
  }
  .email-body li {
    @apply my-0.5;
  }

  /* Horizontal rules */
  .email-body hr {
    @apply my-3 border-t border-gray-200;
  }

  /* Small text and disclaimers */
  .email-body small, .email-body .disclaimer {
    @apply text-xs text-gray-500 block my-1;
  }

  /* Copyright notices */
  .email-body .copyright {
    @apply text-xs text-gray-400 mt-2;
  }

  /* Unsubscribe and help links */
  .email-body .unsubscribe-links {
    @apply text-xs text-gray-500 mt-1 space-y-0.5;
  }
  .email-body .unsubscribe-links a {
    @apply text-gray-600 hover:text-gray-900;
  }

  /* Company information */
  .email-body .company-info {
    @apply text-xs text-gray-400 mt-1;
  }

  /* Break long words and URLs */
  .email-body * {
    @apply break-words overflow-wrap-anywhere;
  }

  /* Email signatures */
  .email-body .signature {
    @apply mt-3 pt-2 border-t border-gray-200 text-sm text-gray-600;
  }

  /* Quoted text */
  .email-body .quoted-text {
    @apply mt-2 pl-3 border-l-4 border-gray-200 text-sm text-gray-500;
  }

  /* Email headers */
  .email-body .email-header {
    @apply mb-3 pb-2 border-b border-gray-200;
  }

  /* Email metadata */
  .email-body .email-meta {
    @apply text-xs text-gray-500 mb-2;
  }

  /* Email attachments */
  .email-body .attachments {
    @apply mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200;
  }
  .email-body .attachment-item {
    @apply flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900;
  }

  /* Remove excess line height from paragraphs with just a break */
  .email-body p:empty, .email-body div:empty {
    @apply hidden;
  }

  /* Dividers that are often used for spacing */
  .email-body div + div:empty {
    @apply hidden;
  }
`;

// Style component to inject email styles
function EmailStyles() {
  return <style dangerouslySetInnerHTML={{ __html: emailStyles }} />;
}

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

// Add interface for email type
interface Email {
	id: number; // Internal numeric ID
	gmailId: string; // Original Gmail message ID
	sender: string;
	senderEmail?: string; // Optional field for sender's email address
	to?: string; // Optional field for recipient's email address
	date?: string; // ISO date string for sorting and display
	time: string;
	subject: string;
	preview: string;
	content: string;
	badges: string[];
	hasAIDraft: boolean;
	aiDraft: string;
	threadId?: string; // Add threadId field
	labelIds?: string[]; // Add labelIds property for Gmail labels
	analytics: {
		responseTime: string;
		priority: string;
		category: string;
		sentiment: string;
	};
}

// Helper function to format email dates properly
function formatEmailDate(dateString: string) {
  try {
    // Try to convert relative time strings to dates
    if (dateString.includes('ago')) {
      const now = new Date();
      if (dateString.includes('minute')) {
        const minutes = parseInt(dateString.split(' ')[0]) || 0;
        return new Date(now.getTime() - minutes * 60000).toLocaleString();
      } else if (dateString.includes('hour')) {
        const hours = parseInt(dateString.split(' ')[0]) || 0;
        return new Date(now.getTime() - hours * 3600000).toLocaleString();
      } else if (dateString === 'Yesterday') {
        return new Date(now.getTime() - 86400000).toLocaleString();
      } else if (dateString.includes('day')) {
        const days = parseInt(dateString.split(' ')[0]) || 0;
        return new Date(now.getTime() - days * 86400000).toLocaleString();
      }
    }
    
    // Try to parse as a date if it's not a relative time
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString();
    }
    
    // Fallback to original string if all else fails
    return dateString;
  } catch (error) {
    return dateString;
  }
}

// Add helper to display time if email date is today, otherwise show date
function displayEmailDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString()
}

interface Rule {
	id: number
	name: string
	description: string
	conditions: {
		type: "sender" | "subject" | "content" | "category"
		operator: "contains" | "equals" | "startsWith" | "endsWith" | "matches"
		value: string
	}[]
	actions: {
		type: "label" | "archive" | "move" | "forward" | "delete" | "markRead"
		value: string
	}[]
	priority: number
	isEnabled: boolean
	createdAt: string
	lastModified: string
	lastTriggered: string | null
	triggerCount: number
}

interface RuleTestResult {
	ruleId: number
	ruleName: string
	emailId: number
	matched: boolean
	matchedConditions: {
		condition: string
		matched: boolean
		value: string
	}[]
	actions: {
		action: "label" | "archive" | "move" | "forward" | "delete" | "markRead"
		value: string
	}[]
	timestamp: string
}

interface AIAction {
	id: number
	type: "rule_applied" | "label_added" | "email_archived" | "email_moved" | "email_deleted" | "draft_created"
	emailId: number
	emailSubject: string
	emailSender: string
	ruleId?: number
	ruleName?: string
	details: {
		action: string
		value: string
		confidence?: number
	}[]
	timestamp: string
}

// Add dummy data
const DUMMY_RULES: Rule[] = [
	{
		id: 1,
		name: "Newsletter Handler",
		description: "Automatically archive newsletters and label them appropriately",
		conditions: [
			{
				type: "subject",
				operator: "contains",
				value: "newsletter"
			},
			{
				type: "category",
				operator: "equals",
				value: "marketing"
			}
		],
		actions: [
			{
				type: "label",
				value: "Newsletter"
			},
			{
				type: "archive",
				value: "true"
			}
		],
		priority: 1,
		isEnabled: true,
		createdAt: "2024-03-15T10:00:00Z",
		lastModified: "2024-03-15T10:00:00Z",
		lastTriggered: "2024-03-20T15:30:00Z",
		triggerCount: 45
	},
	{
		id: 2,
		name: "Meeting Requests",
		description: "Label and organize calendar invites",
		conditions: [
			{
				type: "subject",
				operator: "contains",
				value: "meeting"
			},
			{
				type: "content",
				operator: "contains",
				value: "calendar"
			}
		],
		actions: [
			{
				type: "label",
				value: "Calendar"
			},
			{
				type: "move",
				value: "meetings"
			}
		],
		priority: 2,
		isEnabled: true,
		createdAt: "2024-03-14T09:00:00Z",
		lastModified: "2024-03-16T11:20:00Z",
		lastTriggered: "2024-03-20T14:15:00Z",
		triggerCount: 23
	}
]

const DUMMY_AI_ACTIONS: AIAction[] = [
	{
		id: 1,
		type: "rule_applied",
		emailId: 123,
		emailSubject: "Weekly Newsletter - Tech Updates",
		emailSender: "tech@example.com",
		ruleId: 1,
		ruleName: "Newsletter Handler",
		details: [
			{
				action: "label",
				value: "Newsletter",
				confidence: 0.95
			},
			{
				action: "archive",
				value: "true",
				confidence: 0.98
			}
		],
		timestamp: "2024-03-20T15:30:00Z"
	},
	{
		id: 2,
		type: "draft_created",
		emailId: 124,
		emailSubject: "Meeting Request: Project Review",
		emailSender: "colleague@company.com",
		details: [
			{
				action: "draft_response",
				value: "I'll be available for the meeting. Looking forward to discussing the project updates.",
				confidence: 0.92
			}
		],
		timestamp: "2024-03-20T14:15:00Z"
	}
]

// Update DUMMY_EMAILS to use the Email interface
const DUMMY_EMAILS: Record<string, Email[]> = {
	"to-reply": [
		{
			id: 1,
			gmailId: "msg_1abc", // Mock Gmail message ID in base64url format
			sender: "Google Recruiter",
			time: "2 hours ago",
			subject: "Google SWE Internship Interview Follow-up",
			preview:
				"Thank you for completing your technical interview. We'd like to schedule the next round...",
			content: `Hi Luis,

Thank you for completing your technical interview for the Software Engineering Internship position at Google. We were impressed with your performance and would like to schedule the next round of interviews.

The next phase will include:
1. System Design Interview (45 minutes)
2. Behavioral Interview (30 minutes)
3. Team Matching Discussion (30 minutes)

Please let me know your availability for next week. We're looking to complete these interviews by Friday.

Best regards,
Sarah Chen
Technical Recruiter
Google`,
			badges: ["High Priority", "Interview"],
			hasAIDraft: true,
			aiDraft: `Hi Sarah,

Thank you for the positive feedback and for moving me forward in the interview process. I'm excited about the opportunity to join Google.

I'm available for interviews on the following days next week:
- Monday: 2 PM - 5 PM PST
- Tuesday: 10 AM - 4 PM PST
- Wednesday: 1 PM - 6 PM PST
- Thursday: 9 AM - 3 PM PST
- Friday: 11 AM - 4 PM PST

Please let me know which time slots work best for the team. I'll make sure to prepare thoroughly for each interview round.

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "2 hours",
				priority: "High",
				category: "Career",
				sentiment: "Professional",
			},
		},
		{
			id: 2,
			gmailId: "msg_2def", // Mock Gmail message ID in base64url format
			sender: "Cal Jazz Ensemble",
			time: "Yesterday",
			subject: "Spring Concert Rehearsal Schedule",
			preview:
				"Here's the updated rehearsal schedule for our upcoming spring concert...",
			content: `Dear Jazz Ensemble Members,

I hope this email finds you well. I'm writing to share the updated rehearsal schedule for our upcoming spring concert, "Jazz Under the Stars."

Key Dates:
- March 25: Full ensemble rehearsal (7-9 PM, Hertz Hall)
- March 27: Sectionals (5-7 PM)
- March 29: Dress rehearsal (6-9 PM)
- March 30: Concert (7 PM)

Please note:
1. Attendance is mandatory for all rehearsals
2. New sheet music will be distributed on Monday
3. We'll be recording the concert for our annual album

Let me know if you have any conflicts with these dates.

Best,
Prof. David Wong
Director, Cal Jazz Ensemble`,
			badges: ["Important", "Music"],
			hasAIDraft: true,
			aiDraft: `Hi Professor Wong,

Thank you for sharing the rehearsal schedule. I've reviewed the dates and can confirm my attendance for all rehearsals and the concert.

I'm particularly looking forward to the "Jazz Under the Stars" theme and the recording opportunity. I'll make sure to practice the new material once it's distributed on Monday.

Is there anything specific you'd like us to prepare for the sectionals on March 27?

Best regards,
Luis Sanchez
Tenor Saxophone
Cal Jazz Ensemble`,
			analytics: {
				responseTime: "1 day",
				priority: "Medium",
				category: "Music",
				sentiment: "Professional",
			},
		},
		{
			id: 3,
			gmailId: "msg_3ghi", // Mock Gmail message ID in base64url format
			sender: "Berkeley CS Department",
			time: "3 hours ago",
			subject: "CS 189 Project Proposal Due",
			preview:
				"Reminder: Your machine learning project proposal is due this Friday...",
			content: `Dear CS 189 Students,

This is a reminder that your machine learning project proposals are due this Friday, March 22, at 11:59 PM.

Requirements:
1. Project title and team members
2. Problem statement and motivation
3. Proposed methodology
4. Expected outcomes
5. Timeline and milestones
6. Required resources

Submit your proposal as a PDF through Gradescope. Late submissions will be penalized 10% per day.

Office hours are available:
- Tuesday: 2-4 PM (Soda 405)
- Wednesday: 3-5 PM (Soda 405)
- Thursday: 1-3 PM (Soda 405)

Best regards,
Prof. Michael Jordan
CS 189: Introduction to Machine Learning`,
			badges: ["High Priority", "Academic"],
			hasAIDraft: true,
			aiDraft: `Hi Professor Jordan,

Thank you for the reminder about the project proposal deadline. My team and I are working on a proposal for a real-time music genre classification system using deep learning.

We've made good progress and should be ready to submit by the deadline. However, I have a few questions about the methodology section:
1. Should we include preliminary results if available?
2. Is there a preferred format for the timeline?
3. Do we need to include a budget for cloud computing resources?

I'll try to attend office hours on Tuesday to discuss these points.

Best regards,
Luis Sanchez
CS 189 Student`,
			analytics: {
				responseTime: "3 hours",
				priority: "High",
				category: "Academic",
				sentiment: "Professional",
			},
		},
		{
			id: 17,
			gmailId: "msg_17jkl", // Mock Gmail message ID in base64url format
			sender: "CS 170 TA",
			time: "30 minutes ago",
			subject: "Project 2 Submission Issue",
			preview:
				"I noticed some issues with your project submission that need to be addressed...",
			content: `Hi Luis,

I'm reviewing the submissions for Project 2 and noticed a few issues with your implementation that need to be addressed:

1. The time complexity analysis for your dynamic programming solution is incomplete
2. The test cases for the edge cases are missing
3. The documentation for the graph construction could be more detailed

Please address these points and resubmit by tomorrow at 11:59 PM. Let me know if you have any questions.

Best regards,
David Chen
CS 170 TA`,
			badges: ["High Priority", "Academic"],
			hasAIDraft: true,
			aiDraft: `Hi David,

Thank you for the detailed feedback on Project 2. I'll address each point:

1. I'll add a complete time complexity analysis, including space complexity
2. I'll implement additional test cases covering all edge cases
3. I'll enhance the documentation for the graph construction algorithm

I should have the updated submission ready by tomorrow afternoon. Would it be possible to get your feedback on the changes before the final submission?

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "30 minutes",
				priority: "High",
				category: "Academic",
				sentiment: "Professional",
			},
		},
		{
			id: 18,
			gmailId: "msg_18mno", // Mock Gmail message ID in base64url format
			sender: "Research Lab Director",
			time: "1 hour ago",
			subject: "Summer Research Position",
			preview:
				"We'd like to offer you a summer research position in our AI lab...",
			content: `Dear Luis,

I hope this email finds you well. After reviewing your application and conducting the interview, we're pleased to offer you a summer research position in our AI lab.

Details of the position:
- Duration: June 1 - August 31
- Stipend: $6,000/month
- Project: Developing novel approaches to few-shot learning
- Mentorship: Direct supervision by Prof. Smith

We were particularly impressed by your background in machine learning and your previous research experience.

Please let us know if you'd like to accept this offer by Friday. We can discuss any questions you might have.

Best regards,
Dr. Emily Thompson
Director, AI Research Lab
UC Berkeley`,
			badges: ["High Priority", "Research"],
			hasAIDraft: true,
			aiDraft: `Dear Dr. Thompson,

Thank you for offering me the summer research position in your AI lab. I'm very excited about the opportunity to work on few-shot learning under Prof. Smith's supervision.

I would like to accept the position and have a few questions:
1. Would it be possible to start a week earlier, on May 25?
2. Are there any specific prerequisites or readings you'd recommend before starting?
3. Could you provide more details about the computing resources available for the project?

I look forward to contributing to the lab's research efforts.

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "1 hour",
				priority: "High",
				category: "Research",
				sentiment: "Professional",
			},
		},
		{
			id: 19,
			gmailId: "msg_19mno", // Mock Gmail message ID in base64url format
			sender: "Hackathon Organizer",
			time: "2 hours ago",
			subject: "CalHacks 11.0 - Team Registration",
			preview:
				"Your team's registration for CalHacks 11.0 has been confirmed...",
			content: `Hi Luis,

Great news! Your team's registration for CalHacks 11.0 has been confirmed. Here are the details:

Team Name: AI Innovators
Team Members:
- Luis Sanchez (Team Lead)
- Sarah Chen
- Michael Rodriguez
- Alex Wong

Event Details:
- Date: April 15-17
- Location: MLK Student Union
- Check-in: 5 PM on April 15
- Team Table: B-42

Please confirm:
1. All team members will attend
2. Any dietary restrictions
3. If you need hardware resources

Looking forward to seeing your team's project!

Best,
CalHacks Team`,
			badges: ["Important", "Hackathon"],
			hasAIDraft: true,
			aiDraft: `Hi CalHacks Team,

Thank you for confirming our team's registration. We're all excited to participate in CalHacks 11.0!

To confirm:
1. All four team members will be attending
2. No dietary restrictions
3. We would like to request:
   - 2 NVIDIA A100 GPUs
   - 3 Arduino kits
   - Access to the ML lab

Could you please confirm if these hardware resources will be available?

Best regards,
Luis Sanchez
Team Lead, AI Innovators`,
			analytics: {
				responseTime: "2 hours",
				priority: "High",
				category: "Event",
				sentiment: "Professional",
			},
		},
		{
			id: 20,
			gmailId: "msg_20pqr", // Mock Gmail message ID in base64url format
			sender: "Conference Chair",
			time: "3 hours ago",
			subject: "Paper Review Request - ICML 2024",
			preview: "We would like to invite you to review papers for ICML 2024...",
			content: `Dear Dr. Sanchez,

On behalf of the ICML 2024 program committee, I would like to invite you to serve as a reviewer for this year's conference. Your expertise in machine learning and recent publications make you an excellent candidate for this role.

Reviewer Responsibilities:
- Review 3-4 papers
- Submit reviews by May 15
- Participate in the discussion phase
- Attend the virtual PC meeting

Benefits:
- Early access to cutting-edge research
- Networking opportunities
- Recognition in the conference proceedings

Please let us know if you can commit to this role by next week.

Best regards,
Prof. James Wilson
Program Chair
ICML 2024`,
			badges: ["High Priority", "Academic"],
			hasAIDraft: true,
			aiDraft: `Dear Prof. Wilson,

Thank you for inviting me to serve as a reviewer for ICML 2024. I'm honored by this opportunity and would be happy to contribute to the conference.

I can commit to reviewing 3-4 papers and participating in the discussion phase. However, I should note that I'm currently a graduate student, not a Dr. I hope this won't affect my eligibility to serve as a reviewer.

I have a few questions:
1. What are the specific areas you'd like me to focus on?
2. Would it be possible to get papers related to my research interests in few-shot learning?
3. What is the expected time commitment for the virtual PC meeting?

Best regards,
Luis Sanchez
Graduate Student
UC Berkeley`,
			analytics: {
				responseTime: "3 hours",
				priority: "High",
				category: "Academic",
				sentiment: "Professional",
			},
		},
	],
	academic: [
		{
			id: 4,
			gmailId: "msg_4stu", // Mock Gmail message ID in base64url format
			sender: "EECS Department",
			time: "1 day ago",
			subject: "Spring 2024 Course Registration",
			preview:
				"Important information about course registration for Spring 2024...",
			content: `Dear EECS Students,

Course registration for Spring 2024 will open on March 25 at 9 AM PST. Please note the following important dates:

Phase 1 (March 25-27):
- CS 170: Algorithms
- CS 188: Artificial Intelligence
- CS 189: Machine Learning
- EE 120: Signals and Systems

Phase 2 (March 28-30):
- All other EECS courses
- Technical electives
- Breadth requirements

Important Notes:
1. Check your enrollment appointment time on CalCentral
2. Have backup courses ready
3. Join waitlists if courses are full
4. Contact your advisor for any issues

Best regards,
EECS Student Services`,
			badges: ["Important", "Academic"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "1 day",
				priority: "High",
				category: "Academic",
				sentiment: "Informative",
			},
		},
		{
			id: 5,
			gmailId: "msg_5vwx", // Mock Gmail message ID in base64url format
			sender: "Academic Advisor",
			time: "2 days ago",
			subject: "Degree Progress Check",
			preview:
				"Let's review your degree progress and plan for next semester...",
			content: `Hi Luis,

I hope this email finds you well. I'd like to schedule a meeting to review your degree progress and discuss your course planning for next semester.

Based on your current transcript, you have:
- Completed: 85 units
- In Progress: 15 units
- Remaining: 20 units

Please bring:
1. Your tentative course schedule
2. Any questions about requirements
3. Your academic goals

Schedule a 30-minute appointment through CalCentral.

Best regards,
Dr. Sarah Johnson
EECS Academic Advisor`,
			badges: ["Important"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "2 days",
				priority: "Medium",
				category: "Academic",
				sentiment: "Professional",
			},
		},
		{
			id: 21,
			gmailId: "msg_21yz", // Mock Gmail message ID in base64url format
			sender: "EECS Department",
			time: "4 hours ago",
			subject: "Graduate Student Symposium",
			preview:
				"Call for presentations at the annual Graduate Student Symposium...",
			content: `Dear EECS Graduate Students,

We're pleased to announce the annual Graduate Student Symposium, scheduled for May 15. This is a great opportunity to present your research to faculty and peers.

Important Dates:
- Abstract Submission: April 15
- Presentation Selection: April 22
- Symposium: May 15

Format:
- 15-minute presentation
- 5-minute Q&A
- Poster session

Please submit your abstract through the symposium website.

Best regards,
EECS Graduate Office`,
			badges: ["Important", "Academic"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "4 hours",
				priority: "Medium",
				category: "Academic",
				sentiment: "Informative",
			},
		},
		{
			id: 22,
			gmailId: "msg_22abc", // Mock Gmail message ID in base64url format
			sender: "CS 189 Professor",
			time: "5 hours ago",
			subject: "Final Project Guidelines",
			preview: "Detailed guidelines for the CS 189 final project...",
			content: `Dear CS 189 Students,

Attached are the detailed guidelines for the final project. Key points:

1. Project Proposal (Due April 1):
   - Problem statement
   - Methodology
   - Timeline
   - Team members

2. Midterm Report (Due May 1):
   - Progress update
   - Preliminary results
   - Challenges faced

3. Final Submission (Due May 15):
   - Complete implementation
   - Final report
   - Presentation

Office hours are available for project discussions.

Best regards,
Prof. Michael Jordan
CS 189: Introduction to Machine Learning`,
			badges: ["Important", "Academic"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "5 hours",
				priority: "High",
				category: "Academic",
				sentiment: "Informative",
			},
		},
	],
	career: [
		{
			id: 6,
			gmailId: "msg_6def", // Mock Gmail message ID in base64url format
			sender: "Meta University Recruiting",
			time: "1 hour ago",
			subject: "Meta SWE Internship Application Status",
			preview:
				"Your application for the Software Engineering Internship has been reviewed...",
			content: `Dear Luis,

Thank you for your interest in the Software Engineering Internship at Meta. We've reviewed your application and would like to invite you to complete our technical assessment.

Next Steps:
1. Complete the coding assessment (90 minutes)
2. Submit your availability for technical interviews
3. Update your resume if needed

The assessment will cover:
- Data structures and algorithms
- System design fundamentals
- Problem-solving skills

Please complete the assessment within 7 days.

Best regards,
Meta University Recruiting Team`,
			badges: ["High Priority", "Interview"],
			hasAIDraft: true,
			aiDraft: `Dear Meta University Recruiting Team,

Thank you for reviewing my application and for inviting me to complete the technical assessment. I'm excited about the opportunity to join Meta's engineering team.

I can confirm that I will complete the coding assessment within the 7-day timeframe. I'm particularly interested in the system design and problem-solving components, as they align well with my experience in distributed systems and algorithm development.

For the technical interviews, I'm available during the following times next week:
- Monday: 10 AM - 4 PM PST
- Tuesday: 1 PM - 6 PM PST
- Wednesday: 9 AM - 3 PM PST
- Thursday: 11 AM - 5 PM PST
- Friday: 10 AM - 2 PM PST

I've attached an updated version of my resume that includes my most recent projects and achievements.

I look forward to the assessment and the opportunity to demonstrate my technical skills.

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "1 hour",
				priority: "High",
				category: "Career",
				sentiment: "Professional",
			},
		},
		{
			id: 7,
			gmailId: "msg_7ghi", // Mock Gmail message ID in base64url format
			sender: "Amazon Uni. Recruiting",
			time: "3 hours ago",
			subject: "Amazon SDE Internship - Next Steps",
			preview:
				"Congratulations on passing the online assessment! Let's schedule your interviews...",
			content: `Congratulations on passing the online assessment! Let's schedule your interviews...`,
			badges: ["High Priority", "Interview"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "3 hours",
				priority: "High",
				category: "Career",
				sentiment: "Positive",
			},
		},
		{
			id: 23,
			gmailId: "msg_23jkl", // Mock Gmail message ID in base64url format
			sender: "Google Recruiter",
			time: "6 hours ago",
			subject: "Google SWE Internship - Next Steps",
			preview:
				"Congratulations on passing the technical interview! Let's schedule the next round...",
			content: `Hi Luis,

Congratulations on passing the technical interview! We were impressed with your problem-solving skills and technical knowledge.

Next Steps:
1. System Design Interview (45 minutes)
2. Behavioral Interview (30 minutes)
3. Team Matching Discussion (30 minutes)

Available time slots:
- Monday: 10 AM - 4 PM PST
- Tuesday: 1 PM - 6 PM PST
- Wednesday: 9 AM - 3 PM PST

Please let me know your preferred times.

Best regards,
Sarah Chen
Technical Recruiter
Google`,
			badges: ["High Priority", "Interview"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "6 hours",
				priority: "High",
				category: "Career",
				sentiment: "Positive",
			},
		},
		{
			id: 24,
			gmailId: "msg_24mno", // Mock Gmail message ID in base64url format
			sender: "Microsoft Recruiter",
			time: "7 hours ago",
			subject: "Microsoft Research Internship",
			preview:
				"We'd like to invite you to interview for our Research Internship position...",
			content: `Dear Luis,

We were impressed by your research background and would like to invite you to interview for our Research Internship position at Microsoft Research.

The role focuses on:
- Machine Learning Research
- Large Language Models
- Natural Language Processing

Interview Process:
1. Technical Discussion (60 minutes)
2. Research Presentation (30 minutes)
3. Team Fit Discussion (30 minutes)

Please let us know your availability for next week.

Best regards,
Michael Brown
Research Recruiter
Microsoft`,
			badges: ["High Priority", "Interview"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "7 hours",
				priority: "High",
				category: "Career",
				sentiment: "Professional",
			},
		},
	],
	clubs: [
		{
			id: 8,
			gmailId: "msg_8pqr", // Mock Gmail message ID in base64url format
			sender: "Cal Hackers",
			time: "2 days ago",
			subject: "CalHacks 11.0 Planning Meeting",
			preview: "Join us for the first planning meeting for CalHacks 11.0...",
			content: `Hey Cal Hackers!

We're excited to announce the first planning meeting for CalHacks 11.0! This year's hackathon will be bigger and better than ever.

Meeting Details:
- Date: March 25
- Time: 7 PM
- Location: Soda 405
- Pizza will be provided!

Agenda:
1. Theme announcement
2. Committee assignments
3. Timeline planning
4. Sponsor updates
5. New initiatives

Please RSVP by March 23.

Best,
Cal Hackers Team`,
			badges: ["Important", "Hackathon"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "2 days",
				priority: "Medium",
				category: "Club",
				sentiment: "Excited",
			},
		},
		{
			id: 9,
			gmailId: "msg_9stu", // Mock Gmail message ID in base64url format
			sender: "Berkeley AI Research",
			time: "1 day ago",
			subject: "Weekly Research Meeting",
			preview: "Agenda for this week's BAIR research meeting...",
			content: `Hi BAIR Members,

Here's the agenda for this week's research meeting:

1. Paper Discussion: "Recent Advances in LLMs"
2. Project Updates
   - Computer Vision Team
   - NLP Team
   - Robotics Team
3. New Research Proposals
4. Upcoming Conferences

Meeting Details:
- Time: Friday, 4-6 PM
- Location: Soda 510
- Snacks provided

Please prepare your updates and bring any questions.

Best,
BAIR Leadership Team`,
			badges: ["Important", "Research"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "1 day",
				priority: "Medium",
				category: "Club",
				sentiment: "Professional",
			},
		},
		{
			id: 25,
			gmailId: "msg_25vwx", // Mock Gmail message ID in base64url format
			sender: "BAIR Leadership",
			time: "8 hours ago",
			subject: "Weekly Research Meeting Agenda",
			preview: "Agenda for this week's BAIR research meeting...",
			content: `Hi BAIR Members,

Here's the agenda for this week's research meeting:

1. Paper Discussion: "Recent Advances in LLMs"
2. Project Updates
   - Computer Vision Team
   - NLP Team
   - Robotics Team
3. New Research Proposals
4. Upcoming Conferences

Meeting Details:
- Time: Friday, 4-6 PM
- Location: Soda 510
- Snacks provided

Please prepare your updates and bring any questions.

Best,
BAIR Leadership Team`,
			badges: ["Important", "Research"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "8 hours",
				priority: "Medium",
				category: "Club",
				sentiment: "Professional",
			},
		},
		{
			id: 26,
			gmailId: "msg_26yz", // Mock Gmail message ID in base64url format
			sender: "Cal Hackers",
			time: "9 hours ago",
			subject: "Weekly Workshop: Web3 Development",
			preview: "Join us for a hands-on workshop on Web3 development...",
			content: `Hey Cal Hackers!

We're excited to announce our weekly workshop on Web3 development:

Topics Covered:
- Smart Contract Development
- DApp Architecture
- Web3.js Integration
- Security Best Practices

Workshop Details:
- Date: Thursday, 6-8 PM
- Location: Soda 405
- Requirements: Laptop with Node.js installed
- Pizza will be provided!

Please RSVP by Wednesday.

Best,
Cal Hackers Team`,
			badges: ["Important", "Workshop"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "9 hours",
				priority: "Medium",
				category: "Club",
				sentiment: "Excited",
			},
		},
	],
	personal: [
		{
			id: 10,
			gmailId: "msg_10abc", // Mock Gmail message ID in base64url format
			sender: "Mom",
			time: "1 day ago",
			subject: "Family Dinner This Weekend",
			preview:
				"Are you coming home for dinner this Sunday? Grandma will be there...",
			content: `Hi mijo,

Just checking if you're coming home for dinner this Sunday. Grandma is visiting and she's making her famous tamales! 

Also, I found some of your old photos from high school that you might want to see.

Let me know if you need a ride from BART.

Love,
Mom`,
			badges: ["Personal"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "1 day",
				priority: "Low",
				category: "Personal",
				sentiment: "Warm",
			},
		},
		{
			id: 11,
			gmailId: "msg_11def", // Mock Gmail message ID in base64url format
			sender: "Roommate",
			time: "3 hours ago",
			subject: "Rent Due Tomorrow",
			preview: "Hey, just a reminder that rent is due tomorrow...",
			content: "Hey, just a reminder that rent is due tomorrow...",
			badges: ["Important", "Personal"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "3 hours",
				priority: "High",
				category: "Personal",
				sentiment: "Friendly",
			},
		},
		{
			id: 27,
			gmailId: "msg_27ghi", // Mock Gmail message ID in base64url format
			sender: "Roommate",
			time: "10 hours ago",
			subject: "Apartment Maintenance",
			preview: "The landlord needs to do some maintenance work next week...",
			content: `Hey,

The landlord just called. They need to do some maintenance work next week:
- Fix the kitchen sink
- Check the heating system
- Replace the smoke detectors

They'll be here Tuesday and Wednesday, 9 AM - 5 PM. We need to make sure someone's home to let them in.

Can you cover Tuesday? I'll take Wednesday.

Thanks,
Alex`,
			badges: ["Important", "Personal"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "10 hours",
				priority: "Medium",
				category: "Personal",
				sentiment: "Friendly",
			},
		},
		{
			id: 28,
			gmailId: "msg_28jkl", // Mock Gmail message ID in base64url format
			sender: "Family Group Chat",
			time: "11 hours ago",
			subject: "Summer Vacation Planning",
			preview: "Let's start planning our summer family vacation...",
			content: `Hi everyone,

Let's start planning our summer family vacation. Here are some options:

1. Lake Tahoe (June 15-22)
   - Cabin rental
   - Hiking and water activities
   - Close to home

2. Yosemite (July 1-8)
   - Camping
   - Hiking and photography
   - Need to book soon

3. San Diego (August 1-8)
   - Beach house
   - Relaxation and city activities
   - More expensive

Please vote for your preference and let me know any specific dates that work for you.

Love,
Mom`,
			badges: ["Personal"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "11 hours",
				priority: "Low",
				category: "Personal",
				sentiment: "Warm",
			},
		},
	],
	newsletters: [
		{
			id: 12,
			gmailId: "msg_12mno", // Mock Gmail message ID in base64url format
			sender: "Berkeley Engineering",
			time: "2 days ago",
			subject: "Engineering Weekly Digest",
			preview: "Latest news from the College of Engineering...",
			content: "Latest news from the College of Engineering...",
			badges: ["Newsletter"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "2 days",
				priority: "Low",
				category: "Newsletter",
				sentiment: "Informative",
			},
		},
		{
			id: 13,
			gmailId: "msg_13pqr", // Mock Gmail message ID in base64url format
			sender: "ACM Berkeley",
			time: "1 day ago",
			subject: "ACM Weekly Newsletter",
			preview: "Upcoming tech talks, workshops, and social events...",
			content: "Upcoming tech talks, workshops, and social events...",
			badges: ["Newsletter"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "1 day",
				priority: "Low",
				category: "Newsletter",
				sentiment: "Informative",
			},
		},
		{
			id: 29,
			gmailId: "msg_29stu", // Mock Gmail message ID in base64url format
			sender: "ACM Tech News",
			time: "12 hours ago",
			subject: "Weekly Tech Digest",
			preview: "Latest updates in AI, ML, and Computer Science...",
			content: "Latest updates in AI, ML, and Computer Science...",
			badges: ["Newsletter"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "12 hours",
				priority: "Low",
				category: "Newsletter",
				sentiment: "Informative",
			},
		},
		{
			id: 30,
			gmailId: "msg_30vwx", // Mock Gmail message ID in base64url format
			sender: "Berkeley Engineering",
			time: "13 hours ago",
			subject: "Engineering Weekly",
			preview: "News and updates from the College of Engineering...",
			content: "News and updates from the College of Engineering...",
			badges: ["Newsletter"],
			hasAIDraft: false,
			aiDraft: "",
			analytics: {
				responseTime: "13 hours",
				priority: "Low",
				category: "Newsletter",
				sentiment: "Informative",
			},
		},
	],
	"cold-email": [
		{
			id: 14,
			gmailId: "msg_14yz", // Mock Gmail message ID in base64url format
			sender: "Tech Recruiter",
			time: "1 hour ago",
			subject: "Exciting Opportunity at TechCorp",
			preview:
				"I came across your profile and was impressed by your experience...",
			content: `Hi Luis,

I hope this email finds you well. I came across your profile on LinkedIn and was particularly impressed by your experience in software engineering and machine learning.

I'm reaching out because we have an exciting opportunity at TechCorp that aligns perfectly with your background. We're looking for a Senior Software Engineer to join our AI team.

Key highlights of the role:
- Work on cutting-edge AI projects
- Competitive compensation package
- Remote-friendly environment
- Strong growth opportunities

Would you be open to a quick chat about this opportunity?

Best regards,
Sarah Johnson
Senior Technical Recruiter
TechCorp`,
			badges: ["Cold Outreach", "Recruitment"],
			hasAIDraft: true,
			aiDraft: `Hi Sarah,

Thank you for reaching out and for your interest in my profile. I appreciate you taking the time to connect.

While I'm currently focused on completing my degree at Berkeley, I'm always interested in learning about new opportunities. However, I'm not actively seeking new roles at the moment.

If you'd like, I'd be happy to connect on LinkedIn to stay in touch for future opportunities.

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "1 hour",
				priority: "Low",
				category: "Cold Outreach",
				sentiment: "Professional",
			},
		},
		{
			id: 15,
			gmailId: "msg_15abc", // Mock Gmail message ID in base64url format
			sender: "Startup Founder",
			time: "2 hours ago",
			subject: "Join Our AI Startup Journey",
			preview:
				"We're building the next generation of AI tools and would love to have you on board...",
			content: `Hello Luis,

I'm Alex, founder of AIForge, a startup focused on democratizing AI tools for developers. I saw your impressive work on GitHub and was particularly struck by your contributions to open-source AI projects.

We're currently in stealth mode but have secured significant funding and are looking for talented engineers to join our core team. Your background in machine learning and software engineering would be a perfect fit.

What we offer:
- Early-stage equity
- Competitive salary
- Remote-first culture
- Cutting-edge tech stack

Would you be interested in learning more about our vision?

Best,
Alex Chen
Founder & CEO
AIForge`,
			badges: ["Cold Outreach", "Startup"],
			hasAIDraft: true,
			aiDraft: `Hi Alex,

Thank you for reaching out and for your interest in my work. I'm flattered that you found my GitHub contributions noteworthy.

While I'm currently committed to my studies and existing projects at Berkeley, I'm always interested in learning about innovative AI initiatives. I'd be happy to connect on LinkedIn to stay in touch about future opportunities.

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "2 hours",
				priority: "Low",
				category: "Cold Outreach",
				sentiment: "Professional",
			},
		},
		{
			id: 16,
			gmailId: "msg_16def", // Mock Gmail message ID in base64url format
			sender: "Product Manager",
			time: "3 hours ago",
			subject: "Collaboration Opportunity",
			preview: "We're looking for technical advisors for our new AI product...",
			content: `Hi Luis,

I'm a Product Manager at InnovateAI, and we're developing a new AI-powered development tool. I found your technical blog posts insightful and think you'd be a great technical advisor for our project.

We're looking for experts to:
- Review our technical architecture
- Provide feedback on our AI models
- Guide our development roadmap
- Join our advisory board

This would be a part-time, paid position with flexible hours.

Would you be interested in learning more?

Best regards,
Michael Rodriguez
Product Manager
InnovateAI`,
			badges: ["Cold Outreach", "Advisory"],
			hasAIDraft: true,
			aiDraft: `Hi Michael,

Thank you for reaching out and for your interest in my technical writing. I appreciate the opportunity to potentially collaborate with InnovateAI.

While I'm currently focused on my academic commitments and existing projects, I'm always interested in learning about new AI initiatives. I'd be happy to connect on LinkedIn to stay in touch about future opportunities.

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "3 hours",
				priority: "Low",
				category: "Cold Outreach",
				sentiment: "Professional",
			},
		},
		{
			id: 31,
			gmailId: "msg_31ghi", // Mock Gmail message ID in base64url format
			sender: "AI Startup CEO",
			time: "14 hours ago",
			subject: "Partnership Opportunity",
			preview: "We're looking for technical advisors for our AI startup...",
			content: `Hi Luis,

I'm the CEO of AIStartup, and we're developing a novel approach to automated machine learning. I came across your research on few-shot learning and was particularly impressed.

We're looking for technical advisors to:
- Review our technical architecture
- Guide our ML pipeline development
- Provide insights on market opportunities

This would be a paid advisory role with equity options.

Would you be interested in learning more?

Best regards,
John Smith
CEO, AIStartup`,
			badges: ["Cold Outreach", "Startup"],
			hasAIDraft: true,
			aiDraft: `Hi John,

Thank you for reaching out and for your interest in my research. I appreciate the opportunity to potentially collaborate with AIStartup.

While I'm currently focused on my academic commitments, I'm always interested in learning about innovative AI initiatives. I'd be happy to connect on LinkedIn to stay in touch about future opportunities.

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "14 hours",
				priority: "Low",
				category: "Cold Outreach",
				sentiment: "Professional",
			},
		},
		{
			id: 32,
			gmailId: "msg_32jkl", // Mock Gmail message ID in base64url format
			sender: "Tech Conference Organizer",
			time: "15 hours ago",
			subject: "Speaker Invitation - AI Conference",
			preview:
				"We'd like to invite you to speak at our upcoming AI conference...",
			content: `Dear Luis,

I'm organizing the upcoming AI Innovation Conference in San Francisco, and we'd like to invite you to speak about your work in few-shot learning.

Conference Details:
- Date: September 15-17
- Location: Moscone Center
- Audience: 500+ AI professionals
- Honorarium: $2,000 + expenses

We're particularly interested in your recent paper on "Efficient Few-Shot Learning."

Would you be available to speak?

Best regards,
Sarah Williams
Conference Director
AI Innovation Conference`,
			badges: ["Cold Outreach", "Conference"],
			hasAIDraft: true,
			aiDraft: `Hi Sarah,

Thank you for the invitation to speak at the AI Innovation Conference. I'm honored that you're interested in my work on few-shot learning.

While I'm currently focused on completing my degree, I'd be happy to discuss this opportunity further. Could you provide more details about:
1. The expected length of the presentation
2. The technical level of the audience
3. The specific topics you'd like me to cover

Best regards,
Luis Sanchez`,
			analytics: {
				responseTime: "15 hours",
				priority: "Low",
				category: "Cold Outreach",
				sentiment: "Professional",
			},
		},
	],
};

// Default fallback folders if no Gmail labels are available
const DEFAULT_FOLDERS = [
	"to-reply",
	"academic",
	"career",
	"clubs",
	"personal",
	"newsletters",
	"cold-email",
];

// Update sorting type to only include priority and date
type SortOption = "priority" | "date";

// Add new interface for summary items
interface SummaryItem {
	id: number;
	type: "urgent" | "important" | "followup" | "meeting" | "ai";
	title: string;
	description: string;
	time: string;
	emailId: number;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
}

interface BlockedEmail {
	id: number;
	sender: string;
	email: string;
	reason: "cold-outreach" | "spam" | "newsletter" | "marketing";
	blockedAt: string;
	domain: string;
	category: string;
	confidence: number;
	action: "blocked" | "quarantined" | "flagged";
}

// Add new interfaces for analytics and unsubscribe data
interface UnsubscribeItem {
	id: number;
	sender: string;
	email: string;
	totalEmails: number;
	readPercentage: number;
	archivedPercentage: number;
	status: "unhandled" | "unsubscribed" | "archived" | "approved";
}

interface AnalyticsData {
	summary: {
		received: number;
		read: number;
		archived: number;
		sent: number;
	};
	topSenders: Array<{
		email: string;
		count: number;
	}>;
	topDomains: Array<{
		domain: string;
		count: number;
	}>;
	topRecipients: Array<{
		email: string;
		count: number;
	}>;
	timeSeries: {
		dates: string[];
		archived: number[];
		unarchived: number[];
		read: number[];
		unread: number[];
		sent: number[];
	};
	unsubscribeStats: {
		unsubscribed: number;
		autoArchived: number;
		approved: number;
	};
}

function TodaySummaryComponent() {
	// Mock data for today's summary
	const summaryItems: SummaryItem[] = [
		{
			id: 1,
			type: "urgent",
			title: "Contract Review Required",
			description: "Legal department needs your review of vendor contract",
			time: "2 hours ago",
			emailId: 19,
			icon: <AlertCircle className="h-4 w-4" />,
			color: "text-red-600",
			bgColor: "bg-red-100",
		},
		{
			id: 2,
			type: "important",
			title: "Quarterly Review Meeting",
			description: "Prepare for upcoming quarterly review meeting",
			time: "1 hour ago",
			emailId: 6,
			icon: <Calendar className="h-4 w-4" />,
			color: "text-yellow-600",
			bgColor: "bg-yellow-100",
		},
		{
			id: 3,
			type: "followup",
			title: "Project Timeline Update",
			description: "Response needed for project timeline discussion",
			time: "3 hours ago",
			emailId: 1,
			icon: <Clock className="h-4 w-4" />,
			color: "text-blue-600",
			bgColor: "bg-blue-100",
		},
		{
			id: 4,
			type: "ai",
			title: "AI Draft Ready",
			description: "2 AI-generated responses ready for review",
			time: "Just now",
			emailId: 22,
			icon: <Star className="h-4 w-4" />,
			color: "text-purple-600",
			bgColor: "bg-purple-100",
		},
	];

	// Add today's summary paragraph
	const todaySummary = {
		date: new Date().toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
		}),
		overview: `Today has been quite active with 12 new emails requiring your attention. You have 3 urgent items, including a contract review from Legal and preparation for tomorrow's quarterly review meeting. The AI assistant has prepared 2 draft responses for your review, and there are 5 emails pending your reply. Most of your communications today have been focused on project management and team coordination, with a few important client communications mixed in.`,
		metrics: {
			urgent: 3,
			important: 4,
			pendingReplies: 5,
			aiDrafts: 2,
			totalNew: 12,
		},
		focus: "Project Management & Team Coordination",
		sentiment: "Positive",
		topCategories: [
			"Project Updates",
			"Team Communication",
			"Client Relations",
		],
	};

	return (
		<div className="space-y-4 p-4">
			<div className="mb-6">
				<h2 className="font-semibold text-lg">Today's Summary</h2>
				<p className="text-muted-foreground text-sm">
					Overview of your email activities
				</p>
			</div>

			{/* Add Summary Card */}
			<div className="rounded-lg border bg-card p-4">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="font-medium">{todaySummary.date}</h3>
					<div className="flex items-center gap-2">
						<span className="rounded-full bg-green-100 px-2 py-0.5 text-green-600 text-xs">
							{todaySummary.sentiment} Day
						</span>
						<span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-600 text-xs">
							{todaySummary.metrics.totalNew} New
						</span>
					</div>
				</div>

				<p className="mb-4 text-muted-foreground text-sm">
					{todaySummary.overview}
				</p>

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<h4 className="font-medium text-muted-foreground text-xs">
							Focus Areas
						</h4>
						<div className="flex flex-wrap gap-2">
							{todaySummary.topCategories.map((category) => (
								<span
									key={category}
									className="rounded-full bg-accent px-2 py-0.5 text-xs"
								>
									{category}
								</span>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<h4 className="font-medium text-muted-foreground text-xs">
							Quick Stats
						</h4>
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-md bg-accent/50 p-2">
								<span className="text-muted-foreground text-xs">Urgent</span>
								<p className="font-medium text-sm">
									{todaySummary.metrics.urgent}
								</p>
							</div>
							<div className="rounded-md bg-accent/50 p-2">
								<span className="text-muted-foreground text-xs">Important</span>
								<p className="font-medium text-sm">
									{todaySummary.metrics.important}
								</p>
							</div>
							<div className="rounded-md bg-accent/50 p-2">
								<span className="text-muted-foreground text-xs">To Reply</span>
								<p className="font-medium text-sm">
									{todaySummary.metrics.pendingReplies}
								</p>
							</div>
							<div className="rounded-md bg-accent/50 p-2">
								<span className="text-muted-foreground text-xs">AI Drafts</span>
								<p className="font-medium text-sm">
									{todaySummary.metrics.aiDrafts}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-4">
				{summaryItems.map((item) => (
					<button
						key={item.id}
						className="group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
						onClick={() => {
							// Handle click to navigate to email
							console.log(`Navigate to email ${item.emailId}`);
						}}
					>
						<div className={`rounded-full p-2 ${item.bgColor} ${item.color}`}>
							{item.icon}
						</div>
						<div className="flex-1 space-y-1">
							<div className="flex items-center justify-between">
								<h3 className="font-medium">{item.title}</h3>
								<span className="text-muted-foreground text-xs">
									{item.time}
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								{item.description}
							</p>
						</div>
						<ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
					</button>
				))}
			</div>

			<div className="mt-6 space-y-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-medium">Quick Stats</span>
					<span className="text-muted-foreground">Today</span>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-lg border p-3">
						<div className="flex items-center gap-2">
							<Mail className="h-4 w-4 text-blue-600" />
							<span className="font-medium text-sm">Emails to Reply</span>
						</div>
						<p className="mt-1 font-semibold text-2xl">5</p>
					</div>
					<div className="rounded-lg border p-3">
						<div className="flex items-center gap-2">
							<Star className="h-4 w-4 text-purple-600" />
							<span className="font-medium text-sm">AI Drafts</span>
						</div>
						<p className="mt-1 font-semibold text-2xl">2</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function ColdEmailBlockerComponent() {
	const [showSettings, setShowSettings] = useState(false);
	const [activeTab, setActiveTab] = useState<"blocked" | "settings">("blocked");

	// Mock data for blocked emails
	const blockedEmails: BlockedEmail[] = [
		{
			id: 1,
			sender: "Sales Outreach",
			email: "sales@techcorp.com",
			reason: "cold-outreach",
			blockedAt: "2 hours ago",
			domain: "techcorp.com",
			category: "Sales",
			confidence: 95,
			action: "blocked",
		},
		{
			id: 2,
			sender: "Marketing Team",
			email: "marketing@startup.io",
			reason: "marketing",
			blockedAt: "1 day ago",
			domain: "startup.io",
			category: "Marketing",
			confidence: 88,
			action: "quarantined",
		},
		{
			id: 3,
			sender: "Newsletter Service",
			email: "news@digest.com",
			reason: "newsletter",
			blockedAt: "3 days ago",
			domain: "digest.com",
			category: "Newsletter",
			confidence: 92,
			action: "flagged",
		},
	];

	const stats = {
		totalBlocked: 156,
		thisWeek: 12,
		thisMonth: 45,
		categories: {
			"Cold Outreach": 78,
			Marketing: 45,
			Newsletters: 33,
		},
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b bg-background p-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-lg">Cold Email Blocker</h2>
						<p className="text-muted-foreground text-sm">
							Protect your inbox from unwanted emails
						</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() =>
								setActiveTab(activeTab === "blocked" ? "settings" : "blocked")
							}
							className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
						>
							<SlidersHorizontal className="h-4 w-4" />
							{activeTab === "blocked" ? "Settings" : "View Blocked"}
						</button>
					</div>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 p-4 md:grid-cols-4">
				<div className="rounded-lg border bg-card p-4">
					<div className="flex items-center gap-2">
						<Shield className="h-4 w-4 text-blue-600" />
						<span className="font-medium text-sm">Total Blocked</span>
					</div>
					<p className="mt-1 font-semibold text-2xl">{stats.totalBlocked}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<div className="flex items-center gap-2">
						<Ban className="h-4 w-4 text-red-600" />
						<span className="font-medium text-sm">This Week</span>
					</div>
					<p className="mt-1 font-semibold text-2xl">{stats.thisWeek}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<div className="flex items-center gap-2">
						<Filter className="h-4 w-4 text-purple-600" />
						<span className="font-medium text-sm">This Month</span>
					</div>
					<p className="mt-1 font-semibold text-2xl">{stats.thisMonth}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<div className="flex items-center gap-2">
						<Bell className="h-4 w-4 text-yellow-600" />
						<span className="font-medium text-sm">Active Rules</span>
					</div>
					<p className="mt-1 font-semibold text-2xl">8</p>
				</div>
			</div>

			{activeTab === "blocked" ? (
				<div className="flex-1 space-y-4 overflow-y-auto p-4">
					<div className="flex items-center justify-between">
						<h3 className="font-medium text-sm">Recently Blocked</h3>
						<div className="flex items-center gap-2">
							<select className="rounded-md border px-2 py-1 text-sm">
								<option>All Categories</option>
								<option>Cold Outreach</option>
								<option>Marketing</option>
								<option>Newsletters</option>
							</select>
							<select className="rounded-md border px-2 py-1 text-sm">
								<option>All Actions</option>
								<option>Blocked</option>
								<option>Quarantined</option>
								<option>Flagged</option>
							</select>
						</div>
					</div>

					<div className="space-y-3">
						{blockedEmails.map((email) => (
							<div
								key={email.id}
								className="group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
							>
								<div
									className={`rounded-full p-2 ${
										email.reason === "cold-outreach"
											? "bg-red-100 text-red-600"
											: email.reason === "marketing"
												? "bg-yellow-100 text-yellow-600"
												: "bg-blue-100 text-blue-600"
									}`}
								>
									<Ban className="h-4 w-4" />
								</div>
								<div className="flex-1 space-y-1">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="font-medium">{email.sender}</h4>
											<p className="text-muted-foreground text-sm">
												{email.email}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span
												className={`rounded-full px-2 py-0.5 text-xs ${
													email.action === "blocked"
														? "bg-red-100 text-red-600"
														: email.action === "quarantined"
															? "bg-yellow-100 text-yellow-600"
															: "bg-blue-100 text-blue-600"
												}`}
											>
												{email.action.charAt(0).toUpperCase() +
													email.action.slice(1)}
											</span>
											<span className="text-muted-foreground text-xs">
												{email.blockedAt}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<span>{email.domain}</span>
										<span>•</span>
										<span>{email.category}</span>
										<span>•</span>
										<span>{email.confidence}% confidence</span>
									</div>
								</div>
								<button className="rounded-md p-1 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100">
									<Trash2 className="h-4 w-4 text-muted-foreground" />
								</button>
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="flex-1 space-y-6 overflow-y-auto p-4">
					<div className="space-y-4">
						<h3 className="font-medium text-sm">Blocking Rules</h3>
						<div className="space-y-3">
							<div className="rounded-lg border p-4">
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<h4 className="font-medium">Cold Outreach Detection</h4>
										<p className="text-muted-foreground text-sm">
											Block emails from unknown senders with sales intent
										</p>
									</div>
									<div className="flex items-center gap-2">
										<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
											<Settings className="h-4 w-4" />
										</button>
										<button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm">
											<Check className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>

							<div className="rounded-lg border p-4">
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<h4 className="font-medium">Newsletter Filter</h4>
										<p className="text-muted-foreground text-sm">
											Automatically categorize and filter newsletters
										</p>
									</div>
									<div className="flex items-center gap-2">
										<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
											<Settings className="h-4 w-4" />
										</button>
										<button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm">
											<Check className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>

							<div className="rounded-lg border p-4">
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<h4 className="font-medium">Marketing Emails</h4>
										<p className="text-muted-foreground text-sm">
											Filter promotional and marketing content
										</p>
									</div>
									<div className="flex items-center gap-2">
										<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
											<Settings className="h-4 w-4" />
										</button>
										<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
											<X className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<h3 className="font-medium text-sm">Notifications</h3>
						<div className="space-y-3">
							<div className="flex items-center justify-between rounded-lg border p-4">
								<div className="space-y-1">
									<h4 className="font-medium">Blocking Alerts</h4>
									<p className="text-muted-foreground text-sm">
										Get notified when important emails are blocked
									</p>
								</div>
								<button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm">
									<Bell className="h-4 w-4" />
								</button>
							</div>

							<div className="flex items-center justify-between rounded-lg border p-4">
								<div className="space-y-1">
									<h4 className="font-medium">Weekly Report</h4>
									<p className="text-muted-foreground text-sm">
										Receive weekly blocking statistics
									</p>
								</div>
								<button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
									<BellOff className="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function BulkUnsubscribeComponent() {
	const [activeTab, setActiveTab] = useState<
		"unhandled" | "archived" | "approved"
	>("unhandled");
	const [selectedItems, setSelectedItems] = useState<number[]>([]);

	// Mock data for unsubscribe items
	const unsubscribeItems: UnsubscribeItem[] = [
		{
			id: 1,
			sender: "EdStem",
			email: "notification@edstem.org",
			totalEmails: 174,
			readPercentage: 53,
			archivedPercentage: 0,
			status: "unhandled",
		},
		{
			id: 2,
			sender: "Coinbase",
			email: "reply@mail.coinbase.com",
			totalEmails: 157,
			readPercentage: 5,
			archivedPercentage: 0,
			status: "unhandled",
		},
		{
			id: 3,
			sender: "CalGroups",
			email: "cdss.undergrads@calgroups.berkeley.edu",
			totalEmails: 148,
			readPercentage: 33,
			archivedPercentage: 0,
			status: "unhandled",
		},
		{
			id: 4,
			sender: "Medium",
			email: "noreply@medium.com",
			totalEmails: 90,
			readPercentage: 26,
			archivedPercentage: 0,
			status: "unhandled",
		},
		{
			id: 5,
			sender: "NYTimes",
			email: "noreply@nytimes.com",
			totalEmails: 85,
			readPercentage: 12,
			archivedPercentage: 0,
			status: "unhandled",
		},
	];

	const handleUnsubscribe = (id: number) => {
		// Handle unsubscribe action
		console.log(`Unsubscribing from ${id}`);
	};

	const handleSelectAll = () => {
		if (selectedItems.length === unsubscribeItems.length) {
			setSelectedItems([]);
		} else {
			setSelectedItems(unsubscribeItems.map((item) => item.id));
		}
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b bg-background p-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-lg">Bulk Unsubscribe</h2>
						<p className="text-muted-foreground text-sm">
							Manage your email subscriptions
						</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setActiveTab("unhandled")}
							className={`rounded-md px-3 py-1.5 text-sm ${
								activeTab === "unhandled"
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent"
							}`}
						>
							Unhandled
						</button>
						<button
							onClick={() => setActiveTab("archived")}
							className={`rounded-md px-3 py-1.5 text-sm ${
								activeTab === "archived"
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent"
							}`}
						>
							Archived
						</button>
						<button
							onClick={() => setActiveTab("approved")}
							className={`rounded-md px-3 py-1.5 text-sm ${
								activeTab === "approved"
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent"
							}`}
						>
							Approved
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4">
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={selectedItems.length === unsubscribeItems.length}
							onChange={handleSelectAll}
							className="h-4 w-4 rounded border-gray-300"
						/>
						<span className="text-muted-foreground text-sm">
							{selectedItems.length} selected
						</span>
					</div>
					{selectedItems.length > 0 && (
						<button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm">
							Unsubscribe Selected
						</button>
					)}
				</div>

				<div className="space-y-2">
					{unsubscribeItems.map((item) => (
						<div
							key={item.id}
							className="flex items-center gap-4 rounded-lg border p-4"
						>
							<input
								type="checkbox"
								checked={selectedItems.includes(item.id)}
								onChange={(e) => {
									if (e.target.checked) {
										setSelectedItems([...selectedItems, item.id]);
									} else {
										setSelectedItems(
											selectedItems.filter((id) => id !== item.id),
										);
									}
								}}
								className="h-4 w-4 rounded border-gray-300"
							/>
							<div className="flex-1">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="font-medium">{item.sender}</h4>
										<p className="text-muted-foreground text-sm">
											{item.email}
										</p>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<p className="font-medium text-sm">
												{item.totalEmails} emails
											</p>
											<div className="flex items-center gap-2 text-muted-foreground text-xs">
												<span>{item.readPercentage}% read</span>
												<span>•</span>
												<span>{item.archivedPercentage}% archived</span>
											</div>
										</div>
										<button
											onClick={() => handleUnsubscribe(item.id)}
											className="rounded-md bg-red-100 px-3 py-1.5 text-red-600 text-sm hover:bg-red-200"
										>
											Unsubscribe
										</button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function AnalyticsComponent() {
	// Mock data for analytics
	const analyticsData: AnalyticsData = {
		summary: {
			received: 627,
			read: 153,
			archived: 12,
			sent: 7,
		},
		topSenders: [
			{ email: "fromthetimes-noreply@nytimes.com", count: 63 },
			{ email: "no-reply@mail.coinbase.com", count: 57 },
			{ email: "notification@edstem.org", count: 42 },
			{ email: "noreply@medium.com", count: 30 },
			{ email: "notifications@vercel.com", count: 29 },
		],
		topDomains: [
			{ domain: "mail.coinbase.com", count: 68 },
			{ domain: "nytimes.com", count: 63 },
			{ domain: "linkedin.com", count: 54 },
			{ domain: "edstem.org", count: 42 },
			{ domain: "substack.com", count: 34 },
		],
		topRecipients: [
			{ email: "cs168@berkeley.edu", count: 3 },
			{ email: "cs170@berkeley.edu", count: 3 },
			{ email: "cs195@berkeley.edu", count: 1 },
		],
		timeSeries: {
			dates: ["May 05", "May 12", "May 19", "May 26", "Jun 02", "Jun 09"],
			archived: [10, 15, 8, 12, 9, 11],
			unarchived: [20, 25, 18, 22, 19, 21],
			read: [30, 35, 28, 32, 29, 31],
			unread: [40, 45, 38, 42, 39, 41],
			sent: [2, 3, 1, 2, 1, 1],
		},
		unsubscribeStats: {
			unsubscribed: 1,
			autoArchived: 0,
			approved: 0,
		},
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b bg-background p-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-lg">Email Analytics</h2>
						<p className="text-muted-foreground text-sm">
							Track your email activity and patterns
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4">
				{/* Summary Cards */}
				<div className="mb-6 grid gap-4 md:grid-cols-4">
					<div className="rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2">
							<Mail className="h-4 w-4 text-blue-600" />
							<span className="font-medium text-sm">Received</span>
						</div>
						<p className="mt-1 font-semibold text-2xl">
							{analyticsData.summary.received}
						</p>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2">
							<CheckCircle className="h-4 w-4 text-green-600" />
							<span className="font-medium text-sm">Read</span>
						</div>
						<p className="mt-1 font-semibold text-2xl">
							{analyticsData.summary.read}
						</p>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2">
							<Archive className="h-4 w-4 text-purple-600" />
							<span className="font-medium text-sm">Archived</span>
						</div>
						<p className="mt-1 font-semibold text-2xl">
							{analyticsData.summary.archived}
						</p>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2">
							<Send className="h-4 w-4 text-orange-600" />
							<span className="font-medium text-sm">Sent</span>
						</div>
						<p className="mt-1 font-semibold text-2xl">
							{analyticsData.summary.sent}
						</p>
					</div>
				</div>

				{/* Top Senders and Domains */}
				<div className="mb-6 grid gap-4 md:grid-cols-2">
					<div className="rounded-lg border bg-card p-4">
						<h3 className="mb-4 font-medium text-sm">Who emails you most</h3>
						<div className="space-y-3">
							{analyticsData.topSenders.map((sender, index) => (
								<div key={index} className="flex items-center justify-between">
									<span className="text-sm">{sender.email}</span>
									<span className="font-medium text-sm">{sender.count}</span>
								</div>
							))}
						</div>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<h3 className="mb-4 font-medium text-sm">
							Domains that email you most
						</h3>
						<div className="space-y-3">
							{analyticsData.topDomains.map((domain, index) => (
								<div key={index} className="flex items-center justify-between">
									<span className="text-sm">{domain.domain}</span>
									<span className="font-medium text-sm">{domain.count}</span>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Time Series Charts */}
				<div className="mb-6 rounded-lg border bg-card p-4">
					<h3 className="mb-4 font-medium text-sm">Email Activity Over Time</h3>
					<div className="h-64">
						{/* Placeholder for chart component */}
						<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
							Chart visualization would go here
						</div>
					</div>
				</div>

				{/* Unsubscribe Stats */}
				<div className="rounded-lg border bg-card p-4">
					<h3 className="mb-4 font-medium text-sm">Unsubscribe Statistics</h3>
					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<span className="text-muted-foreground text-xs">
								Unsubscribed
							</span>
							<p className="font-semibold text-2xl">
								{analyticsData.unsubscribeStats.unsubscribed}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground text-xs">
								Auto Archived
							</span>
							<p className="font-semibold text-2xl">
								{analyticsData.unsubscribeStats.autoArchived}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground text-xs">Approved</span>
							<p className="font-semibold text-2xl">
								{analyticsData.unsubscribeStats.approved}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function HomeComponent() {
	const { theme } = useTheme()
	const [activeFolder, setActiveFolder] = useState("all");
	const [activeTool, setActiveTool] = useState("reply-zero");
	const [showNewEmailModal, setShowNewEmailModal] = useState(false);
	const [showAIConfigModal, setShowAIConfigModal] = useState(false);
	const [showRulesModal, setShowRulesModal] = useState(false);
	const [showTestModal, setShowTestModal] = useState(false);
	const [showHistoryModal, setShowHistoryModal] = useState(false);
	const [isAIConfigModalVisible, setIsAIConfigModalVisible] = useState(false);
	const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
	const [isTestModalVisible, setIsTestModalVisible] = useState(false);
	const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
	const [isLabelingRecents, setIsLabelingRecents] = useState(false)
	const [labelingProgress, setLabelingProgress] = useState(0)

	// Chat state
	const [isChatOpen, setIsChatOpen] = useState(false)
	const [isChatMinimized, setIsChatMinimized] = useState(false)
	const [messages, setMessages] = useState<Array<{
		id: string
		role: 'user' | 'assistant'
		content: string
		timestamp: Date
	}>>([])
	const [currentMessage, setCurrentMessage] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const chatMessagesRef = useRef<HTMLDivElement>(null)
	const [emails, setEmails] = useState<Email[]>([])

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		if (chatMessagesRef.current) {
			chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
		}
	}, [messages])

	// Add keyboard shortcut handler for all AI tools
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (!event.metaKey && !event.ctrlKey) return // Only handle Command/Ctrl combinations
			
			event.preventDefault() // Prevent browser's default search behavior
			
			switch (event.key.toLowerCase()) {
				case 'k': // Knowledge
					if (!showAIConfigModal) handleOpenAIConfigModal()
					break
				case 'r': // Rules
					if (!showRulesModal) handleOpenRulesModal()
					break
				case 'e': // Test (changed from 't' to 'e')
					if (!showTestModal) handleOpenTestModal()
					break
				case 'h': // History
					if (!showHistoryModal) handleOpenHistoryModal()
					break
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [showAIConfigModal, showRulesModal, showTestModal, showHistoryModal])

	// Modal handlers
	const handleOpenRulesModal = () => {
		setShowRulesModal(true)
		requestAnimationFrame(() => setIsRulesModalVisible(true))
	}

	const handleCloseRulesModal = () => {
		setIsRulesModalVisible(false)
		setTimeout(() => setShowRulesModal(false), ANIMATION_DURATION)
	}

	const handleOpenTestModal = () => {
		setShowTestModal(true)
		requestAnimationFrame(() => setIsTestModalVisible(true))
	}

	const handleCloseTestModal = () => {
		setIsTestModalVisible(false)
		setTimeout(() => setShowTestModal(false), ANIMATION_DURATION)
	}

	const handleOpenHistoryModal = () => {
		setShowHistoryModal(true)
		requestAnimationFrame(() => setIsHistoryModalVisible(true))
	}

	const handleCloseHistoryModal = () => {
		setIsHistoryModalVisible(false)
		setTimeout(() => setShowHistoryModal(false), ANIMATION_DURATION)
	}

	const [aiConfigData, setAIConfigData] = useState({
		instructions: `* Label all newsletters as 'Newsletter' and archive them.
* Label all marketing emails as 'Marketing' and archive them.
* Label all calendar emails as 'Calendar'.
* Label all receipts as 'Receipts'.
* Label all notifications as 'Notifications'.`,
		additionalRules: "",
		exceptions: ""
	});
	const [blockedEmails, setBlockedEmails] = useState(5);
	const [subscriptions, setSubscriptions] = useState(12);
	const [pendingReplies, setPendingReplies] = useState(3);
	const [aiDrafts, setAiDrafts] = useState(2);
	const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
	const [showNewFolderModal, setShowNewFolderModal] = useState(false);
	const [sortBy, setSortBy] = useState<SortOption>("date");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	
	// Draft generation states
	const [generatedDraft, setGeneratedDraft] = useState<string>("");
	const [isDraftGenerating, setIsDraftGenerating] = useState(false);
	const [draftError, setDraftError] = useState<string | null>(null);
	const [draftInstructions, setDraftInstructions] = useState<string>("");
	
	const [customFolders, setCustomFolders] = useState<Array<{
		id: number;
		name: string;
		type: string;
		description?: string;
		aiBehavior?: string;
		labels?: string[];
	}>>([]);

	// Add account state
	const [accounts, setAccounts] = useState([
		{
			id: 1,
			email: "luisanchez@berkeley.edu", 
			provider: "Gmail (Edu)",
			isActive: true,
		},
		{
			id: 2,
			email: "luisinsertlastname@gmail.com",
			provider: "Gmail (Personal",
			isActive: false,
		},
	]);
	const [showAddAccountModal, setShowAddAccountModal] = useState(false);

	const [newFolderData, setNewFolderData] = useState({
		name: "",
		description: "",
		aiBehavior: "",
		labels: [] as string[],
		newLabel: ""
	})

	const handleLabelToggle = (label: string) => {
		setNewFolderData(prev => ({
			...prev,
			labels: prev.labels.includes(label)
				? prev.labels.filter(l => l !== label)
				: [...prev.labels, label]
		}))
	}

	const handleAddNewLabel = () => {
		if (newFolderData.newLabel.trim() && !newFolderData.labels.includes(newFolderData.newLabel.trim())) {
			setNewFolderData(prev => ({
				...prev,
				labels: [...prev.labels, prev.newLabel.trim()],
				newLabel: ""
			}))
		}
	}

	const handleFolderChange = (folder: string) => {
		setActiveFolder(folder);
		setSelectedEmail(null);
	};

	const handleToolClick = (tool: string) => {
		setActiveTool(tool);
		// Simulate tool actions
		switch (tool) {
			case "cold-email-blocker":
				setBlockedEmails((prev) => prev + 1);
				break;
			case "bulk-unsubscribe":
				setSubscriptions((prev) => Math.max(0, prev - 1));
				break;
			case "reply-zero":
				setPendingReplies((prev) => Math.max(0, prev - 1));
				setAiDrafts((prev) => prev + 1);
				break;
		}
	};

	const handleNewEmail = () => {
		setShowNewEmailModal(true);
		// Simulate modal opening
		setTimeout(() => setShowNewEmailModal(false), 1000);
	};

	const handleEmailClick = (email: Email) => {
		setSelectedEmail(email);
		// Reset draft states when selecting a new email
		setGeneratedDraft("");
		setDraftError(null);
		setIsDraftGenerating(false);
		setDraftInstructions("");
	};
	
	// Function to generate draft reply using OpenAI
	const handleGenerateDraft = async () => {
		if (!selectedEmail) return;
		
		setIsDraftGenerating(true);
		setDraftError(null);
		
		// Log attempt to debug overlay
		debugEvents.addEntry("=== AI Draft Generation Started ===", "info");
		debugEvents.addEntry(`Generating draft for email: ${selectedEmail.id} - ${selectedEmail.subject}`, "info");
		
		try {
			// Log environment check
			debugEvents.addEntry("Checking for OpenAI API key...", "info");
			if (typeof process !== 'undefined' && process.env) {
				const hasNodeEnvKey = !!process.env.OPENAI_API_KEY;
				debugEvents.addEntry(`- Node.js OPENAI_API_KEY: ${hasNodeEnvKey ? "Found" : "Not found"}`, hasNodeEnvKey ? "success" : "warning");
			} else {
				debugEvents.addEntry("- Node.js environment variables not available in browser context", "warning");
			}
			
			if (import.meta.env) {
				const hasViteEnvKey = !!import.meta.env.VITE_OPENAI_API_KEY;
				debugEvents.addEntry(`- Vite VITE_OPENAI_API_KEY: ${hasViteEnvKey ? "Found" : "Not found"}`, hasViteEnvKey ? "success" : "warning");
			} else {
				debugEvents.addEntry("- Vite environment variables not available", "warning");
			}
			
			const emailData: EmailData = {
				sender: selectedEmail.sender,
				subject: selectedEmail.subject,
				content: selectedEmail.content,
				time: selectedEmail.time
			};
			
			debugEvents.addEntry("Calling OpenAI API...", "info");
			const result = await generateEmailDraft(emailData, draftInstructions);
			
			if (result.success) {
				debugEvents.addEntry("Successfully generated draft!", "success");
				debugEvents.addEntry(`Draft length: ${result.draft.length} characters`, "info");
				
				setGeneratedDraft(result.draft);
				
				// Update the email object to show it has an AI draft
				const updatedEmail = {
					...selectedEmail,
					hasAIDraft: true,
					aiDraft: result.draft
				};
				setSelectedEmail(updatedEmail);
				
				// Also update the email in the appropriate folder
				const allEmails = getAllEmails();
				const updatedEmails = allEmails.map(email => 
					email.id === selectedEmail.id ? updatedEmail : email
				);
				
				// Update local storage with updated emails
				localStorage.setItem("inboxFluxEmails", JSON.stringify(updatedEmails));
				debugEvents.addEntry("Updated email in storage", "success");
			} else {
				debugEvents.addEntry("Failed to generate draft", "error");
				debugEvents.addEntry(`Error: ${result.error || "Unknown error"}`, "error");
				setDraftError(result.error || "Failed to generate draft");
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
			console.error("Error generating draft:", error);
			debugEvents.addEntry("Exception occurred during draft generation:", "error");
			debugEvents.addEntry(errorMessage, "error");
			
			if (error instanceof Error && error.stack) {
				debugEvents.addEntry("Stack trace:", "info");
				const stackLines = error.stack.split('\n');
				stackLines.forEach(line => {
					debugEvents.addEntry(`  ${line}`, "info");
				});
			}
			
			setDraftError(errorMessage);
		} finally {
			setIsDraftGenerating(false);
			debugEvents.addEntry("=== AI Draft Generation Completed ===", "info");
		}
	};

	const getAllEmails = () => {
		// ALWAYS prioritize real emails if available, otherwise use dummy data
		if (realEmails.length > 0) {
			debugEvents.addEntry(`Using ${realEmails.length} real emails from Gmail`, "info");
			return realEmails;
		}
		
		debugEvents.addEntry("No real emails found, using dummy data", "warning");
		return Object.values(DUMMY_EMAILS).flat();
	};

	const getEmailsForFolder = (folder: string) => {
		if (folder === "all") return getAllEmails();
		
		// Real emails are always prioritized
		if (realEmails.length > 0) {
			debugEvents.addEntry(`Filtering ${realEmails.length} real emails for folder: ${folder}`, "info");
			return realEmails.filter(email => {
				// If this is a Gmail label, check if email has this label
				if (userGmailLabels.includes(folder)) {
					// Check if the email has this specific Gmail label in badges or label IDs
					const hasLabelInBadges = email.badges.includes(folder);
					const hasLabelInIds = email.labelIds && email.labelIds.some(labelId => 
						labelIdToNameMap[labelId] === folder
					);
					
					debugEvents.addEntry(`Checking email ${email.id} for label "${folder}": badges=${hasLabelInBadges}, labelIds=${hasLabelInIds}`, "info");
					return hasLabelInBadges || hasLabelInIds;
				}
				
				// Fallback to original hardcoded mappings for default folders
				switch (folder) {
					case "inbox":
						return email.badges.includes("Inbox");
					case "important":
						return email.badges.includes("Important") || email.badges.includes("High Priority");
					case "to-reply":
						return email.analytics.priority === "High" || email.analytics.priority === "Medium";
					case "academic":
						return email.analytics.category === "Academic";
					case "career":
						return email.analytics.category === "Development" || email.analytics.category === "Career";
					case "personal":
						return email.badges.includes("Personal") || email.analytics.category === "Personal";
					case "newsletters":
						return email.badges.includes("Marketing") || email.analytics.category === "Newsletter";
					case "cold-email":
						return email.analytics.category === "General" && !email.badges.includes("Important");
					case "clubs":
						return email.badges.includes("Social") || email.analytics.category === "Social";
					default:
						// For any other labels, try to match by badge name
						return email.badges.some(badge => 
							badge.toLowerCase() === folder.toLowerCase() ||
							badge.toLowerCase().includes(folder.toLowerCase())
						);
				}
			});
		}
		
		// Only fallback to dummy data if no real emails
		return DUMMY_EMAILS[folder as keyof typeof DUMMY_EMAILS] || [];
	};

	// Update sorting function for more accurate sorting
	const getComparableTime = (email: Email): number => {
		const now = Date.now()
		if (email.date) return new Date(email.date).getTime()
		const minutesMatch = email.time.match(/^(\d+)\s+minute/)
		if (minutesMatch) return now - parseInt(minutesMatch[1]) * 60000
		const hoursMatch = email.time.match(/^(\d+)\s+hour/)
		if (hoursMatch) return now - parseInt(hoursMatch[1]) * 3600000
		if (email.time === "Yesterday") return now - 24 * 3600000
		const daysMatch = email.time.match(/^(\d+)\s+day/)
		if (daysMatch) return now - parseInt(daysMatch[1]) * 24 * 3600000
		return 0
	}

	const getSortedEmails = (emails: Email[]) => {
		return [...emails].sort((a, b) => {
			const priorityOrder = { High: 3, Medium: 2, Low: 1 }
			if (sortBy === "priority") {
				const prioA = priorityOrder[a.analytics.priority as keyof typeof priorityOrder] ?? 0
				const prioB = priorityOrder[b.analytics.priority as keyof typeof priorityOrder] ?? 0
				if (prioA !== prioB) return sortDirection === "desc" ? prioB - prioA : prioA - prioB
			}
			const timeA = getComparableTime(a)
			const timeB = getComparableTime(b)
			return sortDirection === "desc" ? timeB - timeA : timeA - timeB
		})
	}

	const handleSort = (option: SortOption) => {
		if (sortBy === option) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(option);
			setSortDirection("desc");
		}
	};

	const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
	const [isModalVisible, setIsModalVisible] = useState(false)
	const plusButtonRef = useRef<HTMLButtonElement>(null)
	const ANIMATION_DURATION = 400 // ms

	const handleOpenModal = () => {
		if (plusButtonRef.current) {
			const rect = plusButtonRef.current.getBoundingClientRect()
			const centerX = rect.left + rect.width / 2
			const centerY = rect.top + rect.height / 2
			setModalPosition({ x: centerX, y: centerY })
			setShowNewFolderModal(true)
			// Trigger animation after state update
			requestAnimationFrame(() => {
				setIsModalVisible(true)
			})
		}
	}

	const handleCloseModal = () => {
		setIsModalVisible(false)
		// Wait for animation to complete before hiding modal
		setTimeout(() => {
			setShowNewFolderModal(false)
			setNewFolderData({ name: "", description: "", aiBehavior: "", labels: [], newLabel: "" })
		}, ANIMATION_DURATION)
	}

	const handleOpenAIConfigModal = () => {
		setShowAIConfigModal(true)
		requestAnimationFrame(() => {
			setIsAIConfigModalVisible(true)
		})
	}

	const handleCloseAIConfigModal = () => {
		setIsAIConfigModalVisible(false)
		setTimeout(() => {
			setShowAIConfigModal(false)
			setAIConfigData({
				instructions: `* Label all newsletters as 'Newsletter' and archive them.
* Label all marketing emails as 'Marketing' and archive them.
* Label all calendar emails as 'Calendar'.
* Label all receipts as 'Receipts'.
* Label all notifications as 'Notifications'.`,
				additionalRules: "",
				exceptions: ""
			})
		}, ANIMATION_DURATION)
	}

	const [selectedRule, setSelectedRule] = useState<Rule | null>(null)
	const [selectedEmails, setSelectedEmails] = useState<number[]>([])
	const [testResults, setTestResults] = useState<RuleTestResult[]>([])
	const [rules, setRules] = useState<Rule[]>(DUMMY_RULES)
	const [aiActions, setAiActions] = useState<AIAction[]>(DUMMY_AI_ACTIONS)

	// Add handlers for rules and testing
	const handleCreateRule = () => {
		const newRule: Rule = {
			id: rules.length + 1,
			name: "New Rule",
			description: "",
			conditions: [],
			actions: [],
			priority: rules.length + 1,
			isEnabled: true,
			createdAt: new Date().toISOString(),
			lastModified: new Date().toISOString(),
			lastTriggered: null,
			triggerCount: 0
		}
		setRules(prev => [...prev, newRule])
		setSelectedRule(newRule)
	}

	const handleTestRule = (rule: Rule, emailIds: number[]) => {
		// Simulate rule testing
		const results: RuleTestResult[] = emailIds
			.map(emailId => {
				const email = getAllEmails().find(e => e.id === emailId)
				if (!email) return undefined

				const matchedConditions = rule.conditions.map(condition => ({
					condition: `${condition.type} ${condition.operator} "${condition.value}"`,
					matched: Math.random() > 0.3, // Simulate matching
					value: condition.value
				}))

				const matched = matchedConditions.every(mc => mc.matched)

				return {
					ruleId: rule.id,
					ruleName: rule.name,
					emailId,
					matched,
					matchedConditions,
					actions: rule.actions.map(action => ({
						action: action.type,
						value: action.value
					})),
					timestamp: new Date().toISOString()
				} satisfies RuleTestResult
			})
			.filter((result): result is RuleTestResult => result !== undefined)

		setTestResults(results)
	}

	// Add state for real emails from EmailList component
	const [realEmails, setRealEmails] = useState<Email[]>([]);
	const [googleTokens, setGoogleTokens] = useState<{
		access_token: string
		refresh_token: string
	} | null>(null);
	const emailListRef = useRef<EmailListRef | null>(null)
	
	// Load tokens from localStorage on component mount
	useEffect(() => {
		debugEvents.addEntry("Checking for stored tokens in Index component", "info")
		const storedTokens = localStorage.getItem("googleTokens")
		if (storedTokens) {
			try {
				const tokens = JSON.parse(storedTokens)
				if (tokens.access_token && tokens.refresh_token) {
					debugEvents.addEntry("Found valid tokens in localStorage", "success")
					setGoogleTokens({
						access_token: tokens.access_token,
						refresh_token: tokens.refresh_token
					})
				} else {
					debugEvents.addEntry("Tokens found but missing required fields", "warning")
				}
			} catch (error) {
				console.error("Error parsing stored tokens:", error)
				debugEvents.addEntry("Error parsing stored tokens in Index component", "error")
			}
		} else {
			debugEvents.addEntry("No stored tokens found in Index component", "info")
		}
	}, [])

	// Listen for token updates
	useEffect(() => {
		const handleStorageChange = () => {
			debugEvents.addEntry("Storage change detected in Index component", "info")
			const storedTokens = localStorage.getItem("googleTokens")
			if (storedTokens) {
				try {
					const tokens = JSON.parse(storedTokens)
					debugEvents.addEntry("Updated tokens from storage event", "success")
					setGoogleTokens({
						access_token: tokens.access_token,
						refresh_token: tokens.refresh_token
					})
				} catch (error) {
					console.error("Error parsing stored tokens:", error)
					debugEvents.addEntry("Error parsing updated tokens", "error")
				}
			} else {
				// Tokens were removed
				debugEvents.addEntry("Tokens removed from storage", "warning")
				setGoogleTokens(null)
			}
		}

		window.addEventListener("storage", handleStorageChange)
		
		// Custom event for same-page updates
		const handleTokensUpdated = () => {
			debugEvents.addEntry("Token update event received in Index component", "info")
			const storedTokens = localStorage.getItem("googleTokens")
			if (storedTokens) {
				try {
					const tokens = JSON.parse(storedTokens)
					setGoogleTokens({
						access_token: tokens.access_token,
						refresh_token: tokens.refresh_token
					})
					debugEvents.addEntry("Tokens updated from custom event", "success")
				} catch (error) {
					debugEvents.addEntry("Error parsing tokens from custom event", "error")
				}
			} else {
				setGoogleTokens(null)
				debugEvents.addEntry("Tokens cleared from custom event", "warning")
			}
		}
		
		window.addEventListener("googleTokensUpdated", handleTokensUpdated)
		
		return () => {
			window.removeEventListener("storage", handleStorageChange)
			window.removeEventListener("googleTokensUpdated", handleTokensUpdated)
		}
	}, [])

	// Function to convert EmailList emails to the format used in this component
	const adaptEmailsFromEmailList = (emails: any[]) => {
		debugEvents.addEntry(`Adapting ${emails.length} emails from Gmail API format`, "info");
		
		return emails.map(email => {
			// Convert label IDs to badges
			const badges = getLabelBadges(email.labelIds || []);
			
			debugEvents.addEntry(`Email "${email.subject}": labelIds=${JSON.stringify(email.labelIds)}, badges=${JSON.stringify(badges)}`, "info");
			
			// Determine priority based on labels
			const priority = badges.includes("High Priority") ? "High" : 
				badges.includes("Important") ? "Medium" : "Low";
			
			// Get a category based on from address or subject
			const category = getCategoryFromEmail(email);
			
			// Determine a mock response time based on date
			const responseTime = getMockResponseTime(email.date);
			
			// Generate a mock sentiment
			const sentiment = ["Professional", "Informative", "Positive", "Neutral"][Math.floor(Math.random() * 4)];
			
			// Use numeric ID for compatibility with existing code
			// Note: email.id is a string from Gmail API, we convert to number
			const numericId = parseInt(email.id.slice(-8), 16) || Math.floor(Math.random() * 10000);
			
			// Extract the email address from the From field
			const extractEmailAddress = (str: string) => {
				const match = str?.match(/<([^>]+)>/) || [];
				return match[1] || "";
			};

			// Ensure we have a valid Gmail message ID
			if (!email.id) {
				console.error("🔴 Missing Gmail message ID for email:", email);
				throw new Error("Missing Gmail message ID");
			}

			return {
				id: numericId,
				gmailId: email.id, // Store the Gmail message ID (already in base64url format)
				sender: email.from ? extractName(email.from) : "Unknown Sender",
				senderEmail: email.from ? extractEmailAddress(email.from) : "",
				to: email.to || "",
				date: email.date,
				time: email.date ? getRelativeTime(email.date) : "Unknown time",
				subject: email.subject || "(No subject)",
				preview: email.snippet || "",
				content: email.body || "",
				badges,
				hasAIDraft: false, // No AI drafts for real emails yet
				aiDraft: "",
				labelIds: email.labelIds || [], // Store the original label IDs
				analytics: {
					responseTime,
					priority,
					category,
					sentiment
				}
			};
		});
	};
	
	// Helper function to extract name from email address
	const extractName = (emailString: string) => {
		const match = emailString.match(/^"?([^"<]+)"?\s*<.*>$/)
		return match ? match[1].trim() : emailString
	};
	
	// Helper function to get relative time
	const getRelativeTime = (dateString: string) => {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffMins = Math.floor(diffMs / (1000 * 60));
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
			
			if (diffMins < 60) {
				return diffMins === 1 ? "1 minute ago" : `${diffMins} minutes ago`;
			} else if (diffHours < 24) {
				return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
			} else if (diffDays === 1) {
				return "Yesterday";
			} else if (diffDays < 7) {
				return `${diffDays} days ago`;
			} else {
				return date.toLocaleDateString();
			}
		} catch (error) {
			console.error("Error formatting date:", error);
			return dateString;
		}
	};
	
	// Helper function to convert label IDs to badges
	const getLabelBadges = (labelIds: string[]) => {
		const badges: string[] = [];
		
		// Convert label IDs to actual label names using our mapping
		labelIds.forEach(labelId => {
			const labelName = labelIdToNameMap[labelId];
			
			// Skip system labels we don't want to show
			if (labelId === "INBOX" || 
				labelId === "SPAM" || 
				labelId === "TRASH" || 
				labelId === "DRAFT" || 
				labelId === "SENT" || 
				labelId === "STARRED" || 
				labelId === "UNREAD" ||
				labelId.startsWith("CATEGORY_")) {
				return;
			}
			
			// Add the actual label name if we have it
			if (labelName && !badges.includes(labelName)) {
				badges.push(labelName);
			}
		});
		
		// Don't add any default badges - only show actual labels
		return badges;
	};
	
	// Helper function to get category from email
	const getCategoryFromEmail = (email: any) => {
		// Check labels first
		if ((email.labelIds || []).some((label: string) => label.includes("CATEGORY_PERSONAL"))) return "Personal";
		if ((email.labelIds || []).some((label: string) => label.includes("CATEGORY_SOCIAL"))) return "Social";
		if ((email.labelIds || []).some((label: string) => label.includes("CATEGORY_UPDATES"))) return "Updates";
		if ((email.labelIds || []).some((label: string) => label.includes("CATEGORY_FORUMS"))) return "Forums";
		if ((email.labelIds || []).some((label: string) => label.includes("CATEGORY_PROMOTIONS"))) return "Marketing";
		
		// Check domain or subject
		const from = email.from || "";
		const subject = email.subject || "";
		
		if (from.includes("@berkeley.edu") || subject.includes("Berkeley")) return "Academic";
		if (from.includes("@github.com") || subject.includes("GitHub")) return "Development";
		if (subject.toLowerCase().includes("meeting") || subject.toLowerCase().includes("calendar")) return "Meeting";
		if (subject.toLowerCase().includes("newsletter") || from.toLowerCase().includes("newsletter")) return "Newsletter";
		
		// Default
		return "General";
	};
	
	// Helper function to get mock response time
	const getMockResponseTime = (dateString: string) => {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			
			if (diffHours < 2) return "30 minutes";
			if (diffHours < 5) return "2 hours";
			if (diffHours < 24) return "6 hours";
			if (diffHours < 48) return "1 day";
			return "3 days";
		} catch (error) {
			return "Unknown";
		}
	};
	
	// Define a type for the email data we receive from the API
	interface GmailEmail {
		id: string;
		threadId: string;
		snippet: string;
		subject: string;
		from: string;
		to: string;
		date: string;
		body: string;
		labelIds: string[];
	}
	// State for tracking loading state
	const [isLoadingEmails, setIsLoadingEmails] = useState(false)
	
	// Use EmailList's implementation instead of our own
	const fetchEmails = async () => {
		if (!googleTokens?.access_token || !googleTokens?.refresh_token) {
			debugEvents.addEntry("Cannot fetch emails: Missing Google tokens", "error")
			return
		}
		
		setIsLoadingEmails(true)
		debugEvents.addEntry("Using EmailList's fetchEmails implementation...", "info")
		
		try {
			// Call the EmailList component's fetchEmails method through the ref
			if (emailListRef.current) {
				debugEvents.addEntry("Calling EmailList.fetchEmails() through ref...", "info")
				await emailListRef.current.fetchEmails()
				
				// Now get the emails directly from the EmailList component using our new getEmails method
				const emailListEmails = emailListRef.current.getEmails()
				
				if (emailListEmails && emailListEmails.length > 0) {
					debugEvents.addEntry(`Retrieved ${emailListEmails.length} emails from EmailList component`, "success")
					
					// Convert EmailList emails to our format
					const adaptedEmails = adaptEmailsFromEmailList(emailListEmails)
					
					// Update state with fetched emails
					setRealEmails(adaptedEmails)
					debugEvents.addEntry(`Successfully adapted ${adaptedEmails.length} emails to our format`, "success")
					
					// Force re-render by making a new array
					setRealEmails([...adaptedEmails])
					
					// Reset selected email if it was set
					if (selectedEmail) {
						setSelectedEmail(null)
					}
				} else {
					debugEvents.addEntry("EmailList returned no emails", "warning")
				}
			} else {
				debugEvents.addEntry("EmailList ref is not available - falling back to direct fetch", "warning")
				
				// Fallback to original implementation
				const response = await fetchGmailEmails(
					googleTokens.access_token,
					googleTokens.refresh_token,
					100 // Fetch 100 emails
				)
				
				if (response && Array.isArray(response)) {
					const adaptedEmails = adaptEmailsFromEmailList(response)
					setRealEmails(adaptedEmails)
					debugEvents.addEntry(`Fallback: set ${adaptedEmails.length} emails to state`, "info")
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
			debugEvents.addEntry(`Failed to fetch emails: ${errorMessage}`, "error")
			console.error("[fetchEmails] Error:", error)
		} finally {
			setIsLoadingEmails(false)
		}
	}
	
	// Fetch emails and labels when tokens become available
	useEffect(() => {
		if (googleTokens) {
			debugEvents.addEntry("Auto-fetching emails and labels after tokens available", "info");
			
			// Fetch emails
			fetchEmails();
			
			// Fetch user's Gmail labels
			fetchGmailLabels();
			
			debugEvents.addEntry("Now using EmailList's implementation for fetching emails", "info");
		}
	}, [googleTokens]);
	
	// Debug when real emails state changes
	useEffect(() => {
		if (realEmails.length > 0) {
			debugEvents.addEntry(`Real emails state updated with ${realEmails.length} emails`, "success");
			debugEvents.addEntry(`First email: "${realEmails[0].subject}" from ${realEmails[0].sender}`, "info");
		}
	}, [realEmails]);

	// Add these near other handlers in HomeComponent
	const handleUseDraft = async () => {
		if (!selectedEmail || !googleTokens) {
			console.error("Cannot use draft: Missing email or tokens")
			toast.error("Missing email or authentication")
			return
		}

		if (isCreatingDraft) return

		console.log("Using draft for email:", {
			emailId: selectedEmail.id,
			subject: selectedEmail.subject,
			hasDraft: !!selectedEmail.aiDraft
		})

		setIsCreatingDraft(true)
		try {
			await createDraftMutation.mutateAsync({
				accessToken: googleTokens.access_token,
				refreshToken: googleTokens.refresh_token,
				messageData: {
					to: selectedEmail.senderEmail || selectedEmail.sender,
					subject: `Re: ${selectedEmail.subject}`,
					body: selectedEmail.aiDraft,
					threadId: selectedEmail.threadId
				}
			})
		} finally {
			setIsCreatingDraft(false)
		}
	}

	const handleSendAsIs = async () => {
		if (!selectedEmail || !googleTokens) {
			console.error("Cannot send email: Missing email or tokens")
			toast.error("Missing email or authentication")
			return
		}

		if (isSendingEmail) return

		console.log("Sending email as is:", {
			emailId: selectedEmail.id,
			subject: selectedEmail.subject,
			hasDraft: !!selectedEmail.aiDraft
		})

		setIsSendingEmail(true)
		try {
			await sendEmailMutation.mutateAsync({
				accessToken: googleTokens.access_token,
				refreshToken: googleTokens.refresh_token,
				messageData: {
					to: selectedEmail.senderEmail || selectedEmail.sender,
					subject: `Re: ${selectedEmail.subject}`,
					body: selectedEmail.aiDraft,
					threadId: selectedEmail.threadId
				}
			})
		} finally {
			setIsSendingEmail(false)
		}
	}

	// Add these near other state declarations
	const [isSendingEmail, setIsSendingEmail] = useState(false)
	const [isCreatingDraft, setIsCreatingDraft] = useState(false)

	// Add these mutations near other hooks
	const createDraftMutation = useMutation({
		mutationFn: (data: {
			accessToken: string
			refreshToken: string
			messageData: {
				to: string
				subject: string
				body: string
				threadId?: string
			}
		}) => trpcClient.google.createDraft.mutate(data),
		onSuccess: (data) => {
			console.log("Draft created successfully:", data)
			toast.success("Draft created successfully")
		},
		onError: (error: Error) => {
			console.error("Failed to create draft:", error)
			toast.error(error.message || "Failed to create draft")
		}
	})

	const sendEmailMutation = useMutation({
		mutationFn: (data: {
			accessToken: string
			refreshToken: string
			messageData: {
				to: string
				subject: string
				body: string
				threadId?: string
			}
		}) => trpcClient.google.sendEmail.mutate(data),
		onSuccess: (data) => {
			console.log("Email sent successfully:", data)
			toast.success("Email sent successfully")
		},
		onError: (error: Error) => {
			console.error("Failed to send email:", error)
			toast.error(error.message || "Failed to send email")
		}
	})

	// Add this after line 2781 (after handleGenerateDraft function)

	// Add state for AI processing
	const [processingEmails, setProcessingEmails] = useState<Set<number>>(new Set())
	const [processedEmails, setProcessedEmails] = useState<Map<number, any>>(new Map())

	// Add state for user's Gmail labels
	const [userGmailLabels, setUserGmailLabels] = useState<string[]>([])
	const [isLoadingLabels, setIsLoadingLabels] = useState(false)
	const [labelIdToNameMap, setLabelIdToNameMap] = useState<Record<string, string>>({})

	// Use user's Gmail labels if available, otherwise use a minimal set of defaults
	const existingLabels = userGmailLabels.length > 0 ? userGmailLabels : [
		"Important",
		"Personal",
		"Work"
	]

	// AI Email Labeling Function
	const handleAIProcess = async (email: Email) => {
		debugEvents.addEntry("=== AI LABELING DEBUG START ===", "info")
		
		// Token validation with detailed logging
		if (!googleTokens?.access_token) {
			debugEvents.addEntry("❌ No access token available for AI labeling", "error")
			debugEvents.addEntry(`Google tokens object: ${JSON.stringify(googleTokens)}`, "error")
			toast.error("Please sign in with Google to use AI labeling")
			return
		}

		debugEvents.addEntry("✅ Access token found", "success")
		debugEvents.addEntry(`Token preview: ${googleTokens.access_token.substring(0, 20)}...`, "info")
		debugEvents.addEntry(`Token length: ${googleTokens.access_token.length}`, "info")

		setProcessingEmails(prev => new Set(prev).add(email.id))
		debugEvents.addEntry(`📧 Starting AI labeling for email: ${email.subject}`, "info")
		debugEvents.addEntry(`Email ID: ${email.id}`, "info")
		debugEvents.addEntry(`Thread ID: ${email.threadId}`, "info")
		debugEvents.addEntry(`Sender: ${email.senderEmail || email.sender}`, "info")
		
		toast.info("Analyzing email with AI...", {
			description: "Getting label suggestions from AI"
		})

		try {
			// For now, skip label fetching and use a simple default set
			debugEvents.addEntry("📋 Step 1: Using default labels (scope issue bypass)...", "info")
			
			const existingLabels = ['Important', 'Work', 'Personal', 'Newsletter', 'Marketing', 'Travel', 'Finance', 'Meeting']
			debugEvents.addEntry(`✅ Using ${existingLabels.length} default labels: ${existingLabels.join(', ')}`, "info")

			// Step 2: Analyze email with AI
			debugEvents.addEntry("🤖 Step 2: Analyzing email with AI...", "info")
			debugEvents.addEntry(`API endpoint: /api/analyze-email`, "info")
			
			const emailData = {
				subject: email.subject,
				from: email.senderEmail || email.sender,
				content: email.content,
				date: email.date || email.time,
			}
			
			debugEvents.addEntry(`📧 Email data for AI: ${JSON.stringify(emailData)}`, "info")
			debugEvents.addEntry(`📋 Existing labels: ${existingLabels.join(', ')}`, "info")
			
			const aiStartTime = performance.now()
			const analysisResponse = await fetch('/api/analyze-email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: emailData,
					existingLabels,
				}),
			})
			const aiEndTime = performance.now()
			
			debugEvents.addEntry(`📊 AI analysis response time: ${(aiEndTime - aiStartTime).toFixed(2)}ms`, "info")
			debugEvents.addEntry(`📊 AI response status: ${analysisResponse.status} ${analysisResponse.statusText}`, "info")

			if (!analysisResponse.ok) {
				debugEvents.addEntry("❌ AI analysis request failed", "error")
				try {
					const errorBody = await analysisResponse.text()
					debugEvents.addEntry(`AI error response: ${errorBody}`, "error")
				} catch (bodyError) {
					debugEvents.addEntry(`Could not read AI error response: ${bodyError}`, "error")
				}
				throw new Error(`Failed to analyze email: ${analysisResponse.status} ${analysisResponse.statusText}`)
			}

			debugEvents.addEntry("✅ AI analysis successful", "success")
			const analysis = await analysisResponse.json()
			debugEvents.addEntry(`🤖 AI analysis result: ${JSON.stringify(analysis, null, 2)}`, "info")
			debugEvents.addEntry(`✨ AI suggested labels: ${analysis.suggestedLabels.join(', ')}`, "success")
			debugEvents.addEntry(`📊 Confidence: ${Math.round(analysis.confidence * 100)}%`, "info")

			// Step 3: Show AI results (skip actual label application for now due to scope)
			if (analysis.suggestedLabels.length > 0) {
				debugEvents.addEntry("🏷️ Step 3: AI suggested labels (demo mode)...", "info")
				debugEvents.addEntry(`Suggested labels: ${analysis.suggestedLabels.join(', ')}`, "success")
				
				toast.success("AI analysis completed!", {
					description: `AI suggests ${analysis.suggestedLabels.length} labels: ${analysis.suggestedLabels.join(', ')}`
				})
				
				// Update the email in the UI to show suggested labels
				const updatedEmail = {
					...email,
					badges: [...email.badges, ...analysis.suggestedLabels.map((label: string) => `AI: ${label}`)]
				}
				
				debugEvents.addEntry("✅ Updated email with AI suggested labels in UI", "success")
				
			} else {
				toast.info("No new labels suggested", {
					description: "Email already has appropriate labels or no suitable labels found"
				})
			}

		} catch (error) {
			debugEvents.addEntry("❌ AI LABELING FAILED", "error")
			debugEvents.addEntry(`Error type: ${typeof error}`, "error")
			debugEvents.addEntry(`Error constructor: ${error?.constructor?.name}`, "error")
			
			if (error instanceof Error) {
				debugEvents.addEntry(`Error message: ${error.message}`, "error")
				debugEvents.addEntry(`Error stack: ${error.stack}`, "error")
			} else {
				debugEvents.addEntry(`Error object: ${JSON.stringify(error)}`, "error")
			}
			
			// Network connectivity check
			if (navigator.onLine === false) {
				debugEvents.addEntry("❌ No internet connection detected", "error")
				toast.error("No internet connection", {
					description: "Please check your network connection and try again"
				})
			} else {
				debugEvents.addEntry("✅ Internet connection available", "info")
				const errorMessage = error instanceof Error ? error.message : "Unknown error"
				toast.error("AI labeling failed", {
					description: errorMessage
				})
			}
		} finally {
			debugEvents.addEntry("🔄 Cleaning up processing state...", "info")
			setProcessingEmails(prev => {
				const next = new Set(prev)
				next.delete(email.id)
				debugEvents.addEntry(`✅ Removed email ${email.id} from processing queue`, "info")
				return next
			})
			debugEvents.addEntry("=== AI LABELING DEBUG END ===", "info")
		}
	}

	// Helper function to get label IDs
	const getLabelIds = async (labelNames: string[], accessToken: string): Promise<string[]> => {
		const labelsResponse = await fetch(
			'https://gmail.googleapis.com/gmail/v1/users/me/labels',
			{
				headers: {
					'Authorization': `Bearer ${accessToken}`,
				},
			}
		)
		
		const labelsData = await labelsResponse.json()
		const labelIds: string[] = []
		
		for (const labelName of labelNames) {
			const existingLabel = labelsData.labels.find(
				(label: any) => label.name.toLowerCase() === labelName.toLowerCase()
			)
			
			if (existingLabel) {
				labelIds.push(existingLabel.id)
			} else {
				// Create new label if it doesn't exist
				try {
					const newLabel = await createLabel(labelName, accessToken)
					labelIds.push(newLabel.id)
				} catch (error) {
					debugEvents.addEntry(`Failed to create label "${labelName}"`, "warning")
				}
			}
		}
		
		return labelIds
	}

	// Helper function to create a new label
	const createLabel = async (name: string, accessToken: string) => {
		const response = await fetch(
			'https://gmail.googleapis.com/gmail/v1/users/me/labels',
			{
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name,
					labelListVisibility: 'labelShow',
					messageListVisibility: 'show',
				}),
			}
		)
		
		if (!response.ok) {
			throw new Error(`Failed to create label: ${response.statusText}`)
		}
		
		return await response.json()
	}

	const handleAIProcessWithLabeling = async (email: Email) => {
		debugEvents.addEntry("=== AI LABELING WITH GMAIL API START ===", "info")
		
		// Token validation with detailed logging
		if (!googleTokens?.access_token) {
			debugEvents.addEntry("❌ No access token available for AI labeling", "error")
			toast.error("Please sign in with Google to use AI labeling")
			return
		}

		debugEvents.addEntry("✅ Access token found", "success")
		setProcessingEmails(prev => new Set(prev).add(email.id))
		debugEvents.addEntry(`📧 Starting AI labeling for email: ${email.subject}`, "info")
		
		toast.info("Analyzing email with AI...", {
			description: "Getting label suggestions from AI"
		})

		try {
			// Step 1: Get existing Gmail labels
			debugEvents.addEntry("📋 Step 1: Fetching existing Gmail labels...", "info")
			const labelsResponse = await fetch(
				'https://gmail.googleapis.com/gmail/v1/users/me/labels',
				{
					headers: {
						'Authorization': `Bearer ${googleTokens.access_token}`,
					},
				}
			)
			
			if (!labelsResponse.ok) {
				throw new Error(`Failed to fetch labels: ${labelsResponse.statusText}`)
			}
			
			const labelsData = await labelsResponse.json()
			const existingLabels = labelsData.labels
				.filter((label: any) => label.type === 'user')
				.map((label: any) => label.name)
			
			debugEvents.addEntry(`✅ Found ${existingLabels.length} user labels: ${existingLabels.join(', ')}`, "info")

			// Step 2: Analyze email with AI
			debugEvents.addEntry("🤖 Step 2: Analyzing email with AI...", "info")
			
			const emailData = {
				subject: email.subject,
				from: email.senderEmail || email.sender,
				content: email.content,
				date: email.date || email.time,
			}
			
			const aiStartTime = performance.now()
			const analysisResponse = await fetch('/api/analyze-email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: emailData,
					existingLabels,
				}),
			})
			const aiEndTime = performance.now()
			
			debugEvents.addEntry(`📊 AI analysis response time: ${(aiEndTime - aiStartTime).toFixed(2)}ms`, "info")

			if (!analysisResponse.ok) {
				debugEvents.addEntry("❌ AI analysis request failed", "error")
				throw new Error(`Failed to analyze email: ${analysisResponse.status} ${analysisResponse.statusText}`)
			}

			const analysis = await analysisResponse.json()
			debugEvents.addEntry(`🤖 AI analysis result: ${JSON.stringify(analysis, null, 2)}`, "info")
			debugEvents.addEntry(`✨ AI suggested labels: ${analysis.suggestedLabels.join(', ')}`, "success")

			// Step 3: Apply labels to Gmail via API
			if (analysis.suggestedLabels.length > 0) {
				debugEvents.addEntry("🏷️ Step 3: Applying labels to Gmail...", "info")
				
				// Get or create label IDs
				const labelIds = await getLabelIds(analysis.suggestedLabels, googleTokens.access_token)
				debugEvents.addEntry(`✅ Got label IDs: ${labelIds.join(', ')}`, "info")
				
				// Apply labels to the email in Gmail
				if (email.gmailId && labelIds.length > 0) {
					const modifyResponse = await fetch(
						`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmailId}/modify`,
						{
							method: 'POST',
							headers: {
								'Authorization': `Bearer ${googleTokens.access_token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								addLabelIds: labelIds,
							}),
						}
					)
					
					if (modifyResponse.ok) {
						debugEvents.addEntry(`✅ Successfully applied ${labelIds.length} labels to Gmail`, "success")
						toast.success("AI analysis and labeling completed!", {
							description: `Applied ${analysis.suggestedLabels.length} labels: ${analysis.suggestedLabels.join(', ')}`
						})
						
						// Update the email in local state to reflect the new labels
						const updatedEmail = {
							...email,
							badges: [...email.badges, ...analysis.suggestedLabels],
							labelIds: [...(email.labelIds || []), ...labelIds]
						}
						
						// Update the emails state
						if (realEmails.length > 0) {
							setRealEmails(prev => prev.map(e => e.id === email.id ? updatedEmail : e))
						} else {
							setEmails(prev => prev.map(e => e.id === email.id ? updatedEmail : e))
						}
					} else {
						const errorText = await modifyResponse.text()
						debugEvents.addEntry(`❌ Failed to apply labels to Gmail: ${errorText}`, "error")
						throw new Error(`Failed to apply labels: ${modifyResponse.statusText}`)
					}
				} else {
					debugEvents.addEntry("⚠️ Missing Gmail ID or no labels to apply", "warning")
				}
			} else {
				toast.info("No new labels suggested", {
					description: "Email already has appropriate labels or no suitable labels found"
				})
			}

		} catch (error) {
			debugEvents.addEntry("❌ AI LABELING WITH GMAIL API FAILED", "error")
			
			if (error instanceof Error) {
				debugEvents.addEntry(`Error message: ${error.message}`, "error")
			}
			
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			toast.error("AI labeling failed", {
				description: errorMessage
			})
		} finally {
			setProcessingEmails(prev => {
				const next = new Set(prev)
				next.delete(email.id)
				return next
			})
			debugEvents.addEntry("=== AI LABELING WITH GMAIL API END ===", "info")
		}
	}

	// Function to fetch user's Gmail labels
	const fetchGmailLabels = async () => {
		if (!googleTokens?.access_token || isLoadingLabels) return

		setIsLoadingLabels(true)
		debugEvents.addEntry("Fetching user's Gmail labels...", "info")

		try {
			const labelsResponse = await fetch(
				'https://gmail.googleapis.com/gmail/v1/users/me/labels',
				{
					headers: {
						'Authorization': `Bearer ${googleTokens.access_token}`,
					},
				}
			)

			if (!labelsResponse.ok) {
				throw new Error(`Failed to fetch labels: ${labelsResponse.statusText}`)
			}

			const labelsData = await labelsResponse.json()
			
			// Create a mapping from label ID to label name for all labels
			const idToNameMapping: Record<string, string> = {}
			labelsData.labels.forEach((label: any) => {
				idToNameMapping[label.id] = label.name
			})
			setLabelIdToNameMap(idToNameMapping)
			
			// Filter for user-created labels (not system labels)
			const userLabels = labelsData.labels
				.filter((label: any) => {
					// Include all user-created labels
					if (label.type === 'user') return true;
					
					// Also include some useful system labels
					if (label.id === 'IMPORTANT' || 
						label.id === 'STARRED' ||
						label.id === 'SENT' ||
						label.id === 'DRAFT') return true;
					
					return false;
				})
				.map((label: any) => label.name)
				.filter((name: string) => {
					// Only exclude these specific system labels
					const excludeList = ['INBOX', 'SPAM', 'TRASH', 'UNREAD'];
					return !excludeList.includes(name.toUpperCase());
				})
				// Show all labels - no artificial limit

			debugEvents.addEntry(`✅ Found ${userLabels.length} user labels: ${userLabels.join(', ')}`, "success")
			debugEvents.addEntry(`✅ Created label mapping for ${Object.keys(idToNameMapping).length} labels`, "info")
			debugEvents.addEntry(`📋 All fetched labels (${labelsData.labels.length}): ${labelsData.labels.map((l: any) => `${l.name} (${l.type})`).join(', ')}`, "info")
			
			// Log any filtered out labels
			const filteredOutLabels = labelsData.labels.filter((label: any) => {
				if (label.type === 'user') return false;
				if (label.id === 'IMPORTANT' || label.id === 'STARRED' || label.id === 'SENT' || label.id === 'DRAFT') return false;
				return true;
			});
			if (filteredOutLabels.length > 0) {
				debugEvents.addEntry(`🚫 Filtered out ${filteredOutLabels.length} system labels: ${filteredOutLabels.map((l: any) => l.name).join(', ')}`, "warning")
			}
			
			setUserGmailLabels(userLabels)

			// If no user labels found, keep default folders
			if (userLabels.length === 0) {
				debugEvents.addEntry("No user labels found, keeping default folders", "info")
			}

		} catch (error) {
			debugEvents.addEntry("❌ Failed to fetch Gmail labels", "error")
			console.error("Error fetching Gmail labels:", error)
			
			// Keep default folders on error
			debugEvents.addEntry("Using default folders due to error", "info")
		} finally {
			setIsLoadingLabels(false)
		}
	}

	// Chat functions
	const handleSendMessage = async () => {
		if (!currentMessage.trim() || isStreaming) return

		const userMessage = {
			id: Date.now().toString(),
			role: 'user' as const,
			content: currentMessage.trim(),
			timestamp: new Date()
		}

		setMessages(prev => [...prev, userMessage])
		setCurrentMessage('')
		setIsStreaming(true)

		const assistantMessage = {
			id: (Date.now() + 1).toString(),
			role: 'assistant' as const,
			content: '',
			timestamp: new Date()
		}

		setMessages(prev => [...prev, assistantMessage])

		// Auto-scroll to bottom
		setTimeout(() => {
			chatMessagesRef.current?.scrollTo({ top: chatMessagesRef.current.scrollHeight, behavior: 'smooth' })
		}, 100)

		try {
			// Call our backend API instead of OpenAI directly
			const response = await fetch('http://localhost:3000/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					messages: [
						...messages.map(msg => ({ role: msg.role, content: msg.content })),
						{ role: 'user', content: userMessage.content }
					]
				})
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const reader = response.body?.getReader()
			const decoder = new TextDecoder()

			if (!reader) {
				throw new Error('No response body')
			}

			let accumulatedContent = ''

			while (true) {
				const { done, value } = await reader.read()
				
				if (done) break

				const chunk = decoder.decode(value)
				const lines = chunk.split('\n')

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6).trim()
						
						if (data === '[DONE]') continue

						try {
							const json = JSON.parse(data)
							const content = json.content || ''
							
							if (content) {
								accumulatedContent += content
								
								setMessages(prev => prev.map(msg => 
									msg.id === assistantMessage.id 
										? { ...msg, content: accumulatedContent }
										: msg
								))
							}
						} catch (e) {
							// Ignore JSON parse errors for incomplete chunks
						}
					}
				}
			}
		} catch (error) {
			console.error('Chat error:', error)
			setMessages(prev => prev.map(msg => 
				msg.id === assistantMessage.id 
					? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
					: msg
			))
		} finally {
			setIsStreaming(false)
		}
	}

	const toggleChat = () => {
		if (isChatOpen && !isChatMinimized) {
			setIsChatMinimized(true)
		} else if (isChatOpen && isChatMinimized) {
			setIsChatMinimized(false)
		} else {
			setIsChatOpen(true)
			setIsChatMinimized(false)
		}
	}

	const closeChat = () => {
		setIsChatOpen(false)
		setIsChatMinimized(false)
	}

	const handleLabelRecents = async () => {
		if (!googleTokens?.access_token || isLabelingRecents) return
		
		setIsLabelingRecents(true)
		setLabelingProgress(0)
		
		try {
			// Get 19 most recent emails from the correct email array
			const allEmails = realEmails.length > 0 ? realEmails : emails
			const recentEmails = allEmails.slice(0, 19)
			
			if (recentEmails.length === 0) {
				toast.info("No emails found to label", {
					description: "Make sure you have fetched emails first"
				})
				return
			}
			
			debugEvents.addEntry(`Starting to label ${recentEmails.length} recent emails`, "info")
			
			for (let i = 0; i < recentEmails.length; i++) {
				const email = recentEmails[i]
				await handleAIProcessWithLabeling(email)
				setLabelingProgress(((i + 1) / recentEmails.length) * 100)
			}
			
			toast.success("Completed labeling recent emails", {
				description: `Processed ${recentEmails.length} emails`
			})
		} catch (error) {
			console.error("Error labeling recent emails:", error)
			toast.error("Failed to label recent emails", {
				description: error instanceof Error ? error.message : "Unknown error"
			})
		} finally {
			setIsLabelingRecents(false)
			setLabelingProgress(0)
		}
	}

	return (
		<div className="flex h-screen bg-background">
			<EmailStyles />
			{/* Sidebar with tools */}
			<div className="flex h-full w-64 flex-col border-r bg-background">
				{/* Account Section */}
				<div className="border-b p-4">
					<div className="mb-4 flex items-center gap-3">
						<div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg">
							<img
								src={theme === "dark" ? "/logo.png" : "/logo.png"}
								alt="Boxy Logo"
								className="h-20 w-20 object-contain"
								width={80}
								height={80}
							/>
						</div>
						<div className="flex flex-col">
							<h1 className="font-semibold text-3xl text-primary tracking-tight">
								Boxy
							</h1>
							<p className="text-muted-foreground text-sm">
								Inbox Your Way
							</p>
						</div>
					</div>

					<div className="space-y-2">
						{accounts.map((account) => (
							<button
								key={account.id}
								className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
									account.isActive ? "bg-accent" : "hover:bg-accent/50"
								}`}
								onClick={() => {
									setAccounts(
										accounts.map((acc) =>
											acc.id === account.id
												? { ...acc, isActive: true }
												: { ...acc, isActive: false },
										),
									);
								}}
							>
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
									<span className="font-medium text-primary text-xs">
										{account.email.charAt(0).toUpperCase()}
									</span>
								</div>
								<div className="flex flex-1 flex-col items-start">
									<span className="font-medium text-xs">{account.email}</span>
									<span className="text-[10px] text-muted-foreground">
										{account.provider}
									</span>
								</div>
								{account.isActive && (
									<span className="h-2 w-2 rounded-full bg-green-500" />
								)}
							</button>
						))}
						<button
							onClick={() => setShowAddAccountModal(true)}
							className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground text-sm hover:bg-accent/50"
						>
							<div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed">
								<span className="text-lg">+</span>
							</div>
							<span>Add Account</span>
							<kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
								⌥
							</kbd>
						</button>
					</div>
				</div>

				{/* Tools Section */}
				<div className="flex-1 overflow-y-auto p-4">
					<div className="mb-8">
						<h3 className="mb-2 font-medium text-muted-foreground text-sm">
							Tools
						</h3>
						<nav className="space-y-1">
							<button
								onClick={() => handleToolClick("today-summary")}
								className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
									activeTool === "today-summary"
										? "bg-accent"
										: "hover:bg-accent"
								}`}
							>
								Today's Summary
								<span className="ml-auto rounded-full bg-blue-500 px-2 text-white text-xs">
									New
								</span>
							</button>
							<button
								onClick={() => handleToolClick("reply-zero")}
								className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
									activeTool === "reply-zero" ? "bg-accent" : "hover:bg-accent"
								}`}
							>
								Email Assistant
								<span className="ml-auto rounded-full bg-green-500 px-2 text-white text-xs">
									New
								</span>
							</button>
							<button
								onClick={() => handleToolClick("cold-email-blocker")}
								className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
									activeTool === "cold-email-blocker"
										? "bg-accent"
										: "hover:bg-accent"
								}`}
							>
								Cold Email Blocker
								<span className="ml-auto rounded-full bg-red-500 px-2 text-white text-xs">
									{blockedEmails}
								</span>
							</button>
							<button
								onClick={() => handleToolClick("analytics")}
								className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
									activeTool === "analytics" ? "bg-accent" : "hover:bg-accent"
								}`}
							>
								Analytics
							</button>
							<button
								onClick={() => handleToolClick("bulk-unsubscribe")}
								className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
									activeTool === "bulk-unsubscribe"
										? "bg-accent"
										: "hover:bg-accent"
								}`}
							>
								Bulk Unsubscribe
								<span className="ml-auto rounded-full bg-yellow-500 px-2 text-white text-xs">
									{subscriptions}
								</span>
							</button>
						
						</nav>
					</div>

					<div className="mb-8">
						<h3 className="mb-2 font-medium text-muted-foreground text-sm">
							AI Tools
						</h3>
						<nav className="space-y-1">
							<button
								onClick={handleOpenAIConfigModal}
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
							>
								Knowledge Base
								<kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
									⌘K
								</kbd>
							</button>
							<button
								onClick={handleOpenRulesModal}
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
							>
								Rules
								<kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
									⌘R
								</kbd>
							</button>
							<button
								onClick={handleOpenTestModal}
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
							>
								Test Rules
								<kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
									⌘E
								</kbd>
							</button>
							<button
								onClick={handleOpenHistoryModal}
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
							>
								History
								<kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
									⌘H
								</kbd>
							</button>
						</nav>
					</div>

					<div className="mt-8">
						<h3 className="mb-2 font-medium text-muted-foreground text-sm">
							Support
						</h3>
						<nav className="space-y-1">
							<button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
								Help Center
							</button>
							<button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
								Settings
							</button>
							<div className="p-2">
								<GoogleAuth />
							</div>
						</nav>
					</div>

					<div className="mt-8">
						<h3 className="mb-2 font-medium text-muted-foreground text-sm">
							Community
						</h3>
						<nav className="space-y-1">
							<button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
								Follow on X
							</button>
							<button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
								Join Discord
							</button>
							<button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
								Premium
							</button>
						</nav>
					</div>
				</div>
			</div>

			{/* Main content area */}
			<div className="flex flex-1 flex-col bg-background">
				{/* Header - Fixed */}
				<div className="border-b bg-background p-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<h1 className="font-semibold text-xl capitalize">
								{activeFolder === "all"
									? "All Emails"
									: activeFolder.replace("-", " ")}
							</h1>
							<div className="flex items-center gap-2">
								<button
									onClick={handleLabelRecents}
									disabled={!googleTokens?.access_token || isLabelingRecents}
									className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
								>
									{isLabelingRecents ? (
										<>
											<RefreshCw className="h-4 w-4 animate-spin" />
											Labeling...
										</>
									) : (
										<>
											<Sparkles className="h-4 w-4" />
											Label Recents
										</>
									)}
								</button>
								<div className="flex items-center gap-2">
									{/* Google Auth status */}
									{!googleTokens ? (
										<div className="mr-2">
											<GoogleAuth />
										</div>
									) : (
										<div className="flex items-center gap-2 mr-2">
											<span className="text-xs text-green-500">✓ Gmail Connected</span>
											<button 
												onClick={fetchEmails}
												className="p-1 rounded-full hover:bg-accent"
												title="Refresh emails"
												disabled={isLoadingEmails}
											>
												<RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
											</button>
											{isLoadingEmails && (
												<span className="text-xs text-gray-500">Loading...</span>
											)}
										</div>
									)}
									<button
										onClick={handleNewEmail}
										className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
									>
										New Email
									</button>
								</div>
							</div>
						</div>
						{/* Progress bar */}
						{isLabelingRecents && (
							<div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
								<div 
									className="h-full bg-purple-600 transition-all duration-300"
									style={{ width: `${labelingProgress}%` }}
								/>
							</div>
						)}
					</div>
				</div>

				{/* Email folders tabs - Fixed */}
				<div className="border-b bg-background">
					<div className="p-4">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-medium text-muted-foreground">
									Labels ({userGmailLabels.length > 0 ? userGmailLabels.length : DEFAULT_FOLDERS.length})
								</h3>
								{userGmailLabels.length > 0 && (
									<span className="text-xs text-green-600">Gmail Connected</span>
								)}
							</div>
							{/* Refresh labels button */}
							{googleTokens && (
								<button
									onClick={fetchGmailLabels}
									disabled={isLoadingLabels}
									className="rounded-full p-1 hover:bg-accent transition-colors duration-200"
									title="Refresh Gmail labels"
								>
									<RefreshCw className={`h-3 w-3 ${isLoadingLabels ? 'animate-spin' : ''}`} />
								</button>
							)}
						</div>
						{/* Scrollable container for labels */}
						<div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
							<div className="flex flex-wrap gap-1">
								<button
									onClick={() => handleFolderChange("all")}
									className={`rounded-md px-3 py-1.5 text-sm shrink-0 ${
										activeFolder === "all"
											? "bg-primary text-primary-foreground"
											: "hover:bg-accent"
									}`}
								>
									All
								</button>
								{/* Show user's Gmail labels if available, otherwise show default folders */}
								{(userGmailLabels.length > 0 ? userGmailLabels : DEFAULT_FOLDERS).map((folder) => (
									<button
										key={folder}
										onClick={() => handleFolderChange(folder)}
										className={`rounded-md px-3 py-1.5 text-sm shrink-0 ${
											activeFolder === folder
												? "bg-primary text-primary-foreground"
												: "hover:bg-accent"
										}`}
									>
										{folder
											.split("-")
											.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
											.join(" ")}
									</button>
								))}
								{/* Show loading indicator when fetching labels */}
								{isLoadingLabels && (
									<div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground">
										<div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
										<span className="text-xs">Loading labels...</span>
									</div>
								)}
								{customFolders.map((folder) => (
									<button
										key={folder.id}
										onClick={() => handleFolderChange(folder.type)}
										className={`rounded-md px-3 py-1.5 text-sm shrink-0 ${
											activeFolder === folder.type
												? "bg-primary text-primary-foreground"
												: "hover:bg-accent"
										}`}
									>
										{folder.name}
									</button>
								))}
								<button
									ref={plusButtonRef}
									onClick={handleOpenModal}
									className="ml-2 rounded-full p-1 hover:bg-accent transition-colors duration-200 shrink-0"
									title="Add custom folder"
								>
									<span className="text-lg">+</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Main content area with separate scroll areas */}
				<div className="flex flex-1 overflow-hidden">
					{activeTool === "today-summary" ? (
						<div className="flex-1 overflow-y-auto">
							<TodaySummaryComponent />
						</div>
					) : activeTool === "cold-email-blocker" ? (
						<div className="flex-1 overflow-hidden">
							<ColdEmailBlockerComponent />
						</div>
					) : activeTool === "bulk-unsubscribe" ? (
						<div className="flex-1 overflow-hidden">
							<BulkUnsubscribeComponent />
						</div>
					) : activeTool === "analytics" ? (
						<div className="flex-1 overflow-hidden">
							<AnalyticsComponent />
						</div>
					) : (
						<>
							{/* Email list - Independent scroll */}
							<div className="flex w-[500px] flex-col border-r bg-background">
								{/* Sorting controls - Fixed */}
								<div className="border-b bg-background p-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-muted-foreground text-xs">
												Sort by:
											</span>
											<div className="flex items-center gap-1">
												<button
													onClick={() => handleSort("priority")}
													className={`rounded-md px-2 py-1 text-xs ${
														sortBy === "priority"
															? "bg-primary text-primary-foreground"
															: "hover:bg-accent"
													}`}
												>
													Priority
													{sortBy === "priority" && (
														<span className="ml-1">
															{sortDirection === "asc" ? "↑" : "↓"}
														</span>
													)}
												</button>
												<button
													onClick={() => handleSort("date")}
													className={`rounded-md px-2 py-1 text-xs ${
														sortBy === "date"
															? "bg-primary text-primary-foreground"
															: "hover:bg-accent"
													}`}
												>
													Date
													{sortBy === "date" && (
														<span className="ml-1">
															{sortDirection === "asc" ? "↑" : "↓"}
														</span>
													)}
												</button>
											</div>
										</div>
										<span className="text-muted-foreground text-xs">
											{getEmailsForFolder(activeFolder).length} emails
										</span>
									</div>
								</div>

								{/* Email list - Scrollable */}
								<div className="flex-1 overflow-y-auto">
									<div className="divide-y">
										{getSortedEmails(getEmailsForFolder(activeFolder)).map(
											(email) => (
												<div
													key={email.id}
													onClick={() => handleEmailClick(email)}
													className={`cursor-pointer p-4 hover:bg-accent ${
														selectedEmail?.id === email.id ? "bg-accent" : ""
													}`}
												>
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-2">
															{email.badges.map((badge) => (
																<span
																	key={badge}
																	className={`rounded-full px-2 py-0.5 text-xs ${
																		badge === "AI Generated"
																			? "bg-purple-100 text-purple-800"
																			: badge === "Follow-up"
																				? "bg-orange-100 text-orange-800"
																				: badge === "Meeting"
																					? "bg-blue-100 text-blue-800"
																					: badge === "High Priority"
																						? "bg-red-100 text-red-800"
																						: badge === "Important"
																							? "bg-yellow-100 text-yellow-800"
																							: "bg-gray-100 text-gray-800"
																	}`}
																>
																	{badge}
																</span>
															))}
															<span className="font-medium">
																{email.sender}
															</span>
														</div>
														<span className="text-muted-foreground text-sm">
															{email.date ? displayEmailDate(email.date) : email.time}
														</span>
													</div>
													<div className="mt-1 font-medium text-sm">
														{email.subject}
													</div>
													<div className="mt-1 text-muted-foreground text-sm line-clamp-2">
														{email.preview || email.content?.substring(0, 100)}
													</div>
													{email.hasAIDraft && (
														<div className="mt-2">
															<span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs">
																AI Draft Ready
															</span>
														</div>
													)}
												</div>
											),
										)}
									</div>
								</div>
							</div>

							{/* Right panel - Independent scroll */}
							<div className="flex-1 overflow-hidden bg-background">
								<div className="h-full overflow-y-auto p-4">
									{selectedEmail ? (
										<div className="space-y-4">
											{/* Email Content */}
											<div className="rounded-lg border bg-card p-4">
												<div className="mb-4">
													<div className="mb-2 flex items-center justify-between">
														<h2 className="font-semibold text-lg">
															{selectedEmail.subject}
														</h2>
														<div className="flex items-center gap-2">
															{selectedEmail.badges.map((badge) => (
																<span
																	key={badge}
																	className={`rounded-full px-2 py-0.5 text-xs ${
																		badge === "AI Generated"
																			? "bg-purple-100 text-purple-800"
																			: badge === "Follow-up"
																				? "bg-orange-100 text-orange-800"
																				: badge === "Meeting"
																					? "bg-blue-100 text-blue-800"
																					: badge === "High Priority"
																						? "bg-red-100 text-red-800"
																						: badge === "Important"
																							? "bg-yellow-100 text-yellow-800"
																							: "bg-gray-100 text-gray-800"
																	}`}
																>
																	{badge}
																</span>
															))}
														</div>
													</div>
													<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
														<div className="flex items-center gap-2">
															<span className="w-12 font-medium text-muted-foreground">
																From:
															</span>
															<div>
																<span className="font-medium">
																	{selectedEmail.sender}
																</span>
																<span className="ml-1 text-muted-foreground">
																	{selectedEmail.senderEmail ? 
																		`<${selectedEmail.senderEmail}>` : 
																		`<${selectedEmail.sender.toLowerCase().replace(/[^a-z0-9]/g, '.')}@${
																			selectedEmail.sender.toLowerCase().includes('gmail') ? 'gmail.com' : 
																			selectedEmail.sender.toLowerCase().includes('microsoft') ? 'microsoft.com' :
																			selectedEmail.sender.toLowerCase().includes('berkeley') ? 'berkeley.edu' :
																			'example.com'
																		}>`
																	}
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<span className="w-12 font-medium text-muted-foreground">
																To:
															</span>
															<div>
																<span className="font-medium">
																	{accounts[0]?.email || "me@example.com"}
																</span>
																<span className="ml-1 text-muted-foreground">
																	{accounts[0]?.provider || "Personal"}
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<span className="w-12 font-medium text-muted-foreground">
																Date:
															</span>
															<span className="font-medium">
																{selectedEmail.date ? displayEmailDate(selectedEmail.date) : selectedEmail.time}
															</span>
														</div>
														<div className="flex items-center gap-2">
															<span className="w-12 font-medium text-muted-foreground">
																Folder:
															</span>
															<span className="font-medium capitalize">
																{activeFolder.replace("-", " ")}
															</span>
														</div>
														<div className="flex items-center gap-2">
															<span className="w-12 font-medium text-muted-foreground">
																Status:
															</span>
															<span
																className={`font-medium ${
																	selectedEmail.hasAIDraft
																		? "text-green-600"
																		: "text-muted-foreground"
																}`}
															>
																{selectedEmail.hasAIDraft
																	? "AI Draft Ready"
																	: "No Draft"}
															</span>
														</div>
													</div>
												</div>
												<div className="prose prose-sm max-w-none text-sm relative">
													{selectedEmail.content.includes("<") && selectedEmail.content.includes(">") ? (
														<div 
															className="email-body"
															dangerouslySetInnerHTML={{ 
																__html: selectedEmail.content
																	.replace(/<img/g, '<img loading="lazy"')
																	.replace(/<a/g, '<a target="_blank" rel="noopener noreferrer"')
																	// Remove excessive line breaks
																	.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
																	// Handle empty paragraphs often used for spacing
																	.replace(/<p>\s*(&nbsp;)*\s*<\/p>/gi, '')
															}}
														/>
													) : (
														<div className="email-body">
															{selectedEmail.content.split('\n').map((line, index) => {
																// Make URLs clickable
																const urlRegex = /(https?:\/\/[^\s]+)/g;
																if (line.trim() === '') {
																	return index % 2 === 0 ? <br key={index} /> : null;
																}
																
																// Process line to make URLs clickable
																const parts = line.split(urlRegex);
																const elements = [];
																
																for (let i = 0; i < parts.length; i++) {
																	elements.push(<span key={`${index}-${i}`}>{parts[i]}</span>);
																	
																	// Add URL link if there is a match after this part
																	const match = line.match(urlRegex)?.[i];
																	if (match) {
																		elements.push(
																			<a 
																				key={`${index}-${i}-url`} 
																				href={match} 
																				target="_blank" 
																				rel="noopener noreferrer"
																			>
																				{match}
																			</a>
																		);
																	}
																}
																
																return (
																	<p key={index}>
																		{elements}
																	</p>
																);
															})}
														</div>
													)}
													
													{/* Persistent AI Draft Button (Bottom Left) */}
													<div className="absolute bottom-4 left-4 z-10">
													
													</div>
												</div>
												
												{/* Generate Draft Button (Center) */}
												<div className="mt-4 flex justify-left gap-2">
													<button
														onClick={handleGenerateDraft}
														disabled={isDraftGenerating}
														className="inline-flex items-left gap-1.5 rounded-md bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
													>
														{isDraftGenerating ? (
															<>
																<RefreshCw className="h-5 w-5 animate-spin" />
																Generating...
															</>
														) : (
															<>
																<Sparkles className="h-5 w-5" />
																Generate AI Draft Reply
															</>
														)}
													</button>
													
													{/* Manual Label Dropdown */}
													<ManualLabelDropdown
														email={{
															id: selectedEmail.id,
															gmailId: selectedEmail.gmailId,
															subject: selectedEmail.subject,
															labelIds: selectedEmail.labelIds || []
														}}
														accessToken={googleTokens?.access_token || ""}
														refreshToken={googleTokens?.refresh_token || ""}
														disabled={!googleTokens?.access_token}
														onLabelApplied={(labelId, labelName) => {
															// Optionally refresh the email list or update UI
															console.log(`Applied label ${labelName} (${labelId}) to email ${selectedEmail.gmailId}`)
														}}
													/>
												</div>

												{/* AI Label Button */}
												<div className="mt-2 flex justify-left">
													<AILabelButton
														email={selectedEmail}
														accessToken={googleTokens?.access_token || ""}
														refreshToken={googleTokens?.refresh_token || ""}
														disabled={!googleTokens?.access_token}
														onLabelApplied={(labelId, labelName) => {
															console.log(`AI applied label ${labelName} (${labelId}) to email ${selectedEmail.gmailId}`)
														}}
													/>
												</div>
											</div>

											{/* AI Draft */}
											{(selectedEmail.hasAIDraft || generatedDraft) && (
												<div className="rounded-lg border bg-card p-4">
													<div className="mb-4 flex items-center justify-between">
														<h3 className="font-semibold text-sm">
															{isDraftGenerating ? "Generating Draft..." : "AI Draft Reply"}
														</h3>
														<div className="flex items-center gap-2">
															<button 
																className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
																onClick={handleUseDraft}
																disabled={isDraftGenerating || !selectedEmail.hasAIDraft || isCreatingDraft}
															>
																{isCreatingDraft ? (
																	<>
																		<RefreshCw className="h-3.5 w-3.5 animate-spin" />
																		Creating...
																	</>
																) : (
																	<>
																		<CheckCircle className="h-3.5 w-3.5" />
																		Use Draft
																	</>
																)}
															</button>
															<button 
																className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
																onClick={handleGenerateDraft}
																
																disabled={isDraftGenerating}
															>
																<RefreshCw className="h-3.5 w-3.5" />
																Regenerate
															</button>
															<button 
																className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
																onClick={handleSendAsIs}
																disabled={isDraftGenerating || !selectedEmail.hasAIDraft || isSendingEmail}
															>
																{isSendingEmail ? (
																	<>
																		<RefreshCw className="h-3.5 w-3.5 animate-spin" />
																		Sending...
																	</>
																) : (
																	<>
																		<Send className="h-3.5 w-3.5" />
																		Send as is
																	</>
																)}
															</button>
														</div>
													</div>
													<div className="mb-4">
														<textarea
															className="w-full rounded-md border p-2 text-sm"
															rows={4}
															placeholder="Enter instructions for regenerating the draft..."
															value={draftInstructions}
															onChange={(e) => setDraftInstructions(e.target.value)}
															disabled={isDraftGenerating}
														/>
													</div>
													
													{draftError ? (
														<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
															<div className="flex justify-between items-start">
																<div>
																	<p className="font-medium">Error generating draft:</p>
																	<p>{draftError}</p>
																</div>
																<button 
																	onClick={() => {
																		// Show debug overlay
																		if (typeof window !== 'undefined' && window.document) {
																			const debugElement = window.document.getElementById('debug-overlay');
																			if (debugElement) {
																				debugElement.style.display = 'block';
																			}
																		}
																	}}
																	className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-xs font-medium"
																>
																	<AlertCircle className="h-3 w-3" />
																	Show Debug
																</button>
															</div>
															<p className="mt-2 text-xs">
																API key has been hardcoded for this demo.
															</p>
														</div>
													) : selectedEmail.hasAIDraft && !isDraftGenerating && (
														<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
															<div className="flex items-center">
																<CheckCircle className="h-4 w-4 mr-2" />
																<p className="font-medium">Draft generated successfully!</p>
															</div>
															<p className="mt-1 text-xs">
																Using GPT-4o model for high-quality response drafting.
															</p>
														</div>
													)}
													
													<div className="prose prose-sm max-w-none text-sm">
														{isDraftGenerating ? (
															<div className="flex items-center justify-center p-4">
																<RefreshCw className="h-5 w-5 animate-spin mr-2" />
																<span>Generating draft response...</span>
															</div>
														) : (
															<textarea
																value={selectedEmail.aiDraft || generatedDraft}
																onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
																	if (selectedEmail) {
																		const updatedEmail = {
																			...selectedEmail,
																			aiDraft: e.target.value
																		}
																		setSelectedEmail(updatedEmail)
																	}
																	setGeneratedDraft(e.target.value)
																}}
																className="w-full min-h-[200px] p-3 rounded-md border bg-background font-sans text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
																placeholder="AI draft will appear here..."
															/>
														)}
													</div>
												</div>
											)}

											{/* Analytics */}
											<div className="rounded-lg border bg-card p-4">
												<h3 className="mb-3 font-semibold text-sm">
													Analytics
												</h3>
												<div className="grid gap-3 text-sm md:grid-cols-2">
													<div>
														<span className="font-medium text-muted-foreground text-xs">
															Response Time
														</span>
														<p className="text-sm">
															{selectedEmail.analytics.responseTime}
														</p>
													</div>
													<div>
														<span className="font-medium text-muted-foreground text-xs">
															Priority
														</span>
														<p className="text-sm">
															{selectedEmail.analytics.priority}
														</p>
													</div>
													<div>
														<span className="font-medium text-muted-foreground text-xs">
															Category
														</span>
														<p className="text-sm">
															{selectedEmail.analytics.category}
														</p>
													</div>
													<div>
														<span className="font-medium text-muted-foreground text-xs">
															Sentiment
														</span>
														<p className="text-sm">
															{selectedEmail.analytics.sentiment}
														</p>
													</div>
												</div>
											</div>
										</div>
									) : (
										<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
											Select an email to view details
										</div>
									)}
								</div>
							</div>
						</>
					)}
				</div>

				{/* Hidden EmailList component to fetch real emails */}
				{googleTokens && (
					<div className="hidden">
						<EmailList 
							accessToken={googleTokens.access_token}
							refreshToken={googleTokens.refresh_token}
							ref={emailListRef}
						/>
					</div>
				)}

				{/* New Email Modal (simplified) */}
				{showNewEmailModal && (
					<div className="fixed inset-0 flex items-center justify-center bg-black/50">
						<div className="rounded-lg bg-background p-4">
							<p>New Email Modal (Dummy)</p>
						</div>
					</div>
				)}

				{/* New Folder Modal */}
				{showNewFolderModal && (
					<div 
						className="fixed inset-0 flex items-center justify-center transition-all duration-[400ms] ease-out"
						style={{ 
							opacity: isModalVisible ? 1 : 0,
							pointerEvents: isModalVisible ? 'auto' : 'none',
							backgroundColor: isModalVisible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
							backdropFilter: isModalVisible ? 'blur(4px)' : 'blur(0px)',
						}}
					>
						<div 
							className="w-[480px] rounded-lg bg-background p-6 shadow-xl transition-all duration-[400ms] ease-out"
							style={{
								transform: isModalVisible 
									? 'translate(-50%, -50%) scale(1)' 
									: `translate(calc(${modalPosition.x}px - 50%), calc(${modalPosition.y}px - 50%)) scale(0.3)`,
								opacity: isModalVisible ? 1 : 0,
								transformOrigin: 'center',
								position: 'absolute',
								left: '50%',
								top: '50%',
							}}
						>
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-lg">Create New Label</h2>
								<button
									onClick={handleCloseModal}
									className="rounded-md p-1 hover:bg-accent transition-colors duration-200"
								>
									<span className="text-lg">×</span>
								</button>
							</div>
							<div 
								className="space-y-4 transition-all duration-[400ms] ease-out"
								style={{
									opacity: isModalVisible ? 1 : 0,
									transform: isModalVisible ? 'translateY(0)' : 'translateY(10px)',
								}}
							>
								<div>
									<label
										htmlFor="folder-name"
										className="mb-1.5 block font-medium text-sm"
									>
										Label Name
									</label>
									<input
										id="folder-name"
										type="text"
										value={newFolderData.name}
										onChange={(e) => setNewFolderData(prev => ({ ...prev, name: e.target.value }))}
										className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
										placeholder="Enter folder name"
									/>
								</div>
								<div>
									<label
										htmlFor="folder-description"
										className="mb-1.5 block font-medium text-sm"
									>
										Description
									</label>
									<textarea
										id="folder-description"
										value={newFolderData.description}
										onChange={(e) => setNewFolderData(prev => ({ ...prev, description: e.target.value }))}
										className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none"
										placeholder="Describe what AI should put in this category"
									/>
								</div>
								<div>
									<label
										htmlFor="ai-behavior"
										className="mb-1.5 block font-medium text-sm"
									>
										AI Behavior
									</label>
									<textarea
										id="ai-behavior"
										value={newFolderData.aiBehavior}
										onChange={(e) => setNewFolderData(prev => ({ ...prev, aiBehavior: e.target.value }))}
										className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
										placeholder="Describe how AI should handle emails sent to this folder (e.g., 'Automatically draft responses for meeting requests', 'Flag urgent items for immediate attention', 'Summarize long threads')"
									/>
								</div>
								<div>
									<label className="mb-1.5 block font-medium text-sm">
										Labels
									</label>
									<div className="mb-3">
										<span className="mb-2 block text-xs text-muted-foreground">Existing Labels</span>
										<div className="flex flex-wrap gap-2">
											{existingLabels.map((label) => (
												<button
													key={label}
													onClick={() => handleLabelToggle(label)}
													className={`group flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
														newFolderData.labels.includes(label)
															? "bg-primary text-primary-foreground hover:bg-primary/90"
															: "bg-accent text-accent-foreground hover:bg-accent/80"
													}`}
												>
													{label}
													{newFolderData.labels.includes(label) && (
														<span className="opacity-0 group-hover:opacity-100">×</span>
													)}
												</button>
											))}
										</div>
									</div>
									<div className="mb-3">
										<span className="mb-2 block text-xs text-muted-foreground">Custom Labels</span>
										<div className="flex flex-wrap gap-2">
											{newFolderData.labels
												.filter(label => !existingLabels.includes(label))
												.map((label) => (
													<button
														key={label}
														onClick={() => handleLabelToggle(label)}
														className="group flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
													>
														{label}
														<span className="opacity-0 group-hover:opacity-100">×</span>
													</button>
												))}
										</div>
									</div>
									<div className="flex gap-2">
										<input
											type="text"
											value={newFolderData.newLabel}
											onChange={(e) => setNewFolderData(prev => ({ ...prev, newLabel: e.target.value }))}
											onKeyDown={(e) => e.key === 'Enter' && handleAddNewLabel()}
											className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
											placeholder="Add custom label..."
										/>
										<button
											onClick={handleAddNewLabel}
											className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium hover:bg-accent/80"
										>
											Add
										</button>
									</div>
								</div>
								<div className="flex justify-end gap-2 pt-2">
									<button
										onClick={handleCloseModal}
										className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors duration-200"
									>
										Cancel
									</button>
									<button 
										onClick={() => {
											setCustomFolders(prev => [...prev, {
												id: prev.length + 1,
												name: newFolderData.name,
												type: "custom",
												description: newFolderData.description,
												aiBehavior: newFolderData.aiBehavior,
												labels: newFolderData.labels
											}])
											handleCloseModal()
										}}
										className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90 transition-colors duration-200"
									>
										Create Folder
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Add Account Modal */}
				{showAddAccountModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
						<div className="w-96 rounded-lg bg-background p-4 shadow-lg">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="font-semibold text-lg">Add Email Account</h2>
								<button
									onClick={() => setShowAddAccountModal(false)}
									className="rounded-md p-1 hover:bg-accent"
								>
									<span className="text-lg">×</span>
								</button>
							</div>
							<div className="space-y-4">
								<div>
									<label
										htmlFor="email-provider"
										className="mb-1 block font-medium text-sm"
									>
										Email Provider
									</label>
									<select
										id="email-provider"
										className="w-full rounded-md border px-3 py-2 text-sm"
									>
										<option value="gmail">Gmail</option>
										<option value="outlook">Outlook</option>
										<option value="yahoo">Yahoo</option>
										<option value="other">Other</option>
									</select>
								</div>
								<div>
									<label
										htmlFor="email-address"
										className="mb-1 block font-medium text-sm"
									>
										Email Address
									</label>
									<input
										id="email-address"
										type="email"
										className="w-full rounded-md border px-3 py-2 text-sm"
										placeholder="Enter your email address"
										required
									/>
								</div>
								<div className="flex justify-end gap-2">
									<button
										onClick={() => setShowAddAccountModal(false)}
										className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
									>
										Cancel
									</button>
									<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm">
										Connect Account
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* AI Configuration Modal */}
				{showAIConfigModal && (
					<div 
						className="fixed inset-0 flex items-center justify-center transition-all duration-[400ms] ease-out"
						style={{ 
							opacity: isAIConfigModalVisible ? 1 : 0,
							pointerEvents: isAIConfigModalVisible ? 'auto' : 'none',
							backgroundColor: isAIConfigModalVisible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
							backdropFilter: isAIConfigModalVisible ? 'blur(4px)' : 'blur(0px)',
						}}
					>
						<div 
							className="w-[640px] rounded-lg bg-background p-6 shadow-xl transition-all duration-[400ms] ease-out"
							style={{
								transform: isAIConfigModalVisible 
									? 'translate(-50%, -50%) scale(1)' 
									: 'translate(-50%, -50%) scale(0.95)',
								opacity: isAIConfigModalVisible ? 1 : 0,
								transformOrigin: 'center',
								position: 'absolute',
								left: '50%',
								top: '50%',
							}}
						>
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-lg">Knowledge Base</h2>
								<button
									onClick={handleCloseAIConfigModal}
									className="rounded-md p-1 hover:bg-accent transition-colors duration-200"
								>
									<span className="text-lg">×</span>
								</button>
							</div>
							<div 
								className="space-y-4 transition-all duration-[400ms] ease-out"
								style={{
									opacity: isAIConfigModalVisible ? 1 : 0,
									transform: isAIConfigModalVisible ? 'translateY(0)' : 'translateY(10px)',
								}}
							>
								<div>
									<label
										htmlFor="ai-instructions"
										className="mb-1.5 block font-medium text-sm"
									>
										Default Instructions
									</label>
									<textarea
										id="ai-instructions"
										value={aiConfigData.instructions}
										onChange={(e) => setAIConfigData(prev => ({ ...prev, instructions: e.target.value }))}
										className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[200px] resize-none font-mono"
										placeholder="Enter default instructions for AI email handling..."
									/>
								</div>
								<div>
									<label
										htmlFor="additional-rules"
										className="mb-1.5 block font-medium text-sm"
									>
										Additional Rules
									</label>
									<textarea
										id="additional-rules"
										value={aiConfigData.additionalRules}
										onChange={(e) => setAIConfigData(prev => ({ ...prev, additionalRules: e.target.value }))}
										className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
										placeholder="Add any additional rules or preferences for AI email handling..."
									/>
								</div>
								<div>
									<label
										htmlFor="exceptions"
										className="mb-1.5 block font-medium text-sm"
									>
										Exceptions
									</label>
									<textarea
										id="exceptions"
										value={aiConfigData.exceptions}
										onChange={(e) => setAIConfigData(prev => ({ ...prev, exceptions: e.target.value }))}
										className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
										placeholder="Specify any exceptions to the rules above..."
									/>
								</div>
								<div className="flex justify-end gap-2 pt-2">
									<button
										onClick={handleCloseAIConfigModal}
										className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors duration-200"
									>
										Cancel
									</button>
									<button 
										onClick={() => {
											// TODO: Save AI configuration
											handleCloseAIConfigModal()
										}}
										className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90 transition-colors duration-200"
									>
										Save Configuration
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Rules Modal */}
				{showRulesModal && (
					<div 
						className="fixed inset-0 flex items-center justify-center transition-all duration-[400ms] ease-out"
						style={{ 
							opacity: isRulesModalVisible ? 1 : 0,
							pointerEvents: isRulesModalVisible ? 'auto' : 'none',
							backgroundColor: isRulesModalVisible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
							backdropFilter: isRulesModalVisible ? 'blur(4px)' : 'blur(0px)',
						}}
					>
						<div 
							className="w-[800px] rounded-lg bg-background p-6 shadow-xl transition-all duration-[400ms] ease-out"
							style={{
								transform: isRulesModalVisible 
									? 'translate(-50%, -50%) scale(1)' 
									: 'translate(-50%, -50%) scale(0.95)',
								opacity: isRulesModalVisible ? 1 : 0,
								transformOrigin: 'center',
								position: 'absolute',
								left: '50%',
								top: '50%',
							}}
						>
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-lg">Rules</h2>
								<div className="flex items-center gap-2">
									<button
										onClick={handleCreateRule}
										className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm hover:bg-primary/90"
									>
											Create Rule
									</button>
									<button
										onClick={handleCloseRulesModal}
										className="rounded-md p-1 hover:bg-accent transition-colors duration-200"
									>
										<span className="text-lg">×</span>
									</button>
								</div>
							</div>
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<h3 className="font-medium text-sm">Active Rules</h3>
										<div className="space-y-2 max-h-[400px] overflow-y-auto">
											{rules.map(rule => (
												<div
													key={rule.id}
													className={`w-full rounded-lg border p-3 ${
														selectedRule?.id === rule.id
															? 'border-primary bg-primary/5'
															: ''
													}`}
												>
													<div className="flex items-center justify-between">
														<button
															onClick={() => setSelectedRule(rule)}
															className="flex-1 text-left hover:bg-accent/50 rounded-md px-2 py-1 -mx-2"
														>
															<span className="font-medium">{rule.name}</span>
															<span className="ml-2 text-xs text-muted-foreground">
																{rule.triggerCount} triggers
															</span>
														</button>
														<button
															onClick={() => {
																setSelectedRule(rule)
																// TODO: Implement edit rule functionality
															}}
															className="rounded-md p-1 hover:bg-accent"
														>
															<Settings className="h-4 w-4" />
														</button>
													</div>
													<p className="mt-1 text-sm text-muted-foreground">
														{rule.description}
													</p>
													<div className="mt-2 flex flex-wrap gap-1">
														{rule.actions.map((action, i) => (
															<span
																key={i}
																className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
															>
																{action.type}: {action.value}
															</span>
														))}
													</div>
												</div>
											))}
										</div>
									</div>
									{selectedRule ? (
										<div className="space-y-4">
											<div>
												<label className="mb-1.5 block font-medium text-sm">
													Rule Name
												</label>
												<input
													type="text"
													value={selectedRule.name}
													onChange={(e) => setRules(prev => 
														prev.map(r => r.id === selectedRule.id 
															? { ...r, name: e.target.value }
															: r
														)
													)}
													className="w-full rounded-md border bg-background px-3 py-2 text-sm"
												/>
											</div>
											<div>
												<label className="mb-1.5 block font-medium text-sm">
													Description
												</label>
												<textarea
													value={selectedRule.description}
													onChange={(e) => setRules(prev => 
														prev.map(r => r.id === selectedRule.id 
															? { ...r, description: e.target.value }
															: r
														)
													)}
													className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
												/>
											</div>
											<div>
												<label className="mb-1.5 block font-medium text-sm">
													Conditions
												</label>
												<div className="space-y-2">
													{selectedRule.conditions.map((condition, i) => (
														<div key={i} className="flex gap-2">
															<select
																value={condition.type}
																onChange={(e) => setRules(prev => 
																	prev.map(r => r.id === selectedRule.id 
																		? { ...r, conditions: r.conditions.map((c, j) => 
																			j === i ? { ...c, type: e.target.value as any } : c
																		)}
																		: r
																	)
																)}
																className="rounded-md border bg-background px-2 py-1 text-sm"
															>
																<option value="sender">Sender</option>
																<option value="subject">Subject</option>
																<option value="content">Content</option>
																<option value="category">Category</option>
															</select>
															<select
																value={condition.operator}
																onChange={(e) => setRules(prev => 
																	prev.map(r => r.id === selectedRule.id 
																		? { ...r, conditions: r.conditions.map((c, j) => 
																			j === i ? { ...c, operator: e.target.value as any } : c
																		)}
																		: r
																	)
																)}
																className="rounded-md border bg-background px-2 py-1 text-sm"
															>
																<option value="contains">Contains</option>
																<option value="equals">Equals</option>
																<option value="startsWith">Starts with</option>
																<option value="endsWith">Ends with</option>
																<option value="matches">Matches</option>
															</select>
															<input
																type="text"
																value={condition.value}
																onChange={(e) => setRules(prev => 
																	prev.map(r => r.id === selectedRule.id 
																		? { ...r, conditions: r.conditions.map((c, j) => 
																			j === i ? { ...c, value: e.target.value } : c
																		)}
																		: r
																	)
																)}
																className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
																placeholder="Value"
															/>
															<button
																onClick={() => setRules(prev => 
																	prev.map(r => r.id === selectedRule.id 
																		? { ...r, conditions: r.conditions.filter((_, j) => j !== i) }
																		: r
																	)
																)}
																className="rounded-md p-1 text-destructive hover:bg-destructive/10"
															>
																×
															</button>
														</div>
													))}
													<button
														onClick={() => setRules(prev => 
															prev.map(r => r.id === selectedRule.id 
																? { ...r, conditions: [...r.conditions, {
																	type: "subject",
																	operator: "contains",
																	value: ""
																}]}
																: r
															)
														)}
														className="text-sm text-primary hover:underline"
													>
														+ Add Condition
													</button>
												</div>
											</div>
											<div>
												<label className="mb-1.5 block font-medium text-sm">
													Actions
												</label>
												<div className="space-y-2">
													{selectedRule.actions.map((action, i) => (
														<div key={i} className="flex gap-2">
															<select
																value={action.type}
																onChange={(e) => setRules(prev => 
																	prev.map(r => r.id === selectedRule.id 
																		? { ...r, actions: r.actions.map((a, j) => 
																			j === i ? { ...a, type: e.target.value as any } : a
																		)}
																		: r
																	)
																)}
																className="rounded-md border bg-background px-2 py-1 text-sm"
															>
																<option value="label">Label</option>
																<option value="archive">Archive</option>
																<option value="move">Move to</option>
																<option value="forward">Forward to</option>
																<option value="delete">Delete</option>
																<option value="markRead">Mark as read</option>
															</select>
															<input
																type="text"
																value={action.value}
																onChange={(e) => setRules(prev => 
																	prev.map(r => r.id === selectedRule.id 
																		? { ...r, actions: r.actions.map((a, j) => 
																			j === i ? { ...a, value: e.target.value } : a
																		)}
																		: r
																	)
																)}
																className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
																placeholder="Value"
															/>
															<button
																onClick={() => setRules(prev => 
																	prev.map(r => r.id === selectedRule.id 
																		? { ...r, actions: r.actions.filter((_, j) => j !== i) }
																		: r
																	)
																)}
																className="rounded-md p-1 text-destructive hover:bg-destructive/10"
															>
																×
															</button>
														</div>
													))}
													<button
														onClick={() => setRules(prev => 
															prev.map(r => r.id === selectedRule.id 
																? { ...r, actions: [...r.actions, {
																	type: "label",
																	value: ""
																}]}
																: r
															)
														)}
														className="text-sm text-primary hover:underline"
													>
														+ Add Action
													</button>
												</div>
											</div>
										</div>
									) : (
										<div className="space-y-4">
											<div>
												<label className="mb-1.5 block font-medium text-sm">
													Create Rule from Prompt
												</label>
												<textarea
													className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[200px] resize-none"
													placeholder="Describe the rule you want to create. For example: 'Automatically archive all newsletters and label them as Newsletter'"
													onChange={(e) => {
														const prompt = e.target.value
														if (prompt) {
															// Here you would typically call an API to generate the rule
															// For now, we'll just create a basic rule
															const newRule: Rule = {
																id: rules.length + 1,
																name: "Rule from Prompt",
																description: prompt,
																conditions: [],
																actions: [],
																priority: rules.length + 1,
																isEnabled: true,
																createdAt: new Date().toISOString(),
																lastModified: new Date().toISOString(),
																lastTriggered: null,
																triggerCount: 0
															}
															setRules(prev => [...prev, newRule])
															setSelectedRule(newRule)
														}
													}}
												/>
											</div>
											<div className="flex justify-end">
												<button
													onClick={handleCreateRule}
													className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
												>
													Create Empty Rule
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Test Rules Modal */}
				{showTestModal && (
					<div 
						className="fixed inset-0 flex items-center justify-center transition-all duration-[400ms] ease-out"
						style={{ 
							opacity: isTestModalVisible ? 1 : 0,
							pointerEvents: isTestModalVisible ? 'auto' : 'none',
							backgroundColor: isTestModalVisible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
							backdropFilter: isTestModalVisible ? 'blur(4px)' : 'blur(0px)',
						}}
					>
						<div 
							className="w-[800px] rounded-lg bg-background p-6 shadow-xl transition-all duration-[400ms] ease-out"
							style={{
								transform: isTestModalVisible 
									? 'translate(-50%, -50%) scale(1)' 
									: 'translate(-50%, -50%) scale(0.95)',
								opacity: isTestModalVisible ? 1 : 0,
								transformOrigin: 'center',
								position: 'absolute',
								left: '50%',
								top: '50%',
							}}
						>
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-lg">Test Rules</h2>
								<button
									onClick={handleCloseTestModal}
									className="rounded-md p-1 hover:bg-accent transition-colors duration-200"
								>
									<span className="text-lg">×</span>
								</button>
							</div>
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-4">
										<div>
											<label className="mb-1.5 block font-medium text-sm">
												Select Rule
											</label>
											<select
												value={selectedRule?.id || ""}
												onChange={(e) => setSelectedRule(rules.find(r => r.id === Number(e.target.value)) || null)}
												className="w-full rounded-md border bg-background px-3 py-2 text-sm"
											>
												<option value="">Select a rule to test</option>
												{rules.map(rule => (
													<option key={rule.id} value={rule.id}>
														{rule.name}
													</option>
												))}
											</select>
										</div>
										<div>
											<label className="mb-1.5 block font-medium text-sm">
												Select Emails
											</label>
											<div className="max-h-[300px] space-y-2 overflow-y-auto">
												{getAllEmails().map(email => (
													<label
														key={email.id}
														className="flex items-center gap-2 rounded-lg border p-2 hover:bg-accent/50"
													>
														<input
															type="checkbox"
															checked={selectedEmails.includes(email.id)}
															onChange={(e) => setSelectedEmails(prev => 
																e.target.checked
																	? [...prev, email.id]
																	: prev.filter(id => id !== email.id)
															)}
															className="rounded border-input"
														/>
														<div className="flex-1 min-w-0">
															<div className="truncate font-medium">
																{email.subject}
															</div>
															<div className="truncate text-sm text-muted-foreground">
																{email.sender}
															</div>
														</div>
													</label>
												))}
											</div>
										</div>
										<button
											onClick={() => selectedRule && handleTestRule(selectedRule, selectedEmails)}
											disabled={!selectedRule || selectedEmails.length === 0}
											className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Test Rule
										</button>
									</div>
									<div className="space-y-4">
										<h3 className="font-medium text-sm">Test Results</h3>
										<div className="space-y-4 max-h-[400px] overflow-y-auto">
											{testResults.map((result, i) => {
												const email = getAllEmails().find(e => e.id === result.emailId)
												if (!email) return null

												return (
													<div
														key={i}
														className={`rounded-lg border p-3 ${
															result.matched ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'
														}`}
													>
														<div className="flex items-center justify-between">
															<span className="font-medium">{email.subject}</span>
															<span className={`text-xs ${
																result.matched ? 'text-green-500' : 'text-red-500'
															}`}>
																{result.matched ? 'Matched' : 'Not Matched'}
															</span>
														</div>
														<div className="mt-2 space-y-2">
															<div className="text-sm">
																<span className="font-medium">Conditions:</span>
																<ul className="mt-1 space-y-1">
																	{result.matchedConditions.map((condition, j) => (
																		<li
																			key={j}
																			className={`flex items-center gap-2 ${
																				condition.matched ? 'text-green-500' : 'text-red-500'
																			}`}
																		>
																			<span>{condition.matched ? '✓' : '×'}</span>
																			<span>{condition.condition}</span>
																		</li>
																	))}
																</ul>
															</div>
															{result.matched && (
																<div className="text-sm">
																	<span className="font-medium">Actions:</span>
																	<ul className="mt-1 space-y-1">
																		{result.actions.map((action, j) => (
																			<li key={j} className="flex items-center gap-2">
																				<span>•</span>
																				<span>{action.action}: {action.value}</span>
																			</li>
																		))}
																	</ul>
																</div>
															)}
														</div>
													</div>
												)
											})}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* History Modal */}
				{showHistoryModal && (
					<div 
						className="fixed inset-0 flex items-center justify-center transition-all duration-[400ms] ease-out"
						style={{ 
							opacity: isHistoryModalVisible ? 1 : 0,
							pointerEvents: isHistoryModalVisible ? 'auto' : 'none',
							backgroundColor: isHistoryModalVisible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
							backdropFilter: isHistoryModalVisible ? 'blur(4px)' : 'blur(0px)',
						}}
					>
						<div 
							className="w-[800px] rounded-lg bg-background p-6 shadow-xl transition-all duration-[400ms] ease-out"
							style={{
								transform: isHistoryModalVisible 
									? 'translate(-50%, -50%) scale(1)' 
									: 'translate(-50%, -50%) scale(0.95)',
								opacity: isHistoryModalVisible ? 1 : 0,
								transformOrigin: 'center',
								position: 'absolute',
								left: '50%',
								top: '50%',
							}}
						>
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-lg">AI Action History</h2>
								<button
									onClick={handleCloseHistoryModal}
									className="rounded-md p-1 hover:bg-accent transition-colors duration-200"
								>
									<span className="text-lg">×</span>
								</button>
							</div>
							<div className="space-y-4">
								<div className="space-y-4 max-h-[500px] overflow-y-auto">
									{aiActions.map(action => (
										<div
											key={action.id}
											className="rounded-lg border p-4"
										>
											<div className="flex items-center justify-between">
												<div>
													<span className="font-medium">{action.emailSubject}</span>
													<span className="ml-2 text-sm text-muted-foreground">
														from {action.emailSender}
													</span>
												</div>
												<span className="text-xs text-muted-foreground">
													{new Date(action.timestamp).toLocaleString()}
												</span>
											</div>
											<div className="mt-2 flex items-center gap-2">
												<span className={`rounded-full px-2 py-0.5 text-xs ${
													action.type === 'rule_applied'
														? 'bg-blue-500/10 text-blue-500'
														: action.type === 'draft_created'
														? 'bg-green-500/10 text-green-500'
														: 'bg-purple-500/10 text-purple-500'
												}`}>
													{action.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
												</span>
												{action.ruleName && (
													<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
														Rule: {action.ruleName}
													</span>
												)}
											</div>
											<div className="mt-2 space-y-1">
												{action.details.map((detail, i) => (
													<div
														key={i}
														className="flex items-center gap-2 text-sm"
													>
														<span className="text-muted-foreground">
															{detail.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
														</span>
														<span>{detail.value}</span>
														{detail.confidence && (
															<span className="text-xs text-muted-foreground">
																({Math.round(detail.confidence * 100)}% confidence)
															</span>
														)}
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* AI Chat Popup */}
				{!isChatOpen && (
					<button
						onClick={toggleChat}
						className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center z-50"
					>
						<MessageCircle className="h-6 w-6" />
					</button>
				)}

				{isChatOpen && (
					<div 
						className={`fixed bottom-6 right-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 transition-all duration-300 ${
							isChatMinimized 
								? 'w-80 h-16' 
								: 'w-96 h-[32rem]'
						}`}
					>
						{/* Chat Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
							<div className="flex items-center gap-2">
								<div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
									<MessageCircle className="h-4 w-4 text-white" />
								</div>
								<div>
									<h3 className="font-semibold text-sm">AI Assistant</h3>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{isStreaming ? 'Typing...' : 'Online'}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<button
									onClick={toggleChat}
									className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
								>
									<Minus className="h-4 w-4" />
								</button>
								<button
									onClick={closeChat}
									className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						</div>

						{!isChatMinimized && (
							<>
								{/* Chat Messages */}
								<div 
									ref={chatMessagesRef}
									className="flex-1 overflow-y-auto p-4 space-y-4 h-80"
								>
									{messages.length === 0 && (
										<div className="text-center text-gray-500 dark:text-gray-400 text-sm">
											<MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
											<p>Start a conversation with your AI assistant</p>
										</div>
									)}
									{messages.map((message) => (
										<div
											key={message.id}
											className={`flex ${
												message.role === 'user' ? 'justify-end' : 'justify-start'
											}`}
										>
											<div
												className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
													message.role === 'user'
														? 'bg-blue-500 text-white'
														: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
												}`}
											>
												{message.content}
												{message.role === 'assistant' && isStreaming && message.content === '' && (
													<div className="flex items-center gap-1">
														<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
														<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
														<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
													</div>
												)}
											</div>
										</div>
									))}
								</div>

								{/* Chat Input */}
								<div className="p-4 border-t border-gray-200 dark:border-gray-700">
									<div className="flex items-center gap-2">
										<input
											type="text"
											value={currentMessage}
											onChange={(e) => setCurrentMessage(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && !e.shiftKey) {
													e.preventDefault()
													handleSendMessage()
												}
											}}
											placeholder="Type your message..."
											className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
											disabled={isStreaming}
										/>
										<button
											onClick={handleSendMessage}
											disabled={!currentMessage.trim() || isStreaming}
											className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											<Send className="h-4 w-4" />
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
