# Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Variables
Ensure these environment variables are set in your production environment:

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL database connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production domain (e.g., https://yourdomain.com)

**Optional:**
- `GOOGLE_GENAI_API_KEY` - For AI features

### 2. Database Setup
1. Run migrations:
   ```bash
   npm run db:push
   ```

2. (Optional) Seed the database:
   ```bash
   npm run db:seed
   ```

### 3. Build Test
Test the production build locally:
```bash
npm run build
npm start
```

## Common Issues

### Server Error on Login
**Causes:**
- Missing `NEXTAUTH_SECRET` in production
- Missing `DATABASE_URL` in production
- Database not migrated

**Solutions:**
1. Verify all environment variables are set
2. Check database connection is working
3. Ensure migrations are run
4. Check production logs for specific errors

### Database Connection Issues
- Verify `DATABASE_URL` format matches Neon requirements
- Check Neon database is active and accessible
- Verify IP restrictions if any

## Deployment Steps

1. Commit all changes:
   ```bash
   git add .
   git commit -m "Deploy: Production-ready authentication"
   git push origin main
   ```

2. Configure environment variables in your hosting platform

3. Deploy to your platform (Vercel, AWS, Firebase Hosting, etc.)

4. Run database migrations if needed

5. Test login functionality

## Notes
- The app uses NextAuth with credentials provider
- Database: Neon PostgreSQL via Drizzle ORM
- Auth is JWT-based (no database sessions)
- Google Sign-In is disabled (can be enabled later)
