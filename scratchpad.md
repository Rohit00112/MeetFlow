# MeetFlow Project Improvement Scratchpad

## Current State Analysis

The MeetFlow project is a meeting management application with basic user authentication functionality. The current implementation includes:

- User authentication (register, login, password reset)
- Basic user profile management
- UI for meeting page (non-functional)

## Database Schema Improvements

### Current Schema

```prisma
model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  password      String
  avatar        String?
  bio           String?   @db.Text
  phone         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model PasswordReset {
  id            String    @id @default(uuid())
  email         String
  token         String    @unique
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
}
```

### Missing Models

1. **Meeting Model**
   ```prisma
   model Meeting {
     id            String      @id @default(uuid())
     title         String
     description   String?     @db.Text
     startTime     DateTime
     endTime       DateTime
     meetingLink   String      @unique
     passcode      String?
     isRecurring   Boolean     @default(false)
     recurrenceRule String?
     createdBy     String
     host          User        @relation("MeetingHost", fields: [createdBy], references: [id], onDelete: Cascade)
     attendees     Attendee[]
     createdAt     DateTime    @default(now())
     updatedAt     DateTime    @updatedAt
   }
   ```

2. **Attendee Model**
   ```prisma
   model Attendee {
     id            String    @id @default(uuid())
     meetingId     String
     userId        String?
     email         String
     name          String?
     status        AttendeeStatus @default(PENDING)
     meeting       Meeting   @relation(fields: [meetingId], references: [id], onDelete: Cascade)
     user          User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt

     @@unique([meetingId, email])
   }
   ```

3. **AttendeeStatus Enum**
   ```prisma
   enum AttendeeStatus {
     PENDING
     ACCEPTED
     DECLINED
     TENTATIVE
   }
   ```

4. **Update User Model with Relations**
   ```prisma
   model User {
     // existing fields...
     hostedMeetings Meeting[]  @relation("MeetingHost")
     attendances   Attendee[]
   }
   ```

## Feature Improvements

### Core Meeting Functionality

1. **Meeting Creation**
   - Create meeting form with title, description, date/time, recurring options
   - Generate unique meeting links
   - Invite attendees via email

2. **Meeting Management**
   - View upcoming/past meetings
   - Edit meeting details
   - Cancel meetings
   - Send reminders

3. **Meeting Participation**
   - Join meeting via link
   - Video/audio controls
   - Screen sharing
   - Chat functionality

### User Experience

1. **Dashboard**
   - Overview of upcoming meetings
   - Quick join options
   - Meeting statistics

2. **Calendar Integration**
   - Sync with Google/Microsoft calendar
   - View meetings in calendar format
   - Export meetings to external calendars

3. **Notifications**
   - Email notifications for meeting invites/updates
   - Browser notifications for upcoming meetings
   - Meeting reminder settings

## Technical Improvements

1. **API Endpoints**
   - Create meeting API
   - Update meeting API
   - Get meetings API
   - Join meeting API
   - Attendee management APIs

2. **Real-time Communication**
   - Implement WebRTC for video/audio
   - Socket.io for real-time updates
   - Signaling server for peer connections

3. **Testing**
   - Unit tests for API endpoints
   - Integration tests for meeting flows
   - E2E tests for critical user journeys

## GitHub Branching Strategy

### Main Branches

- `main` - Production-ready code
- `develop` - Integration branch for features

### Feature Branches

1. `feature/database-schema-update`
   - Add Meeting and Attendee models
   - Update User model with relations

2. `feature/meeting-creation`
   - Meeting creation form
   - Meeting creation API

3. `feature/meeting-management`
   - Meeting list view
   - Meeting edit/delete functionality

4. `feature/meeting-participation`
   - WebRTC implementation
   - Meeting room UI

5. `feature/calendar-integration`
   - Calendar view
   - External calendar sync

### Workflow

1. Create feature branch from `develop`
2. Implement feature with regular commits
3. Create PR to merge back to `develop`
4. After testing, merge `develop` to `main` for releases

## Next Steps

1. Update database schema with Meeting and Attendee models
2. Implement meeting creation functionality
3. Develop meeting room with WebRTC
4. Add calendar integration
5. Enhance notification system