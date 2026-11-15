# Saturday Karaoke Picker

A zero-database, AI-powered web app for generating and sharing Saturday karaoke song lists on WhatsApp.

## Folder Structure
- `index.html`: Mobile-responsive frontend with PIN screen, Kannada/Hindi language selector, filters, regenerate button, YouTube karaoke search links, and WhatsApp share button.
- `api/generate.js`: Vercel serverless backend that validates `GROUP_PIN` and fetches song recommendations using `GEMINI_API_KEY`.

## Deployment Steps (Vercel)
1. Upload the contents of `karaoke-app/` (`index.html` and the `api/` folder) to a GitHub repository.
2. Import the repository into [Vercel](https://vercel.com/).
3. Under **Settings > Environment Variables**, add:
   - `GEMINI_API_KEY`: Your free API key from Google AI Studio.
   - `GROUP_PIN`: Your chosen numeric PIN for group members (e.g., `1234`).
4. Deploy (or Redeploy) the project and share your live Vercel URL in your WhatsApp group.
