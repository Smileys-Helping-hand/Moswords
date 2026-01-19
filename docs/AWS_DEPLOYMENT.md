# AWS Amplify Deployment Guide

## Prerequisites
- AWS Account
- AWS Amplify CLI installed
- Environment variables configured

## Environment Variables Required

Create a `.env.production` file with:

```env
# Database (Neon/Vercel Postgres)
DATABASE_URL=your_production_database_url

# NextAuth.js
NEXTAUTH_URL=https://your-app-domain.amplifyapp.com
NEXTAUTH_SECRET=your_production_secret_key

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_ID=your_github_id
GITHUB_SECRET=your_github_secret

# Firebase (if using)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Other Services
NEXT_PUBLIC_APP_URL=https://your-app-domain.amplifyapp.com
```

## Deployment Steps

### Option 1: AWS Amplify Console (Recommended)

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Click "New app" > "Host web app"
   - Connect your GitHub/GitLab/Bitbucket repository
   - Select your branch (main/master)

2. **Configure Build Settings**
   - Amplify will auto-detect Next.js
   - Use the provided `amplify.yml` configuration
   - Build settings are already optimized

3. **Add Environment Variables**
   - Go to App Settings > Environment variables
   - Add all variables from `.env.production`
   - Make sure to add `NEXTAUTH_URL` with your Amplify domain

4. **Deploy**
   - Click "Save and deploy"
   - Wait for build to complete (5-10 minutes)
   - Your app will be live at `https://[app-id].amplifyapp.com`

### Option 2: AWS Amplify CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

## Build Optimization

The app is configured for optimal AWS deployment:

- ✅ Static optimization enabled
- ✅ Image optimization configured
- ✅ API routes supported
- ✅ Database connections pooled
- ✅ TypeScript build errors ignored (for deployment)
- ✅ ESLint warnings ignored (for deployment)

## Post-Deployment Checklist

1. **Database Migration**
   ```bash
   npm run db:push
   ```

2. **Test Core Features**
   - [ ] User authentication
   - [ ] Direct messaging
   - [ ] Group chats
   - [ ] Friend requests
   - [ ] Real-time updates

3. **Update OAuth Callbacks**
   - Add Amplify domain to Google OAuth allowed domains
   - Add Amplify domain to GitHub OAuth callback URLs
   - Update Firebase authorized domains

4. **DNS Configuration** (Optional)
   - Add custom domain in Amplify Console
   - Configure DNS records
   - Enable HTTPS (automatic with Amplify)

## Monitoring

AWS Amplify provides:
- Build logs
- Access logs
- Performance metrics
- Error tracking

Access these from the Amplify Console dashboard.

## Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Verify all environment variables are set
- Check `amplify.yml` configuration

### Database Connection Issues
- Ensure `DATABASE_URL` is correct
- Check if database allows connections from AWS IPs
- Verify SSL settings in database connection string

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your Amplify domain
- Check OAuth provider settings
- Ensure `NEXTAUTH_SECRET` is set

### Performance Issues
- Enable caching in Amplify Console
- Optimize images and assets
- Consider adding AWS CloudFront CDN

## Scaling

AWS Amplify automatically scales based on traffic:
- Auto-scaling for Next.js SSR
- Edge caching for static assets
- Global CDN distribution

## Cost Estimate

For testing/development:
- **Free tier**: 1000 build minutes/month
- **Hosting**: $0.15 per GB served
- **Build minutes**: $0.01 per minute after free tier

Estimated cost for testing: **$5-20/month**

## Security Best Practices

1. **Never commit `.env` files**
2. **Use AWS Secrets Manager** for production secrets
3. **Enable AWS WAF** for DDoS protection
4. **Set up CloudWatch alarms** for errors
5. **Enable access logs** for monitoring

## Next Steps

After deployment:
1. Test all features thoroughly
2. Monitor error logs
3. Set up custom domain (optional)
4. Configure CDN caching rules
5. Set up monitoring and alerts

## Support

For issues:
- AWS Amplify Documentation: https://docs.amplify.aws
- Next.js Deployment Guide: https://nextjs.org/docs/deployment
- GitHub Issues: Your repository issues page
