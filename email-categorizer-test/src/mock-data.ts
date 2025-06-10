import { Email } from "./types"

export const mockEmails: Email[] = [
  {
    id: "email-1",
    from: "client@example.com",
    to: "me@example.com",
    subject: "Meeting Request",
    body: "Hi,\n\nI'd like to schedule a meeting with you to discuss our upcoming project. Are you available next Tuesday at 2 PM?\n\nBest regards,\nClient",
    date: "2023-06-15T10:30:00Z"
  },
  {
    id: "email-2",
    from: "newsletter@company.com",
    to: "me@example.com",
    subject: "Weekly Newsletter: Top Industry News",
    body: "Our Weekly Newsletter\n\nHere are the top stories in your industry this week:\n- New regulations announced\n- Market trends update\n- Upcoming events\n\nTo unsubscribe, click here.",
    date: "2023-06-14T08:00:00Z"
  },
  {
    id: "email-3",
    from: "team@workspace.com",
    to: "me@example.com",
    subject: "Your colleague has shared a document with you",
    body: "Your colleague Alex has shared a document 'Q2 Report' with you. Click here to view it.\n\nThis is an automated message, please do not reply.",
    date: "2023-06-13T15:45:00Z"
  },
  {
    id: "email-4",
    from: "support@service.com",
    to: "me@example.com",
    subject: "Your support ticket #12345 has been resolved",
    body: "Dear Customer,\n\nYour recent support ticket (#12345) regarding login issues has been resolved. If you're still experiencing problems, please reopen the ticket by replying to this email.\n\nThank you for your patience,\nSupport Team",
    date: "2023-06-12T16:20:00Z"
  }
] 