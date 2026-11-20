import { createBrowserRouter } from 'react-router-dom'

import { ForgotPasswordPage } from '@/modules/auth/views/ForgotPasswordPage'
import { LoginPage } from '@/modules/auth/views/LoginPage'
import { RegisterPage } from '@/modules/auth/views/RegisterPage'
import { AccountPage } from '@/modules/account/views/AccountPage'
import { DashboardPage } from '@/modules/dashboard/views/DashboardPage'
import { CalendarPage } from '@/modules/calendar/views/CalendarPage'
import { NotesPage } from '@/modules/notes/views/NotesPage'
import { ChatPage } from '@/modules/chat/views/ChatPage'
import { ChatHomePage } from '@/modules/chat/views/ChatHomePage'
import { ChatLayout } from '@/modules/chat/views/ChatLayout'
import { ChatRequestsPage } from '@/modules/chat/views/ChatRequestsPage'
import { ChatSettingsPage } from '@/modules/chat/views/ChatSettingsPage'
import { LandingPage } from '@/modules/landing/views/LandingPage'
import { ProfileSetupPage } from '@/modules/onboarding/views/ProfileSetupPage'
import { PublicLayout } from '@/shared/components/layout/PublicLayout'
import { App } from '@/app/App'
import { GuestOnly, RequireAuth } from '@/app/RouteGuards'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <GuestOnly><LandingPage /></GuestOnly> },
      { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/register', element: <GuestOnly><RegisterPage /></GuestOnly> },
      { path: '/forgot-password', element: <GuestOnly><ForgotPasswordPage /></GuestOnly> },
    ],
  },
  {
    path: '/onboarding',
    element: (
      <RequireAuth>
        <ProfileSetupPage />
      </RequireAuth>
    ),
  },
  {
    element: <RequireAuth><App /></RequireAuth>,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/notes', element: <NotesPage /> },
      {
        path: '/notes/trash',
        lazy: async () => {
          const { NoteTrashPage } = await import('@/modules/notes/views/NoteTrashPage')
          return { Component: NoteTrashPage }
        },
      },
      {
        path: '/notes/:noteId',
        lazy: async () => {
          const { NoteEditorPage } = await import('@/modules/notes/views/NoteEditorPage')
          return { Component: NoteEditorPage }
        },
      },
      {
        path: '/chat',
        element: <ChatLayout />,
        children: [
          { index: true, element: <ChatHomePage /> },
          { path: 'contacts', element: <ChatPage /> },
          { path: 'requests', element: <ChatRequestsPage /> },
          { path: 'settings', element: <ChatSettingsPage /> },
          {
            path: 'conversations/:conversationId',
            lazy: async () => {
              const { DirectChatPage } = await import('@/modules/chat/views/DirectChatPage')
              return { Component: DirectChatPage }
            },
          },
          {
            path: 'groups/:groupId',
            lazy: async () => {
              const { ChatGroupPage } = await import('@/modules/chat/views/ChatGroupPage')
              return { Component: ChatGroupPage }
            },
          },
        ],
      },
      {
        path: '/chat/join/:token',
        lazy: async () => {
          const { ChatGroupInvitePage } = await import('@/modules/chat/views/ChatGroupInvitePage')
          return { Component: ChatGroupInvitePage }
        },
      },
      { path: '/account', element: <AccountPage /> },
    ],
  },
])
