# **Boxy**  
### Your inbox, ready before you wake.


##  Features

- **Gmail Integration**: Seamless OAuth integration with Gmail API
- **AI Chat Assistant**: Chat with AI about your emails - ask for summaries, find urgent messages, and get insights
- **Email Summarization**: AI-powered email analysis and categorization
- **Label Management**: Automatic and manual email labeling
- **Draft Generation**: AI-generated email draft responses
- **Real-time Processing**: Live email fetching and processing
- **Multi-platform**: Web, mobile (React Native), and documentation


---

![inbox-flux-demo2-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/9ca9b9ab-db4f-4496-8fbd-4935f7768c3e) 
Auto Draft Generation 
![MyMovie2-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/a97761fc-463a-467f-a3de-664e9e024f80)
Smart Labeling
---

##  Project Structure

```
apps/
├── web/          # React/Vite frontend application
├── server/       # Hono backend with tRPC API
├── native/       # React Native/Expo mobile app
└── docs/         # Astro documentation site
```

## 🛠️ Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (package manager)
- **Google Cloud Platform** account
- **OpenAI** account and API key

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd inbie
pnpm install
```

### 2. Google Cloud Setup

#### Create a New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to **APIs & Services** > **Library**
   - Search for "Gmail API" and enable it

#### Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - **App name**: Inbie Email Assistant
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/contacts`
5. Add test users (your Gmail address)

#### Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Configure:
   - **Name**: Inbie Web Client
   - **Authorized JavaScript origins**: `http://localhost:3001`
   - **Authorized redirect URIs**: `http://localhost:3001`
5. Download the JSON file and note the Client ID and Client Secret

### 3. Environment Configuration

#### Server Environment (.env in `apps/server/`)
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database (if using)
DATABASE_URL=your_database_url

# Server Configuration
PORT=3000
NODE_ENV=development
```

#### Web Environment (.env in `apps/web/`)
```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_SERVER_URL=http://localhost:3000

# Google OAuth (same as server)
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 4. Start Development

#### Terminal 1 - Start Server
```bash
cd apps/server
pnpm run dev
```

#### Terminal 2 - Start Web App
```bash
cd apps/web
pnpm run dev
```

#### Terminal 3 - Start Mobile App (Optional)
```bash
cd apps/native
pnpm run dev
```

### 5. Access the Application

- **Web App**: http://localhost:3001
- **Server API**: http://localhost:3000
- **Mobile App**: Follow Expo instructions in terminal

## 🔧 Detailed Configuration

### Gmail API Scopes Explained

| Scope | Purpose |
|-------|---------|
| `gmail.modify` | Read, compose, send, and permanently delete emails |
| `userinfo.email` | Access user's email address |
| `userinfo.profile` | Access basic profile information |
| `contacts` | Access contacts for email suggestions |

### OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to **API Keys**
4. Create a new secret key
5. Copy the key to your environment file

**Recommended Model**: GPT-4 (configured in the application)

### Database Setup (Optional)

The application can work with various databases. Current schema includes:
- User authentication
- Email metadata
- Labels and categories
- AI processing history

## 🤖 AI Chat Features

The AI chat assistant can:

### Email Queries
- **"Summarize my emails from today"** - Get a summary of today's emails
- **"Any urgent messages?"** - Find emails marked as urgent or important
- **"Who emailed me recently?"** - List recent senders
- **"What emails need my attention?"** - Identify actionable emails

### Smart Analysis
- Automatically categorizes emails (work, personal, marketing, etc.)
- Identifies urgent keywords (deadline, urgent, ASAP, etc.)
- Provides sentiment analysis
- Suggests appropriate labels

## 🚀 Deployment

### Server Deployment

**Recommended**: Vercel, Railway, or Heroku

```bash
# Build the server
cd apps/server
pnpm run build

# For production environment variables:
# Update Google OAuth redirect URIs to production domain
# Set NODE_ENV=production
```

### Web App Deployment

**Recommended**: Vercel, Netlify, or Cloudflare Pages

```bash
# Build the web app
cd apps/web
pnpm run build

# Update VITE_API_URL to production server URL
```

### Production OAuth Setup

1. Update OAuth redirect URIs in Google Cloud Console
2. Add production domain to authorized origins
3. Update environment variables with production URLs

## 🔍 Troubleshooting

### Common Issues

#### Gmail API "Access Blocked" Error
**Problem**: OAuth consent screen shows "This app is blocked"
**Solution**:
1. Ensure OAuth consent screen is properly configured
2. Add your email as a test user
3. Verify all required scopes are added
4. Check that Gmail API is enabled

#### "Invalid Client" Error
**Problem**: OAuth client configuration mismatch
**Solution**:
1. Verify `GOOGLE_CLIENT_ID` matches OAuth credentials
2. Check redirect URI matches exactly (`http://localhost:3001`)
3. Ensure credentials are for "Web application" type

#### AI Chat Not Working
**Problem**: Chat doesn't access email data
**Solution**:
1. Verify `OPENAI_API_KEY` is set correctly
2. Check that user is authenticated with Google
3. Ensure email permissions are granted
4. Check browser console for errors

#### Email Fetching Fails
**Problem**: Unable to fetch emails from Gmail
**Solution**:
1. Check Gmail API quota limits
2. Verify access token hasn't expired
3. Confirm `gmail.modify` scope is granted
4. Check server logs for detailed errors

### Development Tips

#### Testing OAuth Flow
1. Use incognito/private browser window
2. Clear browser cache and cookies
3. Test with different Google accounts
4. Check redirect URI configuration

#### Debugging Email Processing
1. Enable debug mode in email components
2. Check network tab for API calls
3. Monitor server logs for processing errors
4. Use Gmail API explorer for testing

##  API Endpoints

### Authentication
- `POST /auth/google` - Initiate Google OAuth
- `POST /auth/callback` - Handle OAuth callback
- `POST /auth/refresh` - Refresh access token

### Email Management
- `GET /api/emails` - Fetch recent emails
- `POST /api/emails/label` - Apply labels to emails
- `POST /api/emails/analyze` - AI analysis of emails
- `POST /api/draft/generate` - Generate AI draft response

### AI Chat
- `POST /api/chat` - Chat with AI assistant (includes email context)

## 📈 Performance Optimization

### Email Fetching
- Implement pagination for large email volumes
- Cache frequently accessed emails
- Use batch processing for label operations

### AI Processing
- Implement rate limiting for OpenAI API
- Cache AI responses for similar queries
- Use streaming for real-time chat experience

##  Security Considerations

### Data Protection
- Tokens stored securely in httpOnly cookies
- Email content is not permanently stored
- AI processing uses minimal necessary data

### Access Control
- OAuth scopes are minimally permissive
- User consent required for email access
- Refresh token rotation implemented

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Submit a pull request

##  License

[Your License Here]

##  Support

For issues and questions:
1. Check troubleshooting section above
2. Review server and browser console logs
3. Verify environment configuration
4. Check Google Cloud Console for quota/limits

##  Roadmap

- [ ] Enhanced email categorization
- [ ] Calendar integration
- [ ] Email templates
- [ ] Advanced search functionality
- [ ] Team collaboration features
- [ ] Mobile app completion

---

**Note**: This application requires careful setup of Google Cloud OAuth and OpenAI API. Follow the configuration steps precisely for the best experience. 
