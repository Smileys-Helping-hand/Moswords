# Local Development Setup Guide

## Prerequisites
- Node.js 18.17+ (LTS recommended)
- npm 9+ or yarn 1.22+
- PostgreSQL 14+ (for database)
- Git 2.30+

## Environment Setup

### 1. Create `.env.local` file
```bash
cp .env.example .env.local
```

### 2. Configure required variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/moswords

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# API Keys (optional for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Installation

```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Optional: Seed with sample data
npm run db:seed
```

## Development

### Start Dev Server
```bash
npm run dev
```

Server runs at: `http://localhost:3000`

### Code Quality Checks
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format  # if available
```

## Performance Optimization Tips

### 1. Local Development
- Use Chrome DevTools Performance tab to profile
- Check Network tab for slow requests
- Monitor React renders with React DevTools

### 2. Mobile Testing
```bash
# Test on mobile device
1. Get your machine IP: ipconfig getifaddr en0 (Mac) or ipconfig (Windows)
2. Access from mobile: http://YOUR_IP:3000
3. Test on various devices/orientations
```

### 3. Reduce Motion for Low-Power Devices
- Animations auto-disable on low-power devices
- Check `useDeviceOptimization()` hook
- Manually test: DevTools → Rendering → Emulate CSS media feature prefers-reduced-motion

### 4. Network Throttling
DevTools → Network → Throttling
- Test with: Slow 3G, Fast 3G, Offline
- Monitor for layout shifts and slow loads

## Database

### Reset Database
```bash
# Clear all data
npm run db:reset

# Migrate latest
npm run db:migrate

# Seed sample data
npm run db:seed
```

### Query Database
```bash
npm run db:studio
```

Opens Drizzle Studio at: `http://localhost:5555`

## Troubleshooting

### Port 3000 Already in Use
```bash
# macOS/Linux
lsof -ti :3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify database exists

### Slow Build
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check disk space and RAM

### Service Worker Issues
- Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Delete)
- Unregister old SW: DevTools → Application → Service Workers → Unregister
- Hard refresh: Ctrl+Shift+R or Cmd+Shift+R

## Performance Monitoring

### Built-in Monitoring
- `usePerformanceMonitor()` logs slow renders (dev only)
- `useNetworkMonitor()` tracks slow network requests
- `useDeviceOptimization()` detects device capabilities

### Enable Debug Mode
Add to `.env.local`:
```env
DEBUG=moswords:*
```

## Testing

### Device Simulation
DevTools → Device Toolbar (Ctrl+Shift+M)

Available presets:
- iPhone 12, 13, 14, 15
- iPad Pro
- Pixel 6, 7, 8
- Galaxy S21, S22

### Network Conditions
Test with throttling:
1. Offline (no connection)
2. Slow 3G (~400kbps)
3. Fast 3G (~1.6Mbps)
4. 4G (~4Mbps)

## Best Practices

1. **Always use `React.memo()` for frequently rendered components**
2. **Lazy load routes with dynamic imports**
3. **Use `useDeviceOptimization()` to disable animations on low-power devices**
4. **Monitor bundle size with next/bundle-analyzer**
5. **Test on real devices regularly**
6. **Profile performance in DevTools regularly**
7. **Keep components under 300-400 lines**
8. **Use error boundaries around major sections**

## Deployment Checklist

- [ ] All TypeScript errors resolved
- [ ] No console warnings/errors
- [ ] Tested on iOS Safari, Android Chrome
- [ ] PWA installable and works offline
- [ ] Performance budget met (LCP < 2.5s, CLS < 0.1)
- [ ] All images optimized
- [ ] Build time < 60 seconds
- [ ] Bundle size checked
- [ ] 404 pages handled gracefully
- [ ] Error boundaries in place
