# Deployment Checklist for AWS Amplify

## Pre-Deployment

### Code Preparation
- [x] Fix Next.js 15 async params issues
- [x] Remove duplicate message keys
- [x] Add message notifications
- [x] Test all core features locally
- [x] Run build without errors: `npm run build`
- [ ] Run TypeScript checks: `npm run type-check` (if available)
- [ ] Test database migrations: `npm run db:push`

### Environment Setup
- [ ] Create `.env.production` file
- [ ] Set `DATABASE_URL` for production database
- [ ] Generate new `NEXTAUTH_SECRET` (use: `openssl rand -base64 32`)
- [ ] Set `NEXTAUTH_URL` to your Amplify domain
- [ ] Configure OAuth provider credentials (if using)
- [ ] Set Firebase credentials (if using)

### Database Preparation
- [ ] Create production database (Neon/Vercel Postgres/Supabase)
- [ ] Run migrations on production database
- [ ] Test database connection
- [ ] Set up database backups
- [ ] Configure connection pooling

### Repository Setup
- [ ] Commit all changes to Git
- [ ] Push to GitHub/GitLab/Bitbucket
- [ ] Create a `main` or `production` branch
- [ ] Tag release version (e.g., `v1.0.0`)

## AWS Amplify Setup

### Console Configuration
- [ ] Sign in to AWS Console
- [ ] Go to AWS Amplify service
- [ ] Click "New app" > "Host web app"
- [ ] Connect your repository
- [ ] Select branch to deploy

### Build Settings
- [ ] Verify `amplify.yml` is detected
- [ ] Confirm Node.js version (18.x or higher)
- [ ] Set build timeout to 15 minutes minimum
- [ ] Enable live package updates

### Environment Variables
Add these in Amplify Console > Environment variables:
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `GOOGLE_CLIENT_ID` (if using)
- [ ] `GOOGLE_CLIENT_SECRET` (if using)
- [ ] `GITHUB_ID` (if using)
- [ ] `GITHUB_SECRET` (if using)
- [ ] `NEXT_PUBLIC_FIREBASE_*` (all Firebase vars)
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NODE_ENV=production`

### Advanced Settings
- [ ] Enable automatic builds on push
- [ ] Enable pull request previews (optional)
- [ ] Set up custom domain (optional)
- [ ] Configure redirects (if needed)

## Deployment

### Initial Deploy
- [ ] Click "Save and deploy"
- [ ] Monitor build logs
- [ ] Wait for deployment (5-10 minutes)
- [ ] Note the Amplify URL

### Post-Deploy Database
- [ ] Connect to production database
- [ ] Run migrations if not automatic
- [ ] Verify tables are created
- [ ] Check indexes and constraints

### OAuth Configuration
- [ ] Update Google OAuth authorized domains
  - Add: `your-app-id.amplifyapp.com`
- [ ] Update GitHub OAuth callback URLs
  - Add: `https://your-app-id.amplifyapp.com/api/auth/callback/github`
- [ ] Update Firebase authorized domains
  - Add: `your-app-id.amplifyapp.com`

## Testing

### Core Features Test
- [ ] User registration
- [ ] User login
- [ ] Password reset (if applicable)
- [ ] OAuth login (Google, GitHub)
- [ ] User profile update

### Messaging Features Test
- [ ] Send direct message
- [ ] Receive direct message
- [ ] Create group chat
- [ ] Send group message
- [ ] Add friend request
- [ ] Accept friend request
- [ ] Message notifications

### Performance Test
- [ ] Page load speed (< 3 seconds)
- [ ] Image loading
- [ ] API response times
- [ ] Real-time updates working
- [ ] Mobile responsiveness

### Error Handling Test
- [ ] 404 pages work
- [ ] 500 error handling
- [ ] Network error handling
- [ ] Form validation
- [ ] Toast notifications

## Monitoring Setup

### AWS CloudWatch
- [ ] Enable CloudWatch logs
- [ ] Set up error alerts
- [ ] Configure performance alarms
- [ ] Set up daily summary emails

### Application Monitoring
- [ ] Check build history
- [ ] Monitor access logs
- [ ] Review error logs
- [ ] Check performance metrics

## Security Hardening

### Headers & Security
- [ ] Enable HTTPS (automatic with Amplify)
- [ ] Configure CORS properly
- [ ] Set security headers
- [ ] Enable rate limiting (if needed)

### Access Control
- [ ] Set up IAM roles properly
- [ ] Configure minimal permissions
- [ ] Enable CloudTrail logging
- [ ] Set up AWS WAF (optional)

## Optimization

### Performance
- [ ] Enable Amplify caching
- [ ] Optimize images (WebP, compression)
- [ ] Minimize bundle size
- [ ] Enable gzip compression

### Database
- [ ] Set up connection pooling
- [ ] Enable query caching
- [ ] Add database indexes
- [ ] Monitor query performance

## Documentation

### Update Documentation
- [ ] Update README with deployment URL
- [ ] Document environment variables
- [ ] Add troubleshooting guide
- [ ] Create user guide

### Team Communication
- [ ] Share deployment URL with team
- [ ] Document any known issues
- [ ] Create support channels
- [ ] Set up feedback mechanism

## Maintenance Plan

### Regular Tasks
- [ ] Set up automatic backups
- [ ] Schedule database maintenance
- [ ] Plan for updates and patches
- [ ] Create rollback procedure

### Monitoring Schedule
- [ ] Daily: Check error logs
- [ ] Weekly: Review performance metrics
- [ ] Monthly: Audit security settings
- [ ] Quarterly: Cost analysis

## Rollback Plan

### If Issues Occur
- [ ] Document rollback procedure
- [ ] Keep previous version accessible
- [ ] Test rollback in staging (if available)
- [ ] Have emergency contacts ready

## Success Criteria

### Launch Ready When:
- [ ] All tests pass
- [ ] No critical errors in logs
- [ ] Performance meets targets
- [ ] Security audit complete
- [ ] Documentation updated
- [ ] Team trained on new features

## Post-Launch

### Week 1
- [ ] Monitor closely for errors
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Update documentation based on feedback

### Month 1
- [ ] Analyze usage patterns
- [ ] Optimize based on real data
- [ ] Plan feature updates
- [ ] Review costs and optimize

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Deployment URL**: _________________

**Issues Encountered**: _________________

**Notes**: _________________
