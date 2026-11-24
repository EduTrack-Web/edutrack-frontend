import { createBrowserRouter } from 'react-router-dom'

import { PublicLayout } from '@/shared/components/layout/PublicLayout'
import { App } from '@/app/App'
import { GuestOnly, RequireAuth } from '@/app/RouteGuards'

export const router = createBrowserRouter([
  {
    hydrateFallbackElement: null,
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        lazy: async () => {
          const { LandingPage } = await import('@/modules/landing/views/LandingPage')
          return { Component: () => <GuestOnly><LandingPage /></GuestOnly> }
        },
      },
      {
        path: '/login',
        lazy: async () => {
          const { LoginPage } = await import('@/modules/auth/views/LoginPage')
          return { Component: () => <GuestOnly><LoginPage /></GuestOnly> }
        },
      },
      {
        path: '/register',
        lazy: async () => {
          const { RegisterPage } = await import('@/modules/auth/views/RegisterPage')
          return { Component: () => <GuestOnly><RegisterPage /></GuestOnly> }
        },
      },
      {
        path: '/forgot-password',
        lazy: async () => {
          const { ForgotPasswordPage } = await import('@/modules/auth/views/ForgotPasswordPage')
          return { Component: () => <GuestOnly><ForgotPasswordPage /></GuestOnly> }
        },
      },
    ],
  },
  {
    hydrateFallbackElement: null,
    path: '/onboarding',
    lazy: async () => {
      const { ProfileSetupPage } = await import('@/modules/onboarding/views/ProfileSetupPage')
      return { Component: () => <RequireAuth><ProfileSetupPage /></RequireAuth> }
    },
  },
  {
    hydrateFallbackElement: null,
    element: <RequireAuth><App /></RequireAuth>,
    children: [
      {
        path: '/dashboard',
        lazy: async () => {
          const { DashboardPage } = await import('@/modules/dashboard/views/DashboardPage')
          return { Component: DashboardPage }
        },
      },
      {
        path: '/calendar',
        lazy: async () => {
          const { CalendarPage } = await import('@/modules/calendar/views/CalendarPage')
          return { Component: CalendarPage }
        },
      },
      {
        path: '/notes',
        lazy: async () => {
          const { NotesPage } = await import('@/modules/notes/views/NotesPage')
          return { Component: NotesPage }
        },
      },
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
        lazy: async () => {
          const { ChatLayout } = await import('@/modules/chat/views/ChatLayout')
          return { Component: ChatLayout }
        },
        children: [
          {
            index: true,
            lazy: async () => {
              const { ChatHomePage } = await import('@/modules/chat/views/ChatHomePage')
              return { Component: ChatHomePage }
            },
          },
          {
            path: 'contacts',
            lazy: async () => {
              const { ChatPage } = await import('@/modules/chat/views/ChatPage')
              return { Component: ChatPage }
            },
          },
          {
            path: 'requests',
            lazy: async () => {
              const { ChatRequestsPage } = await import('@/modules/chat/views/ChatRequestsPage')
              return { Component: ChatRequestsPage }
            },
          },
          {
            path: 'settings',
            lazy: async () => {
              const { ChatSettingsPage } = await import('@/modules/chat/views/ChatSettingsPage')
              return { Component: ChatSettingsPage }
            },
          },
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
      {
        path: '/account',
        lazy: async () => {
          const { AccountPage } = await import('@/modules/account/views/AccountPage')
          return { Component: AccountPage }
        },
      },
    ],
  },
])
