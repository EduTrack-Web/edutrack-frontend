import { Outlet, useMatch } from 'react-router-dom'

import { ChatGroupSidebar } from '@/modules/chat/components/ChatGroupSidebar'
import { CreateChatGroupDialog } from '@/modules/chat/components/CreateChatGroupDialog'
import { useChatViewModel } from '@/modules/chat/viewmodels/useChatViewModel'

export function ChatLayout() {
  const vm = useChatViewModel()
  const directConversationMatch = useMatch('/chat/conversations/:conversationId')
  const groupMatch = useMatch('/chat/groups/:groupId')
  const contactsMatch = useMatch('/chat/contacts')
  const requestsMatch = useMatch('/chat/requests')
  const settingsMatch = useMatch('/chat/settings')
  const isContentOpen = Boolean(directConversationMatch || groupMatch || contactsMatch || requestsMatch || settingsMatch)

  return (
    <>
      <div className="content-card w-full max-w-none overflow-hidden lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className={isContentOpen ? 'hidden min-h-0 lg:block' : 'min-h-0'}>
          <ChatGroupSidebar
            currentDirectConversationId={directConversationMatch?.params.conversationId}
            currentGroupId={groupMatch?.params.groupId}
            directConversations={vm.directConversations}
            groups={vm.groups}
            isLoading={vm.isLoading}
            incomingRequestCount={vm.incomingRequestCount}
            onCreateGroup={vm.openCreateGroup}
            onFriendRequestSent={vm.reload}
            outgoingRequestCount={vm.outgoingRequestCount}
          />
        </div>

        <div className="min-h-0 min-w-0 lg:h-full">
          <Outlet context={{ vm }} />
        </div>
      </div>

      {vm.isCreateGroupOpen && <CreateChatGroupDialog friends={vm.friends} onClose={vm.closeCreateGroup} />}
    </>
  )
}
