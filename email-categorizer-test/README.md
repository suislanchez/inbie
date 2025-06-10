# Email Categorizer Test

A minimal test implementation for email categorization using OpenAI.

## Features

- Categorizes emails as "reply" or "no_reply"
- Generates suggested replies for emails that need a response
- Provides confidence scores for categorizations
- Includes explanations for why an email was categorized a certain way

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   bun install
   ```
3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_key_here
   MODEL_NAME=gpt-4-turbo
   ```

## Running the Tests

Run the tests with:

```
bun test
```

## Running the Demo

Test with sample emails:

```
bun start
```

## Project Structure

- `src/types.ts`: Type definitions
- `src/config.ts`: Configuration settings
- `src/openai-client.ts`: OpenAI API integration
- `src/mock-data.ts`: Sample email data
- `src/index.ts`: Main entry point for testing
- `src/email-categorizer.test.ts`: Test suite

## Integration

After testing, this functionality can be integrated into the main project by:

1. Moving the relevant files to the appropriate location in the main project
2. Adapting the interface to work with the actual email data source
3. Implementing UI components to display the categorization results 