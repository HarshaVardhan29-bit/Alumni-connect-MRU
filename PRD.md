# Product Requirements Document (PRD)
## AlumniAI — Manav Rachna University Alumni Network Platform

**Version:** 1.0  
**Platform:** Web Application  
**Stack:** React + Vite (Frontend), Node.js + Express (Backend), MongoDB (Database)  
**Ports:** Frontend — 5174, Backend — 5000

---

## 1. Product Overview

AlumniAI is a full-stack alumni networking platform built for Manav Rachna University (MRU). It connects students and alumni through AI-powered mentorship matching, real-time messaging, social feeds, groups, and communities. The platform has two separate portals: a user-facing portal (students & alumni) and an admin portal for platform management.

---

## 2. User Roles

### 2.1 Student
- Can register, log in, and access all user features
- Can browse alumni profiles and request mentorship
- Can post on the feed, join groups/communities, and send messages
- Cannot access admin panel

### 2.2 Alumni
- Same access as students plus ability to offer mentorship
- Can be matched with students via AI matching
- Has additional profile fields: company, designation, batch, skills

### 2.3 Admin
- Completely separate login at `/admin/login`
- Can manage users, mentorships, announcements, and view activity logs
- Uses a separate JWT secret for authentication

---

## 3. Authentication & Authorization

### 3.1 User Authentication
- Email/password registration and login with JWT tokens
- Google OAuth 2.0 login (`/auth/google/success` callback)
- Forgot password flow with email-based reset
- JWT stored in localStorage; protected routes redirect to `/login` if unauthenticated

### 3.2 Admin Authentication
- Separate login form at `/admin/login`
- Admin JWT stored as `adminToken` in localStorage
- All admin routes protected by `adminProtect` middleware
- Role check enforced server-side (`decoded.role === 'admin'`)

---

## 4. Core Features

### 4.1 Landing Page (`/`)
- Public-facing marketing page
- Links to login and register

### 4.2 Registration & Login (`/register`, `/login`)
- Email + password form
- Google OAuth option
- Role selection: Student or Alumni
- Form validation on both client and server

### 4.3 Dashboard (`/dashboard`)
- Personalized home screen after login
- Shows widgets: Weather, News, Jobs
- Displays announcements from admin
- Quick navigation to all features

### 4.4 Social Feed (`/feed`)
- Users can create posts with text and media (images/videos)
- Like, retweet/repost, and comment on posts
- Save posts for later (`/saved`)
- View individual post detail (`/post/:id`)
- Feed is paginated and sorted by recency

### 4.5 User Profiles (`/profile`, `/profile/:id`)
- View and edit own profile
- View other users' public profiles
- Profile fields: name, bio, industry, company, designation, batch, skills, career goals
- Avatar upload support

### 4.6 Explore (`/explore`)
- Browse and search all alumni and student profiles
- Filter by industry, skills, batch, company

### 4.7 AI Mentorship Matching (`/mentorship`)
- AI-powered matching between students and alumni based on skills, industry, and career goals
- Compatibility score displayed for each match
- Send and manage mentorship requests
- View active mentorship connections (`/mentorship/connections`)

### 4.8 Real-Time Messaging (`/messages`, `/messages/:id`)
- Message inbox listing all conversations
- Real-time chat using Socket.IO
- Message request system (users must accept before chatting)
- Support for text messages
- Video/audio call support via CallManager component

### 4.9 Groups & Communities (`/groups`, `/communities`)
- Create and join groups (project/interest-based) and communities (broader topics)
- Group messaging with real-time updates
- Group admin can manage members

### 4.10 Notifications (`/notifications`)
- Real-time notification bell in navbar
- Notification panel with unread count
- Notifications for: likes, comments, mentorship requests, messages, announcements

### 4.11 Analytics (`/analytics`)
- Personal analytics dashboard
- Stats on posts, connections, mentorship activity

### 4.12 Settings (`/settings`)
- Update profile information
- Change password
- Notification preferences
- Account management

---

## 5. Admin Portal

### 5.1 Admin Login (`/admin/login`)
- Separate login page for admin accounts
- Default credentials: `admin@mru.edu.in` / `Admin@2026!`

### 5.2 Admin Dashboard (`/admin/dashboard`)
- Overview stats: total users, active mentorships, recent activity

### 5.3 User Management (`/admin/users`)
- View all registered users (students and alumni)
- Activate/deactivate accounts
- Search and filter users

### 5.4 Mentorship Management (`/admin/mentorships`)
- View all mentorship connections
- Monitor active and pending mentorships

### 5.5 Announcements (`/admin/announcements`)
- Create and publish announcements to all users
- Announcements appear on user dashboards

### 5.6 Activity Logs (`/admin/logs`)
- View admin action logs for audit purposes

---

## 6. API Routes Summary

| Route Group | Base Path | Description |
|-------------|-----------|-------------|
| Auth | `/api/auth` | Register, login, Google OAuth, password reset |
| Users | `/api/users` | Profile CRUD, search, explore |
| Posts | `/api/posts` | Feed, create/like/comment/save posts |
| Mentorship | `/api/mentorship` | Requests, connections, AI matching |
| Messages | `/api/messages` | Conversations, send/receive messages |
| Message Requests | `/api/message-requests` | Accept/decline message requests |
| Groups | `/api/groups` | Create, join, manage groups & communities |
| Notifications | `/api/notifications` | Fetch and mark notifications |
| Analytics | `/api/analytics` | User stats and activity data |
| News | `/api/news` | External news feed for dashboard widget |
| Matches | `/api/matches` | AI-powered alumni-student matching |
| Admin | `/api/admin` | Admin-only user, mentorship, announcement, log management |

---

## 7. Real-Time Features (Socket.IO)

- Live chat messages in direct and group conversations
- Real-time notification delivery
- Online/offline user presence indicators
- Video/audio call signaling via CallManager

---

## 8. Demo Accounts (Seeded Data)

| Role | Email | Password |
|------|-------|----------|
| Student | `student@mru.edu.in` | `demo1234` |
| Alumni | `alumni@mru.edu.in` | `demo1234` |
| Alumni | `priya@mru.edu.in` | `demo1234` |
| Alumni | `rahul@mru.edu.in` | `demo1234` |
| Alumni | `ananya@mru.edu.in` | `demo1234` |
| Admin | `admin@mru.edu.in` | `Admin@2026!` |

---

## 9. Non-Functional Requirements

- **Security:** JWT authentication, bcrypt password hashing, Helmet.js headers, rate limiting on API routes, input validation via express-validator
- **Performance:** Vite-based frontend for fast builds, paginated API responses
- **Accessibility:** Semantic HTML, keyboard navigable UI
- **Scalability:** Modular Express routes, Mongoose models with indexing

---

## 10. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose ODM |
| Auth | JWT, bcryptjs, Passport.js (Google OAuth) |
| Real-time | Socket.IO |
| Email | Nodemailer |
| Security | Helmet, express-rate-limit, express-validator |
