# Gmail Integration

This project integrates Google OAuth 2.0 to access Gmail data, allowing users to:

1. Sign in with their Google account
2. Fetch and view their recent emails
3. View email content in a clean interface

## Prerequisites

You need to be a test user (luisanchez@berkeley.edu) as configured in the Google Cloud project.

## Setup and Running

1. Start the server:
```bash
# From project root
cd apps/server
bun run dev
```

2. In a new terminal, start the web application:
```bash
# From project root
cd apps/web
bun run dev
```

3. Open your browser and navigate to: http://localhost:3001

4. Click on the "Gmail" link in the navigation bar

## Usage

1. On the Gmail page, click "Sign In with Google"
2. Authorize the application when prompted by Google
3. After successful authorization, click "Fetch Recent Emails" to view your most recent emails
4. Click on any email in the list to view its full content

## Troubleshooting

- If you encounter authentication errors, try signing out and signing in again
- If emails fail to load, check the browser console for specific error messages
- Make sure you're using the authorized test account (luisanchez@berkeley.edu)

## Implementation Details

- The application uses Google's OAuth 2.0 for authentication
- The following scopes are requested:
  - https://www.googleapis.com/auth/userinfo.email
  - https://www.googleapis.com/auth/userinfo.profile
  - https://www.googleapis.com/auth/gmail.modify
  - https://www.googleapis.com/auth/contacts
- Email data is fetched via the Gmail API
- Access tokens are securely stored in browser localStorage

## Security Notes

- This implementation is for development purposes only
- In a production environment, you would need to:
  - Use secure storage for tokens
  - Implement refresh token rotation
  - Add additional security measures

## Technologies Used

- React + TypeScript
- TRPC for type-safe API calls
- Radix UI + Tailwind CSS for UI components
- Google OAuth 2.0 and Gmail API 

# Inbox Flux Web App

## Features

- Email management with Gmail integration
- AI-powered email categorization
- Rule-based email processing
- Email analytics
- AI draft generation for emails

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm (v7 or higher)
- OpenAI API Key (for AI features)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
pnpm install
```

4. Set up environment variables:

There are two ways to set up your OpenAI API key:

**Option 1: Using a `.env.local` file**

Create a `.env.local` file in the `apps/web` directory with the following content:

```
# OpenAI API key for generating email drafts
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

**Option 2: Using Node.js environment variables**

If you're running the app in a Node.js environment, you can also set the following environment variable:

```
OPENAI_API_KEY=your_openai_api_key_here
```

You can get your OpenAI API key from: https://platform.openai.com/account/api-keys

5. Start the development server:

```bash
pnpm dev
```

## AI Draft Generation

The app includes AI-powered draft generation for emails. This feature uses the OpenAI API to generate appropriate responses to emails.

To use this feature:
1. Ensure you have set up your OpenAI API key in the `.env.local` file
2. Select an email in the inbox
3. Click the "Generate AI Draft Reply" button
4. You can provide optional instructions to customize the generated draft
5. Use the generated draft as-is or edit it before sending 