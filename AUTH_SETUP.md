# Authentication System Documentation

## Overview

This Next.js application now includes a complete authentication system with registration, login, and logout functionality. The authentication state is managed using React Context and persists user sessions in localStorage.

**IMPORTANT SECURITY NOTE**: This is a demonstration implementation only. Storing authentication data in localStorage with client-side password hashing is NOT secure for production use. This approach is suitable for prototypes, demos, and learning purposes only.

## Architecture

### Components Created

1. **Auth Context** (`/contexts/auth-context.tsx`)
   - Manages global authentication state
   - Provides `login()`, `register()`, and `logout()` functions
   - Handles localStorage persistence
   - Exposes `user` object and `isLoading` state

2. **Login Page** (`/app/login/page.tsx`)
   - Email and password form
   - Form validation using react-hook-form and zod
   - Error handling and loading states
   - Link to registration page

3. **Register Page** (`/app/register/page.tsx`)
   - Email, password, and confirm password form
   - Password matching validation
   - Form validation using react-hook-form and zod
   - Link to login page

4. **Protected Main App** (`/app/page.tsx`)
   - Automatically redirects unauthenticated users to login
   - Displays user email in header
   - Logout button with icon

5. **Layout Updates** (`/app/layout.tsx`)
   - Wraps entire app with AuthProvider
   - Makes auth state available throughout the app

## How It Works

### Authentication Flow

```
1. User visits the app (/)
   ↓
2. AuthContext checks localStorage for existing session
   ↓
3. If no session found → Redirect to /login
   ↓
4. User can choose to:
   - Login with existing credentials
   - Register a new account
   ↓
5. On successful auth → Redirect to main app (/)
   ↓
6. Main app displays with user info and logout button
   ↓
7. User clicks logout → Clear session → Redirect to /login
```

### Data Storage

**localStorage keys used:**
- `ordertaker_users`: JSON object storing all registered users
  ```json
  {
    "user@example.com": {
      "email": "user@example.com",
      "password": "hashed_password"
    }
  }
  ```
- `ordertaker_current_user`: JSON object storing current logged-in user
  ```json
  {
    "email": "user@example.com"
  }
  ```

### Form Validation

Both login and register forms use:
- **react-hook-form**: Form state management and submission
- **zod**: Schema validation with TypeScript types
- **@hookform/resolvers/zod**: Integration between the two

**Validation rules:**
- Email: Must be valid email format
- Password: Minimum 6 characters
- Confirm Password: Must match password field

## Testing the Feature

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Register a New Account

1. Visit `http://localhost:3000`
2. You'll be redirected to `http://localhost:3000/login`
3. Click "Sign up" link at the bottom
4. Fill in the registration form:
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
5. Click "Create account"
6. You'll be automatically logged in and redirected to the main app

### 3. Test the Main App

1. You should now see:
   - Order Taker and Crew Dashboard navigation buttons
   - Your email (`test@example.com`) in the top right
   - A "Logout" button
2. Use the app normally (create orders, view dashboard, etc.)
3. Your authentication state persists across page refreshes

### 4. Test Logout

1. Click the "Logout" button in the top right
2. You'll be logged out and redirected to the login page
3. Try visiting `http://localhost:3000` directly - you'll be redirected to login

### 5. Test Login with Existing Account

1. At the login page, enter your credentials:
   - Email: `test@example.com`
   - Password: `password123`
2. Click "Sign in"
3. You'll be logged in and redirected to the main app

### 6. Test Validation Errors

**Registration page:**
- Try submitting with invalid email: `"not-an-email"` → Shows validation error
- Try password less than 6 chars: `"123"` → Shows validation error
- Try mismatched passwords → Shows validation error
- Try registering same email twice → Shows "User already exists" error

**Login page:**
- Try wrong password → Shows "Invalid email or password" error
- Try non-existent email → Shows "Invalid email or password" error

## Code Structure

```
/home/john/projects/ordertakerapp/
├── contexts/
│   └── auth-context.tsx          # Auth state management & localStorage logic
├── app/
│   ├── layout.tsx                # Wraps app with AuthProvider
│   ├── page.tsx                  # Protected main app with logout button
│   ├── login/
│   │   └── page.tsx              # Login form
│   └── register/
│       └── page.tsx              # Registration form
```

## Using Auth in Other Components

To access auth state in any component:

```tsx
"use client"

import { useAuth } from "@/contexts/auth-context"

export function MyComponent() {
  const { user, isLoading, login, register, logout } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Not authenticated</div>
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## Security Considerations for Production

This implementation is **NOT production-ready**. For a real application, you should:

### Backend Requirements
1. **Never store passwords in localStorage or any client-side storage**
2. **Use a secure backend API** (Node.js/Express, Next.js API routes, etc.)
3. **Hash passwords server-side** using bcrypt or argon2
4. **Store user data in a secure database** (PostgreSQL, MongoDB, etc.)
5. **Implement rate limiting** to prevent brute force attacks
6. **Use HTTPS** for all communications

### Authentication Best Practices
1. **Use JWT tokens** or session cookies for authentication
2. **Implement refresh tokens** for long-lived sessions
3. **Use HTTP-only cookies** to prevent XSS attacks
4. **Implement CSRF protection**
5. **Add email verification** for new accounts
6. **Implement password reset** functionality
7. **Add 2FA/MFA** for sensitive operations
8. **Log authentication events** for security monitoring

### What This Demo Does Right
- Proper separation of concerns (context, hooks, components)
- Form validation on the client-side
- Loading and error states
- Consistent UI/UX patterns
- Clear user feedback
- TypeScript for type safety

## Future Enhancements (For Production)

If you want to make this production-ready, consider:

1. **Add a backend API** (e.g., Next.js API routes or separate Express server)
2. **Use a database** (PostgreSQL with Prisma, MongoDB with Mongoose)
3. **Implement proper token-based auth** (JWT with refresh tokens)
4. **Add email verification**
5. **Add password reset functionality**
6. **Implement role-based access control** (admin, user, crew, etc.)
7. **Add session management** (view active sessions, logout all devices)
8. **Add activity logs** (login history, security events)
9. **Implement OAuth** (Google, GitHub, etc.)
10. **Add rate limiting and brute force protection**

## Troubleshooting

### "User already exists" error
- Clear localStorage: Open browser DevTools → Application/Storage → localStorage → Delete `ordertaker_users`

### Stuck at login page
- Check browser console for errors
- Clear localStorage and refresh

### Changes not persisting
- Ensure you're not in incognito/private browsing mode
- Check that localStorage is enabled in your browser

### TypeScript errors
- Run `npm run build` to check for type errors
- Ensure all dependencies are installed: `npm install`

## Dependencies Used

- `react-hook-form`: Form state management
- `zod`: Schema validation
- `@hookform/resolvers/zod`: Integration between react-hook-form and zod
- `next/navigation`: Client-side routing (useRouter)
- `lucide-react`: Icons (LogOut icon)
- `shadcn/ui`: UI components (Button, Input, Card, Label, Alert)

All dependencies were already installed in the project.
