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